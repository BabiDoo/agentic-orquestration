import { CONTRACTS_VERSION, DatasetManifest } from '@adzhub/contracts';
import { getCurrentDatasetManifest, getSupercerebroOperatorProfiles, SupercerebroTraversalEngine } from '@adzhub/data';
import { getNoStoreHeaders, redactSecretsRecursively } from '@adzhub/runtime';
import { defaultRunsService, RunEvent, RunsService } from './runs-service.js';
import { renderHtmlShell, ADZHUB_LOGO_SVG } from './ui-shell.js';
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
  path?: string;
  url?: string;
  query?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
  runsService?: RunsService;
}

export interface DocumentItem {
  id: string;
  type: 'briefing' | 'pauta' | 'relatorio' | 'proposta' | 'plano';
  typeName: string;
  badgeBg?: string;
  badgeBorder?: string;
  badgeColor?: string;
  title: string;
  date: string;
  author: string;
  status: string;
  summary: string;
  content: string;
  sourceRunId?: string;
  createdAt?: string;
}

export interface TimelineEventItem {
  id: string;
  category: 'governance' | 'documents' | 'audit' | 'system';
  actor: {
    name: string;
    role: string;
    avatarBg?: string;
    avatarColor?: string;
    avatarInitials: string;
  };
  actionTitle: string;
  badgeText: string;
  badgeBg?: string;
  badgeBorder?: string;
  badgeColor?: string;
  summary: string;
  target?: string;
  timestamp: string;
  provenance: string;
  createdAt?: string;
}

export const INITIAL_DOCUMENTS_STORE: DocumentItem[] = [
  {
    id: 'doc-briefing-q3',
    type: 'briefing',
    typeName: 'Briefing',
    badgeBg: 'var(--tag-info-bg)',
    badgeBorder: 'var(--tag-info-border)',
    badgeColor: 'var(--tag-info-ink)',
    title: 'Briefing de Campanha: Lançamento Whey Isolar HouseWhey Q3',
    date: '27/08/2026 09:30',
    author: 'Aline Santos & Agente AdzHub',
    status: 'Aprovado por: Marcos Silva',
    summary: 'Briefing estratégico de mídia para expansão da linha Whey Isolate no público Fitness Premium. Definição de público, budget e metas de CPA.',
    content: [
      '# Briefing de Campanha: Lançamento Whey Isolar HouseWhey Q3',
      '',
      '**Cliente:** HouseWhey (SPOT Mídia & Governança)',
      '**Data de Criação:** 27/08/2026 09:30',
      '**Responsável Operacional:** Aline Santos & Agente AdzHub',
      '**Status:** Aprovado por: Marcos Silva (Head de Marketing)',
      '',
      '---',
      '',
      '### 1. Visão Geral & Objetivos',
      '- **Objetivo Primário:** Aquisição de novos clientes e escala de vendas diretas e-commerce.',
      '- **Linha de Produto:** Whey Protein Isolado (Sabores Baunilha, Chocolate Belga e Morango).',
      '- **Meta de CPA:** R$ 35,00 por compra.',
      '- **Orçamento Diário de Mídia:** R$ 1.500,00/dia.',
      '',
      '### 2. Público-Alvo & Persona',
      '- **Faixa Etária:** 25 a 45 anos (Homens e Mulheres).',
      '- **Interesses:** Musculação, Crossfit, Nutrição Esportiva, Vida Saudável.',
      '- **Comportamento:** Compradores frequentes e-commerce via smartphone (iOS/Android).',
      '',
      '### 3. Diretrizes de Mensagem & Copys',
      '- **Hook Principal:** "O sabor e a pureza que seu treino de alta performance exige."',
      '- **Pilares de Comunicação:** Zero lactose, 27g de proteína por dose, adoçado naturalmente com estévia.',
      '- **Chamada para Ação (CTA):** Garanta o seu com Frete Grátis acima de R$ 199.',
      '',
      '### 4. Canais & Formatos',
      '- **Meta Ads:** Feed Reels, Instagram Stories (Vídeos UGC 9:16)',
      '- **TikTok Ads:** In-Feed Native Video (Foco em entretenimento educativo)'
    ].join('\n'),
    createdAt: '2026-08-27T09:30:00Z'
  },
  {
    id: 'doc-pauta-ugc-01',
    type: 'pauta',
    typeName: 'Pauta & UGC',
    badgeBg: 'var(--tag-neutral-bg)',
    badgeBorder: 'var(--tag-neutral-border)',
    badgeColor: 'var(--tag-neutral-ink)',
    title: 'Pauta UGC Criativos TikTok/Reels: 5 Variações de Hook Alta Conversão',
    date: '27/08/2026 10:15',
    author: 'Luiza Valente (Atendimento & Vendas)',
    status: 'Em Produção',
    summary: 'Roteiros práticos para gravação de criativos UGC. Contém 5 hooks de atração, roteiro de prova social e estrutura de encerramento com oferta.',
    content: [
      '# Pauta de Conteúdo UGC & Roteiros de Vídeo',
      '',
      '**Formato:** Reels / TikTok (9:16 - 15 a 30 segundos)',
      '**Produto em Foco:** Whey Isolar Baunilha & Ômega 3 IFOS',
      '**Criador:** Criadores UGC & Micro-influenciadores Fitness',
      '',
      '---',
      '',
      '### Roteiro 1: "O erro do Whey que empelota"',
      '- **00-03s (Visual + Hook):** Close na shakeira misturando instantaneamente sem deixar grumos. "Se você ainda sofre com whey que empelota no pós-treino..."',
      '- **03-10s (Desenvolvimento):** Demonstração da solubilidade pura e teste de sabor com água gelada.',
      '- **10-15s (CTA):** "Clique no link abaixo e use o cupom PUREZA10 para frete grátis."'
    ].join('\n'),
    createdAt: '2026-08-27T10:15:00Z'
  },
  {
    id: 'doc-relatorio-semanal-01',
    type: 'relatorio',
    typeName: 'Relatório',
    badgeBg: 'var(--tag-success-bg)',
    badgeBorder: 'var(--tag-success-border)',
    badgeColor: 'var(--tag-success-ink)',
    title: 'Relatório Executivo Semanal: Desempenho Meta Ads vs CRM Reconciliado',
    date: '27/08/2026 11:00',
    author: 'Aline Rocha (Tráfego Pago SPOT)',
    status: 'Publicado',
    summary: 'Consolidação de métricas semanais. Cruzamento de dados de investimento de tráfego pago com vendas aprovadas no HubSpot e WhatsApp.',
    content: [
      '# Relatório Executivo Semanal de Aquisição & CRM',
      '',
      '**Período:** 20/08/2026 a 27/08/2026',
      '**Conta:** HouseWhey (SPOT Mídia)',
      '',
      '---',
      '',
      '### Métricas Consolidadas da Conta',
      '- **Investimento Total:** R$ 10.500,00',
      '- **Retorno Geral (ROAS):** 3.82x',
      '- **CPA Médio da Conta:** R$ 38,40 (Meta: R$ 35,00)',
      '',
      '### Diagnóstico por Conjunto de Anúncios',
      '1. **AdSet_Whey_Baunilha_01:**',
      '   - Investimento: R$ 4.200,00 | Vendas: 132 | CPA: R$ 31,80 (Aprovado)',
      '2. **AdSet_Whey_Sabores_04 (ad_04):**',
      '   - Investimento: R$ 2.835,00 | Vendas: 30 | CPA: R$ 94,50 (Alerta Crítico)',
      '',
      '### Recomendação',
      '- Recomenda-se a **pausa imediata do criativo ad_04** e reatribuição da verba excedente (R$ 450,00/dia) para os anúncios campeões.'
    ].join('\n'),
    createdAt: '2026-08-27T11:00:00Z'
  },
  {
    id: 'doc-proposta-jit-01',
    type: 'proposta',
    typeName: 'Proposta',
    badgeBg: 'var(--tag-warning-bg)',
    badgeBorder: 'var(--tag-warning-border)',
    badgeColor: 'var(--tag-warning-ink)',
    title: 'Proposta: Pausa do Anúncio ad_04 e Realocação para Criativo Campeão',
    date: '27/08/2026 11:45',
    author: 'Carolina Mendes (Mídia & Governança)',
    status: 'Aguardando Aprovação: Marcos Silva',
    summary: 'Proposta formal de alteração operacional para controle de desperdício em anúncios de baixo rendimento.',
    content: [
      '# Proposta Operacional de Mídia',
      '',
      '**ID da Proposta:** PROP-2026-0827-04',
      '**Solicitante:** Carolina Mendes',
      '**Aprovação Esperada:** Marcos Silva (Head de Marketing)',
      '',
      '---',
      '',
      '### Ação Solicitada',
      '1. Pausar status do anúncio ID asset_ad_04 na API Meta Ads.',
      '2. Migrar orçamento diário de R$ 450,00 para ad_whey_baunilha_01.',
      '',
      '### Justificativa Técnica',
      'O anúncio asset_ad_04 acumulou CPA de R$ 94,50 nas últimas 48h, ultrapassando a margem de tolerância estabelecida para a conta.'
    ].join('\n'),
    createdAt: '2026-08-27T11:45:00Z'
  },
  {
    id: 'doc-plano-escala-01',
    type: 'plano',
    typeName: 'Plano de Ação',
    badgeBg: 'var(--tag-neutral-bg)',
    badgeBorder: 'var(--tag-neutral-border)',
    badgeColor: 'var(--tag-neutral-ink)',
    title: 'Plano de Escala de Mídia: Distribuição Regional H2',
    date: '26/08/2026 16:20',
    author: 'Agente AdzHub',
    status: 'Aprovado por: Marcos Silva',
    summary: 'Planejamento de expansão orçamentária por fases com travas de segurança de CPA e limites automáticos de gasto diário.',
    content: [
      '# Plano de Ação & Escala Governada H2',
      '',
      '**Escopo:** Expansão de Vendas Região Sul e Sudeste',
      '**Orquestrador:** Supercérebro IA',
      '',
      '---',
      '',
      '### Fase 1: Validação de Públicos (Semanas 1-2)',
      '- Testes A/B de criativos de alta velocidade.',
      '- Budget máximo por teste: R$ 200,00.',
      '',
      '### Fase 2: Escala Vertical (Semanas 3-4)',
      '- Aumento progressivo de +20% a cada 48h condicionada ao ROAS >= 3.5x.'
    ].join('\n'),
    createdAt: '2026-08-26T16:20:00Z'
  }
];

