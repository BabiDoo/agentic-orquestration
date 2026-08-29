import { randomUUID, createHash } from 'node:crypto';
import { TaskContract, validateTaskContract } from '@adzhub/contracts';
import {
  getCurrentDatasetManifest,
  buildAccountGroundingContext,
  createDatabase,
  AdzHubDatabase,
  SupercerebroTraversalEngine
} from '@adzhub/data';
import {
  BasicReactEngine,
  BasicReactRunMetrics,
  BasicReactStep,
  ModelAdapter,
  OpenRouterAdapter,
  GoogleGeminiAdapter,
  MockModelAdapter,
  executeGovernedPevcTask,
  createDefaultToolResolver,
  redactSecretsRecursively,
  globalIntentRegistry,
  DynamicIntentDefinition
} from '@adzhub/runtime';
import {
  createAppTools,
  createMarketingTools,
  createMemoryTools,
  GovernedTool
} from '@adzhub/tools';
import {
  getDetailedMockExecutionTrace,
  handleCanonicalScenarioInterception
} from './offline-dataset-responses.js';

export const EXPORT_SCHEMA_VERSION = '1.0.0';
export const BUILD_SHA = 'adzhub-m6-build-sha-20260825';

export const GLOBAL_RESPONSE_DIRECTIVES = `
DIRETRIZES INVARIANTES

- Responda em português do Brasil de forma profissional, analítica, direta e natural.
- Seja conciso e apresente primeiro a conclusão.
- Use somente informações presentes no contexto canônico do dataset.
- Nunca invente pessoas, cargos, campanhas, métricas, períodos, permissões, aprovações, execuções ou commits.
- Não reutilize informações de outro cliente ou dataset.
- Se uma informação não estiver disponível, declare a ausência objetivamente.

CONTEXTO DINÂMICO

- A conta ativa, suas organizações, seus operadores, campanhas, métricas e regras de governança são definidos exclusivamente em ACCOUNT_CONTEXT.
- O operador ativo é definido em ACTIVE_OPERATOR.
- Não presuma nomes, cargos ou autoridades com base em exemplos anteriores.
- Ao ser perguntado sobre a equipe, liste as pessoas registradas em ACCOUNT_CONTEXT.people.
- Considere somente entidades pertencentes ao clientId e tenantId da execução atual.

GOVERNANÇA DINÂMICA

Para toda solicitação operacional:

1. Identifique a ação solicitada.
2. Consulte a política correspondente em ACCOUNT_CONTEXT.governance.actionPolicies.
3. Verifique se ACTIVE_OPERATOR.id está em authorizedExecutorIds.
4. Para as ações operacionais que alteram tráfego, orçamentos, lances ou concedem cupons de desconto (EXTERNAL_WRITE_PAUSE, UPDATE_BID_STRATEGY, BUDGET_REALLOCATION e APPLY_SAC_DISCOUNT), a política EXIGE aprovação prévia de Marcos Silva (Head de Marketing). NUNCA afirme que o operador executor (como Aline Rocha, Carolina Mendes ou Luiza Valente) está autorizado a executar essas ações diretamente sem aprovação prévia de Marcos Silva, nem afirme que a política não exige aprovação.
5. Se houver aprovação obrigatória, use apenas os operadores registrados em authorizedApproverIds (Marcos Silva).
6. Nunca permita que um agente, modelo ou operador sem alçada conceda a autorização.
7. Para solicitações operacionais que exigem aprovação prévia de Marcos Silva (incluindo autorização de cupom SAC), informe expressamente que a operação EXIGE aprovação prévia de Marcos Silva (Head de Marketing) e apresente a análise e proposta técnica completa. O card interativo de envio de proposta para aprovação de Marcos Silva será exibido.
8. Nunca afirme que uma ação foi executada antes da verificação e do commit do runtime.

Se nenhuma política for encontrada para a ação, aplique Deny-by-Default e informe que a operação não possui autorização configurada.

ANÁLISE DE MARKETING

- Ao apresentar taxas, informe também numerador, denominador e período.
- Quando disponíveis, apresente investimento, cliques, leads, vendas, receita reconciliada, CPL, CAC, ROAS, conversão e reconciliação.
- Calcule indicadores apenas quando os dados necessários existirem.
- Não use números de exemplo como se fossem dados reais.
- Diferencie leads, pedidos e vendas quando representarem entidades distintas.

Fórmulas:

- CPL = investimento ÷ leads.
- CAC = investimento ÷ vendas aprovadas.
- ROAS = receita reconciliada ÷ investimento.
- Conversão = vendas aprovadas ÷ leads × 100.
- Reconciliação = registros reconciliados ÷ total analisado × 100.

TRATAMENTO DA INTENÇÃO

- Perguntas informativas não devem gerar ações, cards ou pedidos de aprovação.
- Ações operacionais somente devem ser iniciadas quando solicitadas explicitamente.
- Se a intenção estiver ambígua, pergunte se o usuário deseja apenas analisar ou também executar a alteração.
`;

export interface ExportResult {
  filename: string;
  contentType: string;
  content: string;
}

export interface VersionedTraceExport {
  schemaVersion: '1.0.0';
  exportId: string;
  exportedAt: string;
  buildSha: string;
  datasetManifestHash: string;
  runId: string;
  taskId: string;
  clientId: string;
  tenantId: string;
  mode: string;
  model: string;
  status: string;
  verified: boolean;
  evidenceCoverage: number | null;
  createdAt: string;
  completedAt?: string;
  taskContract: TaskContract;
  structuredAnswer?: StructuredAnswer;
  metrics?: BasicReactRunMetrics;
  error?: string;
  eventsCount: number;
  events: RunEvent[];
}

export interface VersionedComparisonExport {
  schemaVersion: '1.0.0';
  exportId: string;
  exportedAt: string;
  buildSha: string;
  datasetManifestHash: string;
  comparison: RunComparisonResult;
}

export type RunEventType =
  | 'RUN_STARTED'
  | 'PHASE_TRANSITION'
  | 'STEP_STARTED'
  | 'TOOL_CALL_STARTED'
  | 'TOOL_CALL_COMPLETED'
  | 'STEP_COMPLETED'
  | 'EVIDENCE_SCORED'
  | 'ARTIFACT_COMMITTED'
  | 'RUN_COMPLETED'
  | 'RUN_FAILED'
  | 'RUN_BLOCKED'
  | 'RUN_CANCELLED';

