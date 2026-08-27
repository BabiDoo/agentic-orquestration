import { CONTRACTS_VERSION, DatasetManifest } from '@adzhub/contracts';
import { getCurrentDatasetManifest, getSupercerebroOperatorProfiles } from '@adzhub/data';
import { getNoStoreHeaders, redactSecretsRecursively } from '@adzhub/runtime';
import { defaultRunsService, RunEvent, RunsService } from './runs-service.js';
import { renderHtmlShell } from './ui-shell.js';
import {
  listCanonicalScenarios,
  getCanonicalScenario,
  ALLOWED_MODELS
} from './canonical-scenarios.js';
import {
  getSecurityHeaders,
  InMemoryRateLimiter,
  validatePayloadSize
} from './security-hardening.js';

export interface ApiResponse<T = unknown> {
  status: number;
  headers: Record<string, string>;
  body: T;
}

export interface ApiRequestContext {
  method: string;
  path: string;
  query?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
  runsService?: RunsService;
}

const BUILD_SHA = 'adzhub-demo-v1.0.0-sha';
const apiRateLimiter = new InMemoryRateLimiter({ windowMs: 60000, maxRequests: 120 });

/**
 * Roteador e despachante in-memory / HTTP das rotas canônicas da API da UI / Web Shell.
 */