export const INITIAL_TIMELINE_STORE: TimelineEventItem[] = [
  {
    id: 'evt-tl-102',
    category: 'documents',
    actor: {
      name: 'Luiza Valente',
      role: 'Atendimento & Vendas',
      avatarBg: 'var(--tag-neutral-bg)',
      avatarColor: 'var(--tag-neutral-ink)',
      avatarInitials: 'LV'
    },
    actionTitle: 'Recebimento do Documento "Pauta UGC TikTok/Reels"',
    badgeText: 'Documento Recebido',
    badgeBg: 'var(--tag-neutral-bg)',
    badgeBorder: 'var(--tag-neutral-border)',
    badgeColor: 'var(--tag-neutral-ink)',
    summary: 'Luiza Valente recebeu e anexou a pauta de criativos UGC contendo 5 roteiros de alta conversão para gravação com influenciadores.',
    target: 'Documento: doc-pauta-ugc-01',
    timestamp: '27/08/2026 13:40',
    provenance: 'Central de Documentos',
    createdAt: '2026-08-27T13:40:00Z'
  },
  {
    id: 'evt-tl-103',
    category: 'governance',
    actor: {
      name: 'Marcos Silva',
      role: 'Head de Marketing (HouseWhey)',
      avatarBg: 'var(--tag-success-bg)',
      avatarColor: 'var(--tag-success-ink)',
      avatarInitials: 'MS'
    },
    actionTitle: 'Aprovação da Proposta de Remanejamento de Orçamento',
    badgeText: 'Proposta Aprovada',
    badgeBg: 'var(--tag-success-bg)',
    badgeBorder: 'var(--tag-success-border)',
    badgeColor: 'var(--tag-success-ink)',
    summary: 'Marcos Silva aprovou a proposta #prop-8921 permitindo o remanejamento de R$ 500,00/dia da campanha Namorados para alavancar o lançamento de Whey Isolar.',
    target: 'Proposta #prop-8921 · Aprovada por Marcos Silva',
    timestamp: '27/08/2026 12:20',
    provenance: 'Aprovação da Conta',
    createdAt: '2026-08-27T12:20:00Z'
  },
  {
    id: 'evt-tl-104',
    category: 'audit',
    actor: {
      name: 'Agente AdzHub',
      role: 'Auditoria & Integridade',
      avatarBg: 'var(--tag-info-bg)',
      avatarColor: 'var(--tag-info-ink)',
      avatarInitials: 'AH'
    },
    actionTitle: 'Auditoria de Regras da Conta',
    badgeText: 'Auditoria Salva',
    badgeBg: 'var(--tag-info-bg)',
    badgeBorder: 'var(--tag-info-border)',
    badgeColor: 'var(--tag-info-ink)',
    summary: 'Agente AdzHub executou a validação de regras da conta, confirmando a integridade das metas de CPA e investimento.',
    target: 'Verificação de Integridade',
    timestamp: '27/08/2026 11:05',
    provenance: 'Motor de Auditoria',
    createdAt: '2026-08-27T11:05:00Z'
  },
  {
    id: 'evt-tl-105',
    category: 'governance',
    actor: {
      name: 'Carolina Mendes',
      role: 'Gerente Operacional (SPOT)',
      avatarBg: 'var(--tag-warning-bg)',
      avatarColor: 'var(--tag-warning-ink)',
      avatarInitials: 'CM'
    },
    actionTitle: 'Submissão de Proposta de Controle de Tolerância',
    badgeText: 'Proposta Submetida',
    badgeBg: 'var(--tag-warning-bg)',
    badgeBorder: 'var(--tag-warning-border)',
    badgeColor: 'var(--tag-warning-ink)',
    summary: 'Carolina Mendes registrou nova regra de tolerância: anúncios com CPA > 2.5x a meta após 1.000 impressões devem gerar pendência imediata de pausa.',
    target: 'Regra de Tolerância #gov-rule-04',
    timestamp: '27/08/2026 09:45',
    provenance: 'Painel da Conta',
    createdAt: '2026-08-27T09:45:00Z'
  },
  {
    id: 'evt-tl-106',
    category: 'documents',
    actor: {
      name: 'Aline Rocha',
      role: 'Tráfego Pago (SPOT)',
      avatarBg: 'var(--tag-info-bg)',
      avatarColor: 'var(--tag-info-ink)',
      avatarInitials: 'AR'
    },
    actionTitle: 'Vínculo do Briefing Q3 na Conta',
    badgeText: 'Briefing Registrado',
    badgeBg: 'var(--tag-neutral-bg)',
    badgeBorder: 'var(--tag-neutral-border)',
    badgeColor: 'var(--tag-neutral-ink)',
    summary: 'Aline Rocha cadastrou o Briefing de Lançamento Whey Isolar HouseWhey Q3, conectando público, metas de CPA e canais de veiculação.',
    target: 'Documento: doc-briefing-q3',
    timestamp: '27/08/2026 09:30',
    provenance: 'Central de Documentos',
    createdAt: '2026-08-27T09:30:00Z'
  }
];

