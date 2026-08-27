import { z } from 'zod';
import { AllowedEffect, AllowedEffectSchema, TaskContract } from '@adzhub/contracts';

/**
 * Estimativa de custo, tokens e latência para um passo individual do plano.
 */
export const StepBudgetEstimateSchema = z.object({
  estimatedTokens: z.number().int().nonnegative().default(0),
  estimatedCostBrl: z.number().nonnegative().default(0),
  estimatedTimeoutMs: z.number().int().positive().default(5000)
});

export type StepBudgetEstimate = z.infer<typeof StepBudgetEstimateSchema>;

/**
 * Schema canônico de um passo do DAG de execução PEV-C.
 */
export const PlanStepSchema = z.object({
  stepId: z.string().min(1, { message: 'stepId é obrigatório' }),
  name: z.string().min(1, { message: 'name é obrigatório' }),
  toolName: z.string().min(1, { message: 'toolName é obrigatório' }),
  phase: z.enum(['PLAN', 'EXECUTE', 'VERIFY', 'COMMIT']),
  dependsOn: z.array(z.string()).default([]),
  effects: z
    .array(AllowedEffectSchema)
    .min(1, { message: 'Pelo menos um effect deve ser declarado para o passo' }),
  estimatedBudget: StepBudgetEstimateSchema,
  params: z.record(z.unknown()).default({})
});

export type PlanStep = z.infer<typeof PlanStepSchema>;

/**
 * Resumo do orçamento total consolidado do plano.
 */
export const PlanTotalBudgetSchema = z.object({
  totalSteps: z.number().int().positive(),
  totalToolCalls: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  totalCostBrl: z.number().nonnegative(),
  estimatedTimeoutMs: z.number().int().positive()
});

export type PlanTotalBudget = z.infer<typeof PlanTotalBudgetSchema>;

/**
 * Schema canônico do Plano Governed PEV-C baseado em DAG.
 */
export const PevcPlanSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  planId: z.string().min(1),
  version: z.number().int().positive(),
  taskId: z.string().min(1),
  runId: z.string().min(1),
  steps: z.array(PlanStepSchema).min(1, { message: 'O plano deve conter pelo menos um passo' }),
  totalEstimatedBudget: PlanTotalBudgetSchema,
  effectsRequired: z.array(AllowedEffectSchema).min(1),
  createdAt: z.string().datetime()
});

export type PevcPlan = z.infer<typeof PevcPlanSchema>;

/**
 * Códigos diagnósticos de erro de validação do plano.
 */
export type PlanValidationErrorCode =
  | 'INVALID_SCHEMA'
  | 'CYCLE_DETECTED'
  | 'MISSING_DEPENDENCY'
  | 'SELF_DEPENDENCY'
  | 'EFFECT_FORBIDDEN'
  | 'EFFECT_NOT_ALLOWED'
  | 'BUDGET_EXCEEDED'
  | 'STRUCTURAL_ORDER_VIOLATION';

/**
 * Erro lançado quando a validação do DAG ou do plano falha.
 */
export class PlanValidationError extends Error {
  public readonly code: PlanValidationErrorCode;
  public readonly details: Record<string, unknown>;