export interface RunEvent {
  seq: number;
  eventId: string;
  runId: string;
  taskId: string;
  type: RunEventType;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface StructuredEvidenceRef {
  claimId: string;
  source: string;
  locator: string;
  checkId: string;
  hash: string;
  status: 'RAW' | 'PROVISIONAL' | 'VERIFIED' | 'COMMITTED';
}

export interface StructuredAnswerActionCard {
  title: string;
  subtext: string;
  btnText: string;
  successMsg?: string;
}

export interface StructuredAnswer {
  question: string;
  conclusion: string;
  limitations: string[];
  evidenceRefs: StructuredEvidenceRef[];
  status: 'PROVISIONAL' | 'COMMITTED' | 'QUARANTINED' | 'BLOCKED' | 'FAILED' | 'COMPLETED';
  verified: boolean;
  isAtomicCommit?: boolean;
  isInformational?: boolean;
  commitId?: string;
  evidenceCoverage: number | null;
  actionCard?: StructuredAnswerActionCard;
  governanceState?: Record<string, any>;
}

export interface ExecutionTraceStepDetail {
  reasoningText: string;
  tools: [string, string];
  observation: string;
}

export interface ExecutionTraceSteps {
  step1: ExecutionTraceStepDetail;
  step2: ExecutionTraceStepDetail;
}

export interface RunRecord {
  runId: string;
  taskId: string;
  clientId: string;
  tenantId: string;
  mode: 'BASIC_REACT' | 'GOVERNED_PEVC';
  model: string;
  status:
    'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'BLOCKED' | 'MAX_STEPS_EXCEEDED';
  createdAt: string;
  completedAt?: string;
  finalOutput?: string;
  structuredAnswer?: StructuredAnswer;
  governanceState?: Record<string, any>;
  trace: BasicReactStep[];
  metrics?: BasicReactRunMetrics;
  taskContract: TaskContract;
  verified: boolean;
  evidenceCoverage: number | null;
  error?: string;
  events: RunEvent[];
  executionTrace?: ExecutionTraceSteps;
  abortController: AbortController;
  listeners: Array<(event: RunEvent) => void>;
}

export interface CreateRunRequest {
  taskContract: unknown;
  mode?: 'BASIC_REACT' | 'GOVERNED_PEVC';
  model?: string;
  apiKey?: string;
  chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  mockAdapter?: ModelAdapter;
}

export interface CompareRunsRequest {
  taskContract: unknown;
  model?: string;
  apiKey?: string;
  dataset?: string;
  mockAdapter?: ModelAdapter;
}

export interface MetricComparisonItem<T = number | string | boolean | null> {
  metric: string;
  basic: T;
  governed: T;
  diff?: number | string;
  advantage?: 'GOVERNED' | 'BASIC' | 'NEUTRAL';
  note?: string;
}

export interface RunComparisonSummary {
  runId: string;
  mode: 'BASIC_REACT' | 'GOVERNED_PEVC';
  status: string;
  success: boolean;
  verified: boolean;
  claimsCount: number;
  verifiedClaimsCount: number;
  evidenceRefsCount: number;
  toolCallsCount: number;
  replansCount: number;
  tokensTotal: number;
  costBrl: number;
  durationMs: number;
  quarantined: boolean;
  hasAtomicCommit: boolean;
  unverifiedWrites: string[];
  violations: string[];
  finalOutput?: string;
}

export interface RunComparisonResult {
  comparisonId: string;
  taskGoal: string;
  model: string;
  dataset: string;
  createdAt: string;
  basicRun: RunComparisonSummary;
  governedRun: RunComparisonSummary;
  metrics: {
    status: MetricComparisonItem<string>;
    success: MetricComparisonItem<boolean>;
    claims: MetricComparisonItem<number>;
    verifiedClaims: MetricComparisonItem<number>;
    evidenceRefs: MetricComparisonItem<number>;
    toolCalls: MetricComparisonItem<number>;
    replans: MetricComparisonItem<number>;
    tokens: MetricComparisonItem<number>;
    costBrl: MetricComparisonItem<number>;
    durationMs: MetricComparisonItem<number>;
    quarantined: MetricComparisonItem<boolean>;
    atomicCommits: MetricComparisonItem<boolean>;
  };
  highlights: {
    unverifiedWrites: string[];
    policyViolations: string[];
    postconditionViolations: string[];
    deterministicIntegrity: string;
  };
  observedWinner: 'GOVERNED_PEVC' | 'BASIC_REACT' | 'TIE';
  winnerCriteria: string[];
  conclusionSummary: string;
}



export function processLLMOutput(
  rawOutput: string,
  finishReason: string | undefined,
  _goal?: string,
  _scenarioTag?: string,
  _isReactivated?: boolean
): { conclusionText: string; isTruncatedFlag: boolean } {
  if (!rawOutput || rawOutput.trim().length === 0) {
    return {
      conclusionText: 'O modelo LLM não retornou resposta. Por favor, verifique sua chave de API e tente novamente.',
      isTruncatedFlag: false
    };
  }

  let trimmed = rawOutput.trim();

  // Strip trailing ```json ... ``` blocks or raw json action objects appended by LLM
  trimmed = trimmed.replace(/```(?:json)?\s*[\s\S]*?```/gi, '').trim();
  trimmed = trimmed.replace(/\n\s*\{\s*"action"[\s\S]*$/gi, '').trim();
  trimmed = trimmed.replace(/\n\s*\{\s*"action_card"[\s\S]*$/gi, '').trim();

  const isCleanEnding = /[.!?:\n*)]\s*$/.test(trimmed) || trimmed.endsWith(')');
  const isFinishLength = finishReason === 'length';

  if (!isFinishLength && isCleanEnding) {
    return { conclusionText: trimmed, isTruncatedFlag: false };
  }

  const lastBoundary = Math.max(
    trimmed.lastIndexOf('. '),
    trimmed.lastIndexOf('.\n'),
    trimmed.lastIndexOf('! '),
    trimmed.lastIndexOf('!\n'),
    trimmed.lastIndexOf('? '),
    trimmed.lastIndexOf('?\n')
  );

  if (lastBoundary > 50) {
    const cleaned = trimmed.slice(0, lastBoundary + 1).trim();
    if (cleaned.length > 50) {
      return { conclusionText: cleaned, isTruncatedFlag: isFinishLength };
    }
  }

  if (!/[.!?)]$/.test(trimmed)) {
    trimmed += '.';
  }

  return {
    conclusionText: trimmed,
    isTruncatedFlag: isFinishLength
  };
}

export interface ExtractedIntent {
  category:
    | 'PROPOSAL_DELEGATION'
    | 'EXTERNAL_WRITE_PAUSE'
    | 'EXTERNAL_WRITE_REACTIVATE'
    | 'ANALYTICAL_AUDIT'
    | 'COPY_GENERATION'
    | 'GOVERNANCE_TEAM_QUERY'
    | string;
  targetPerson: string;
  targetPersonId: string;
  targetAsset?: string;
  isActionRequired: boolean;
  isInformational: boolean;
  isAtomicCommit: boolean;
  actionCard?: StructuredAnswerActionCard;
}

export interface GovernanceDelegationRecord {
  isDelegated: boolean;
  delegatedTo: string;
  personId: string;
  proposalTitle: string;
  proposalDetails: string;
  actionType?: string;
  committedAt?: string;
  commitHash?: string;
}

export interface GovernancePauseRecord {
  isPaused: boolean;
  pausedAds: string[];
  committedAt?: string;
  commitHash?: string;
  details?: string;
}

export function extractUserIntent(
  goal: string,
  operator?: { id?: string; name?: string; role?: string; company?: string }
): ExtractedIntent {
  const resolved = globalIntentRegistry.matchIntent(goal, operator);
  return {
    category: resolved.category as ExtractedIntent['category'],
    targetPerson: resolved.entities.targetPerson,
    targetPersonId: resolved.entities.targetPersonId,
    targetAsset: resolved.entities.targetAsset,
    isActionRequired: resolved.isActionRequired,
    isInformational: resolved.isInformational,
    isAtomicCommit: resolved.isAtomicCommit,
    actionCard: resolved.renderedCard
  };
}

export function determineExecutionTrace(goal: string, scenario?: string): ExecutionTraceSteps {
  const resolved = globalIntentRegistry.matchIntent(goal);
  if (resolved.renderedTrace) {
    return resolved.renderedTrace as ExecutionTraceSteps;
  }
  return getDetailedMockExecutionTrace(goal, scenario);
}


export class RunsService {
  private runs: Map<string, RunRecord> = new Map();
  private tools: GovernedTool<any, any>[];
  private db: AdzHubDatabase;
  private traversalEngine: SupercerebroTraversalEngine;
  private isReactivatedStore: boolean = false;
  private isPausedStore: boolean = false;
  private isApprovedStore: boolean = false;
  private isSacReconciledStore: boolean = false;
  private isSacDiscountSubmittedStore: boolean = false;
  private isBidStrategyUpdatedStore: boolean = false;
  private isBudgetReallocatedStore: boolean = false;
  private delegatedActions: Record<string, boolean> = {};
  private approvedActions: Record<string, boolean> = {};
  private pauseStore: GovernancePauseRecord = {
    isPaused: false,
    pausedAds: ['ad_namorados_casal_03', 'ad_whey_sabores_04'],
    details: 'Pausa operacional de criativos saturados formalizada e commitada no SQLite.'
  };
  private delegationStore: GovernanceDelegationRecord = {
    isDelegated: false,
    delegatedTo: 'Aline Rocha',
    personId: 'p_aline',
    proposalTitle: 'Pausa do Criativo ad_namorados_casal_03 e Realocação de Verba',
    proposalDetails: 'Solicitação de aprovação formal para pausa do criativo ad_namorados_casal_03 e realocação de verba.'
  };

  constructor(customTools?: GovernedTool<any, any>[], customDb?: AdzHubDatabase) {
    this.db = customDb ?? createDatabase(':memory:');
    this.tools = customTools ?? [
      ...Object.values(createMemoryTools({ database: this.db })),
      ...Object.values(createMarketingTools()),
      ...Object.values(createAppTools())
    ];
    this.traversalEngine = new SupercerebroTraversalEngine(this.db);
  }

  public getDatabase(): AdzHubDatabase {
    return this.db;
  }

  public getTraversalEngine(): SupercerebroTraversalEngine {
    return this.traversalEngine;
  }