export async function handleApiRequest(context: ApiRequestContext): Promise<ApiResponse> {
  const method = (context.method || 'GET').toUpperCase();
  const pathParts = (context.path || '/').split('?');
  const rawPath = pathParts[0] ?? '/';
  const path = rawPath.endsWith('/') && rawPath.length > 1 ? rawPath.slice(0, -1) : rawPath;
  const runsService = context.runsService ?? defaultRunsService;

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Contracts-Version': CONTRACTS_VERSION,
    ...getNoStoreHeaders(),
    ...getSecurityHeaders()
  };

  // Verificação de Rate Limiting
  const clientIp = context.headers?.['x-forwarded-for'] ?? 'local-client';
  const rateLimitCheck = apiRateLimiter.checkLimit(clientIp);
  if (!rateLimitCheck.allowed) {
    return {
      status: 429,
      headers: {
        ...defaultHeaders,
        'Retry-After': String(Math.ceil(rateLimitCheck.resetInMs / 1000))
      },
      body: {
        error: 'Too Many Requests',
        message: 'Limite de requisições excedido. Tente novamente mais tarde.'
      }
    };
  }

  // Verificação de tamanho máximo de payload (1MB)
  if (context.body) {
    const sizeCheck = validatePayloadSize(context.body);
    if (!sizeCheck.valid) {
      return {
        status: 413,
        headers: defaultHeaders,
        body: { error: 'Payload Too Large', message: sizeCheck.error }
      };
    }
  }

  // 0. GET / ou /index.html ou /admin ou /app (Serve a UI Shell)
  if (path === '' || path === '/' || path === '/index.html' || path === '/admin' || path === '/app') {
    if (method !== 'GET') {
      return {
        status: 405,
        headers: defaultHeaders,
        body: { error: 'Method Not Allowed', allowed: ['GET'] }
      };
    }

    return {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Contracts-Version': CONTRACTS_VERSION,
        ...getNoStoreHeaders()
      },
      body: renderHtmlShell() as any
    };
  }

  // Favicon (204 No Content para evitar 404 no console do navegador)
  if (path === '/favicon.ico') {
    return {
      status: 204,
      headers: defaultHeaders,
      body: ''
    };
  }

  // 1. GET /api/health
  if (path === '/api/health') {
    if (method !== 'GET') {
      return {
        status: 405,
        headers: defaultHeaders,
        body: { error: 'Method Not Allowed', allowed: ['GET'] }
      };
    }

    return {
      status: 200,
      headers: defaultHeaders,
      body: {
        status: 'OK',
        readiness: true,
        version: CONTRACTS_VERSION,
        buildSha: BUILD_SHA,
        contractsVersion: CONTRACTS_VERSION,
        timestamp: new Date().toISOString()
      }
    };
  }

  // 2. GET /api/datasets/current
  if (path === '/api/datasets/current') {
    if (method !== 'GET') {
      return {
        status: 405,
        headers: defaultHeaders,
        body: { error: 'Method Not Allowed', allowed: ['GET'] }
      };
    }

    try {
      const currentManifest: DatasetManifest = getCurrentDatasetManifest();
      return {
        status: 200,
        headers: defaultHeaders,
        body: currentManifest
      };
    } catch (err: unknown) {
      return {
        status: 500,
        headers: defaultHeaders,
        body: {
          error: 'Internal Server Error',
          message: err instanceof Error ? err.message : 'Falha ao recuperar manifesto do dataset'
        }
      };
    }
  }

  // 2.1 GET /api/scenarios (Lista cenários canônicos S0–S5)
  if (path === '/api/scenarios') {
    if (method !== 'GET') {
      return {
        status: 405,
        headers: defaultHeaders,
        body: { error: 'Method Not Allowed', allowed: ['GET'] }
      };
    }

    return {
      status: 200,
      headers: defaultHeaders,
      body: listCanonicalScenarios()
    };
  }

  // 2.2 GET /api/scenarios/:id (Retorna detalhes e contrato do cenário canônico)
  const scenarioMatch = path.match(/^\/api\/scenarios\/([a-zA-Z0-9_-]+)$/);
  if (scenarioMatch) {
    if (method !== 'GET') {
      return {
        status: 405,
        headers: defaultHeaders,
        body: { error: 'Method Not Allowed', allowed: ['GET'] }
      };
    }

    const scenarioId = scenarioMatch[1]!;
    const scenario = getCanonicalScenario(scenarioId);

    if (!scenario) {
      return {
        status: 404,
        headers: defaultHeaders,
        body: {
          error: 'Not Found',
          message: `Cenário '${scenarioId}' não encontrado na allowlist de cenários canônicos (S0–S5).`
        }
      };
    }

    return {
      status: 200,
      headers: defaultHeaders,
      body: scenario
    };
  }

  // 2.3 GET /api/models (Lista modelos permitidos por allowlist)
  if (path === '/api/models') {
    if (method !== 'GET') {
      return {
        status: 405,
        headers: defaultHeaders,
        body: { error: 'Method Not Allowed', allowed: ['GET'] }
      };
    }

    return {
      status: 200,
      headers: defaultHeaders,
      body: ALLOWED_MODELS
    };
  }

  // 2.4 GET & POST /api/models/list (Consulta dinâmica ao Google ModelService.ListModels)
  if (path === '/api/models/list' || path === '/api/models/discover') {
    const body = (context.body ?? {}) as Record<string, unknown>;
    const headerKey =
      context.headers?.['x-openrouter-key'] ??
      context.headers?.['x-api-key'] ??
      (context.headers?.authorization?.startsWith('Bearer ')
        ? context.headers.authorization.slice(7)
        : undefined);

    const apiKey = (typeof body.apiKey === 'string' ? body.apiKey : headerKey)?.trim();
    if (!apiKey) {
      return {
        status: 400,
        headers: defaultHeaders,
        body: {
          error: 'Bad Request',
          message: 'Chave de API não informada. Forneça uma chave de API para consultar ModelService.ListModels.'
        }
      };
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
      );
      const data = await response.json();
      return {
        status: response.status,
        headers: defaultHeaders,
        body: data
      };
    } catch (err: unknown) {
      return {
        status: 500,
        headers: defaultHeaders,
        body: {
          error: 'Internal Server Error',
          message: err instanceof Error ? err.message : 'Falha ao consultar ModelService.ListModels'
        }
      };
    }
  }

  // 2.41 GET /api/supercerebro/operators ou /api/supercerebro/pendencies (Operadores e Pendências do Supercérebro)
  if (path === '/api/supercerebro/operators' || path === '/api/supercerebro/pendencies' || path === '/api/operators') {
    if (method !== 'GET') {
      return {
        status: 405,
        headers: defaultHeaders,
        body: { error: 'Method Not Allowed', allowed: ['GET'] }
      };
    }

    const operators = getSupercerebroOperatorProfiles({
      isPaused: runsService.isPaused(),
      isReactivated: runsService.isReactivated(),
      delegationState: runsService.getDelegationState()
    });

    return {
      status: 200,
      headers: defaultHeaders,
      body: {
        source: 'supercerebro_canonical',
        operators
      }
    };
  }

  // 2.5 POST & GET /api/governance/commit /api/governance/state (Registra e consulta commit de governança efetuado no painel)
  if (path === '/api/governance/commit' || path === '/api/governance/state' || path === '/api/commit') {
    if (method === 'GET') {
      return {
        status: 200,
        headers: defaultHeaders,
        body: {
          status: 'OK',
          isReactivated: runsService.isReactivated(),
          isPaused: runsService.isPaused(),
          pauseState: runsService.getPauseState(),
          delegation: runsService.getDelegationState(),
          timestamp: new Date().toISOString()
        }
      };
    }

    if (method !== 'POST') {
      return {
        status: 405,
        headers: defaultHeaders,
        body: { error: 'Method Not Allowed', allowed: ['GET', 'POST'] }
      };
    }
    const body = (context.body ?? {}) as Record<string, unknown>;
    const action = String(body.action || 'REACTIVATE');
    if (action === 'REACTIVATE' || action === 'reativar' || action === 'Reativar') {
      runsService.commitReactivation();
    } else if (
      action === 'PAUSE' ||
      action === 'pausar' ||
      action === 'Pausar' ||
      action === 'PAUSE_AD' ||
      action === 'CONFIRM_PAUSE'
    ) {
      const pausedAds = Array.isArray(body.pausedAds)
        ? (body.pausedAds as string[])
        : ['ad_namorados_casal_03', 'ad_whey_sabores_04'];
      const details =
        typeof body.details === 'string'
          ? body.details
          : 'Pausa de criativos saturados aprovada pelo operador e commitada no SQLite.';
      runsService.commitPause({
        pausedAds,
        details
      });
    } else if (action === 'DELEGATE_PROPOSAL' || action === 'DELEGATE' || action === 'delegar') {
      const delegatedTo =
        (typeof body.targetPerson === 'string' && body.targetPerson.trim())
          ? body.targetPerson.trim()
          : (typeof body.person === 'string' && body.person.trim())
            ? body.person.trim()
            : 'Responsável Designado';

      const proposalTitle =
        (typeof body.proposalTitle === 'string' && body.proposalTitle.trim())
          ? body.proposalTitle.trim()
          : 'Proposta de Alteração Operacional';

      const proposalDetails =
        (typeof body.proposalDetails === 'string' && body.proposalDetails.trim())
          ? body.proposalDetails.trim()
          : 'Despacho de alteração operacional aprovado e commitado no painel de governança.';

      runsService.commitDelegation({
        delegatedTo,
        proposalTitle,
        proposalDetails
      });
    }
    return {
      status: 200,
      headers: defaultHeaders,
      body: {
        status: 'COMMITTED',
        action,
        isReactivated: runsService.isReactivated(),
        isPaused: runsService.isPaused(),
        pauseState: runsService.getPauseState(),
        delegation: runsService.getDelegationState(),
        timestamp: new Date().toISOString()
      }
    };
  }

  // 3. POST /api/runs (Inicia uma nova execução)
  if (path === '/api/runs') {
    if (method !== 'POST') {
      return {
        status: 405,
        headers: defaultHeaders,
        body: { error: 'Method Not Allowed', allowed: ['POST'] }
      };
    }

    try {
      const body = (context.body ?? {}) as Record<string, unknown>;

      // Extrai apiKey de forma segura do header, payload ou variáveis de ambiente do servidor
      const headerKey =
        context.headers?.['x-openrouter-key'] ??
        context.headers?.['x-api-key'] ??
        (context.headers?.authorization?.startsWith('Bearer ')
          ? context.headers.authorization.slice(7)
          : undefined);

      const envKey =
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_API_KEY ||
        process.env.OPENROUTER_API_KEY ||
        process.env.OPENAI_API_KEY;

      const apiKey = (
        typeof body.apiKey === 'string' && body.apiKey.trim()
          ? body.apiKey.trim()
          : headerKey || envKey
      )?.trim();

      const runRecord = await runsService.startRun({
        taskContract: body.taskContract ?? body,
        mode: body.mode as 'BASIC_REACT' | 'GOVERNED_PEVC' | undefined,
        model: typeof body.model === 'string' ? body.model : undefined,
        apiKey,
        chatHistory: Array.isArray(body.chatHistory) ? body.chatHistory : undefined,
        mockAdapter: body.mockAdapter as any
      });

      const sanitizedResult = runsService.getSanitizedRun(runRecord.runId, apiKey);

      return {
        status: 201,
        headers: defaultHeaders,
        body: sanitizedResult
      };
    } catch (err: unknown) {
      return {
        status: 400,
        headers: defaultHeaders,
        body: {
          error: 'Bad Request',
          message: err instanceof Error ? err.message : 'Parâmetros de execução inválidos'
        }
      };
    }
  }

  // 3.1 POST /api/compare (M6-07 Comparador Basic × Governed)
  if (path === '/api/compare') {
    if (method !== 'POST') {
      return {
        status: 405,
        headers: defaultHeaders,
        body: { error: 'Method Not Allowed', allowed: ['POST'] }
      };
    }

    try {
      const body = (context.body ?? {}) as Record<string, unknown>;
      const headerKey =
        context.headers?.['x-openrouter-key'] ??
        context.headers?.['x-api-key'] ??
        (context.headers?.authorization?.startsWith('Bearer ')
          ? context.headers.authorization.slice(7)
          : undefined);

      const apiKey = (typeof body.apiKey === 'string' ? body.apiKey : headerKey)?.trim();

      const rawContract = (body.taskContract ?? body) as Record<string, any>;
      if (!rawContract.goal || typeof rawContract.goal !== 'string' || !rawContract.goal.trim()) {
        rawContract.goal = 'Audite as métricas de performance da conta Housewhey cruzando Meta Ads e CRM';
      }

      const comparisonResult = await runsService.compareRuns({
        taskContract: rawContract,
        model: typeof body.model === 'string' ? body.model : undefined,
        apiKey,
        dataset: typeof body.dataset === 'string' ? body.dataset : undefined,
        mockAdapter: body.mockAdapter as any
      });

      return {
        status: 200,
        headers: defaultHeaders,
        body: comparisonResult
      };
    } catch (err: unknown) {
      return {
        status: 400,
        headers: defaultHeaders,
        body: {
          error: 'Bad Request',
          message: err instanceof Error ? err.message : 'Parâmetros de comparação inválidos'
        }
      };
    }
  }

  // 3.2 POST /api/compare/export (M6-08 Exportação de Comparação)
  if (path === '/api/compare/export') {
    if (method !== 'POST') {
      return {
        status: 405,
        headers: defaultHeaders,
        body: { error: 'Method Not Allowed', allowed: ['POST'] }
      };
    }

    try {
      const body = (context.body ?? {}) as Record<string, unknown>;
      const format = (context.query?.['format'] || body.format || 'json') as 'json' | 'markdown';
      const headerKey =
        context.headers?.['x-openrouter-key'] ??
        context.headers?.['x-api-key'] ??
        (context.headers?.authorization?.startsWith('Bearer ')
          ? context.headers.authorization.slice(7)
          : undefined);

      const apiKey = (typeof body.apiKey === 'string' ? body.apiKey : headerKey)?.trim();

      const comparisonResult = await runsService.compareRuns({
        taskContract: body.taskContract ?? body,
        model: typeof body.model === 'string' ? body.model : undefined,
        apiKey,
        dataset: typeof body.dataset === 'string' ? body.dataset : undefined,
        mockAdapter: body.mockAdapter as any
      });

      const exportResult = runsService.exportComparison(comparisonResult, format);

      return {
        status: 200,
        headers: {
          ...defaultHeaders,
          'Content-Type': exportResult.contentType,
          'Content-Disposition': `attachment; filename="${exportResult.filename}"`
        },
        body: exportResult.contentType.startsWith('application/json')
          ? JSON.parse(exportResult.content)
          : exportResult.content
      };
    } catch (err: unknown) {
      return {
        status: 400,
        headers: defaultHeaders,
        body: {
          error: 'Bad Request',
          message: err instanceof Error ? err.message : 'Falha ao exportar comparação'
        }
      };
    }
  }

  // 4. POST /api/runs/:id/cancel
  const cancelMatch = path.match(/^\/api\/runs\/([a-zA-Z0-9_-]+)\/cancel$/);
  if (cancelMatch) {
    if (method !== 'POST') {
      return {
        status: 405,
        headers: defaultHeaders,
        body: { error: 'Method Not Allowed', allowed: ['POST'] }
      };
    }

    const runId = cancelMatch[1]!;
    const cancelled = runsService.cancelRun(runId);

    if (!cancelled) {
      return {
        status: 404,
        headers: defaultHeaders,
        body: {
          error: 'Not Found',
          message: `Run '${runId}' não encontrada ou já finalizada.`
        }
      };
    }

    return {
      status: 200,
      headers: defaultHeaders,
      body: {
        ok: true,
        runId,
        status: 'CANCELLED'
      }
    };
  }

  // 5. GET /api/runs/:id/events (Consulta de eventos em tempo real / SSE)
  const eventsMatch = path.match(/^\/api\/runs\/([a-zA-Z0-9_-]+)\/events$/);
  if (eventsMatch) {
    if (method !== 'GET') {
      return {
        status: 405,
        headers: defaultHeaders,
        body: { error: 'Method Not Allowed', allowed: ['GET'] }
      };
    }

    const runId = eventsMatch[1]!;
    const run = runsService.getRun(runId);

    if (!run) {
      return {
        status: 404,
        headers: defaultHeaders,
        body: {
          error: 'Not Found',
          message: `Run '${runId}' não encontrada`
        }
      };
    }

    return {
      status: 200,
      headers: defaultHeaders,
      body: {
        runId,
        events: redactSecretsRecursively(run.events)
      }
    };
  }

  // 5.1 GET /api/runs/:id/export (M6-08 Exportação de Trace e Relatório)
  const exportMatch = path.match(/^\/api\/runs\/([a-zA-Z0-9_-]+)\/export$/);
  if (exportMatch) {
    if (method !== 'GET') {
      return {
        status: 405,
        headers: defaultHeaders,
        body: { error: 'Method Not Allowed', allowed: ['GET'] }
      };
    }

    const runId = exportMatch[1]!;
    const format = (context.query?.['format'] || 'json') as 'json' | 'markdown' | 'summary';
    const headerKey =
      context.headers?.['x-openrouter-key'] ??
      context.headers?.['x-api-key'] ??
      (context.headers?.authorization?.startsWith('Bearer ')
        ? context.headers.authorization.slice(7)
        : undefined);

    try {
      const exportResult = runsService.exportRun(runId, format, headerKey);
      return {
        status: 200,
        headers: {
          ...defaultHeaders,
          'Content-Type': exportResult.contentType,
          'Content-Disposition': `attachment; filename="${exportResult.filename}"`
        },
        body: exportResult.contentType.startsWith('application/json')
          ? JSON.parse(exportResult.content)
          : exportResult.content
      };
    } catch (err: unknown) {
      return {
        status: 404,
        headers: defaultHeaders,
        body: {
          error: 'Not Found',
          message:
            err instanceof Error ? err.message : `Run '${runId}' não encontrada para exportação`
        }
      };
    }
  }

  // 6. GET /api/runs/:id (Consulta snapshot consolidado da run)
  const runDetailMatch = path.match(/^\/api\/runs\/([a-zA-Z0-9_-]+)$/);
  if (runDetailMatch) {
    if (method !== 'GET') {
      return {
        status: 405,
        headers: defaultHeaders,
        body: { error: 'Method Not Allowed', allowed: ['GET'] }
      };
    }

    const runId = runDetailMatch[1]!;
    const sanitizedRun = runsService.getSanitizedRun(runId);

    if (!sanitizedRun) {
      return {
        status: 404,
        headers: defaultHeaders,
        body: {
          error: 'Not Found',
          message: `Run '${runId}' não encontrada`
        }
      };
    }

    return {
      status: 200,
      headers: defaultHeaders,
      body: sanitizedRun
    };
  }

  // 7. 404 Not Found
  return {
    status: 404,
    headers: defaultHeaders,
    body: {
      error: 'Not Found',
      message: `Rota '${path}' não encontrada`
    }
  };
}