let dynamicDocumentsStore: DocumentItem[] = [...INITIAL_DOCUMENTS_STORE];
let dynamicTimelineStore: TimelineEventItem[] = [...INITIAL_TIMELINE_STORE];

export function getDocumentsStore(): DocumentItem[] {
  return dynamicDocumentsStore;
}

export function addDocumentToStore(doc: DocumentItem): DocumentItem {
  const existingIdx = dynamicDocumentsStore.findIndex(
    (d) => d.id === doc.id || (d.title === doc.title && d.author === doc.author)
  );
  if (existingIdx >= 0) {
    dynamicDocumentsStore[existingIdx] = { ...dynamicDocumentsStore[existingIdx], ...doc };
    return dynamicDocumentsStore[existingIdx];
  }
  dynamicDocumentsStore.unshift(doc);
  return doc;
}

export function getTimelineStore(): TimelineEventItem[] {
  return dynamicTimelineStore;
}

export function addTimelineEventToStore(evt: TimelineEventItem): TimelineEventItem {
  dynamicTimelineStore.unshift(evt);
  return evt;
}

/** Restaura os documentos e a timeline exibidos ao dataset canônico inicial. */
export function resetUiStores(): void {
  dynamicDocumentsStore = [...INITIAL_DOCUMENTS_STORE];
  dynamicTimelineStore = [...INITIAL_TIMELINE_STORE];
}

const BUILD_SHA = 'adzhub-demo-v1.0.0-sha';
const apiRateLimiter = new InMemoryRateLimiter({ windowMs: 60000, maxRequests: 120 });

/**
 * Roteador e despachante in-memory / HTTP das rotas canônicas da API da UI / Web Shell.
 */