  constructor(
    code: PlanValidationErrorCode,
    message: string,
    details: Record<string, unknown> = {}
  ) {
    super(`[PlanValidationError:${code}] ${message}`);
    this.name = 'PlanValidationError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Executa ordenação topológica (Algoritmo de Kahn) para detectar ciclos e validar o DAG.
 * Retorna os steps ordenados por dependência ou lança PlanValidationError em caso de ciclo/dependência inválida.
 */
export function validateDAGTopologicalSort(steps: PlanStep[]): PlanStep[] {
  const stepMap = new Map<string, PlanStep>();
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  // 1. Inicializa estruturas
  for (const step of steps) {
    if (stepMap.has(step.stepId)) {
      throw new PlanValidationError(
        'INVALID_SCHEMA',
        `stepId duplicado encontrado no plano: '${step.stepId}'`,
        { stepId: step.stepId }
      );
    }
    stepMap.set(step.stepId, step);
    inDegree.set(step.stepId, 0);
    adjacency.set(step.stepId, []);
  }

  // 2. Constrói grafo e calcula graus de entrada
  for (const step of steps) {
    for (const depId of step.dependsOn) {
      if (depId === step.stepId) {
        throw new PlanValidationError(
          'SELF_DEPENDENCY',
          `O passo '${step.stepId}' não pode depender de si mesmo.`,
          { stepId: step.stepId }
        );
      }

      if (!stepMap.has(depId)) {
        throw new PlanValidationError(
          'MISSING_DEPENDENCY',
          `O passo '${step.stepId}' depende de '${depId}', que não existe no plano.`,
          { stepId: step.stepId, missingDependency: depId }
        );
      }

      adjacency.get(depId)!.push(step.stepId);
      inDegree.set(step.stepId, (inDegree.get(step.stepId) ?? 0) + 1);
    }
  }

  // 3. Algoritmo de Kahn: fila de nós com in-degree zero
  const queue: string[] = [];
  for (const [stepId, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(stepId);
    }
  }

  const sorted: PlanStep[] = [];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    sorted.push(stepMap.get(currentId)!);

    const neighbors = adjacency.get(currentId) ?? [];
    for (const neighborId of neighbors) {
      const newDegree = inDegree.get(neighborId)! - 1;
      inDegree.set(neighborId, newDegree);
      if (newDegree === 0) {
        queue.push(neighborId);
      }
    }
  }

  // Se não foi possível ordenar todos os nós, existe pelo menos um ciclo no grafo
  if (sorted.length !== steps.length) {
    const cyclicSteps = steps.filter((s) => (inDegree.get(s.stepId) ?? 0) > 0).map((s) => s.stepId);

    throw new PlanValidationError(
      'CYCLE_DETECTED',
      `Ciclo direcionado detectado no DAG de execução envolvendo os passos: [${cyclicSteps.join(', ')}].`,
      { cyclicSteps }
    );
  }

  return sorted;
}

/**
 * Valida as invariantes metodológicas de estrutura do DAG:
 * 1. Contexto precede coletas.
 * 2. Meta e CRM podem rodar em paralelo (não possuem dependência cruzada).
 * 3. Join depende de todas as coletas.
 * 4. Verify depende do Join.
 * 5. Commit depende do Verify.
 */
export function validateStructuralInvariants(steps: PlanStep[]): void {
  const contextStep = steps.find(
    (s) => s.effects.includes('read:memory') && s.toolName.includes('context')
  );
  const metaStep = steps.find((s) => s.effects.includes('read:meta'));
  const crmStep = steps.find((s) => s.effects.includes('read:crm'));
  const joinStep = steps.find(
    (s) => s.effects.includes('write:staging') || s.name.includes('join')
  );
  const verifyStep = steps.find((s) => s.phase === 'VERIFY');
  const commitStep = steps.find((s) => s.phase === 'COMMIT');

  // 1. Contexto precede coleta
  if (contextStep) {
    if (contextStep.dependsOn.length > 0) {
      throw new PlanValidationError(
        'STRUCTURAL_ORDER_VIOLATION',
        `O passo de contexto '${contextStep.stepId}' deve ser o nó inicial e não pode possuir dependências.`,
        { stepId: contextStep.stepId, dependsOn: contextStep.dependsOn }
      );
    }

    if (metaStep && !metaStep.dependsOn.includes(contextStep.stepId)) {
      throw new PlanValidationError(
        'STRUCTURAL_ORDER_VIOLATION',
        `O passo de coleta Meta '${metaStep.stepId}' deve depender do passo de contexto '${contextStep.stepId}'.`,
        { metaStepId: metaStep.stepId, contextStepId: contextStep.stepId }
      );
    }

    if (crmStep && !crmStep.dependsOn.includes(contextStep.stepId)) {
      throw new PlanValidationError(
        'STRUCTURAL_ORDER_VIOLATION',
        `O passo de coleta CRM '${crmStep.stepId}' deve depender do passo de contexto '${contextStep.stepId}'.`,
        { crmStepId: crmStep.stepId, contextStepId: contextStep.stepId }
      );
    }
  }

  // 2. Meta e CRM não devem ter dependência mútua (devem ser paralelizáveis)
  if (metaStep && crmStep) {
    if (
      metaStep.dependsOn.includes(crmStep.stepId) ||
      crmStep.dependsOn.includes(metaStep.stepId)
    ) {
      throw new PlanValidationError(
        'STRUCTURAL_ORDER_VIOLATION',
        `Coletas de Meta e CRM devem ser independentes para permitir execução paralela, mas foi encontrada dependência cruzada.`,
        { metaDependsOn: metaStep.dependsOn, crmDependsOn: crmStep.dependsOn }
      );
    }
  }

  // 3. Join depende de Meta e CRM
  if (joinStep) {
    if (metaStep && !joinStep.dependsOn.includes(metaStep.stepId)) {
      throw new PlanValidationError(
        'STRUCTURAL_ORDER_VIOLATION',
        `O passo de join '${joinStep.stepId}' deve aguardar a coleta Meta '${metaStep.stepId}'.`,
        { joinStepId: joinStep.stepId, metaStepId: metaStep.stepId }
      );
    }
    if (crmStep && !joinStep.dependsOn.includes(crmStep.stepId)) {
      throw new PlanValidationError(
        'STRUCTURAL_ORDER_VIOLATION',
        `O passo de join '${joinStep.stepId}' deve aguardar a coleta CRM '${crmStep.stepId}'.`,
        { joinStepId: joinStep.stepId, crmStepId: crmStep.stepId }
      );
    }
  }

  // 4. Verify depende de Join/Execute
  if (verifyStep && joinStep && !verifyStep.dependsOn.includes(joinStep.stepId)) {
    throw new PlanValidationError(
      'STRUCTURAL_ORDER_VIOLATION',
      `O passo de verificação '${verifyStep.stepId}' deve aguardar o passo de join/análise '${joinStep.stepId}'.`,
      { verifyStepId: verifyStep.stepId, joinStepId: joinStep.stepId }
    );
  }

  // 5. Commit depende de Verify
  if (commitStep && verifyStep && !commitStep.dependsOn.includes(verifyStep.stepId)) {
    throw new PlanValidationError(
      'STRUCTURAL_ORDER_VIOLATION',
      `O passo de commit '${commitStep.stepId}' deve aguardar o passo de verificação '${verifyStep.stepId}'.`,
      { commitStepId: commitStep.stepId, verifyStepId: verifyStep.stepId }
    );
  }
}

/**
 * Valida o plano contra as restrições de capabilities (effects) e budgets do TaskContract.
 */
export function validatePlanAgainstTaskContract(plan: PevcPlan, contract: TaskContract): void {
  const allowedSet = new Set<AllowedEffect>(contract.effects.allowed);
  const forbiddenSet = new Set<AllowedEffect>(contract.effects.forbidden ?? []);

  // 1. Valida Effects dos steps e do plano
  for (const effect of plan.effectsRequired) {
    if (forbiddenSet.has(effect)) {
      throw new PlanValidationError(
        'EFFECT_FORBIDDEN',
        `O efeito '${effect}' é expressamente proibido pelo TaskContract.`,
        { effect, forbiddenEffects: Array.from(forbiddenSet) }
      );
    }
    if (!allowedSet.has(effect)) {
      throw new PlanValidationError(
        'EFFECT_NOT_ALLOWED',
        `O efeito '${effect}' requerido pelo plano não está na lista de efeitos permitidos pelo TaskContract.`,
        { effect, allowedEffects: Array.from(allowedSet) }
      );
    }
  }

  for (const step of plan.steps) {
    for (const stepEffect of step.effects) {
      if (forbiddenSet.has(stepEffect)) {
        throw new PlanValidationError(
          'EFFECT_FORBIDDEN',
          `O passo '${step.stepId}' utiliza o efeito proibido '${stepEffect}'.`,
          { stepId: step.stepId, effect: stepEffect }
        );
      }
      if (!allowedSet.has(stepEffect)) {
        throw new PlanValidationError(
          'EFFECT_NOT_ALLOWED',
          `O passo '${step.stepId}' utiliza o efeito não autorizado '${stepEffect}'.`,
          { stepId: step.stepId, effect: stepEffect }
        );
      }
    }
  }

  // 2. Valida Budgets
  const { budgets } = contract;
  const { totalEstimatedBudget } = plan;

  if (totalEstimatedBudget.totalSteps > budgets.maxSteps) {
    throw new PlanValidationError(
      'BUDGET_EXCEEDED',
      `O plano estima ${totalEstimatedBudget.totalSteps} passos, excedendo o limite de ${budgets.maxSteps} do contrato.`,
      { estimated: totalEstimatedBudget.totalSteps, limit: budgets.maxSteps, budgetKey: 'maxSteps' }
    );
  }

  if (totalEstimatedBudget.totalToolCalls > budgets.maxToolCalls) {
    throw new PlanValidationError(
      'BUDGET_EXCEEDED',
      `O plano estima ${totalEstimatedBudget.totalToolCalls} chamadas de ferramentas, excedendo o limite de ${budgets.maxToolCalls} do contrato.`,
      {
        estimated: totalEstimatedBudget.totalToolCalls,
        limit: budgets.maxToolCalls,
        budgetKey: 'maxToolCalls'
      }
    );
  }

  if (totalEstimatedBudget.totalTokens > budgets.maxTokens) {
    throw new PlanValidationError(
      'BUDGET_EXCEEDED',
      `O plano estima consumo de ${totalEstimatedBudget.totalTokens} tokens, excedendo o limite de ${budgets.maxTokens} do contrato.`,
      {
        estimated: totalEstimatedBudget.totalTokens,
        limit: budgets.maxTokens,
        budgetKey: 'maxTokens'
      }
    );
  }

  if (totalEstimatedBudget.totalCostBrl > budgets.maxCostBrl) {
    throw new PlanValidationError(
      'BUDGET_EXCEEDED',
      `O plano estima custo de R$ ${totalEstimatedBudget.totalCostBrl.toFixed(2)}, excedendo o limite de R$ ${budgets.maxCostBrl.toFixed(2)} do contrato.`,
      {
        estimated: totalEstimatedBudget.totalCostBrl,
        limit: budgets.maxCostBrl,
        budgetKey: 'maxCostBrl'
      }
    );
  }

  if (totalEstimatedBudget.estimatedTimeoutMs > budgets.timeoutMs) {
    throw new PlanValidationError(
      'BUDGET_EXCEEDED',
      `O plano estima latência de ${totalEstimatedBudget.estimatedTimeoutMs}ms, excedendo o timeout de ${budgets.timeoutMs}ms do contrato.`,
      {
        estimated: totalEstimatedBudget.estimatedTimeoutMs,
        limit: budgets.timeoutMs,
        budgetKey: 'timeoutMs'
      }
    );
  }
}

/**
 * Validação abrangente de um Plano PEV-C: Schema + Topologia DAG + Invariantes Estruturais + Conformidade com Contrato.
 */
export function validateDAGPlan(plan: unknown, contract?: TaskContract): PevcPlan {
  const parseResult = PevcPlanSchema.safeParse(plan);
  if (!parseResult.success) {
    throw new PlanValidationError(
      'INVALID_SCHEMA',
      `Estrutura do plano inválida: ${parseResult.error.message}`,
      { zodErrors: parseResult.error.format() }
    );
  }

  const validPlan = parseResult.data;

  // Validação topológica do DAG
  validateDAGTopologicalSort(validPlan.steps);

  // Validação das invariantes de precedência e fork/join
  validateStructuralInvariants(validPlan.steps);

  // Validação contra o contrato se fornecido
  if (contract) {
    validatePlanAgainstTaskContract(validPlan, contract);
  }

  return validPlan;
}

/**
 * Parâmetros para criação do plano canônico.
 */
export interface CanonicalPlanOptions {
  contract: TaskContract;
  runId: string;
  version?: number;
  planId?: string;
  customStepOverrides?: Partial<PlanStep>[];
  enableFallback?: boolean;
}

/**
 * Cria deterministicamente o plano canônico em DAG para tarefas de Análise Criativa / Auditoria S0–S5.
 * Contexto precede coletas; Meta e CRM executam em paralelo; Join, Verify e Commit aguardam dependências.
 */
export function createCanonicalDAGPlan(options: CanonicalPlanOptions): PevcPlan {
  const { contract, runId, version = 1 } = options;
  const planId = options.planId ?? `plan_${contract.taskId}_v${version}`;
  const now = new Date().toISOString();

  // Constrói passos específicos por intenção ou default analítico
  let steps: PlanStep[];

  if (contract.intention === 'ACTION_RECOMMENDATION') {
    steps = [
      {
        stepId: 'step_context',
        name: 'Buscar Contexto do Cliente',
        toolName: 'search_client_context',
        phase: 'PLAN',
        dependsOn: [],
        effects: ['read:memory'],
        estimatedBudget: { estimatedTokens: 300, estimatedCostBrl: 0.005, estimatedTimeoutMs: 1000 },
        params: { client_id: contract.clientId, query: contract.goal }
      },
      {
        stepId: 'step_fetch_meta',
        name: 'Coletar Anúncios e Métricas Meta Ads',
        toolName: 'list_ads',
        phase: 'EXECUTE',
        dependsOn: ['step_context'],
        effects: ['read:meta'],
        estimatedBudget: { estimatedTokens: 800, estimatedCostBrl: 0.015, estimatedTimeoutMs: 2000 },
        params: { client_id: contract.clientId, since: contract.timeframe.since, until: contract.timeframe.until }
      },
      {
        stepId: 'step_fetch_crm',
        name: 'Coletar Leads e Conversões CRM',
        toolName: 'get_crm_leads',
        phase: 'EXECUTE',
        dependsOn: ['step_context'],
        effects: ['read:crm'],
        estimatedBudget: { estimatedTokens: 800, estimatedCostBrl: 0.015, estimatedTimeoutMs: 2000 },
        params: { client_id: contract.clientId, since: contract.timeframe.since, until: contract.timeframe.until }
      },
      {
        stepId: 'step_action_recommendation',
        name: 'Gerar Propostas Formais de Decisão (App)',
        toolName: 'run_app_action_recommendation',
        phase: 'EXECUTE',
        dependsOn: ['step_fetch_meta', 'step_fetch_crm'],
        effects: ['write:staging'],
        estimatedBudget: { estimatedTokens: 1200, estimatedCostBrl: 0.025, estimatedTimeoutMs: 3000 },
        params: { client_id: contract.clientId, timeframe: contract.timeframe }
      },
      {
        stepId: 'step_verify',
        name: 'Verificar Propostas, Pós-condições e Hashes',
        toolName: 'verify_evidence_and_postconditions',
        phase: 'VERIFY',
        dependsOn: ['step_action_recommendation'],
        effects: ['read:memory'],
        estimatedBudget: { estimatedTokens: 400, estimatedCostBrl: 0.008, estimatedTimeoutMs: 1500 },
        params: { minCoverage: contract.successCriteria.minEvidenceCoverage, requireVerifiedClaims: contract.successCriteria.requireVerifiedClaims }
      },
      {
        stepId: 'step_commit',
        name: 'Persistir Propostas Provisórias no Staging',
        toolName: 'commit_insights',
        phase: 'COMMIT',
        dependsOn: ['step_verify'],
        effects: ['write:insight'],
        estimatedBudget: { estimatedTokens: 300, estimatedCostBrl: 0.007, estimatedTimeoutMs: 1500 },
        params: { taskId: contract.taskId, runId }
      }
    ];
  } else if (contract.intention === 'CREATIVE_BRIEF_GENERATION') {
    steps = [
      {
        stepId: 'step_context',
        name: 'Buscar Contexto do Cliente e Mapa da Solução',
        toolName: 'search_client_context',
        phase: 'PLAN',
        dependsOn: [],
        effects: ['read:memory'],
        estimatedBudget: { estimatedTokens: 300, estimatedCostBrl: 0.005, estimatedTimeoutMs: 1000 },
        params: { client_id: contract.clientId, query: contract.goal }
      },
      {
        stepId: 'step_fetch_meta',
        name: 'Coletar Criativos Ativos Meta Ads',
        toolName: 'list_ads',
        phase: 'EXECUTE',
        dependsOn: ['step_context'],
        effects: ['read:meta'],
        estimatedBudget: { estimatedTokens: 800, estimatedCostBrl: 0.015, estimatedTimeoutMs: 2000 },
        params: { client_id: contract.clientId, since: contract.timeframe.since, until: contract.timeframe.until }
      },
      {
        stepId: 'step_creative_brief',
        name: 'Gerar Briefing Criativo Normativo (App)',
        toolName: 'run_app_creative_brief',
        phase: 'EXECUTE',
        dependsOn: ['step_fetch_meta'],
        effects: ['write:staging'],
        estimatedBudget: { estimatedTokens: 1200, estimatedCostBrl: 0.025, estimatedTimeoutMs: 3000 },
        params: { client_id: contract.clientId, timeframe: contract.timeframe }
      },
      {
        stepId: 'step_verify',
        name: 'Verificar Briefings e Conformidade de Compliance',
        toolName: 'verify_evidence_and_postconditions',
        phase: 'VERIFY',
        dependsOn: ['step_creative_brief'],
        effects: ['read:memory'],
        estimatedBudget: { estimatedTokens: 400, estimatedCostBrl: 0.008, estimatedTimeoutMs: 1500 },
        params: { minCoverage: contract.successCriteria.minEvidenceCoverage, requireVerifiedClaims: contract.successCriteria.requireVerifiedClaims }
      },
      {
        stepId: 'step_commit',
        name: 'Persistir Artefato de Briefing Criativo',
        toolName: 'commit_insights',
        phase: 'COMMIT',
        dependsOn: ['step_verify'],
        effects: ['write:insight'],
        estimatedBudget: { estimatedTokens: 300, estimatedCostBrl: 0.007, estimatedTimeoutMs: 1500 },
        params: { taskId: contract.taskId, runId }
      }
    ];
  } else if (contract.intention === 'MEETING_AGENDA_GENERATION') {
    steps = [
      {
        stepId: 'step_context',
        name: 'Buscar Contexto do Cliente',
        toolName: 'search_client_context',
        phase: 'PLAN',
        dependsOn: [],
        effects: ['read:memory'],
        estimatedBudget: { estimatedTokens: 300, estimatedCostBrl: 0.005, estimatedTimeoutMs: 1000 },
        params: { client_id: contract.clientId, query: contract.goal }
      },
      {
        stepId: 'step_fetch_meta',
        name: 'Coletar Métricas Consolidadas Meta Ads',
        toolName: 'list_ads',
        phase: 'EXECUTE',
        dependsOn: ['step_context'],
        effects: ['read:meta'],
        estimatedBudget: { estimatedTokens: 800, estimatedCostBrl: 0.015, estimatedTimeoutMs: 2000 },
        params: { client_id: contract.clientId, since: contract.timeframe.since, until: contract.timeframe.until }
      },
      {
        stepId: 'step_fetch_crm',
        name: 'Coletar Pedidos e Faturamento CRM',
        toolName: 'get_crm_leads',
        phase: 'EXECUTE',
        dependsOn: ['step_context'],
        effects: ['read:crm'],
        estimatedBudget: { estimatedTokens: 800, estimatedCostBrl: 0.015, estimatedTimeoutMs: 2000 },
        params: { client_id: contract.clientId, since: contract.timeframe.since, until: contract.timeframe.until }
      },
      {
        stepId: 'step_meeting_agenda',
        name: 'Compilar Pauta de Reunião com Métricas e Decisões (App)',
        toolName: 'run_app_meeting_agenda',
        phase: 'EXECUTE',
        dependsOn: ['step_fetch_meta', 'step_fetch_crm'],
        effects: ['write:staging'],
        estimatedBudget: { estimatedTokens: 1200, estimatedCostBrl: 0.025, estimatedTimeoutMs: 3000 },
        params: { client_id: contract.clientId, timeframe: contract.timeframe }
      },
      {
        stepId: 'step_verify',
        name: 'Verificar Integridade da Pauta e Locators de Evidência',
        toolName: 'verify_evidence_and_postconditions',
        phase: 'VERIFY',
        dependsOn: ['step_meeting_agenda'],
        effects: ['read:memory'],
        estimatedBudget: { estimatedTokens: 400, estimatedCostBrl: 0.008, estimatedTimeoutMs: 1500 },
        params: { minCoverage: contract.successCriteria.minEvidenceCoverage, requireVerifiedClaims: contract.successCriteria.requireVerifiedClaims }
      },
      {
        stepId: 'step_commit',
        name: 'Persistir Artefato de Pauta de Reunião',
        toolName: 'commit_insights',
        phase: 'COMMIT',
        dependsOn: ['step_verify'],
        effects: ['write:insight'],
        estimatedBudget: { estimatedTokens: 300, estimatedCostBrl: 0.007, estimatedTimeoutMs: 1500 },
        params: { taskId: contract.taskId, runId }
      }
    ];
  } else {
    // Padrão: Reconciliação / Auditoria Analítica Canônica
    steps = [
      {
        stepId: 'step_context',
        name: 'Buscar Contexto do Cliente',
        toolName: 'search_client_context',
        phase: 'PLAN',
        dependsOn: [],
        effects: ['read:memory'],
        estimatedBudget: {
          estimatedTokens: 300,
          estimatedCostBrl: 0.005,
          estimatedTimeoutMs: 1000
        },
        params: {
          client_id: contract.clientId,
          query: contract.goal
        }
      },
      {
        stepId: 'step_fetch_meta',
        name: 'Coletar Anúncios e Métricas Meta Ads',
        toolName: 'list_ads',
        phase: 'EXECUTE',
        dependsOn: ['step_context'],
        effects: ['read:meta'],
        estimatedBudget: {
          estimatedTokens: 800,
          estimatedCostBrl: 0.015,
          estimatedTimeoutMs: 2000
        },
        params: {
          client_id: contract.clientId,
          since: contract.timeframe.since,
          until: contract.timeframe.until
        }
      },
      {
        stepId: 'step_fetch_crm',
        name: 'Coletar Leads e Conversões CRM',
        toolName: 'get_crm_leads',
        phase: 'EXECUTE',
        dependsOn: ['step_context'],
        effects: ['read:crm'],
        estimatedBudget: {
          estimatedTokens: 800,
          estimatedCostBrl: 0.015,
          estimatedTimeoutMs: 2000
        },
        params: {
          client_id: contract.clientId,
          since: contract.timeframe.since,
          until: contract.timeframe.until
        }
      },
      {
        stepId: 'step_join_analysis',
        name: 'Executar Reconciliação e Análise de Criativos (App)',
        toolName: 'run_app_analise_criativos',
        phase: 'EXECUTE',
        dependsOn: ['step_fetch_meta', 'step_fetch_crm'],
        effects: ['write:staging'],
        estimatedBudget: {
          estimatedTokens: 1200,
          estimatedCostBrl: 0.025,
          estimatedTimeoutMs: 3000
        },
        params: {
          client_id: contract.clientId,
          timeframe: contract.timeframe
        }
      },
      {
        stepId: 'step_verify',
        name: 'Verificar Estrutura, Pós-condições e Evidências',
        toolName: 'verify_evidence_and_postconditions',
        phase: 'VERIFY',
        dependsOn: ['step_join_analysis'],
        effects: ['read:memory'],
        estimatedBudget: {
          estimatedTokens: 400,
          estimatedCostBrl: 0.008,
          estimatedTimeoutMs: 1500
        },
        params: {
          minCoverage: contract.successCriteria.minEvidenceCoverage,
          requireVerifiedClaims: contract.successCriteria.requireVerifiedClaims
        }
      },
      {
        stepId: 'step_commit',
        name: 'Persistir Insights Atômicos no Supercérebro',
        toolName: 'commit_insights',
        phase: 'COMMIT',
        dependsOn: ['step_verify'],
        effects: ['write:insight'],
        estimatedBudget: {
          estimatedTokens: 300,
          estimatedCostBrl: 0.007,
          estimatedTimeoutMs: 1500
        },
        params: {
          taskId: contract.taskId,
          runId
        }
      }
    ];
  }

  // Coleta os efeitos únicos requeridos
  const effectsSet = new Set<AllowedEffect>();
  let sumTokens = 0;
  let sumCost = 0;
  let maxPathTimeout = 0;

  for (const step of steps) {
    for (const eff of step.effects) {
      effectsSet.add(eff);
    }
    sumTokens += step.estimatedBudget.estimatedTokens;
    sumCost += step.estimatedBudget.estimatedCostBrl;
    maxPathTimeout += step.estimatedBudget.estimatedTimeoutMs;
  }

  const totalEstimatedBudget: PlanTotalBudget = {
    totalSteps: steps.length,
    totalToolCalls: steps.length,
    totalTokens: sumTokens,
    totalCostBrl: Number(sumCost.toFixed(4)),
    estimatedTimeoutMs: maxPathTimeout
  };

  const plan: PevcPlan = {
    schemaVersion: '1.0.0',
    planId,
    version,
    taskId: contract.taskId,
    runId,
    steps,
    totalEstimatedBudget,
    effectsRequired: Array.from(effectsSet),
    createdAt: now
  };

  // Valida o plano antes de devolvê-lo
  return validateDAGPlan(plan, contract);
}