/**
 * Adapter compatível com Fetch API standard (Request -> Response), suportando Server-Sent Events (SSE).
 */
export async function handleFetchRequest(
  request: Request,
  runsService?: RunsService
): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const path = url.pathname;
  const service = runsService ?? defaultRunsService;

  // Trata streaming SSE diretamente no fetch adapter
  const sseMatch = path.match(/^\/api\/runs\/([a-zA-Z0-9_-]+)\/events$/);
  if (
    sseMatch &&
    method === 'GET' &&
    request.headers.get('accept')?.includes('text/event-stream')
  ) {
    const runId = sseMatch[1]!;
    const run = service.getRun(runId);

    if (!run) {
      return new Response(JSON.stringify({ error: 'Run not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...getNoStoreHeaders() }
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        let unsubscribe: () => void = () => {};
        unsubscribe = service.addEventListener(runId, (evt: RunEvent) => {
          const sanitizedEvt = redactSecretsRecursively(evt);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(sanitizedEvt)}\n\n`));

          if (
            evt.type === 'RUN_COMPLETED' ||
            evt.type === 'RUN_FAILED' ||
            evt.type === 'RUN_CANCELLED'
          ) {
            try {
              controller.close();
            } catch {
              // Já fechado
            }
            unsubscribe();
          }
        });
      }
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Connection: 'keep-alive'
      }
    });
  }

  let body: unknown = undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      body = await request.json();
    } catch {
      // Body não-JSON ou vazio
    }
  }

  const headers: Record<string, string> = {};
  request.headers.forEach((val, key) => {
    headers[key.toLowerCase()] = val;
  });

  const result = await handleApiRequest({
    method,
    path,
    body,
    headers,
    runsService: service
  });

  const isNullBodyStatus = result.status === 204 || result.status === 205 || result.status === 304;
  const responseBody = isNullBodyStatus
    ? null
    : typeof result.body === 'string' && result.headers['Content-Type']?.includes('text/html')
      ? result.body
      : JSON.stringify(result.body);

  return new Response(responseBody, {
    status: result.status,
    headers: result.headers
  });
}
