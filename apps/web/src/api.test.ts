import { describe, it, expect, beforeEach } from 'vitest';
import { TaskContract } from '@adzhub/contracts';
import { MockModelAdapter } from '@adzhub/runtime';
import { handleApiRequest, handleFetchRequest } from './api.js';
import { RunsService } from './runs-service.js';
import {
  buildDatasetManifest,
  setCurrentDatasetManifest,
  resetCurrentDatasetManifest,
  DEFAULT_CANONICAL_TIMEFRAME
} from '@adzhub/data';

describe('@adzhub/web API Router & Runs Engine (M2-08 & Gate M2)', () => {
  let runsService: RunsService;
  const sampleApiKey = 'sk-or-v1-supersecretkey1234567890abcdef1234567890';

  const timeframe = {
    since: '2026-08-01T00:00:00.000Z',
    until: '2026-08-20T23:59:59.000Z',
    timezone: 'America/Sao_Paulo'
  };

  const s0TaskContract: TaskContract = {
    schemaVersion: '1.0.0',
    taskId: 'task_s0_housewhey_analysis',
    clientId: 'cli_housewhey',
    tenantId: 'hub_spot',
    goal: 'Analisar performance de criativos e reconciliar Meta Ads com vendas reais no CRM',
    timeframe,
    effects: {
      allowed: ['read:memory', 'read:meta', 'read:crm', 'read:app'],
      forbidden: ['external_write']
    },
    budgets: {
      maxSteps: 10,
      maxToolCalls: 5,
      maxTokens: 8000,
      maxCostBrl: 2.5,
      timeoutMs: 30000
    },
    successCriteria: {
      minEvidenceCoverage: 0.8,
      requireVerifiedClaims: true
    },
    approvalPolicy: {
      externalWritesRequireApproval: true,
      autoApproveReadOnly: true
    },
    metadata: {
      scenario: 'S0',
      requester: 'Aline (Gestão de Tráfego SPOT)'
    }
  };

  beforeEach(() => {
    resetCurrentDatasetManifest();
    runsService = new RunsService();
  });

  describe('GET /api/health', () => {
    it('deve retornar 200 OK com readiness, buildSha, version e headers no-store', async () => {
      const response = await handleApiRequest({
        method: 'GET',
        path: '/api/health',
        runsService
      });

      expect(response.status).toBe(200);
      expect(response.headers['Cache-Control']).toContain('no-store');

      const body = response.body as {
        status: string;
        readiness: boolean;
        version: string;
        buildSha: string;
        contractsVersion: string;
      };

      expect(body.status).toBe('OK');
      expect(body.readiness).toBe(true);
      expect(body.version).toBe('1.0.0');
      expect(body.buildSha).toContain('adzhub-');
      expect(body.contractsVersion).toBe('1.0.0');
    });
  });

  describe('GET /api/datasets/current', () => {
    it('1. Deve retornar 200 OK com o manifesto do dataset ativo', async () => {
      const response = await handleApiRequest({
        method: 'GET',
        path: '/api/datasets/current',
        runsService
      });

      expect(response.status).toBe(200);
      expect(response.headers['Content-Type']).toBe('application/json');

      const manifest = response.body as any;
      expect(manifest.schemaVersion).toBe('1.0.0');
      expect(manifest.manifestId).toBe('dsm_housewhey_s0_v1');
      expect(manifest.clientId).toBe('cli_housewhey');
    });

    it('2. Deve refletir dinamicamente a atualização do dataset ativo', async () => {
      const customManifest = buildDatasetManifest({
        manifestId: 'dsm_updated_s1',
        datasetVersion: '1.1.0',
        clientId: 'cli_housewhey',
        origin: 'synthetic_generator',
        timeframe: DEFAULT_CANONICAL_TIMEFRAME,
        files: [
          {
            filename: 'meta_ads_performance.json',
            content: '{"updated": true}',
            purpose: 'Métricas'
          }
        ]
      });

      setCurrentDatasetManifest(customManifest);

      const response = await handleApiRequest({
        method: 'GET',
        path: '/api/datasets/current',
        runsService
      });

      expect(response.status).toBe(200);
      const manifest = response.body as any;
      expect(manifest.manifestId).toBe('dsm_updated_s1');
      expect(manifest.datasetVersion).toBe('1.1.0');
    });

    it('3. Deve rejeitar métodos não suportados com 405 Method Not Allowed', async () => {
      const response = await handleApiRequest({
        method: 'POST',
        path: '/api/datasets/current',
        runsService
      });

      expect(response.status).toBe(405);
      expect((response.body as { error: string }).error).toBe('Method Not Allowed');
    });
  });

  describe('API de Runs (POST /api/runs, GET /api/runs/:id, cancel & events)', () => {
    it('POST /api/runs inicia run e retorna 201 Created com status, trace e métricas', async () => {
      const mockAdapter = new MockModelAdapter();
      mockAdapter.enqueueResponse({
        content: 'Diagnóstico da campanha Housewhey executado.',
        toolCalls: undefined
      });

      const response = await handleApiRequest({
        method: 'POST',
        path: '/api/runs',
        headers: {
          'x-openrouter-key': sampleApiKey
        },
        body: {
          taskContract: s0TaskContract,
          mode: 'BASIC_REACT',
          model: 'mock/test-model',
          mockAdapter
        },
        runsService
      });

      expect(response.status).toBe(201);
      expect(response.headers['Cache-Control']).toContain('no-store');

      const body = response.body as any;
      expect(body.runId).toBeDefined();
      expect(body.taskId).toBe('task_s0_housewhey_analysis');
      expect(body.status).toBe('COMPLETED');
      expect(body.mode).toBe('BASIC_REACT');
      expect(body.finalOutput).toContain('Diagnóstico');
      expect(body.metrics).toBeDefined();
      expect(body.metrics.totalSteps).toBe(1);

      // Verificação de redaction de chave
      const rawJson = JSON.stringify(body);
      expect(rawJson).not.toContain(sampleApiKey);
    });

    it('GET /api/runs/:id retorna snapshot consolidado da run', async () => {
      const mockAdapter = new MockModelAdapter();
      mockAdapter.enqueueResponse({
        content: 'Concluído.',
        toolCalls: undefined
      });

      const createRes = await handleApiRequest({
        method: 'POST',
        path: '/api/runs',
        body: {
          taskContract: s0TaskContract,
          mockAdapter
        },
        runsService
      });

      const runId = (createRes.body as any).runId;

      const detailRes = await handleApiRequest({
        method: 'GET',
        path: `/api/runs/${runId}`,
        runsService
      });

      expect(detailRes.status).toBe(200);
      const run = detailRes.body as any;
      expect(run.runId).toBe(runId);
      expect(run.status).toBe('COMPLETED');
      expect(run.taskId).toBe('task_s0_housewhey_analysis');
    });

    it('GET /api/runs/:id/events retorna lista de eventos de trace', async () => {
      const mockAdapter = new MockModelAdapter();
      mockAdapter.enqueueResponse({
        content: 'Pensando e finalizando...',
        toolCalls: undefined
      });

      const createRes = await handleApiRequest({
        method: 'POST',
        path: '/api/runs',
        body: {
          taskContract: s0TaskContract,
          mockAdapter
        },
        runsService
      });

      const runId = (createRes.body as any).runId;

      const eventsRes = await handleApiRequest({
        method: 'GET',
        path: `/api/runs/${runId}/events`,
        runsService
      });

      expect(eventsRes.status).toBe(200);
      const body = eventsRes.body as any;
      expect(body.runId).toBe(runId);
      expect(body.events.length).toBeGreaterThanOrEqual(2);
      expect(body.events.some((e: any) => e.type === 'RUN_STARTED')).toBe(true);
      expect(body.events.some((e: any) => e.type === 'RUN_COMPLETED')).toBe(true);
    });

    it('POST /api/runs/:id/cancel cancela a execução ativa', async () => {
      const mockAdapter = new MockModelAdapter();
      // Simula execução demorada
      mockAdapter.setHandler(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return {
          content: 'Processando...',
          toolCalls: undefined
        };
      });

      // Dispara em background
      const runPromise = runsService.startRun({
        taskContract: s0TaskContract,
        mockAdapter
      });

      // Aguarda iniciar
      await new Promise((resolve) => setTimeout(resolve, 5));
      const activeRuns = runsService['runs'];
      const runId = Array.from(activeRuns.keys())[0]!;

      const cancelRes = await handleApiRequest({
        method: 'POST',
        path: `/api/runs/${runId}/cancel`,
        runsService
      });

      expect(cancelRes.status).toBe(200);
      const cancelBody = cancelRes.body as any;
      expect(cancelBody.ok).toBe(true);
      expect(cancelBody.status).toBe('CANCELLED');

      await runPromise;
      expect(runsService.getRun(runId)?.status).toBe('CANCELLED');
    });
  });

  describe('API de Governança & Commit (/api/governance/commit, /api/governance/state)', () => {
    it('1. GET /api/governance/state retorna estado inicial íntegro', async () => {
      const res = await handleApiRequest({
        method: 'GET',
        path: '/api/governance/state',
        runsService
      });

      expect(res.status).toBe(200);
      const body = res.body as any;
      expect(body.status).toBe('OK');
      expect(body.isReactivated).toBe(false);
      expect(body.isPaused).toBe(false);
      expect(body.delegation).toBeDefined();
    });

    it('2. POST /api/governance/commit com action PAUSE persiste o estado de pausa', async () => {
      const commitRes = await handleApiRequest({
        method: 'POST',
        path: '/api/governance/commit',
        body: {
          action: 'PAUSE',
          pausedAds: ['ad_namorados_casal_03', 'ad_whey_sabores_04'],
          details: 'Pausa aprovada pelo operador no painel'
        },
        runsService
      });

      expect(commitRes.status).toBe(200);
      const body = commitRes.body as any;
      expect(body.status).toBe('COMMITTED');
      expect(body.isPaused).toBe(true);
      expect(body.pauseState.isPaused).toBe(true);
      expect(body.pauseState.pausedAds).toContain('ad_whey_sabores_04');
      expect(runsService.isPaused()).toBe(true);

      // Consulta subsequente em outro chat / endpoint state
      const stateRes = await handleApiRequest({
        method: 'GET',
        path: '/api/governance/state',
        runsService
      });
      expect(stateRes.status).toBe(200);
      expect((stateRes.body as any).isPaused).toBe(true);
      expect((stateRes.body as any).pauseState.pausedAds).toContain('ad_namorados_casal_03');
    });

    it('3. POST /api/governance/commit com action REACTIVATE limpa o estado de pausa e ativa reativação', async () => {
      runsService.commitPause();
      expect(runsService.isPaused()).toBe(true);

      const commitRes = await handleApiRequest({
        method: 'POST',
        path: '/api/governance/commit',
        body: { action: 'REACTIVATE' },
        runsService
      });

      expect(commitRes.status).toBe(200);
      expect((commitRes.body as any).isReactivated).toBe(true);
      expect((commitRes.body as any).isPaused).toBe(false);
      expect(runsService.isReactivated()).toBe(true);
      expect(runsService.isPaused()).toBe(false);
    });
  });

  describe('GATE M2: Critérios de Aceite Globais do Épico M2', () => {
    it('1. S0 executa no Basic/ReAct pela UI/API ponta a ponta', async () => {
      const mockAdapter = new MockModelAdapter();

      // Step 1: list_ads
      mockAdapter.enqueueResponse({
        content: 'Passo 1: Listando anúncios da Housewhey.',
        toolCalls: [
          {
            id: 'call_ads_1',
            type: 'function',
            function: {
              name: 'list_ads',
              arguments: JSON.stringify({
                client_id: 'cli_housewhey',
                since: timeframe.since,
                until: timeframe.until
              })
            }
          }
        ]
      });

      // Step 2: run_app_analise_criativos
      mockAdapter.enqueueResponse({
        content: 'Passo 2: Rodando o App de Análise de Criativos.',
        toolCalls: [
          {
            id: 'call_app_1',
            type: 'function',
            function: {
              name: 'run_app_analise_criativos',
              arguments: JSON.stringify({
                client_id: 'cli_housewhey',
                timeframe,
                benchmark_cpa_brl: 85.0
              })
            }
          }
        ]
      });

      // Step 3: Conclusão
      mockAdapter.enqueueResponse({
        content: `Diagnóstico Gate M2:
- Anúncio ad_whey_baunilha_01: TOP PERFORMER (recomendado para escala).
- Anúncio ad_namorados_casal_03: QUEIMA DE VERBA (recomendado para pausa imediata).`,
        toolCalls: undefined
      });

      // Execução via API
      const createResponse = await handleApiRequest({
        method: 'POST',
        path: '/api/runs',
        headers: {
          'x-openrouter-key': sampleApiKey
        },
        body: {
          taskContract: s0TaskContract,
          mode: 'BASIC_REACT',
          model: 'mock/test-model',
          mockAdapter
        },
        runsService
      });

      expect(createResponse.status).toBe(201);
      const runData = createResponse.body as any;

      // 2. Resposta, tools e métricas básicas são visíveis
      expect(runData.status).toBe('COMPLETED');
      expect(runData.finalOutput).toContain('TOP PERFORMER');
      expect(runData.finalOutput).toContain('ad_namorados_casal_03');
      expect(runData.trace).toHaveLength(3);
      expect(runData.metrics.totalToolCalls).toBe(2);
      expect(runData.metrics.totalTokens).toBeGreaterThan(0);
      expect(runData.metrics.durationMs).toBeGreaterThanOrEqual(0);

      // 3. Chave não aparece em banco, console, trace ou export
      const serializedJson = JSON.stringify(runData);
      expect(serializedJson).not.toContain(sampleApiKey);
      expect(serializedJson).not.toContain('supersecretkey');
    });

    it('2. Fetch API e SSE transmitem stream de eventos corretamente', async () => {
      const mockAdapter = new MockModelAdapter();
      mockAdapter.enqueueResponse({
        content: 'Finalizado via SSE',
        toolCalls: undefined
      });

      // Cria run
      const runRecord = await runsService.startRun({
        taskContract: s0TaskContract,
        mockAdapter
      });

      const sseRequest = new Request(`http://localhost:3000/api/runs/${runRecord.runId}/events`, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream'
        }
      });

      const sseResponse = await handleFetchRequest(sseRequest, runsService);

      expect(sseResponse.status).toBe(200);
      expect(sseResponse.headers.get('Content-Type')).toBe('text/event-stream');
      expect(sseResponse.headers.get('Cache-Control')).toContain('no-store');

      const streamText = await sseResponse.text();
      expect(streamText).toContain('data: ');
      expect(streamText).toContain('RUN_STARTED');
      expect(streamText).toContain('RUN_COMPLETED');
      expect(streamText).not.toContain(sampleApiKey);
    });
  });

  describe('API de Operadores e Pendências do Supercérebro (/api/supercerebro/operators)', () => {
    it('1. GET /api/supercerebro/operators retorna operadores canônicos e suas pendências dinâmicas', async () => {
      const res = await handleApiRequest({
        method: 'GET',
        path: '/api/supercerebro/operators',
        runsService
      });

      expect(res.status).toBe(200);
      const body = res.body as any;
      expect(body.source).toBe('supercerebro_canonical');
      expect(Array.isArray(body.operators)).toBe(true);
      expect(body.operators.length).toBeGreaterThanOrEqual(4);

      const aline = body.operators.find((op: any) => op.id === 'p_aline');
      expect(aline).toBeDefined();
      expect(aline.name).toBe('Aline Rocha');
      expect(aline.company).toBe('SPOT');
      expect(aline.pendencies.length).toBeGreaterThan(0);
      expect(aline.pendencies[0].title).toBe('Pausar Criativos Fracos');

      const marcos = body.operators.find((op: any) => op.id === 'p_marcos');
      expect(marcos).toBeDefined();
      expect(marcos.name).toBe('Marcos Silva');
      expect(marcos.company).toBe('Housewhey');
      expect(marcos.pendencies.length).toBeGreaterThan(0);
      expect(marcos.pendencies[0].title).toBe('Aprovar Mudança de Verba');
    });

    it('2. GET /api/supercerebro/pendencies é um alias válido para a mesma rota', async () => {
      const res = await handleApiRequest({
        method: 'GET',
        path: '/api/supercerebro/pendencies',
        runsService
      });

      expect(res.status).toBe(200);
      const body = res.body as any;
      expect(body.source).toBe('supercerebro_canonical');
      expect(body.operators).toBeDefined();
    });

    it('3. Atualiza pendências dinamicamente quando proposta é submetida e aprovada', async () => {
      // 1. Carolina despacha proposta para Marcos
      await handleApiRequest({
        method: 'POST',
        path: '/api/governance/commit',
        body: {
          action: 'DELEGATE_PROPOSAL',
          targetPerson: 'Marcos Silva',
          proposalTitle: 'Proposta de Remanejamento SPOT'
        },
        runsService
      });

      let res = await handleApiRequest({
        method: 'GET',
        path: '/api/supercerebro/operators',
        runsService
      });
      let body = res.body as any;
      let marcos = body.operators.find((op: any) => op.id === 'p_marcos');
      let aline = body.operators.find((op: any) => op.id === 'p_aline');
      expect(marcos.pendencies[0].status).toBe('Pendente');
      expect(marcos.pendencies[0].btnText).toBe('Aprovar Proposta →');
      expect(aline.pendencies[0].status).toBe('Aguardando Aprovação');

      // 2. Marcos aprova e commita no SQLite
      await handleApiRequest({
        method: 'POST',
        path: '/api/governance/commit',
        body: {
          action: 'APPROVE_PROPOSAL',
          targetPerson: 'Carolina Mendes'
        },
        runsService
      });

      res = await handleApiRequest({
        method: 'GET',
        path: '/api/supercerebro/operators',
        runsService
      });
      body = res.body as any;
      marcos = body.operators.find((op: any) => op.id === 'p_marcos');
      aline = body.operators.find((op: any) => op.id === 'p_aline');
      const carolina = body.operators.find((op: any) => op.id === 'p_carolina');

      expect(marcos.pendencies[0].status).toBe('Concluído');
      expect(marcos.pendencies[0].btnText).toBe('Ver Aprovação →');
      expect(aline.pendencies[0].status).toBe('Concluído');
      expect(aline.pendencies[0].btnText).toBe('Ver Auditoria →');
      expect(carolina.pendencies[0].status).toBe('Concluído');
      expect(carolina.pendencies[0].btnText).toBe('Ver Histórico →');
    });

    it('4. GET /api/supercerebro/graph retorna os nós e conexões do Grafo do Supercérebro', async () => {
      const res = await handleApiRequest({
        method: 'GET',
        path: '/api/supercerebro/graph',
        query: { clientId: 'cli_housewhey' },
        runsService
      });

      expect(res.status).toBe(200);
      const body = res.body as any;
      expect(body.clientId).toBe('cli_housewhey');
      expect(Array.isArray(body.nodes)).toBe(true);
      expect(Array.isArray(body.edges)).toBe(true);
      expect(Array.isArray(body.events)).toBe(true);
      expect(body.nodes.length).toBeGreaterThan(0);
      expect(body.edges.length).toBeGreaterThan(0);

      const clientNode = body.nodes.find((n: any) => n.id === 'client_housewhey_spot' || n.id === 'cli_housewhey' || n.type === 'organization' || n.type === 'hub');
      expect(clientNode).toBeDefined();
    });
  });
});