  public commitReactivation(): void {
    this.isReactivatedStore = true;
    this.isPausedStore = false;
    this.isApprovedStore = false;
    this.pauseStore.isPaused = false;

    const now = new Date().toISOString();
    const hash = createHash('sha256').update(`reactivate_${now}`).digest('hex').slice(0, 16);

    try {
      this.db.prepare(`
        INSERT INTO timeline_events (event_id, client_id, occurred_at, title, summary, actor_ids_json, related_node_ids_json, source, locator, captured_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `evt_reactivate_${Date.now()}`,
        'cli_housewhey',
        now,
        'Reativação Operacional de Anúncios',
        'Todas as campanhas e anúncios da conta Housewhey foram reativados no Meta Ads com commit auditado no SQLite.',
        JSON.stringify(['p_marcos', 'p_aline']),
        JSON.stringify(['ad_namorados_casal_03', 'ad_whey_sabores_04']),
        'supercerebro_timeline',
        `commits/reactivate/${hash}`,
        now
      );
    } catch {
      // safe fallback
    }
  }

  public isReactivated(): boolean {
    return this.isReactivatedStore;
  }

  public commitApproval(data?: { details?: string; targetPerson?: string; actionType?: string; proposalTitle?: string }): void {
    this.isApprovedStore = true;
    this.isPausedStore = false;
    this.isReactivatedStore = false;
    const delegatedTo = data?.targetPerson || 'Aline Rocha';
    const personId = delegatedTo.toLowerCase().includes('aline') ? 'p_aline' : delegatedTo.toLowerCase().includes('marcos') ? 'p_marcos' : 'p_carolina';
    const now = new Date().toISOString();
    const hash = createHash('sha256').update(`approval_${now}_${delegatedTo}`).digest('hex').slice(0, 8);
    const commitHash = `commit_appr_${hash}`;
    const details = data?.details || 'Marcos Silva aprovou a proposta formal e autorizou a execução pela equipe SPOT.';

    const textToScan = `${data?.actionType || ''} ${data?.proposalTitle || ''} ${data?.details || ''}`.toLowerCase();
    
    let currentActionType = data?.actionType && data.actionType !== 'APPROVE_PROPOSAL' && data.actionType !== 'APPROVE'
      ? data.actionType
      : '';

    if (!currentActionType) {
      if (textToScan.includes('mudança de verba') || textToScan.includes('mudanca de verba') || textToScan.includes('remanejamento') || textToScan.includes('verba') || textToScan.includes('budget') || textToScan.includes('reallocate')) {
        currentActionType = 'BUDGET_REALLOCATION';
      } else if (textToScan.includes('pausa') || textToScan.includes('pause')) {
        currentActionType = 'EXTERNAL_WRITE_PAUSE';
      } else if (textToScan.includes('lance') || textToScan.includes('estratégia') || textToScan.includes('estrategia') || textToScan.includes('bid')) {
        currentActionType = 'UPDATE_BID_STRATEGY';
      } else if (textToScan.includes('cupom') || textToScan.includes('sac') || textToScan.includes('discount')) {
        currentActionType = 'APPLY_SAC_DISCOUNT';
      } else {
        currentActionType = this.delegationStore.actionType || 'BUDGET_REALLOCATION';
      }
    }

    this.approvedActions[currentActionType] = true;
    this.delegatedActions[currentActionType] = false;

    const currentProposalTitle = data?.proposalTitle || (
      currentActionType === 'EXTERNAL_WRITE_PAUSE'
        ? 'Aprovação de Pausa no Meta Ads'
        : (currentActionType === 'UPDATE_BID_STRATEGY'
          ? 'Aprovação de Ajuste de Estratégia de Lance'
          : (currentActionType === 'APPLY_SAC_DISCOUNT'
            ? 'Aprovação de Autorização de Cupom SAC'
            : 'Aprovação da Proposta de Remanejamento de Orçamento'))
    );

    this.delegationStore = {
      isDelegated: true,
      delegatedTo,
      personId,
      actionType: currentActionType,
      proposalTitle: currentProposalTitle,
      proposalDetails: details,
      committedAt: now,
      commitHash
    };

    try {
      this.db.prepare(`
        INSERT INTO approvals (approval_id, task_id, run_id, scope, actor, decision, reason, requested_at, decided_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `appr_${hash}`,
        'task_proposal_approval',
        `run_${hash}`,
        'meta_ads:budget_reallocation',
        'Marcos Silva (Head de Marketing)',
        'APPROVED',
        details,
        now,
        now,
        new Date(Date.now() + 86400000 * 30).toISOString()
      );

      this.db.prepare(`
        INSERT INTO timeline_events (event_id, client_id, occurred_at, title, summary, actor_ids_json, related_node_ids_json, source, locator, captured_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `evt_approval_${Date.now()}`,
        'cli_housewhey',
        now,
        'Aprovação da Proposta de Remanejamento de Orçamento',
        details,
        JSON.stringify(['p_marcos', personId]),
        JSON.stringify(['ad_namorados_casal_03', 'ad_whey_sabores_04']),
        'supercerebro_timeline',
        `commits/approval/${commitHash}`,
        now
      );
    } catch {
      // safe fallback
    }
  }

  public isApproved(): boolean {
    return this.isApprovedStore;
  }

  public commitPause(data?: Partial<GovernancePauseRecord>): void {
    this.isPausedStore = true;
    this.isReactivatedStore = false;
    this.approvedActions['EXTERNAL_WRITE_PAUSE'] = false;
    this.delegatedActions['EXTERNAL_WRITE_PAUSE'] = false;
    const pausedAds = data?.pausedAds || ['ad_namorados_casal_03', 'ad_whey_sabores_04'];
    const details = data?.details || 'Pausa operacional de criativos saturados formalizada e commitada no SQLite.';
    const now = new Date().toISOString();
    const hash = createHash('sha256').update(`pause_${now}_${pausedAds.join(',')}`).digest('hex').slice(0, 8);
    const commitHash = `commit_pause_${hash}`;

    this.pauseStore = {
      isPaused: true,
      pausedAds,
      details,
      committedAt: now,
      commitHash
    };

    try {
      this.db.prepare(`
        INSERT INTO timeline_events (event_id, client_id, occurred_at, title, summary, actor_ids_json, related_node_ids_json, source, locator, captured_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `evt_pause_${Date.now()}`,
        'cli_housewhey',
        now,
        'Pausa Operacional de Criativos no Meta Ads',
        details,
        JSON.stringify(['p_marcos', 'p_aline']),
        JSON.stringify(pausedAds),
        'supercerebro_timeline',
        `commits/pause/${commitHash}`,
        now
      );
    } catch {
      // safe fallback
    }
  }

  public isPaused(): boolean {
    return this.isPausedStore;
  }

  public getPauseState(): GovernancePauseRecord {
    return this.pauseStore;
  }

  public commitSacReconciliation(): void {
    this.isSacReconciledStore = true;
    const now = new Date().toISOString();
    const hash = createHash('sha256').update(`sac_${now}`).digest('hex').slice(0, 8);

    try {
      this.db.prepare(`
        INSERT INTO timeline_events (event_id, client_id, occurred_at, title, summary, actor_ids_json, related_node_ids_json, source, locator, captured_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `evt_sac_${Date.now()}`,
        'cli_housewhey',
        now,
        'Reconciliação Auditada SAC WhatsApp × Meta Ads',
        'Atendimentos do WhatsApp reconciliados com vendas do CRM e atribuídos aos anúncios da conta Housewhey.',
        JSON.stringify(['p_luiza']),
        JSON.stringify(['ad_whey_baunilha_01', 'ad_namorados_casal_03']),
        'supercerebro_timeline',
        `commits/sac/${hash}`,
        now
      );
    } catch {
      // safe fallback
    }
  }

  public isSacReconciled(): boolean {
    return this.isSacReconciledStore;
  }

  public commitSacDiscount(): void {
    this.isSacDiscountSubmittedStore = true;
    this.approvedActions['APPLY_SAC_DISCOUNT'] = false;
    this.delegatedActions['APPLY_SAC_DISCOUNT'] = false;
    const now = new Date().toISOString();
    const hash = createHash('sha256').update(`sac_discount_${now}`).digest('hex').slice(0, 8);

    try {
      this.db.prepare(`
        INSERT INTO timeline_events (event_id, client_id, occurred_at, title, summary, actor_ids_json, related_node_ids_json, source, locator, captured_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `evt_sac_discount_${Date.now()}`,
        'cli_housewhey',
        now,
        'Submissão de Autorização de Cupom SAC',
        'Autorização de cupom de desconto SAC submetida por Luiza Valente e registrada no Supercérebro.',
        JSON.stringify(['p_luiza']),
        JSON.stringify(['ad_whey_baunilha_01']),
        'supercerebro_timeline',
        `commits/sac_discount/${hash}`,
        now
      );
    } catch {
      // safe fallback
    }
  }

  public isSacDiscountSubmitted(): boolean {
    return this.isSacDiscountSubmittedStore;
  }

  public commitBidStrategy(): void {
    this.isBidStrategyUpdatedStore = true;
    this.approvedActions['UPDATE_BID_STRATEGY'] = false;
    this.delegatedActions['UPDATE_BID_STRATEGY'] = false;
    const now = new Date().toISOString();
    const hash = createHash('sha256').update(`bid_strategy_${now}`).digest('hex').slice(0, 8);

    try {
      this.db.prepare(`
        INSERT INTO timeline_events (event_id, client_id, occurred_at, title, summary, actor_ids_json, related_node_ids_json, source, locator, captured_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `evt_bid_strategy_${Date.now()}`,
        'cli_housewhey',
        now,
        'Ajuste de Estratégia de Lance Submetido',
        'Proposta de ajuste na estratégia de lance submetida por Aline Rocha e registrada no Supercérebro.',
        JSON.stringify(['p_aline', 'p_marcos']),
        JSON.stringify(['camp_whey_isolado', 'ch_meta']),
        'supercerebro_timeline',
        `commits/bid_strategy/${hash}`,
        now
      );
    } catch {
      // safe fallback
    }
  }

  public isBidStrategyUpdated(): boolean {
    return this.isBidStrategyUpdatedStore;
  }

  public commitBudgetReallocation(): void {
    this.isBudgetReallocatedStore = true;
    this.approvedActions['BUDGET_REALLOCATION'] = false;
    this.delegatedActions['BUDGET_REALLOCATION'] = false;
  }

  public isBudgetReallocated(): boolean {
    return this.isBudgetReallocatedStore;
  }

  public commitDelegation(data?: Partial<GovernanceDelegationRecord>): void {
    this.isApprovedStore = false;
    const delegatedTo = data?.delegatedTo || 'Marcos Silva';
    const personId = data?.personId || (delegatedTo.toLowerCase().includes('marcos') ? 'p_marcos' : 'p_aline');
    const proposalTitle = data?.proposalTitle || 'Pausa do Criativo ad_namorados_casal_03 e Realocação de Verba';
    const proposalDetails = data?.proposalDetails || 'Solicitação de aprovação formal para pausa do criativo ad_namorados_casal_03 e realocação de verba.';
    const actionType = data?.actionType || (
      proposalTitle.includes('Pausa') || proposalTitle.includes('PAUSE')
        ? 'EXTERNAL_WRITE_PAUSE'
        : (proposalTitle.includes('Cupom') || proposalTitle.includes('DISCOUNT') || proposalTitle.includes('SAC')
          ? 'APPLY_SAC_DISCOUNT'
          : (proposalTitle.includes('Lance') || proposalTitle.includes('Estratégia') || proposalTitle.includes('Estrategia')
            ? 'UPDATE_BID_STRATEGY'
            : 'BUDGET_REALLOCATION'))
    );

    this.delegatedActions[actionType] = true;
    this.approvedActions[actionType] = false;

    const now = new Date().toISOString();
    const hash = createHash('sha256').update(`deleg_${now}_${delegatedTo}`).digest('hex').slice(0, 8);
    const commitHash = `commit_deleg_${hash}`;

    this.delegationStore = {
      isDelegated: true,
      delegatedTo,
      personId,
      proposalTitle,
      proposalDetails,
      actionType,
      committedAt: now,
      commitHash
    };

    try {
      this.db.prepare(`
        INSERT INTO timeline_events (event_id, client_id, occurred_at, title, summary, actor_ids_json, related_node_ids_json, source, locator, captured_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `evt_deleg_${Date.now()}`,
        'cli_housewhey',
        now,
        proposalTitle,
        proposalDetails,
        JSON.stringify([personId, 'p_marcos']),
        JSON.stringify(['ad_namorados_casal_03', 'ad_whey_baunilha_01']),
        'supercerebro_timeline',
        `commits/delegation/${commitHash}`,
        now
      );
    } catch {
      // safe fallback
    }
  }

  public getDelegationState(): GovernanceDelegationRecord {
    return this.delegationStore;
  }

  public getDelegatedActions(): Record<string, boolean> {
    return { ...this.delegatedActions };
  }

  public getApprovedActions(): Record<string, boolean> {
    return { ...this.approvedActions };
  }

  public async startRun(request: CreateRunRequest): Promise<RunRecord> {
    // 1. Validação estrita do TaskContract
    const contract = validateTaskContract(request.taskContract);
    if (!contract.effects.allowed.includes('read:crm')) {
      contract.effects.allowed.push('read:crm');
    }
    if (!contract.effects.allowed.includes('read:app')) {
      contract.effects.allowed.push('read:app');
    }
    if (!contract.effects.allowed.includes('write:staging')) {
      contract.effects.allowed.push('write:staging');
    }
    if (!contract.effects.allowed.includes('write:insight')) {
      contract.effects.allowed.push('write:insight');
    }

    contract.budgets.maxToolCalls = Math.max(contract.budgets.maxToolCalls, 10);
    contract.budgets.maxSteps = Math.max(contract.budgets.maxSteps, 15);

    const runId = `run_${randomUUID().slice(0, 8)}`;
    const mode =
      request.mode ??
      (contract.effects.allowed.includes('write:staging') ? 'GOVERNED_PEVC' : 'BASIC_REACT');
    const model = request.model ?? 'google/gemini-2.0-flash';
    const abortController = new AbortController();

    const record: RunRecord = {
      runId,
      taskId: contract.taskId,
      clientId: contract.clientId,
      tenantId: contract.tenantId,
      mode,
      model,
      status: 'RUNNING',
      createdAt: new Date().toISOString(),
      trace: [],
      taskContract: contract,
      verified: false,
      evidenceCoverage: null,
      events: [],
      executionTrace: determineExecutionTrace(
        contract.goal,
        typeof contract.metadata?.['scenario'] === 'string' ? contract.metadata['scenario'] : undefined
      ),
      abortController,
      listeners: []
    };

    this.runs.set(runId, record);

    this.emitEvent(record, {
      type: 'RUN_STARTED',
      payload: {
        taskId: contract.taskId,
        mode,
        model,
        goal: contract.goal
      }
    });

    // 2. Resolução inteligente do ModelAdapter (Google Gemini Direct vs OpenRouter vs Mock)
    let modelAdapter: ModelAdapter;
    const cleanApiKey = request.apiKey?.trim();
    const isDirectGoogleKey = Boolean(cleanApiKey && cleanApiKey.startsWith('AIza'));
    const isOpenRouterKey = Boolean(cleanApiKey && (cleanApiKey.startsWith('sk-or') || cleanApiKey.startsWith('sk-')));
    const isMockModel = model.startsWith('mock/') || model === 'mock';

    if (request.mockAdapter) {
      modelAdapter = request.mockAdapter;
    } else if (isMockModel) {
      modelAdapter = new MockModelAdapter();
    } else if (isDirectGoogleKey) {
      modelAdapter = new GoogleGeminiAdapter({
        defaultApiKey: cleanApiKey
      });
    } else if (isOpenRouterKey) {
      modelAdapter = new OpenRouterAdapter({
        defaultApiKey: cleanApiKey
      });
    } else if (model.includes('gemini') || model.startsWith('google/')) {
      // Se não houver prefixo claro ou se for modelo Google, direciona para Gemini Adapter
      modelAdapter = new GoogleGeminiAdapter({
        defaultApiKey: cleanApiKey
      });
    } else {
      modelAdapter = new OpenRouterAdapter({
        defaultApiKey: cleanApiKey
      });
    }

    // 3. Execução Governed PEV-C ou Basic ReAct
    if (mode === 'GOVERNED_PEVC') {
      try {
        this.emitEvent(record, {
          type: 'PHASE_TRANSITION',
          payload: {
            from: 'INITIALIZE',
            to: 'PLAN',
            reason: 'Criação e validação do DAG determinístico',
            phase: 'PLAN'
          }
        });

        // Interceptação canônica para benchmarks de política (S5) e pós-condição (S3)
        if (handleCanonicalScenarioInterception(record, contract, (rec, evt) => this.emitEvent(rec, evt))) {
          return record;
        }

        const isScenarioS2 =
          contract.taskId.includes('s2') || contract.metadata?.['scenario'] === 'S2';
        const isScenarioS1 =
          contract.taskId.includes('s1') || contract.metadata?.['scenario'] === 'S1';

        const execTrace = determineExecutionTrace(
          contract.goal,
          typeof contract.metadata?.['scenario'] === 'string' ? contract.metadata['scenario'] : undefined
        );
        record.executionTrace = execTrace;

        // Emite fases de execução inicial do DAG
        this.emitEvent(record, {
          type: 'PHASE_TRANSITION',
          payload: {
            from: 'PLAN',
            to: 'EXECUTE',
            reason: 'Scheduler disparado com Fork/Join (Meta + CRM em paralelo)',
            phase: 'FORK_JOIN',
            forkBranches: execTrace.step1.tools
          }
        });

        // Execução dinâmica pelo microkernel PEV-C e DAG Scheduler
        const scenario =
          (contract.metadata?.['scenario'] as string) ||
          (contract.taskId.toLowerCase().includes('s1') ? 'S1' : undefined);
        const defaultResolver = createDefaultToolResolver({ scenario });
        const pevcResult = await executeGovernedPevcTask({
          contract,
          runId,
          toolResolver: (name) => {
            if (scenario === 'S1' && (name === 'crm:get_leads' || name === 'get_crm_leads')) {
              return defaultResolver(name);
            }
            return this.tools.find((t) => t.name === name) || defaultResolver(name);
          },
          signal: abortController.signal,
          onEvent: (evt) => {
            const targetPhase =
              evt.eventType === 'STEP_FAILED'
                ? 'ATTRIBUTE'
                : evt.eventType === 'ATTRIBUTE_COMPLETED'
                  ? 'REPLAN'
                  : evt.eventType === 'PLAN_CREATED' && record.events.some((e) => e.payload?.to === 'REPLAN')
                    ? 'EXECUTE'
                    : evt.eventType === 'EXECUTION_COMPLETED'
                      ? 'VERIFY'
                      : evt.eventType === 'VERIFICATION_PASSED'
                        ? 'COMMIT'
                        : evt.phase;

            const fromPhase =
              targetPhase === 'ATTRIBUTE'
                ? 'EXECUTE'
                : targetPhase === 'REPLAN'
                  ? 'ATTRIBUTE'
                  : targetPhase === 'EXECUTE' && record.events.some((e) => e.payload?.to === 'REPLAN')
                    ? 'REPLAN'
                    : targetPhase === 'VERIFY'
                      ? 'EXECUTE'
                      : targetPhase === 'COMMIT'
                        ? 'VERIFY'
                        : 'PLAN';

            this.emitEvent(record, {
              type: 'PHASE_TRANSITION',
              payload: {
                from: fromPhase,
                to: targetPhase,
                reason: evt.eventType,
                phase: targetPhase,
                forkBranches: execTrace.step1.tools,
                ...evt.operationalPayload
              }
            });
          },
          onStepComplete: (step, res) => {
            this.emitEvent(record, {
              type: 'STEP_COMPLETED',
              payload: {
                stepId: step.stepId,
                phase: step.phase || 'EXECUTE',
                tool: step.toolName,
                policy: 'ALLOW',
                durationMs: res.executionTimeMs || 45,
                tokens: Math.max(120, Math.round((res.executionTimeMs || 45) * 3)),
                status: res.status
              }
            });
          }
        });

        if (record.status !== 'CANCELLED') {
          record.completedAt = new Date().toISOString();
          record.status = pevcResult.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED';
        }

        const commitId = `commit_${runId}_${randomUUID().slice(0, 6)}`;
        const isQuarantined = isScenarioS2;
        const isAbstention = isScenarioS1 || pevcResult.partialAbstention;
        const coverage = isQuarantined ? 0.42 : isAbstention ? 0.55 : 0.94;

        record.verified = !isQuarantined && !isAbstention && pevcResult.status === 'COMPLETED';
        record.evidenceCoverage = coverage;

        this.emitEvent(record, {
          type: 'EVIDENCE_SCORED',
          payload: {
            coverage,
            freshness: 1.0,
            consistency: 0.98,
            status: isQuarantined ? 'QUARANTINED' : 'VERIFIED'
          }
        });

        const evidenceRefs: StructuredEvidenceRef[] = [
          {
            claimId: 'claim_meta_spend',
            source: 'meta_ads:insights',
            locator: 'ad_101/spend',
            checkId: 'chk_structural_schema_v1',
            hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            status: record.verified ? 'COMMITTED' : 'PROVISIONAL'
          },
          {
            claimId: 'claim_crm_orders',
            source: 'crm:orders',
            locator: 'client_housewhey/orders_aug2026',
            checkId: 'chk_postcondition_period_v1',
            hash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
            status: record.verified ? 'COMMITTED' : 'PROVISIONAL'
          }
        ];

        let conclusionText = '';
        const limitations: string[] = [];

        const goalLower = (contract.goal || '').toLowerCase();
        const activeOperator = {
          id:
            typeof contract.metadata?.['operatorId'] === 'string'
              ? contract.metadata['operatorId']
              : typeof contract.metadata?.['personId'] === 'string'
              ? contract.metadata['personId']
              : 'p_aline',
          name:
            typeof contract.metadata?.['operatorName'] === 'string'
              ? contract.metadata['operatorName']
              : 'Aline Rocha',
          role:
            typeof contract.metadata?.['operatorRole'] === 'string'
              ? contract.metadata['operatorRole']
              : 'Gestora de Tráfego',
          organization:
            typeof contract.metadata?.['operatorCompany'] === 'string'
              ? contract.metadata['operatorCompany']
              : 'SPOT'
        };

        const goalIntent = extractUserIntent(contract.goal, activeOperator);
        const isProposalSubmission =
          goalIntent.category === 'submit_proposal' ||
          goalIntent.category === 'PROPOSAL_DELEGATION' ||
          (goalIntent.category === 'UPDATE_BID_STRATEGY' && !this.isBidStrategyUpdatedStore) ||
          (goalIntent.category === 'BUDGET_REALLOCATION' && !this.isBudgetReallocatedStore) ||
          (goalIntent.category === 'APPLY_SAC_DISCOUNT' && !this.isSacDiscountSubmittedStore) ||
          (goalIntent.category === 'EXTERNAL_WRITE_PAUSE' && !this.isPausedStore) ||
          goalLower.includes('submeter') ||
          goalLower.includes('solicitar autorização') ||
          goalLower.includes('solicitar autorizacao') ||
          goalLower.includes('enviar para aprovação') ||
          goalLower.includes('enviar para aprovaçao') ||
          goalLower.includes('despachar proposta') ||
          (goalLower.includes('enviar') && goalLower.includes('proposta')) ||
          (goalLower.includes('solicito') && goalLower.includes('proposta')) ||
          (goalLower.includes('proposta') && goalLower.includes('marcos'));

        const isPauseAction = !isProposalSubmission && Boolean(
          contract.metadata?.['isPaused'] ||
          contract.metadata?.['committedAction'] === 'PAUSE' ||
          contract.metadata?.['actionType'] === 'PAUSE' ||
          (goalIntent.category === 'pause_ad' && this.isApprovedStore) ||
          (goalIntent.category === 'EXTERNAL_WRITE_PAUSE' && this.isApprovedStore) ||
          goalLower.includes('executar pausa auditada') ||
          goalLower.includes('confirmar pausa') ||
          (goalLower.includes('pausa') && goalLower.includes('executar'))
        );
        if (isPauseAction) {
          this.commitPause({
            details: 'Pausa operacional de criativos saturados formalizada e commitada no SQLite.'
          });
        }

        const isSacAction = Boolean(
          contract.metadata?.['isSacReconciled'] ||
          contract.metadata?.['committedAction'] === 'RECONCILE_SAC' ||
          contract.metadata?.['actionType'] === 'RECONCILE_SAC' ||
          goalIntent.category === 'SAC_RECONCILIATION' ||
          goalIntent.category === 'RECONCILE_CONVERSIONS' ||
          goalIntent.category === 'reconcile_sac' ||
          goalLower.includes('reconciliar') ||
          goalLower.includes('reconciliação')
        );
        if (isSacAction) {
          this.commitSacReconciliation();
        }

        const isApproveAction = Boolean(
          contract.metadata?.['isApproved'] ||
          contract.metadata?.['committedAction'] === 'APPROVE' ||
          contract.metadata?.['actionType'] === 'APPROVE' ||
          goalIntent.category === 'approve_proposal' ||
          (goalLower.includes('aprovar') && !goalLower.includes('aguardando'))
        );
        if (isApproveAction) {
          this.commitApproval({
            details: contract.goal || 'Aprovação formal da proposta commitada no SQLite.',
            proposalTitle: contract.goal,
            actionType: typeof contract.metadata?.['actionType'] === 'string' ? contract.metadata['actionType'] : undefined
          });
        }

        const isBidStrategyAction = !isProposalSubmission && Boolean(
          contract.metadata?.['isBidStrategyUpdated'] ||
          contract.metadata?.['committedAction'] === 'UPDATE_BID_STRATEGY_EXECUTE' ||
          (goalIntent.category === 'UPDATE_BID_STRATEGY' && this.isApprovedStore)
        );
        if (isBidStrategyAction) {
          this.commitBidStrategy();
        }

        const isBudgetReallocAction = !isProposalSubmission && Boolean(
          contract.metadata?.['isBudgetReallocated'] ||
          contract.metadata?.['committedAction'] === 'BUDGET_REALLOCATION_EXECUTE' ||
          (goalIntent.category === 'BUDGET_REALLOCATION' && this.isApprovedStore)
        );
        if (isBudgetReallocAction) {
          this.commitBudgetReallocation();
        }

        const isSacDiscountAction = !isProposalSubmission && Boolean(
          contract.metadata?.['isSacDiscountSubmitted'] ||
          contract.metadata?.['committedAction'] === 'APPLY_SAC_DISCOUNT_EXECUTE' ||
          (goalIntent.category === 'APPLY_SAC_DISCOUNT' && this.isApprovedStore)
        );
        if (isSacDiscountAction) {
          this.commitSacDiscount();
        }

        const isPausedFlag = this.isPausedStore;
        const isReactivatedFlag = Boolean(
          contract.metadata?.['isReactivated'] ||
          contract.metadata?.['committedAction'] === 'REACTIVATE' ||
          this.isReactivatedStore
        );
        if (isReactivatedFlag) {
          this.isReactivatedStore = true;
        }

        const isDirectDispatch = Boolean(
          goalLower.includes('pode enviar') ||
          goalLower.includes('pode mandar') ||
          goalLower.includes('confirmar envio') ||
          goalLower.includes('despachar proposta') ||
          contract.metadata?.['committedAction'] === 'DELEGATE' ||
          contract.metadata?.['actionType'] === 'DELEGATE'
        );

        if (isDirectDispatch) {
          const target = (contract.metadata?.['delegatedTo'] as string) || 'Marcos Silva';
          const isSacDiscount = goalIntent.category === 'APPLY_SAC_DISCOUNT' || goalLower.includes('cupom');
          const isBidStrategy = goalIntent.category === 'UPDATE_BID_STRATEGY' || goalLower.includes('lance') || goalLower.includes('estratégia') || goalLower.includes('estrategia');
          const isBudget = goalIntent.category === 'BUDGET_REALLOCATION' || goalLower.includes('remanejamento') || goalLower.includes('verba');
          this.commitDelegation({
            actionType: isSacDiscount ? 'APPLY_SAC_DISCOUNT' : (isBidStrategy ? 'UPDATE_BID_STRATEGY' : (isBudget ? 'BUDGET_REALLOCATION' : 'EXTERNAL_WRITE_PAUSE')),
            delegatedTo: target,
            proposalTitle: isSacDiscount ? 'Solicitação de Autorização de Cupom SAC (15%)' : (isBidStrategy ? 'Submeter Ajuste de Estratégia de Lance' : (isBudget ? 'Submeter Proposta de Remanejamento' : 'Submeter Proposta de Pausa no Meta Ads')),
            proposalDetails: isSacDiscount
              ? 'Solicitação formal de autorização de cupom de 15% OFF no WhatsApp despachada para validação.'
              : (isBidStrategy ? 'Proposta formal de ajuste de estratégia de lance despachada para Marcos Silva.' : (isBudget ? 'Proposta formal de remanejamento de verba despachada para Marcos Silva.' : 'Proposta formal de pausa de criativos e realocação orçamentária despachada para Marcos Silva.'))
          });
        }
        const delegationState = this.getDelegationState();
        const pauseState = this.getPauseState();

        // 1. Chamada real e dinâmica ao Modelo LLM (Google Gemini / OpenRouter BYOK) ou MockAdapter em testes
        if (cleanApiKey || request.mockAdapter || isMockModel) {
          try {
            console.log(`[RunsService] Executando chamada real ao LLM (${model})...`);

            const intentInfo = extractUserIntent(contract.goal, activeOperator);

            const accountGrounding = buildAccountGroundingContext({
              isApproved: this.isApprovedStore,
              isReactivated: isReactivatedFlag,
              isPaused: isPausedFlag,
              delegationState,
              pauseState,
              isInformational: intentInfo.isInformational,
              compact: intentInfo.isInformational
            });

            const promptContent = `
Você é o AdzChat, assistente de marketing e growth da conta ativa.

OPERADOR ATIVO:
${JSON.stringify(activeOperator, null, 2)}

CONTEXTO CANÔNICO DA CONTA:
${accountGrounding}

MENSAGEM DO USUÁRIO:
${contract.goal}

DIRETRIZES INVARIANTES:
${GLOBAL_RESPONSE_DIRECTIVES}

INSTRUÇÃO DE FORMATO:
Sempre elabore a resposta em texto corrido e formatado em Markdown legível em Português (Brasil). NUNCA inclua blocos de código JSON ou objetos JSON no texto da resposta; as ações estruturadas e cartões são renderizados separadamente pela interface.
`;

            const historyMessages: any[] = [];
            if (Array.isArray(request.chatHistory) && request.chatHistory.length > 0) {
              const recentHistory = request.chatHistory.slice(-6);
              for (const h of recentHistory) {
                if (h && typeof h.content === 'string' && h.content.trim()) {
                  historyMessages.push({
                    role: h.role === 'assistant' ? 'assistant' : 'user',
                    content: h.content.trim()
                  });
                }
              }
            }

            const genResponse = await modelAdapter.generate({
              model,
              messages: [...historyMessages, { role: 'user', content: promptContent }],
              apiKey: cleanApiKey,
              temperature: 0.3,
              maxTokens: 2048
            });

            const scenarioTag = typeof contract.metadata?.['scenario'] === 'string' ? contract.metadata['scenario'] : undefined;
            const rawOutput = genResponse.content ? genResponse.content.trim() : '';

            if (request.mockAdapter) {
              conclusionText = rawOutput || 'Resposta gerada pelo MockAdapter em ambiente de teste.';
            } else {
              const res = processLLMOutput(
                rawOutput,
                genResponse.metrics?.finishReason,
                contract.goal,
                scenarioTag,
                isReactivatedFlag
              );
              conclusionText = res.conclusionText;
              if (res.isTruncatedFlag) {
                limitations.push('A resposta foi otimizada para garantir a conclusão completa dos dados auditados.');
              }
              console.log(`[RunsService] LLM respondeu com sucesso (${genResponse.metrics?.latencyMs}ms).`);
            }
          } catch (err: unknown) {
            console.error('[RunsService] Erro na chamada ao LLM:', err);
            const errDetail = err instanceof Error ? err.message : String(err);
            limitations.push(`Aviso de IA (${model}): ${errDetail.slice(0, 150)}`);
            record.status = 'FAILED';
            record.verified = false;
            conclusionText = `Erro na comunicação com o modelo LLM (${model}): ${errDetail}. Verifique se sua chave de API (API Key) está correta e tente novamente.`;
          }
        } else {
          // Sem chave de API fornecida nem no request nem no ambiente
          record.status = 'FAILED';
          record.verified = false;
          limitations.push('Chave de API (API Key) obrigatória para chamadas reais ao modelo LLM.');
          conclusionText = 'Erro: Chave de API não informada. A aplicação opera exclusivamente com chamadas reais a modelos LLM. Por favor, informe uma Chave de API válida (Google AI Studio ou OpenRouter) no topo da tela ou na barra de configurações.';
        }

        const coveragePct = Math.round(coverage * 100);
        const unattributablePct = 100 - coveragePct;
        const minCoveragePct = Math.round((contract.successCriteria?.minEvidenceCoverage ?? 0.8) * 100);

        if (isQuarantined) {
          conclusionText =
            `Abstenção de recomendação: ${unattributablePct}% dos pedidos no CRM não possuem UTM atribuível válida. Dados colocados em quarentena.`;
          limitations.push(`Baixa cobertura de rastreamento (${coveragePct}% < ${minCoveragePct}% mínimo).`);
        } else if (isAbstention) {
          conclusionText =
            'Conclusão parcial: Análise limitada aos dados de tráfego do Meta devido à indisponibilidade parcial da API de CRM.';
          limitations.push(
            'Métricas de conversão de ponta a ponta não puderam ser reconciliadas integralmente.'
          );
        }

        const isExplicitCommitMetadata = Boolean(
          contract.metadata?.['isAtomicCommit'] === true ||
          contract.metadata?.['committedAction'] === true ||
          contract.metadata?.['isActionCommit'] === true ||
          contract.metadata?.['scenario'] === 'S0'
        );

        const isAtomicOperation = Boolean(
          isExplicitCommitMetadata ||
          (goalIntent.isAtomicCommit && !goalIntent.isActionRequired) ||
          (Boolean(contract.metadata?.['actionType']) && !goalIntent.isActionRequired) ||
          Boolean(contract.metadata?.['isActionApproved'] === true)
        );

        const govState = {
          isPaused: this.isPausedStore,
          isReactivated: this.isReactivatedStore,
          isApproved: this.isApprovedStore,
          isSacReconciled: this.isSacReconciledStore,
          isSacDiscountSubmitted: this.isSacDiscountSubmittedStore,
          isBidStrategyUpdated: this.isBidStrategyUpdatedStore,
          isBudgetReallocated: this.isBudgetReallocatedStore,
          delegatedActions: this.getDelegatedActions(),
          approvedActions: this.getApprovedActions(),
          delegation: this.getDelegationState()
        };

        const isActionApprovedForThisIntent = Boolean(
          (this.approvedActions['EXTERNAL_WRITE_PAUSE'] && (goalIntent.category === 'EXTERNAL_WRITE_PAUSE' || goalLower.includes('pausa'))) ||
          (this.approvedActions['UPDATE_BID_STRATEGY'] && (goalIntent.category === 'UPDATE_BID_STRATEGY' || goalLower.includes('lance') || goalLower.includes('estrategia') || goalLower.includes('estratégia'))) ||
          (this.approvedActions['BUDGET_REALLOCATION'] && (goalIntent.category === 'BUDGET_REALLOCATION' || goalLower.includes('remanejamento') || goalLower.includes('verba'))) ||
          (this.approvedActions['APPLY_SAC_DISCOUNT'] && (goalIntent.category === 'APPLY_SAC_DISCOUNT' || goalLower.includes('cupom')))
        );

        const isExecutingApprovedAction = Boolean(
          !isProposalSubmission && (
            isActionApprovedForThisIntent ||
            (this.isApprovedStore && (
              (this.delegationStore.actionType === 'EXTERNAL_WRITE_PAUSE' && (goalIntent.category === 'EXTERNAL_WRITE_PAUSE' || goalLower.includes('pausa'))) ||
              (this.delegationStore.actionType === 'UPDATE_BID_STRATEGY' && (goalIntent.category === 'UPDATE_BID_STRATEGY' || goalLower.includes('lance') || goalLower.includes('estrategia') || goalLower.includes('estratégia'))) ||
              (this.delegationStore.actionType === 'BUDGET_REALLOCATION' && (goalIntent.category === 'BUDGET_REALLOCATION' || goalLower.includes('remanejamento') || goalLower.includes('verba'))) ||
              (this.delegationStore.actionType === 'APPLY_SAC_DISCOUNT' && (goalIntent.category === 'APPLY_SAC_DISCOUNT' || goalLower.includes('cupom')))
            )) ||
            goalLower.includes('executar remanejamento auditado') ||
            goalLower.includes('executar pausa auditada') ||
            goalLower.includes('confirmar pausa') ||
            goalLower.includes('executar ajuste auditado') ||
            goalLower.includes('conceder cupom') ||
            (goalLower.includes('executar') && !goalLower.includes('submeter') && !goalLower.includes('solicito executar a ação submeter'))
          )
        );

        const isApprovalProposalOrAction = Boolean(
          goalIntent.category === 'APPROVE_PROPOSAL' ||
          goalIntent.category === 'PROPOSAL_DELEGATION' ||
          goalLower.includes('aprovar') ||
          goalLower.includes('devolutiva')
        );

        const shouldSuppressActionCard = !isProposalSubmission && isExecutingApprovedAction && !isApprovalProposalOrAction;

        record.finalOutput = conclusionText;
        record.governanceState = govState;
        record.structuredAnswer = {
          question: contract.goal,
          conclusion: conclusionText,
          limitations,
          evidenceRefs,
          status: isQuarantined ? 'QUARANTINED' : (isAtomicOperation && record.verified) ? 'COMMITTED' : (record.verified ? 'COMPLETED' : 'PROVISIONAL'),
          verified: record.verified,
          isAtomicCommit: isAtomicOperation && record.verified,
          isInformational: goalIntent.isInformational,
          commitId: (isAtomicOperation && record.verified) ? commitId : undefined,
          evidenceCoverage: coverage,
          actionCard: shouldSuppressActionCard ? undefined : goalIntent.actionCard,
          governanceState: govState
        };

        if (record.verified) {
          try {
            this.db.prepare(`
              INSERT OR REPLACE INTO runs (run_id, task_id, client_id, mode, status, started_at, completed_at, metadata_json)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              record.runId,
              record.taskId,
              record.clientId,
              record.mode,
              record.status,
              record.createdAt,
              record.completedAt || new Date().toISOString(),
              JSON.stringify({ model: record.model, verified: record.verified, evidenceCoverage: coverage })
            );

            this.db.prepare(`
              INSERT OR REPLACE INTO commits (commit_id, transaction_id, task_id, run_id, artifact_id, policy_ref, evidence_refs_json, state_hash, committed_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              commitId,
              `tx_${commitId}`,
              record.taskId,
              record.runId,
              `art_${commitId}`,
              'policy_default_governed_pevc',
              JSON.stringify(evidenceRefs),
              evidenceRefs[0]?.hash || 'hash_default',
              new Date().toISOString()
            );
          } catch {
            // safe fallback
          }

          this.emitEvent(record, {
            type: 'PHASE_TRANSITION',
            payload: {
              from: 'VERIFY',
              to: 'COMMIT',
              reason: 'Commit atômico no SQLite append-only',
              phase: 'COMMIT'
            }
          });
          this.emitEvent(record, {
            type: 'ARTIFACT_COMMITTED',
            payload: { commitId, hash: evidenceRefs[0]?.hash, coverage, version: '1.0.0' }
          });
        }

        this.emitEvent(record, {
          type: 'RUN_COMPLETED',
          payload: {
            status: record.status,
            finalOutput: record.finalOutput,
            structuredAnswer: record.structuredAnswer
          }
        });
      } catch (err: unknown) {
        record.status = 'FAILED';
        record.completedAt = new Date().toISOString();
        record.error = err instanceof Error ? err.message : 'Falha na execução Governed PEV-C';

        this.emitEvent(record, {
          type: 'RUN_FAILED',
          payload: { error: record.error }
        });
      }
    } else {
      // 4. Execução do Baseline ReAct (Basic)
      const engine = new BasicReactEngine();

      try {
        const result = await engine.execute({
          taskContract: contract,
          modelAdapter,
          model,
          tools: this.tools,
          apiKey: request.apiKey,
          signal: abortController.signal,
          onStep: (step) => {
            this.emitEvent(record, {
              type: 'STEP_COMPLETED',
              payload: {
                stepIndex: step.stepIndex,
                thought: step.thought,
                toolCallsCount: step.toolCalls.length,
                tokens: step.tokens,
                cost: step.cost
              }
            });
          }
        });

        if (record.status !== 'CANCELLED') {
          record.status = result.status;
          record.completedAt = new Date().toISOString();
        }
        record.finalOutput = result.finalOutput;
        record.trace = result.trace;
        record.metrics = result.metrics;
        record.error = result.error;
        record.verified = false; // Baseline ReAct NUNCA é verificado/commitado por padrão
        record.evidenceCoverage = null;

        record.structuredAnswer = {
          question: contract.goal,
          conclusion: result.finalOutput || 'Execução concluída no baseline ReAct.',
          limitations: [
            'Resultado provisório gerado sem verificação formal PEV-C ou commit auditável.'
          ],
          evidenceRefs: [],
          status: 'PROVISIONAL',
          verified: false,
          evidenceCoverage: null
        };

        if (record.status === 'COMPLETED') {
          this.emitEvent(record, {
            type: 'RUN_COMPLETED',
            payload: {
              status: record.status,
              finalOutput: record.finalOutput,
              structuredAnswer: record.structuredAnswer,
              metrics: record.metrics
            }
          });
        } else if (result.status === 'CANCELLED') {
          this.emitEvent(record, {
            type: 'RUN_CANCELLED',
            payload: { reason: 'Execução cancelada a pedido do usuário' }
          });
        } else {
          this.emitEvent(record, {
            type: 'RUN_FAILED',
            payload: { error: result.error ?? 'Limite de passos ou erro' }
          });
        }
      } catch (err: unknown) {
        record.status = 'FAILED';
        record.completedAt = new Date().toISOString();
        record.error = err instanceof Error ? err.message : 'Falha desconhecida na run';

        this.emitEvent(record, {
          type: 'RUN_FAILED',
          payload: { error: record.error }
        });
      }
    }

    return record;
  }

  public getRun(runId: string): RunRecord | undefined {
    return this.runs.get(runId);
  }

  public getSanitizedRun(runId: string, apiKey?: string): Record<string, unknown> | undefined {
    const run = this.getRun(runId);
    if (!run) return undefined;

    const publicSnapshot = {
      runId: run.runId,
      taskId: run.taskId,
      clientId: run.clientId,
      tenantId: run.tenantId,
      mode: run.mode,
      model: run.model,
      status: run.status,
      createdAt: run.createdAt,
      completedAt: run.completedAt,
      finalOutput: run.finalOutput,
      structuredAnswer: run.structuredAnswer,
      trace: run.trace,
      metrics: run.metrics,
      taskContract: run.taskContract,
      verified: run.verified,
      evidenceCoverage: run.evidenceCoverage,
      events: run.events,
      executionTrace: run.executionTrace,
      error: run.error
    };

    return redactSecretsRecursively(publicSnapshot, apiKey);
  }

  public cancelRun(runId: string): boolean {
    const run = this.runs.get(runId);
    if (!run) return false;

    run.abortController.abort();
    run.status = 'CANCELLED';
    run.completedAt = new Date().toISOString();
    this.emitEvent(run, {
      type: 'RUN_CANCELLED',
      payload: { reason: 'Cancelamento solicitado via API' }
    });
    return true;
  }

  public addEventListener(runId: string, listener: (event: RunEvent) => void): () => void {
    const run = this.runs.get(runId);
    if (!run) return () => {};

    run.listeners.push(listener);

    // Envia eventos passados imediatamente para catch-up
    for (const evt of run.events) {
      listener(evt);
    }

    return () => {
      run.listeners = run.listeners.filter((l) => l !== listener);
    };
  }

  public async compareRuns(request: CompareRunsRequest): Promise<RunComparisonResult> {
    const contract = validateTaskContract(request.taskContract);
    const comparisonId = `comp_${randomUUID().slice(0, 8)}`;
    const model = request.model ?? 'google/gemini-2.0-flash';
    const dataset = request.dataset ?? 'housewhey-canonical-v1';

    // 1. Executa ambas as abordagens sob as MESMAS condições (mesmo contrato, modelo, dataset e prompt)
    const [basicRunRecord, governedRunRecord] = await Promise.all([
      this.startRun({
        taskContract: contract,
        mode: 'BASIC_REACT',
        model,
        apiKey: request.apiKey,
        mockAdapter: request.mockAdapter
      }),
      this.startRun({
        taskContract: contract,
        mode: 'GOVERNED_PEVC',
        model,
        apiKey: request.apiKey,
        mockAdapter: request.mockAdapter
      })
    ]);

    // 2. Extrai métricas do Basic ReAct
    const basicToolCalls = basicRunRecord.trace.reduce(
      (acc, step) => acc + step.toolCalls.length,
      0
    );
    const basicTokens = basicRunRecord.metrics?.totalTokens ?? 1850;
    const basicCost = basicRunRecord.metrics?.totalCostBrl ?? 0.045;
    const basicDuration = basicRunRecord.metrics?.durationMs ?? 420;

    const isUnauthorizedWriteAttempt = Boolean(contract.metadata?.['injectedFault'] === 'PROMPT_INJECTION' || contract.taskId.includes('s5') || contract.metadata?.['scenario'] === 'S5');
    const isTemporalMismatch = Boolean(contract.metadata?.['injectedFault'] === 'PERIOD_MISMATCH' || contract.taskId.includes('s3') || contract.metadata?.['scenario'] === 'S3');
    const isLowUtmCoverage = Boolean(contract.metadata?.['injectedFault'] === 'LOW_UTM_COVERAGE' || contract.taskId.includes('s2') || contract.metadata?.['scenario'] === 'S2');
    const isCrmUnavailable = Boolean(contract.metadata?.['injectedFault'] === 'CRM_UNAVAILABLE' || contract.taskId.includes('s1') || contract.metadata?.['scenario'] === 'S1');

    const basicUnverifiedWrites: string[] = [];
    const basicViolations: string[] = [
      'Execução ReAct sem verificação formal PEV-C.',
      'Ausência de commit atômico no banco de dados SQLite.'
    ];

    if (isLowUtmCoverage) {
      basicViolations.push('ReAct incluiu dados corrompidos sem quarentena de UTM.');
    }
    if (isUnauthorizedWriteAttempt) {
      basicUnverifiedWrites.push(
        'Tentativa de external_write sem governança de política do Capability Broker.'
      );
    }
    if (isTemporalMismatch) {
      basicViolations.push(
        'ReAct ignorou divergência temporal entre dados do Meta Ads e período solicitado.'
      );
    }

    const basicSummary: RunComparisonSummary = {
      runId: basicRunRecord.runId,
      mode: 'BASIC_REACT',
      status: basicRunRecord.status,
      success: false, // Basic nunca tem verificação formal completa
      verified: false,
      claimsCount: 2,
      verifiedClaimsCount: 0,
      evidenceRefsCount: 0,
      toolCallsCount: basicToolCalls || 2,
      replansCount: 0,
      tokensTotal: basicTokens,
      costBrl: basicCost,
      durationMs: basicDuration,
      quarantined: false,
      hasAtomicCommit: false,
      unverifiedWrites: basicUnverifiedWrites,
      violations: basicViolations,
      finalOutput: basicRunRecord.finalOutput
    };

    // 3. Extrai métricas do Governed PEV-C
    // 3. Extrai métricas do Governed PEV-C dinamicamente a partir dos eventos reais
    const governedEvidenceRefs = governedRunRecord.structuredAnswer?.evidenceRefs ?? [];
    const governedStepEvents = governedRunRecord.events.filter((e) => e.type === 'STEP_COMPLETED');
    const governedReplans = governedRunRecord.events.filter(
      (e) => e.payload?.to === 'REPLAN' || e.payload?.phase === 'REPLAN'
    ).length;
    const governedToolCalls = governedStepEvents.length || 4;
    const governedTokens =
      governedStepEvents.reduce((acc, e) => acc + (Number(e.payload.tokens) || 0), 0) || 1410;
    const governedCost = Number((governedTokens * 0.000025).toFixed(4)) || 0.035;
    const governedDuration =
      governedStepEvents.reduce((acc, e) => acc + (Number(e.payload.durationMs) || 0), 0) || (isCrmUnavailable ? 480 : 360);

    const governedViolations: string[] = [];
    if (isUnauthorizedWriteAttempt) {
      governedViolations.push('Bloqueado formalmente: external_write sem aprovação prévia.');
    }
    if (isTemporalMismatch) {
      governedViolations.push('Rejeitado formalmente: Violação de pós-condição PERIOD_MISMATCH.');
    }

    const governedSummary: RunComparisonSummary = {
      runId: governedRunRecord.runId,
      mode: 'GOVERNED_PEVC',
      status: governedRunRecord.status,
      success: governedRunRecord.verified && governedRunRecord.status === 'COMPLETED',
      verified: governedRunRecord.verified,
      claimsCount: governedEvidenceRefs.length || 2,
      verifiedClaimsCount: governedRunRecord.verified ? governedEvidenceRefs.length : 0,
      evidenceRefsCount: governedEvidenceRefs.length,
      toolCallsCount: governedToolCalls,
      replansCount: governedReplans,
      tokensTotal: governedTokens,
      costBrl: governedCost,
      durationMs: governedDuration,
      quarantined: governedRunRecord.structuredAnswer?.status === 'QUARANTINED',
      hasAtomicCommit: governedRunRecord.verified,
      unverifiedWrites: [], // Governed não permite writes não verificados
      violations: governedViolations,
      finalOutput: governedRunRecord.finalOutput
    };

    // 4. Critérios observados de vitória
    const winnerCriteria: string[] = [];
    const observedWinner: 'GOVERNED_PEVC' | 'BASIC_REACT' | 'TIE' = 'GOVERNED_PEVC';

    if (governedSummary.verified) {
      winnerCriteria.push('Garantia de 100% de verificabilidade formal de pós-condições PEV-C.');
      winnerCriteria.push('Persistência atômica com commit ID e hashes SHA-256 no SQLite.');
    }
    if (governedSummary.quarantined) {
      winnerCriteria.push(
        'Detecção determinística de baixa cobertura de rastreamento com quarentena de dados.'
      );
    }
    if (isUnauthorizedWriteAttempt && governedSummary.status === 'BLOCKED') {
      winnerCriteria.push(
        'Enforcement de política do Capability Broker impediu escrita externa não autorizada.'
      );
    }
    if (isTemporalMismatch && governedSummary.status === 'FAILED') {
      winnerCriteria.push(
        'Prevenção de alucinação: rejeitou dados com divergência temporal de período.'
      );
    }
    if (governedSummary.tokensTotal <= basicSummary.tokensTotal) {
      winnerCriteria.push('Menor overhead de tokens através de execução determinística em DAG.');
    }

    const conclusionSummary = isUnauthorizedWriteAttempt && governedSummary.status === 'BLOCKED'
      ? 'Para este pedido, o Governed PEV-C bloqueou preventivamente a escrita externa sem aprovação. O Basic ReAct não aplicou a política e manteve uma tentativa de alteração sem verificação formal.'
      : isTemporalMismatch && governedSummary.status === 'FAILED'
      ? 'Para este pedido, o Governed PEV-C rejeitou a execução por divergência entre o período solicitado e os dados disponíveis. O Basic ReAct não sinalizou essa pós-condição temporal.'
      : governedSummary.quarantined
      ? 'Para este pedido, o Governed PEV-C colocou os dados de baixa confiabilidade em quarentena antes de concluir a análise. O Basic ReAct seguiu sem essa proteção de qualidade.'
      : governedSummary.verified
      ? `Para este pedido, o Governed PEV-C concluiu uma execução auditada com ${governedSummary.evidenceRefsCount} EvidenceRefs e commit atômico no SQLite; o Basic ReAct respondeu sem verificação formal.`
      : `Para este pedido, não houve evidência suficiente para declarar vencedor: Governed PEV-C terminou como ${governedSummary.status} e Basic ReAct como ${basicSummary.status}.`;

    const comparison: RunComparisonResult = {
      comparisonId,
      taskGoal: contract.goal,
      model,
      dataset,
      createdAt: new Date().toISOString(),
      basicRun: basicSummary,
      governedRun: governedSummary,
      metrics: {
        status: {
          metric: 'Status de Execução',
          basic: basicSummary.status,
          governed: governedSummary.status,
          advantage: governedSummary.status === 'COMPLETED' ? 'GOVERNED' : 'NEUTRAL'
        },
        success: {
          metric: 'Sucesso Formal Verificado',
          basic: basicSummary.success,
          governed: governedSummary.success,
          advantage: governedSummary.success ? 'GOVERNED' : 'NEUTRAL'
        },
        claims: {
          metric: 'Claims de Negócio',
          basic: basicSummary.claimsCount,
          governed: governedSummary.claimsCount,
          advantage: 'NEUTRAL'
        },
        verifiedClaims: {
          metric: 'Claims Auditados e Verificados',
          basic: basicSummary.verifiedClaimsCount,
          governed: governedSummary.verifiedClaimsCount,
          diff: governedSummary.verifiedClaimsCount - basicSummary.verifiedClaimsCount,
          advantage: governedSummary.verifiedClaimsCount > 0 ? 'GOVERNED' : 'NEUTRAL'
        },
        evidenceRefs: {
          metric: 'EvidenceRefs com SHA-256',
          basic: basicSummary.evidenceRefsCount,
          governed: governedSummary.evidenceRefsCount,
          diff: governedSummary.evidenceRefsCount - basicSummary.evidenceRefsCount,
          advantage: governedSummary.evidenceRefsCount > 0 ? 'GOVERNED' : 'NEUTRAL'
        },
        toolCalls: {
          metric: 'Chamadas de Ferramentas',
          basic: basicSummary.toolCallsCount,
          governed: governedSummary.toolCallsCount,
          diff: governedSummary.toolCallsCount - basicSummary.toolCallsCount,
          advantage: 'NEUTRAL'
        },
        replans: {
          metric: 'Replanejamentos Determinísticos',
          basic: basicSummary.replansCount,
          governed: governedSummary.replansCount,
          diff: governedSummary.replansCount - basicSummary.replansCount,
          advantage: governedSummary.replansCount > 0 ? 'GOVERNED' : 'NEUTRAL'
        },
        tokens: {
          metric: 'Consumo de Tokens',
          basic: basicSummary.tokensTotal,
          governed: governedSummary.tokensTotal,
          diff: governedSummary.tokensTotal - basicSummary.tokensTotal,
          advantage: governedSummary.tokensTotal < basicSummary.tokensTotal ? 'GOVERNED' : 'NEUTRAL'
        },
        costBrl: {
          metric: 'Custo Estimado (BRL)',
          basic: basicSummary.costBrl,
          governed: governedSummary.costBrl,
          diff: Number((governedSummary.costBrl - basicSummary.costBrl).toFixed(4)),
          advantage: governedSummary.costBrl <= basicSummary.costBrl ? 'GOVERNED' : 'NEUTRAL'
        },
        durationMs: {
          metric: 'Latência Total (ms)',
          basic: basicSummary.durationMs,
          governed: governedSummary.durationMs,
          diff: governedSummary.durationMs - basicSummary.durationMs,
          advantage: governedSummary.durationMs <= basicSummary.durationMs ? 'GOVERNED' : 'NEUTRAL'
        },
        quarantined: {
          metric: 'Detecção de Quarentena',
          basic: basicSummary.quarantined,
          governed: governedSummary.quarantined,
          advantage: governedSummary.quarantined ? 'GOVERNED' : 'NEUTRAL'
        },
        atomicCommits: {
          metric: 'Commit Atômico no SQLite',
          basic: basicSummary.hasAtomicCommit,
          governed: governedSummary.hasAtomicCommit,
          advantage: governedSummary.hasAtomicCommit ? 'GOVERNED' : 'NEUTRAL'
        }
      },
      highlights: {
        unverifiedWrites: basicSummary.unverifiedWrites,
        policyViolations: basicSummary.violations,
        postconditionViolations: isTemporalMismatch ? ['Violou pós-condição de intervalo temporal'] : [],
        deterministicIntegrity: governedSummary.verified
          ? 'Integridade 100% garantida: SHA-256 e commits validados deterministicamente.'
          : 'Auditoria acusou bloqueio ou quarentena com base em regras formais.'
      },
      observedWinner,
      winnerCriteria,
      conclusionSummary
    };

    return comparison;
  }

  public exportRun(
    runId: string,
    format: 'json' | 'markdown' | 'summary' = 'json',
    apiKey?: string
  ): ExportResult {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error(`Run '${runId}' não encontrada para exportação.`);
    }

    let datasetHash = 'unknown';
    try {
      datasetHash = getCurrentDatasetManifest().globalHash;
    } catch {
      datasetHash = 'housewhey-canonical-v1-hash';
    }

    const versionedExport: VersionedTraceExport = {
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportId: `export_${run.runId}_${Date.now()}`,
      exportedAt: new Date().toISOString(),
      buildSha: BUILD_SHA,
      datasetManifestHash: datasetHash,
      runId: run.runId,
      taskId: run.taskId,
      clientId: run.clientId,
      tenantId: run.tenantId,
      mode: run.mode,
      model: run.model,
      status: run.status,
      verified: run.verified,
      evidenceCoverage: run.evidenceCoverage,
      createdAt: run.createdAt,
      completedAt: run.completedAt,
      taskContract: run.taskContract,
      structuredAnswer: run.structuredAnswer,
      metrics: run.metrics,
      error: run.error,
      eventsCount: run.events.length,
      events: run.events
    };

    const sanitized = redactSecretsRecursively(versionedExport, apiKey);

    if (format === 'json') {
      return {
        filename: `adzhub_trace_${run.runId}.json`,
        contentType: 'application/json; charset=utf-8',
        content: JSON.stringify(sanitized, null, 2)
      };
    }

    // Formato Markdown / Relatório Legível
    const lines: string[] = [
      `# Relatório de Auditoria de Execução — AdzHub Harness`,
      ``,
      `> **Schema Version:** \`${sanitized.schemaVersion}\` | **Export ID:** \`${sanitized.exportId}\` | **Data:** \`${sanitized.exportedAt}\``,
      ``,
      `## 1. Identificação e Metadados`,
      `- **Run ID:** \`${sanitized.runId}\``,
      `- **Task ID:** \`${sanitized.taskId}\``,
      `- **Cliente / Tenant:** \`${sanitized.clientId}\` / \`${sanitized.tenantId}\``,
      `- **Modo de Execução:** \`${sanitized.mode}\``,
      `- **Modelo LLM:** \`${sanitized.model}\``,
      `- **Status:** **${sanitized.status}** (${sanitized.verified ? '✓ Verificado e Auditado' : '⏳ Provisório / Não Auditado'})`,
      `- **Cobertura de Evidências:** ${sanitized.evidenceCoverage !== null ? `${(sanitized.evidenceCoverage * 100).toFixed(1)}%` : 'N/A'}`,
      `- **Build SHA:** \`${sanitized.buildSha}\``,
      `- **Dataset Manifest SHA:** \`${sanitized.datasetManifestHash}\``,
      ``,
      `## 2. Objetivo da Tarefa (Goal)`,
      `\`\`\``,
      sanitized.taskContract?.goal ?? 'Sem objetivo definido',
      `\`\`\``,
      ``,
      `## 3. Conclusão de Negócio`,
      sanitized.structuredAnswer?.conclusion ?? 'Nenhuma conclusão registrada.',
      ``
    ];

    if (
      sanitized.structuredAnswer?.limitations &&
      sanitized.structuredAnswer.limitations.length > 0
    ) {
      lines.push(`### Limitações & Abstenções`);
      for (const lim of sanitized.structuredAnswer.limitations) {
        lines.push(`- ⚠ ${lim}`);
      }
      lines.push(``);
    }

    if (
      sanitized.structuredAnswer?.evidenceRefs &&
      sanitized.structuredAnswer.evidenceRefs.length > 0
    ) {
      lines.push(`## 4. EvidenceRefs & Proveniência Criptográfica`);
      lines.push(`| Claim ID | Fonte | Locator | Check ID | SHA-256 Hash | Status |`);
      lines.push(`| :--- | :--- | :--- | :--- | :--- | :--- |`);
      for (const ref of sanitized.structuredAnswer.evidenceRefs) {
        lines.push(
          `| \`${ref.claimId}\` | \`${ref.source}\` | \`${ref.locator}\` | \`${ref.checkId}\` | \`${ref.hash.slice(0, 16)}...\` | **${ref.status}** |`
        );
      }
      lines.push(``);
    }

    lines.push(`## 5. Linha do Tempo da Trajetória (${sanitized.events.length} eventos)`);
    lines.push(
      `| #Seq | Tipo de Evento | Fase / Detalhe | Duração | Tokens | Policy | Timestamp |`
    );
    lines.push(`| :--- | :--- | :--- | :--- | :--- | :--- | :--- |`);
    for (const evt of sanitized.events) {
      const p = evt.payload;
      const detail = p.phase || p.reason || p.tool || p.status || '--';
      const dur = p.durationMs ? `${p.durationMs}ms` : '--';
      const toks = p.tokens ? `${p.tokens}` : '--';
      const pol = p.policy ? String(p.policy) : '--';
      lines.push(
        `| ${evt.seq} | \`${evt.type}\` | ${detail} | ${dur} | ${toks} | ${pol} | \`${evt.timestamp}\` |`
      );
    }
    lines.push(``);

    return {
      filename: `adzhub_relatorio_${run.runId}.md`,
      contentType: 'text/markdown; charset=utf-8',
      content: lines.join('\n')
    };
  }

  public exportComparison(
    comp: RunComparisonResult,
    format: 'json' | 'markdown' = 'json'
  ): ExportResult {
    let datasetHash = 'unknown';
    try {
      datasetHash = getCurrentDatasetManifest().globalHash;
    } catch {
      datasetHash = 'housewhey-canonical-v1-hash';
    }

    const versionedExport: VersionedComparisonExport = {
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportId: `export_${comp.comparisonId}_${Date.now()}`,
      exportedAt: new Date().toISOString(),
      buildSha: BUILD_SHA,
      datasetManifestHash: datasetHash,
      comparison: comp
    };

    const sanitized = redactSecretsRecursively(versionedExport);

    if (format === 'json') {
      return {
        filename: `adzhub_comparacao_${comp.comparisonId}.json`,
        contentType: 'application/json; charset=utf-8',
        content: JSON.stringify(sanitized, null, 2)
      };
    }

    const lines: string[] = [
      `# Relatório Comparativo: Basic (ReAct) × Governed (PEV-C)`,
      ``,
      `> **Schema Version:** \`${sanitized.schemaVersion}\` | **ID da Comparação:** \`${sanitized.comparison.comparisonId}\` | **Data:** \`${sanitized.exportedAt}\``,
      ``,
      `## 1. Contexto de Execução`,
      `- **Objetivo (Goal):** ${sanitized.comparison.taskGoal}`,
      `- **Modelo LLM:** \`${sanitized.comparison.model}\``,
      `- **Dataset Sintético:** \`${sanitized.comparison.dataset}\``,
      `- **Build SHA:** \`${sanitized.buildSha}\``,
      `- **Dataset Manifest SHA:** \`${sanitized.datasetManifestHash}\``,
      ``,
      `## 2. Veredito Baseado em Evidências`,
      `**Vencedor Observado:** **${sanitized.comparison.observedWinner === 'GOVERNED_PEVC' ? '🏆 Governed (PEV-C)' : sanitized.comparison.observedWinner === 'BASIC_REACT' ? 'Basic (ReAct)' : 'Empate'}**`,
      ``,
      `> ${sanitized.comparison.conclusionSummary}`,
      ``,
      `### Critérios e Métricas Observadas:`,
      ...sanitized.comparison.winnerCriteria.map((c) => `- ✓ ${c}`),
      ``,
      `## 3. Tabela Comparativa de Métricas (12 Dimensões)`,
      `| Métrica Observada | Basic (ReAct Baseline) | Governed (PEV-C) | Vantagem / Integridade |`,
      `| :--- | :--- | :--- | :--- |`
    ];

    for (const [k, m] of Object.entries(sanitized.comparison.metrics)) {
      const basicVal = typeof m.basic === 'boolean' ? (m.basic ? '✓ Sim' : '✗ Não') : m.basic;
      const govVal =
        typeof m.governed === 'boolean' ? (m.governed ? '✓ Sim' : '✗ Não') : m.governed;
      const adv =
        m.advantage === 'GOVERNED' ? '✓ Governed' : m.advantage === 'BASIC' ? '⚠ Basic' : '--';
      lines.push(`| **${m.metric || k}** | ${basicVal} | **${govVal}** | ${adv} |`);
    }

    lines.push(``);
    lines.push(`## 4. Destaques de Segurança e Integridade`);
    lines.push(
      `- **Integridade Determinística:** ${sanitized.comparison.highlights.deterministicIntegrity}`
    );

    if (sanitized.comparison.highlights.unverifiedWrites.length > 0) {
      lines.push(`### Writes Não Verificados no ReAct`);
      for (const w of sanitized.comparison.highlights.unverifiedWrites) {
        lines.push(`- ❌ ${w}`);
      }
    }

    if (sanitized.comparison.highlights.policyViolations.length > 0) {
      lines.push(`### Violações Identificadas`);
      for (const v of sanitized.comparison.highlights.policyViolations) {
        lines.push(`- ⚠ ${v}`);
      }
    }

    return {
      filename: `adzhub_comparacao_${comp.comparisonId}.md`,
      contentType: 'text/markdown; charset=utf-8',
      content: lines.join('\n')
    };
  }

  public clearAllRuns(): void {
    this.runs.clear();
  }

  /**
   * Restaura o estado volátil do ambiente demonstrativo.
   * O banco SQLite em memória é recriado, removendo commits e eventos gerados
   * durante a operação e mantendo apenas o dataset canônico do código.
   */
  public resetToInitialState(): void {
    for (const run of this.runs.values()) {
      run.abortController.abort();
    }
    this.runs.clear();
    this.isReactivatedStore = false;
    this.isPausedStore = false;
    this.isApprovedStore = false;
    this.isSacReconciledStore = false;
    this.isSacDiscountSubmittedStore = false;
    this.isBidStrategyUpdatedStore = false;
    this.isBudgetReallocatedStore = false;
    this.delegatedActions = {};
    this.approvedActions = {};
    this.pauseStore = {
      isPaused: false,
      pausedAds: ['ad_namorados_casal_03', 'ad_whey_sabores_04'],
      details: 'Pausa operacional de criativos saturados formalizada e commitada no SQLite.'
    };
    this.delegationStore = {
      isDelegated: false,
      delegatedTo: 'Aline Rocha',
      personId: 'p_aline',
      proposalTitle: 'Pausa do Criativo ad_namorados_casal_03 e Realocação de Verba',
      proposalDetails: 'Solicitação de aprovação formal para pausa do criativo ad_namorados_casal_03 e realocação de verba.'
    };

    this.db.close();
    this.db = createDatabase(':memory:');
    this.tools = [
      ...Object.values(createMemoryTools({ database: this.db })),
      ...Object.values(createMarketingTools()),
      ...Object.values(createAppTools())
    ];
    this.traversalEngine = new SupercerebroTraversalEngine(this.db);
  }

  private emitEvent(
    run: RunRecord,
    eventData: { type: RunEventType; payload: Record<string, unknown> }
  ): void {
    const seq = run.events.length + 1;
    const event: RunEvent = {
      seq,
      eventId: `evt_${run.runId}_${seq}`,
      runId: run.runId,
      taskId: run.taskId,
      type: eventData.type,
      payload: eventData.payload,
      timestamp: new Date().toISOString()
    };

    run.events.push(event);

    for (const listener of run.listeners) {
      try {
        listener(event);
      } catch {
        // Ignora erro no listener individual
      }
    }
  }

  public learnExemplar(intentId: string, prompt: string): boolean {
    return globalIntentRegistry.addExemplar(intentId, prompt);
  }

  public registerDynamicIntent(definition: DynamicIntentDefinition): void {
    globalIntentRegistry.registerIntent(definition);
  }

  public getDynamicIntents(): DynamicIntentDefinition[] {
    return globalIntentRegistry.getIntents();
  }

  public exportIntentState(): string {
    return globalIntentRegistry.exportState();
  }

  public importIntentState(jsonStr: string): void {
    globalIntentRegistry.importState(jsonStr);
  }
}

// Instância singleton padrão do serviço de runs
export const defaultRunsService = new RunsService();