export async function handleApiRequest(context: ApiRequestContext): Promise<ApiResponse> {
  const method = (context.method || 'GET').toUpperCase();
  const rawTarget = context.path || context.url || '/';
  const pathParts = rawTarget.split('?');
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

  // Logotipo Vetorial Oficial AdzHub (/adzhub-logo.svg)
  if (path === '/adzhub-logo.svg') {
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
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
        'X-Contracts-Version': CONTRACTS_VERSION
      },
      body: ADZHUB_LOGO_SVG as any
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

  // 1.1 POST /api/reset: retorna o ambiente demonstrativo ao dataset canônico inicial.
  // Exige confirmação explícita para evitar a perda acidental dos registros em memória.
  if (path === '/api/reset') {
    if (method !== 'POST') {
      return {
        status: 405,
        headers: defaultHeaders,
        body: { error: 'Method Not Allowed', allowed: ['POST'] }
      };
    }

    const body = (context.body ?? {}) as Record<string, unknown>;
    if (body.confirm !== 'RESET') {
      return {
        status: 400,
        headers: defaultHeaders,
        body: { error: 'Bad Request', message: 'Confirmação inválida para reset.' }
      };
    }

    resetUiStores();
    runsService.resetToInitialState();

    return {
      status: 200,
      headers: defaultHeaders,
      body: {
        success: true,
        message: 'Dataset restaurado ao estado inicial.',
        documents: getDocumentsStore().length,
        timelineEvents: getTimelineStore().length
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

    const isPaused = runsService.isPaused() || context.query?.isPaused === 'true';
    const isReactivated = runsService.isReactivated() || context.query?.isReactivated === 'true';
    const isApproved = runsService.isApproved() || context.query?.isApproved === 'true';
    const isSacReconciled = runsService.isSacReconciled() || context.query?.isSacReconciled === 'true';
    const isSacDiscountSubmitted = runsService.isSacDiscountSubmitted() || context.query?.isSacDiscountSubmitted === 'true';
    const isBudgetReallocated = runsService.isBudgetReallocated() || context.query?.isBudgetReallocated === 'true';
    const isBidStrategyUpdated = runsService.isBidStrategyUpdated() || context.query?.isBidStrategyUpdated === 'true';

    const isDelegatedQuery = context.query?.isDelegated === 'true';
    const activeDelegation = runsService.getDelegationState();
    const delegationState = (activeDelegation && activeDelegation.isDelegated) ? activeDelegation : (isDelegatedQuery ? {
      isDelegated: true,
      delegatedTo: (context.query?.delegatedTo as string) || 'Marcos Silva',
      proposalTitle: (context.query?.proposalTitle as string) || '',
      actionType: (context.query?.actionType as string) || ''
    } : null);

    let delegatedActions: Record<string, boolean> | undefined;
    if (context.query?.delegatedActions) {
      try {
        delegatedActions = JSON.parse(context.query.delegatedActions);
      } catch {}
    }
    if (!delegatedActions) delegatedActions = runsService.getDelegatedActions();

    let approvedActions: Record<string, boolean> | undefined;
    if (context.query?.approvedActions) {
      try {
        approvedActions = JSON.parse(context.query.approvedActions);
      } catch {}
    }
    if (!approvedActions) approvedActions = runsService.getApprovedActions();

    const operators = getSupercerebroOperatorProfiles({
      isPaused,
      isReactivated,
      isApproved,
      delegationState,
      isSacReconciled,
      isSacDiscountSubmitted,
      isBudgetReallocated,
      isBidStrategyUpdated,
      delegatedActions,
      approvedActions
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

  // 2.42 POST /api/governance/commit (Registra aprovação/commit de governança no backend)
  if (path === '/api/governance/commit') {
    if (method !== 'POST') {
      return {
        status: 405,
        headers: defaultHeaders,
        body: { error: 'Method Not Allowed', allowed: ['POST'] }
      };
    }

    const body = (context.body ?? {}) as Record<string, any>;
    const action = String(body.action || '').toUpperCase();
    const targetPerson = body.targetPerson;

    const titleText = String(body.proposalTitle || '').toLowerCase();
    const isApprovalAction =
      action.startsWith('APPROVE') ||
      action.includes('DEVOLUTIVA') ||
      action.includes('CONFIRM') ||
      titleText.startsWith('aprovar') ||
      titleText.includes('devolutiva');

    const isProposalSubmissionAction =
      !isApprovalAction && (
        action.includes('DELEGATE') ||
        action.includes('SUBMIT') ||
        action.includes('PROPOSAL') ||
        titleText.includes('submeter') ||
        titleText.includes('proposta') ||
        titleText.includes('enviar')
      );

    const isApprovalCommit = isApprovalAction;
    const actorName = body.actorName || 'Marcos Silva';
    const actorRole = body.actorRole || 'Diretor de Operações';
    const avatarBg = body.avatarBg || '#3b82f6';
    const avatarColor = body.avatarColor || '#ffffff';
    const avatarInitials = body.actorInitials || 'MS';
    const actionTitle = body.proposalTitle || action;
    const summary = body.details || `Execução de governança: ${action}`;
    const target = targetPerson || 'Equipe de Performance';
    const isSacCommit = action.includes('RECONCILE') || action.includes('DISCOUNT');
    const isPauseCommit = action.includes('PAUSE');
    
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (isApprovalAction) {
      const resolvedTarget = targetPerson || body.delegatedTo || body.recipient || (body.operatorId === 'p_carolina' ? 'Marcos Silva' : 'Aline Rocha');
      runsService.commitApproval({
        details: body.details || body.proposalTitle,
        targetPerson: resolvedTarget,
        actionType: action,
        proposalTitle: body.proposalTitle
      });
    } else if (isProposalSubmissionAction) {
      const delegatedTo = body.delegatedTo || targetPerson || 'Marcos Silva';
      const personId = body.personId || (String(delegatedTo).toLowerCase().includes('marcos') ? 'p_marcos' : 'p_aline');
      const resolvedAction = action.includes('PAUSE') || titleText.includes('pausa') ? 'EXTERNAL_WRITE_PAUSE' :
                             action.includes('BID') || titleText.includes('lance') ? 'UPDATE_BID_STRATEGY' :
                             action.includes('DISCOUNT') || titleText.includes('cupom') ? 'APPLY_SAC_DISCOUNT' :
                             action.includes('BUDGET') || titleText.includes('remanejamento') ? 'BUDGET_REALLOCATION' :
                             action;
      runsService.commitDelegation({
        delegatedTo,
        personId,
        proposalTitle: body.proposalTitle || 'Submissão de Proposta',
        proposalDetails: body.details || body.proposalDetails,
        actionType: resolvedAction
      });
    } else if (action.includes('RECONCILE') || action.includes('RECONCILIAR')) {
      runsService.commitSacReconciliation();
    } else if (action.includes('DISCOUNT') || action.includes('CUPOM') || action.includes('APPLY_SAC_DISCOUNT')) {
      runsService.commitSacDiscount();
    } else if (action.includes('BID_STRATEGY') || action.includes('UPDATE_BID_STRATEGY') || action.includes('LANCE') || action.includes('ESTRATÉGIA')) {
      runsService.commitBidStrategy();
    } else if (action.includes('BUDGET_REALLOCATION') || action.includes('REALLOCATION') || action.includes('REMANEJAMENTO')) {
      runsService.commitBudgetReallocation();
    } else if (action.includes('PAUSE') || action.includes('PAUSAR')) {
      runsService.commitPause({
        pausedAds: Array.isArray(body.pausedAds) ? body.pausedAds : undefined,
        details: body.details
      });
    } else if (action.includes('REACTIVATE') || action.includes('RELIGAR')) {
      runsService.commitReactivation();
    }

    const badgeText = body.badgeText || (isApprovalCommit ? 'Aprovado' : (isProposalSubmissionAction ? 'Enviado para Aprovação' : 'Ação Commitada'));
    const badgeBg = isApprovalCommit ? 'var(--tag-success-bg)' : (isProposalSubmissionAction ? 'var(--tag-warning-bg)' : avatarBg);
    const badgeBorder = isApprovalCommit ? 'var(--tag-success-border)' : (isProposalSubmissionAction ? 'var(--tag-warning-border)' : avatarBg.replace('-bg)', '-border)'));
    const badgeColor = isApprovalCommit ? 'var(--tag-success-ink)' : (isProposalSubmissionAction ? 'var(--tag-warning-ink)' : avatarColor);

    if (isApprovalCommit) {
      addDocumentToStore({
        id: `doc-appr-${Date.now().toString(36)}`,
        type: 'proposta',
        typeName: 'PROPOSTA',
        badgeBg: 'var(--tag-success-bg)',
        badgeBorder: 'var(--tag-success-border)',
        badgeColor: 'var(--tag-success-ink)',
        title: actionTitle.startsWith('Aprovação') ? actionTitle : `Aprovação: ${actionTitle}`,
        date: formattedDate,
        author: `${actorName} (${actorRole})`,
        status: 'Aprovado e Auditado no SQLite',
        summary: `${actorName} aprovou a proposta "${actionTitle}" e autorizou a execução pela equipe.`,
        content: [
          `# ${actionTitle.toUpperCase()}`,
          '',
          `**APROVADOR:** ${actorName} (${actorRole})`,
          `**DESTINATÁRIO:** ${target}`,
          `**DATA:** ${formattedDate}`,
          '**STATUS:** APROVADO E COMMITADO NO SUPERCÉREBRO (SQLite Auditado)',
          '',
          '---',
          '',
          '### 1. Decisão Executiva de Governança',
          summary,
          '',
          '### 2. Registro Auditado & Execução Tecnológica',
          `Decisão registrada com integridade imutável no SQLite (Supercérebro). Execução técnica liberada para ${target}.`
        ].join('\n')
      });
    }

    addTimelineEventToStore({
      id: `evt-tl-${Date.now().toString(36)}`,
      category: isSacCommit ? 'audit' : 'governance',
      actor: {
        name: actorName,
        role: actorRole,
        avatarBg,
        avatarColor,
        avatarInitials
      },
      actionTitle,
      badgeText,
      badgeBg,
      badgeBorder,
      badgeColor,
      summary,
      target,
      timestamp: formattedDate,
      provenance: isPauseCommit ? 'Meta Ads & SQLite' : 'Supercérebro',
      createdAt: now.toISOString()
    });

    const updatedOperators = getSupercerebroOperatorProfiles({
      isPaused: runsService.isPaused(),
      isReactivated: runsService.isReactivated(),
      isApproved: runsService.isApproved(),
      delegationState: runsService.getDelegationState(),
      isSacReconciled: runsService.isSacReconciled(),
      isSacDiscountSubmitted: runsService.isSacDiscountSubmitted(),
      isBidStrategyUpdated: runsService.isBidStrategyUpdated(),
      isBudgetReallocated: runsService.isBudgetReallocated(),
      delegatedActions: runsService.getDelegatedActions(),
      approvedActions: runsService.getApprovedActions()
    });

    return {
      status: 200,
      headers: defaultHeaders,
      body: {
        status: 'COMMITTED',
        success: true,
        message: 'Ação de governança registrada com sucesso no Supercérebro (SQLite Auditado).',
        isPaused: runsService.isPaused(),
        isApproved: runsService.isApproved(),
        isSacReconciled: runsService.isSacReconciled(),
        isSacDiscountSubmitted: runsService.isSacDiscountSubmitted(),
        isBidStrategyUpdated: runsService.isBidStrategyUpdated(),
        isBudgetReallocated: runsService.isBudgetReallocated(),
        isReactivated: runsService.isReactivated(),
        pauseState: runsService.getPauseState(),
        delegation: runsService.getDelegationState(),
        delegatedActions: runsService.getDelegatedActions(),
        approvedActions: runsService.getApprovedActions(),
        operators: updatedOperators
      }
    };
  }

  // 2.43 GET /api/governance/state (Retorna o estado atual de governança)
  if (path === '/api/governance/state') {
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
        isPaused: runsService.isPaused(),
        isApproved: runsService.isApproved(),
        isSacReconciled: runsService.isSacReconciled(),
        isSacDiscountSubmitted: runsService.isSacDiscountSubmitted(),
        isBidStrategyUpdated: runsService.isBidStrategyUpdated(),
        isBudgetReallocated: runsService.isBudgetReallocated(),
        isReactivated: runsService.isReactivated(),
        pauseState: runsService.getPauseState(),
        delegation: runsService.getDelegationState(),
        delegatedActions: runsService.getDelegatedActions(),
        approvedActions: runsService.getApprovedActions()
      }
    };
  }

  // 2.4.5 GET /api/supercerebro/graph (Retorna dados do Grafo do Supercérebro)
  if (path === '/api/supercerebro/graph') {
    if (method !== 'GET') {
      return {
        status: 405,
        headers: defaultHeaders,
        body: { error: 'Method Not Allowed', allowed: ['GET'] }
      };
    }

    try {
      const rawClient = context.query?.clientId;
      const clientId = (!rawClient || rawClient === 'client_housewhey_spot') ? 'cli_housewhey' : rawClient;
      const isPaused = runsService.isPaused() || context.query?.isPaused === 'true';
      const isReactivated = runsService.isReactivated() || context.query?.isReactivated === 'true';
      const isApproved = runsService.isApproved() || context.query?.isApproved === 'true';
      const isSacReconciled = runsService.isSacReconciled() || context.query?.isSacReconciled === 'true';
      const isSacDiscountSubmitted = runsService.isSacDiscountSubmitted() || context.query?.isSacDiscountSubmitted === 'true';

      const engine = new SupercerebroTraversalEngine();
      const graphResult = engine.traverse({
        clientId,
        maxHops: 3,
        limit: 100,
        isPaused,
        isReactivated,
        isApproved,
        isSacReconciled,
        isSacDiscountSubmitted,
        delegationState: runsService.getDelegationState()
      });

      return {
        status: 200,
        headers: defaultHeaders,
        body: graphResult
      };
    } catch (err: unknown) {
      return {
        status: 500,
        headers: defaultHeaders,
        body: {
          error: 'Internal Server Error',
          message: err instanceof Error ? err.message : 'Falha ao recuperar grafo do Supercérebro'
        }
      };
    }
  }

  // 2.4.6 GET & POST /api/documents (Central de Documentos Dinâmica)
  if (path === '/api/documents' || path.startsWith('/api/documents/')) {
    if (method === 'GET') {
      const typeFilter = context.query?.type;
      const searchFilter = (context.query?.q || context.query?.search || '').toLowerCase().trim();
      let docs = getDocumentsStore();
      if (typeFilter && typeFilter !== 'all') {
        docs = docs.filter(d => d.type === typeFilter);
      }
      if (searchFilter) {
        docs = docs.filter(d =>
          d.title.toLowerCase().includes(searchFilter) ||
          d.summary.toLowerCase().includes(searchFilter) ||
          d.content.toLowerCase().includes(searchFilter)
        );
      }
      return {
        status: 200,
        headers: defaultHeaders,
        body: {
          total: docs.length,
          documents: docs
        }
      };
    }

    if (method === 'POST') {
      const body = (context.body ?? {}) as Record<string, unknown>;
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      if (!title) {
        return {
          status: 400,
          headers: defaultHeaders,
          body: { error: 'Bad Request', message: 'O campo "title" é obrigatório.' }
        };
      }
      const contentText = (title + ' ' + String(body.summary || '') + ' ' + String(body.content || '')).toLowerCase();

      let detectedType: DocumentItem['type'] = 'relatorio';
      if (contentText.includes('briefing') || contentText.includes('reunião') || contentText.includes('reuniao')) {
        detectedType = 'briefing';
      } else if (contentText.includes('pauta') || contentText.includes('ugc') || contentText.includes('roteiro') || contentText.includes('criativo')) {
        detectedType = 'pauta';
      } else if (contentText.includes('proposta') || contentText.includes('submeter') || contentText.includes('solicitação') || contentText.includes('solicitacao') || contentText.includes('autorização') || contentText.includes('autorizacao') || contentText.includes('cupom') || contentText.includes('desconto') || contentText.includes('pausa')) {
        detectedType = 'proposta';
      } else if (contentText.includes('plano') || contentText.includes('planejamento') || textIncludes(contentText, 'escala') || textIncludes(contentText, 'estratégia')) {
        detectedType = 'plano';
      }

      function textIncludes(str: string, term: string) { return str.includes(term); }

      const type = (typeof body.type === 'string' && ['briefing', 'pauta', 'relatorio', 'proposta', 'plano'].includes(body.type))
        ? (body.type as DocumentItem['type'])
        : detectedType;

      const typeNameMap: Record<DocumentItem['type'], string> = {
        briefing: 'BRIEFING',
        pauta: 'PAUTA & UGC',
        relatorio: 'RELATÓRIO',
        proposta: 'PROPOSTA',
        plano: 'PLANO'
      };

      const badgeColorMap: Record<DocumentItem['type'], { bg: string; border: string; ink: string }> = {
        briefing: { bg: 'var(--tag-info-bg)', border: 'var(--tag-info-border)', ink: 'var(--tag-info-ink)' },
        pauta: { bg: 'rgba(147, 51, 234, 0.15)', border: 'rgba(147, 51, 234, 0.3)', ink: '#c084fc' },
        relatorio: { bg: 'var(--tag-success-bg)', border: 'var(--tag-success-border)', ink: 'var(--tag-success-ink)' },
        proposta: { bg: 'var(--tag-warning-bg)', border: 'var(--tag-warning-border)', ink: 'var(--tag-warning-ink)' },
        plano: { bg: 'rgba(14, 165, 233, 0.15)', border: 'rgba(14, 165, 233, 0.3)', ink: '#38bdf8' }
      };

      const now = new Date();
      const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const rawTypeName = typeof body.typeName === 'string' ? body.typeName : '';
      const finalTypeName = (!rawTypeName || rawTypeName === 'Documento de Governança' || rawTypeName === 'Relatório')
        ? typeNameMap[type]
        : rawTypeName;

      const newDoc: DocumentItem = {
        id: typeof body.id === 'string' ? body.id : `doc-${type}-${Date.now().toString(36)}`,
        type,
        typeName: finalTypeName,
        badgeBg: typeof body.badgeBg === 'string' && body.badgeBg !== 'var(--tag-success-bg)' ? body.badgeBg : badgeColorMap[type].bg,
        badgeBorder: typeof body.badgeBorder === 'string' && body.badgeBorder !== 'var(--tag-success-border)' ? body.badgeBorder : badgeColorMap[type].border,
        badgeColor: typeof body.badgeColor === 'string' && body.badgeColor !== 'var(--tag-success-ink)' ? body.badgeColor : badgeColorMap[type].ink,
        title,
        date: typeof body.date === 'string' ? body.date : formattedDate,
        author: typeof body.author === 'string' ? body.author : 'Agente AdzHub',
        status: typeof body.status === 'string' ? body.status : 'Registrado no Supercérebro',
        summary: typeof body.summary === 'string' ? body.summary : title,
        content: typeof body.content === 'string' ? body.content : `# ${title}\n\n${typeof body.summary === 'string' ? body.summary : ''}`,
        sourceRunId: typeof body.sourceRunId === 'string' ? body.sourceRunId : undefined,
        createdAt: now.toISOString()
      };

      addDocumentToStore(newDoc);

      // Adiciona evento na timeline
      addTimelineEventToStore({
        id: `evt-tl-${Date.now().toString(36)}`,
        category: 'documents',
        actor: {
          name: newDoc.author,
          role: 'Automação & Governança',
          avatarBg: badgeColorMap[type].bg,
          avatarColor: badgeColorMap[type].ink,
          avatarInitials: newDoc.author.slice(0, 2).toUpperCase()
        },
        actionTitle: `Novo Documento: "${newDoc.title}"`,
        badgeText: newDoc.typeName,
        badgeBg: badgeColorMap[type].bg,
        badgeBorder: badgeColorMap[type].border,
        badgeColor: badgeColorMap[type].ink,
        summary: newDoc.summary,
        target: `Documento: ${newDoc.id}`,
        timestamp: formattedDate,
        provenance: 'Central de Documentos',
        createdAt: now.toISOString()
      });

      return {
        status: 201,
        headers: defaultHeaders,
        body: {
          success: true,
          document: newDoc
        }
      };
    }

    return {
      status: 405,
      headers: defaultHeaders,
      body: { error: 'Method Not Allowed', allowed: ['GET', 'POST'] }
    };
  }

  // 2.4.7 GET & POST /api/timeline (Linha do Tempo de Governança Dinâmica)
  if (path === '/api/timeline') {
    if (method === 'GET') {
      const categoryFilter = context.query?.category;
      let events = getTimelineStore();
      if (categoryFilter && categoryFilter !== 'all') {
        events = events.filter(e => e.category === categoryFilter);
      }
      return {
        status: 200,
        headers: defaultHeaders,
        body: {
          total: events.length,
          events
        }
      };
    }

    if (method === 'POST') {
      const body = (context.body ?? {}) as Record<string, unknown>;
      const actionTitle = typeof body.actionTitle === 'string' ? body.actionTitle.trim() : '';
      if (!actionTitle) {
        return {
          status: 400,
          headers: defaultHeaders,
          body: { error: 'Bad Request', message: 'O campo "actionTitle" é obrigatório.' }
        };
      }

      const now = new Date();
      const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const actorObj = (typeof body.actor === 'object' && body.actor !== null)
        ? (body.actor as TimelineEventItem['actor'])
        : {
            name: 'Operador Responsável',
            role: 'Governança & Mídia',
            avatarBg: 'var(--tag-info-bg)',
            avatarColor: 'var(--tag-info-ink)',
            avatarInitials: 'OP'
          };

      const newEvent: TimelineEventItem = {
        id: typeof body.id === 'string' ? body.id : `evt-tl-${Date.now().toString(36)}`,
        category: (typeof body.category === 'string' && ['governance', 'documents', 'audit', 'system'].includes(body.category))
          ? (body.category as TimelineEventItem['category'])
          : 'governance',
        actor: actorObj,
        actionTitle,
        badgeText: typeof body.badgeText === 'string' ? body.badgeText : 'Ação Registrada',
        badgeBg: typeof body.badgeBg === 'string' ? body.badgeBg : 'var(--tag-info-bg)',
        badgeBorder: typeof body.badgeBorder === 'string' ? body.badgeBorder : 'var(--tag-info-border)',
        badgeColor: typeof body.badgeColor === 'string' ? body.badgeColor : 'var(--tag-info-ink)',
        summary: typeof body.summary === 'string' ? body.summary : actionTitle,
        target: typeof body.target === 'string' ? body.target : undefined,
        timestamp: typeof body.timestamp === 'string' ? body.timestamp : formattedDate,
        provenance: typeof body.provenance === 'string' ? body.provenance : 'Supercérebro',
        createdAt: now.toISOString()
      };

      addTimelineEventToStore(newEvent);

      return {
        status: 201,
        headers: defaultHeaders,
        body: {
          success: true,
          event: newEvent
        }
      };
    }

    return {
      status: 405,
      headers: defaultHeaders,
      body: { error: 'Method Not Allowed', allowed: ['GET', 'POST'] }
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
          isApproved: runsService.isApproved(),
          pauseState: runsService.getPauseState(),
          delegation: runsService.getDelegationState(),
          isSacReconciled: runsService.isSacReconciled(),
          isSacDiscountSubmitted: runsService.isSacDiscountSubmitted(),
          isBidStrategyUpdated: runsService.isBidStrategyUpdated(),
          isBudgetReallocated: runsService.isBudgetReallocated(),
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
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const actionUpper = String(action).toUpperCase();
    const titleLower = String(body.proposalTitle || '').toLowerCase();
    const detailsLower = String(body.details || '').toLowerCase();

    const isPauseCommit =
      actionUpper.includes('PAUSE') ||
      actionUpper.includes('PAUSAR') ||
      titleLower.includes('pausa') ||
      titleLower.includes('pausar') ||
      detailsLower.includes('pausa') ||
      detailsLower.includes('pausar');

    const isSacCommit =
      actionUpper.includes('RECONCILE') ||
      actionUpper.includes('SAC') ||
      titleLower.includes('reconcili') ||
      detailsLower.includes('reconcili');

    const bodyActor = typeof body.actor === 'object' && body.actor ? (body.actor as Record<string, unknown>) : {};
    const actorName =
      typeof body.operatorName === 'string' && body.operatorName.trim()
        ? body.operatorName.trim()
        : typeof bodyActor.name === 'string' && bodyActor.name.trim()
        ? bodyActor.name.trim()
        : 'Operador Responsável';

    const actorRole =
      typeof body.operatorRole === 'string' && body.operatorRole.trim()
        ? body.operatorRole.trim()
        : typeof bodyActor.role === 'string' && bodyActor.role.trim()
        ? bodyActor.role.trim()
        : 'Governança & Operações';

    const avatarInitials =
      typeof bodyActor.avatarInitials === 'string' && bodyActor.avatarInitials.trim()
        ? bodyActor.avatarInitials.trim()
        : actorName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'OP';

    const avatarBg = typeof bodyActor.avatarBg === 'string'
      ? bodyActor.avatarBg
      : 'var(--tag-info-bg)';

    const avatarColor = typeof bodyActor.avatarColor === 'string'
      ? bodyActor.avatarColor
      : 'var(--tag-info-ink)';

    const actionTitle =
      typeof body.proposalTitle === 'string' && body.proposalTitle.trim()
        ? body.proposalTitle.trim()
        : typeof body.actionTitle === 'string' && body.actionTitle.trim()
        ? body.actionTitle.trim()
        : typeof body.title === 'string' && body.title.trim()
        ? body.title.trim()
        : 'Confirmação de Governança Operacional';

    const summary =
      typeof body.details === 'string' && body.details.trim()
        ? body.details.trim()
        : typeof body.summary === 'string' && body.summary.trim()
        ? body.summary.trim()
        : typeof body.subtext === 'string' && body.subtext.trim()
        ? body.subtext.trim()
        : 'Operação confirmada pelo operador e commitada no SQLite.';

    const rawTargetPerson = typeof body.targetPerson === 'string' ? body.targetPerson.trim() : '';
    const isHousewheyActor = actorName.includes('Marcos') || actorName.includes('Luiza');

    let target = '';
    if (typeof body.target === 'string' && body.target.trim()) {
      target = body.target.trim();
    } else if (rawTargetPerson && rawTargetPerson !== 'Equipe SPOT') {
      target = rawTargetPerson.startsWith('Despacho') ? rawTargetPerson : `Despacho: ${rawTargetPerson}`;
    } else if (Array.isArray(body.pausedAds) && body.pausedAds.length > 0) {
      target = `Recurso: ${(body.pausedAds as string[]).join(', ')}`;
    } else if (isHousewheyActor) {
      target = 'Aline Rocha (SPOT)';
    } else {
      target = 'Marcos Silva (Housewhey)';
    }

    const badgeText =
      typeof body.badgeText === 'string' && body.badgeText.trim()
        ? body.badgeText.trim()
        : 'Ação Commitada';

    const isApprovalCommit =
      actionUpper.startsWith('APPROVE') ||
      actionUpper.includes('CONFIRM') ||
      actionUpper.includes('DEVOLUTIVA') ||
      titleLower.startsWith('aprovar') ||
      titleLower.includes('devolutiva');

    if (actionUpper.includes('REACTIVATE') || actionUpper.includes('REATIVAR')) {
      runsService.commitReactivation();
    } else if (isPauseCommit && !isApprovalCommit) {
      const pausedAds = Array.isArray(body.pausedAds)
        ? (body.pausedAds as string[])
        : [];
      runsService.commitPause({ pausedAds, details: summary });
    } else if (isApprovalCommit) {
      const targetPerson =
        (typeof body.targetPerson === 'string' && body.targetPerson.trim())
          ? body.targetPerson.trim()
          : (typeof body.person === 'string' && body.person.trim())
            ? body.person.trim()
            : 'Aline Rocha';
      runsService.commitApproval({ details: summary, targetPerson, actionType: actionUpper, proposalTitle: actionTitle });
    } else if (actionUpper.includes('BID_STRATEGY') || titleLower.includes('lance') || titleLower.includes('estratégia') || titleLower.includes('estrategia')) {
      runsService.commitBidStrategy();
      const delegatedTo = (typeof body.targetPerson === 'string' && body.targetPerson.trim()) ? body.targetPerson.trim() : 'Marcos Silva';
      runsService.commitDelegation({ delegatedTo, proposalTitle: actionTitle, proposalDetails: summary });
    } else if (actionUpper.includes('BUDGET_REALLOCATION') || titleLower.includes('remanejamento')) {
      runsService.commitBudgetReallocation();
      const delegatedTo = (typeof body.targetPerson === 'string' && body.targetPerson.trim()) ? body.targetPerson.trim() : 'Marcos Silva';
      runsService.commitDelegation({ delegatedTo, proposalTitle: actionTitle, proposalDetails: summary });
    } else if (actionUpper.includes('DISCOUNT') || actionUpper.includes('CUPOM') || actionUpper.includes('APPLY_SAC_DISCOUNT') || titleLower.includes('cupom')) {
      runsService.commitSacDiscount();
    } else if (isSacCommit) {
      runsService.commitSacReconciliation();
    } else if (
      actionUpper.includes('PROPOSAL') ||
      actionUpper.includes('DELEGAT') ||
      actionUpper.includes('DESPACHO') ||
      actionUpper.includes('SUBMETER') ||
      actionUpper.includes('ENVIAR')
    ) {
      const delegatedTo =
        (typeof body.targetPerson === 'string' && body.targetPerson.trim())
          ? body.targetPerson.trim()
          : (typeof body.person === 'string' && body.person.trim())
            ? body.person.trim()
            : 'Marcos Silva';
      const actionType = (typeof body.actionType === 'string' && body.actionType.trim() && body.actionType !== 'PROPOSAL_DELEGATION' && body.actionType !== 'PROPOSAL')
        ? body.actionType.trim()
        : (actionTitle.includes('Pausa') || actionTitle.includes('PAUSE')
          ? 'EXTERNAL_WRITE_PAUSE'
          : (actionTitle.includes('Cupom') || actionTitle.includes('SAC')
            ? 'APPLY_SAC_DISCOUNT'
            : (actionTitle.includes('Lance') || actionTitle.includes('Estratégia') || actionTitle.includes('Estrategia')
              ? 'UPDATE_BID_STRATEGY'
              : 'BUDGET_REALLOCATION')));
      runsService.commitDelegation({
        delegatedTo,
        proposalTitle: actionTitle,
        proposalDetails: summary,
        actionType
      });
    }

    addTimelineEventToStore({
      id: `evt-tl-${Date.now().toString(36)}`,
      category: isSacCommit ? 'audit' : 'governance',
      actor: {
        name: actorName,
        role: actorRole,
        avatarBg,
        avatarColor,
        avatarInitials
      },
      actionTitle,
      badgeText,
      badgeBg: avatarBg,
      badgeBorder: avatarBg.replace('-bg)', '-border)'),
      badgeColor: avatarColor,
      summary,
      target,
      timestamp: formattedDate,
      provenance: isPauseCommit ? 'Meta Ads & SQLite' : 'Supercérebro',
      createdAt: now.toISOString()
    });
    return {
      status: 200,
      headers: defaultHeaders,
      body: {
        status: 'COMMITTED',
        action,
        isReactivated: runsService.isReactivated(),
        isPaused: runsService.isPaused(),
        isApproved: runsService.isApproved(),
        isSacReconciled: runsService.isSacReconciled(),
        pauseState: runsService.getPauseState(),
        delegation: runsService.getDelegationState(),
        timestamp: new Date().toISOString()
      }
    };
  }

  // 2.1 POST /api/learn (Aprendizado contínuo do Supercérebro / Exemplares dinâmicos)
  if (path === '/api/learn') {
    if (method !== 'POST') {
      return {
        status: 405,
        headers: defaultHeaders,
        body: { error: 'Method Not Allowed', allowed: ['POST'] }
      };
    }
    const body = (context.body ?? {}) as Record<string, unknown>;
    const prompt = typeof body.prompt === 'string' ? body.prompt : '';
    const intentId = typeof body.intentId === 'string' ? body.intentId : typeof body.category === 'string' ? body.category : 'PROPOSAL_DELEGATION';

    if (!prompt.trim()) {
      return {
        status: 400,
        headers: defaultHeaders,
        body: { error: 'O campo "prompt" é obrigatório para registrar o aprendizado.' }
      };
    }

    const learned = runsService.learnExemplar(intentId, prompt);
    return {
      status: 200,
      headers: defaultHeaders,
      body: {
        status: 'LEARNED',
        intentId,
        prompt,
        newlyAdded: learned,
        timestamp: new Date().toISOString()
      }
    };
  }

  // 2.2 GET /api/intents & POST /api/intents (Catálogo dinâmico de intenções)
  if (path === '/api/intents') {
    if (method === 'GET') {
      return {
        status: 200,
        headers: defaultHeaders,
        body: {
          status: 'OK',
          intents: runsService.getDynamicIntents(),
          timestamp: new Date().toISOString()
        }
      };
    }
    if (method === 'POST') {
      const body = (context.body ?? {}) as any;
      if (!body.intentId || !body.category) {
        return {
          status: 400,
          headers: defaultHeaders,
          body: { error: 'Campos "intentId" e "category" são obrigatórios.' }
        };
      }
      runsService.registerDynamicIntent(body);
      return {
        status: 201,
        headers: defaultHeaders,
        body: {
          status: 'REGISTERED',
          intentId: body.intentId,
          timestamp: new Date().toISOString()
        }
      };
    }
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
  const isRawString =
    typeof result.body === 'string' &&
    (result.headers['Content-Type']?.includes('text/') ||
     result.headers['Content-Type']?.includes('image/svg+xml'));
  const responseBody: string | null = isNullBodyStatus
    ? null
    : isRawString
      ? (result.body as string)
      : JSON.stringify(result.body);

  return new Response(responseBody, {
    status: result.status,
    headers: result.headers
  });
}
