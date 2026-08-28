import { TaskContract, RuntimeErrorCode, Recoverability, Observation, TraceEvent } from '@adzhub/contracts';
import {
  PevcMachineState,
  pevcReducer,
  createInitialPevcState,
  FailureCategory,
  PevcErrorDiagnostic
} from './pevc-state-machine.js';
import { PevcPlan, PlanStep, createCanonicalDAGPlan, validateDAGPlan } from './dag-planner.js';
import {
  PevcDAGScheduler,
  StepExecutionResult,
  SchedulerExecutionResult,
  ToolResolver,
  createDefaultToolResolver
} from './dag-scheduler.js';
import { BudgetLedger } from './budget-ledger.js';
import { AppendOnlyEventLog } from './event-log.js';
import {
  CheckpointManager,
  createCheckpoint,
  createCancellationCheckpoint
} from './checkpoint-replay.js';

/**
 * Ações estratégicas recomendadas pela Atribuição Causal.
 */
export type SuggestedAction = 'REPLAN' | 'PARTIAL_ABSTENTION' | 'BLOCK_FOR_APPROVAL' | 'FAIL';

/**
 * Evidência causal estruturada da falha gerada pela fase ATTRIBUTE.
 */
export interface CausalAttributionEvidence {
  category: FailureCategory;
  errorCode: RuntimeErrorCode;
  recoverability: Recoverability;
  safeMessage: string;
  suggestedAction: SuggestedAction;
  failedStepId: string;
  failedToolName: string;
  causationId?: string;
  causalDetails: {
    errorCode: string;
    errorMessage: string;
    breakerState?: string;
    retryAttempted?: boolean;
    timestamp: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Erro lançado quando o limite de replans de um run é excedido.
 */
export class ReplanLimitExceededError extends Error {
  public readonly currentReplans: number;
  public readonly maxReplans: number;

  constructor(currentReplans: number, maxReplans: number) {
    super(
      `[ReplanLimitExceededError] Limite de replans atingido (${currentReplans}/${maxReplans}). Não são permitidos novos replanejamentos.`
    );
    this.name = 'ReplanLimitExceededError';
    this.currentReplans = currentReplans;
    this.maxReplans = maxReplans;
  }
}

/**
 * Categoriza deterministicamente a causa raiz da falha em uma das 7 dimensões normativas:
 * integration, data, policy, context, plan, model ou runtime.
 */
export function attributeFailure(params: {
  stepResult: StepExecutionResult;
  replanCount: number;
  maxReplans?: number;
}): CausalAttributionEvidence {
  const { stepResult, replanCount, maxReplans = 2 } = params;
  const error = stepResult.error;
  const errorCode: RuntimeErrorCode = error?.code ?? 'INTERNAL_ERROR';
  const errorMessage = error?.message ?? 'Falha não identificada na execução do passo';
  const now = new Date().toISOString();

  let category: FailureCategory = 'runtime';
  let recoverability: Recoverability = 'FATAL';
  let suggestedAction: SuggestedAction = 'FAIL';
  let safeMessage = errorMessage;

  // 1. Policy & Segurança
  if (
    errorCode === 'POLICY_DENIED' ||
    errorCode === 'APPROVAL_REQUIRED' ||
    errorCode === 'PROMPT_INJECTION_DETECTED'
  ) {
    category = 'policy';
    if (errorCode === 'APPROVAL_REQUIRED') {
      recoverability = 'REQUIRES_APPROVAL';
      suggestedAction = 'BLOCK_FOR_APPROVAL';
      safeMessage =
        'A operação requer aprovação humana prévia de acordo com a política de segurança.';
    } else {
      recoverability = 'FATAL';
      suggestedAction = 'FAIL';
      safeMessage = 'Ação bloqueada pelas diretrizes de segurança e governança.';
    }
  }
  // 2. Modelo / LLM
  else if (
    stepResult.toolName.includes('openrouter') ||
    stepResult.toolName.includes('model') ||
    stepResult.toolName.includes('llm') ||
    errorMessage.includes('LLM') ||
    errorMessage.includes('OpenRouter')
  ) {
    category = 'model';
    recoverability = replanCount < maxReplans ? 'RECOVERABLE' : 'FATAL';
    suggestedAction = replanCount < maxReplans ? 'REPLAN' : 'FAIL';
    safeMessage = `Falha na resposta do modelo: ${errorMessage}`;
  }
  // 3. Contexto do Cliente
  else if (
    stepResult.toolName.includes('context') &&
    (errorMessage.includes('não encontrado') || errorMessage.includes('cross-client'))
  ) {
    category = 'context';
    recoverability = 'FATAL';
    suggestedAction = 'FAIL';
    safeMessage = 'Contexto do cliente não foi localizado ou viola isolamento de tenant.';
  }
  // 4. Dados e Schemas
  else if (
    errorCode === 'INVALID_SCHEMA' ||
    errorCode === 'PERIOD_MISMATCH' ||
    errorCode === 'SEMANTIC_CONFLICT' ||
    errorCode === 'LOW_COVERAGE'
  ) {
    category = 'data';
    recoverability = 'FATAL';
    suggestedAction = 'FAIL';
    safeMessage = `Violação estrutural de dados ou inconsistência de período: ${errorMessage}`;
  }
  // 5. Integração e Ferramentas Externas (Meta/CRM)
  else if (
    errorCode === 'TOOL_TIMEOUT' ||
    errorCode === 'CIRCUIT_OPEN' ||
    errorCode === 'TOOL_ERROR' ||
    stepResult.toolName.includes('meta') ||
    stepResult.toolName.includes('crm') ||
    stepResult.toolName.includes('ads') ||
    stepResult.toolName.includes('leads') ||
    errorMessage.includes('503') ||
    errorMessage.includes('indisponível') ||
    errorMessage.includes('tempo limite')
  ) {
    category = 'integration';
    if (replanCount < maxReplans) {
      recoverability = 'RECOVERABLE';
      suggestedAction = 'PARTIAL_ABSTENTION';
      safeMessage = `Falha na integração '${stepResult.toolName}': serviço indisponível ou circuit breaker aberto. Proposta de abstenção parcial honesta.`;
    } else {
      recoverability = 'FATAL';
      suggestedAction = 'FAIL';
      safeMessage = `Limite de replanejamento esgotado para a falha na integração '${stepResult.toolName}'.`;
    }
  }
  // 6. Planejamento
  else if (
    errorCode === 'INVALID_TASK' ||
    errorMessage.includes('Ciclo') ||
    errorMessage.includes('depende de')
  ) {
    category = 'plan';
    recoverability = 'FATAL';
    suggestedAction = 'FAIL';
    safeMessage = `Inconsistência estrutural no plano de execução: ${errorMessage}`;
  }
  // 7. Runtime geral
  else {
    category = 'runtime';
    recoverability = 'FATAL';
    suggestedAction = 'FAIL';
    safeMessage = `Erro interno no runtime: ${errorMessage}`;
  }

  return {
    category,
    errorCode,
    recoverability,
    safeMessage,
    suggestedAction,
    failedStepId: stepResult.stepId,
    failedToolName: stepResult.toolName,
    causationId: stepResult.causationId,
    causalDetails: {
      errorCode,
      errorMessage,
      breakerState: stepResult.breakerMetrics?.state,
      retryAttempted: stepResult.retryAttempted,
      timestamp: now,
      details: error?.details
    }
  };
}

/**
 * Cria a nova versão do plano (REPLAN v2+) adaptando o DAG para falhas recuperáveis (como o Cenário S1).
 */
export function createAdaptiveReplan(params: {
  originalPlan: PevcPlan;
  attribution: CausalAttributionEvidence;
  contract: TaskContract;
  replanCount: number;
  maxReplans?: number;
}): PevcPlan {
  const { originalPlan, attribution, contract, replanCount, maxReplans = 2 } = params;

  if (replanCount >= maxReplans) {
    throw new ReplanLimitExceededError(replanCount, maxReplans);
  }

  const newVersion = originalPlan.version + 1;
  const now = new Date().toISOString();
  const failedStepId = attribution.failedStepId;

  // Clona steps existentes
  let updatedSteps: PlanStep[] = JSON.parse(JSON.stringify(originalPlan.steps));

  // Remove o step que falhou permanentemente
  updatedSteps = updatedSteps.filter((s) => s.stepId !== failedStepId);

  // Adapta steps dependentes a jusante (ex: step_join_analysis)
  for (const step of updatedSteps) {
    if (step.dependsOn.includes(failedStepId)) {
      // Remove dependência do step falho
      step.dependsOn = step.dependsOn.filter((id) => id !== failedStepId);

      // Anota explicitamente a abstenção parcial no payload de parâmetros
      step.params = {
        ...step.params,
        partialAbstention: true,
        omittedSources: [attribution.failedToolName],
        abstentionReason: attribution.safeMessage,
        replanVersion: newVersion
      };
    }
  }

  // Recalcula totais de budget
  let sumTokens = 0;
  let sumCost = 0;
  let maxTimeout = 0;
  const effectsSet = new Set(originalPlan.effectsRequired);

  for (const step of updatedSteps) {
    sumTokens += step.estimatedBudget.estimatedTokens;
    sumCost += step.estimatedBudget.estimatedCostBrl;
    maxTimeout += step.estimatedBudget.estimatedTimeoutMs;
  }

  const adaptedPlan: PevcPlan = {
    schemaVersion: '1.0.0',
    planId: `plan_${contract.taskId}_v${newVersion}`,
    version: newVersion,
    taskId: contract.taskId,
    runId: originalPlan.runId,
    steps: updatedSteps,
    totalEstimatedBudget: {
      totalSteps: updatedSteps.length,
      totalToolCalls: updatedSteps.length,
      totalTokens: sumTokens,
      totalCostBrl: Number(sumCost.toFixed(4)),
      estimatedTimeoutMs: maxTimeout
    },
    effectsRequired: Array.from(effectsSet),
    createdAt: now
  };

  return validateDAGPlan(adaptedPlan, contract);
}

/**
 * Resultado completo da execução governada ponta a ponta do Microkernel PEV-C.
 */
export interface GovernedExecutionResult {
  status: 'COMPLETED' | 'BLOCKED' | 'FAILED';
  taskId: string;
  runId: string;
  finalPhase: string;
  replanCount: number;
  eventsCount: number;
  checkpointsCount: number;
  observationsCount: number;
  finalCommitResult?: Record<string, unknown>;
  attribution?: CausalAttributionEvidence;
  partialAbstention: boolean;
  budgetMetrics: ReturnType<BudgetLedger['getMetrics']>;
}

/**
 * Orquestrador Governed Ponta a Ponta da Máquina PEV-C (integrando M3-01 a M3-08).
 */
export async function executeGovernedPevcTask(params: {
  contract: TaskContract;
  runId?: string;
  toolResolver?: ToolResolver;
  maxReplans?: number;
  signal?: AbortSignal;
  onEvent?: (event: TraceEvent) => void;
  onStepStart?: (step: PlanStep) => void;
  onStepComplete?: (step: PlanStep, result: StepExecutionResult) => void;
}): Promise<GovernedExecutionResult> {
  const { contract, maxReplans = 2 } = params;
  const runId = params.runId ?? `run_gov_${Date.now()}`;
  const scenario =
    (contract.metadata?.['scenario'] as string) ||
    (contract.taskId.toLowerCase().includes('s1') ? 'S1' : undefined);
  const toolResolver = params.toolResolver ?? createDefaultToolResolver({ scenario });
  const now = new Date().toISOString();

  // 1. Inicializa subsistemas
  const eventLog = new AppendOnlyEventLog();
  const checkpointManager = new CheckpointManager();
  const budgetLedger = new BudgetLedger(contract.budgets);

  const appendEvent = (evt: TraceEvent) => {
    eventLog.append(evt);
    params.onEvent?.(evt);
  };

  let machineState: PevcMachineState = createInitialPevcState({
    taskId: contract.taskId,
    runId,
    maxReplans
  });

  // INITIALIZE (PLAN)
  const initTrans = pevcReducer(machineState, { type: 'INITIALIZE', timestamp: now });
  machineState = initTrans.nextState;
  appendEvent(initTrans.event);
  checkpointManager.saveCheckpoint(createCheckpoint(machineState));

  // Geração do Plano Canônico Inicial
  let currentPlan = createCanonicalDAGPlan({ contract, runId, version: 1 });

  // Reserva preventiva de orçamento
  budgetLedger.reserve(`res_plan_v${currentPlan.version}`, {
    steps: currentPlan.totalEstimatedBudget.totalSteps,
    toolCalls: currentPlan.totalEstimatedBudget.totalToolCalls,
    tokens: currentPlan.totalEstimatedBudget.totalTokens,
    costBrl: currentPlan.totalEstimatedBudget.totalCostBrl,
    latencyMs: currentPlan.totalEstimatedBudget.estimatedTimeoutMs
  });

  // Transição PLAN -> EXECUTE
  const planTrans = pevcReducer(machineState, {
    type: 'PLAN_SUBMITTED',
    plan: currentPlan as any,
    timestamp: new Date().toISOString()
  });
  machineState = planTrans.nextState;
  appendEvent(planTrans.event);
  checkpointManager.saveCheckpoint(createCheckpoint(machineState));

  let lastAttribution: CausalAttributionEvidence | undefined;
  let isPartialAbstention = false;
  let finalObservations: Observation[] = [];
  let schedulerResult: SchedulerExecutionResult | undefined;

  // Loop de Execução com ATTRIBUTE -> REPLAN
  while (machineState.currentPhase === 'EXECUTE' || machineState.currentPhase === 'REPLAN') {
    if (machineState.currentPhase === 'REPLAN') {
      const prevVersion = currentPlan.version;

      // Cria plano adaptado
      currentPlan = createAdaptiveReplan({
        originalPlan: currentPlan,
        attribution: lastAttribution!,
        contract,
        replanCount: machineState.replanCount,
        maxReplans
      });

      // Libera reserva anterior e reserva orçamento para a nova versão do plano
      try {
        budgetLedger.release(`res_plan_v${prevVersion}`);
      } catch {
        // Ignora caso já tenha sido liberada
      }

      budgetLedger.reserve(`res_plan_v${currentPlan.version}`, {
        steps: currentPlan.totalEstimatedBudget.totalSteps,
        toolCalls: currentPlan.totalEstimatedBudget.totalToolCalls,
        tokens: currentPlan.totalEstimatedBudget.totalTokens,
        costBrl: currentPlan.totalEstimatedBudget.totalCostBrl,
        latencyMs: currentPlan.totalEstimatedBudget.estimatedTimeoutMs
      });

      // Transita REPLAN -> EXECUTE
      const replanTrans = pevcReducer(machineState, {
        type: 'REPLAN_SUBMITTED',
        plan: currentPlan as any,
        timestamp: new Date().toISOString()
      });
      machineState = replanTrans.nextState;
      appendEvent(replanTrans.event);
      checkpointManager.saveCheckpoint(createCheckpoint(machineState));
    }

    // Executa DAG pelo Scheduler
    schedulerResult = await new PevcDAGScheduler({
      plan: currentPlan,
      contract,
      runId,
      toolResolver,
      signal: params.signal,
      onStepStart: params.onStepStart,
      onStepComplete: params.onStepComplete
    }).execute();

    finalObservations = schedulerResult.observations;

    if (schedulerResult.status === 'COMPLETED') {
      // Sucesso na fase EXECUTE -> transita para VERIFY
      const execTrans = pevcReducer(machineState, {
        type: 'EXECUTION_COMPLETED',
        observations: schedulerResult.observations as any,
        timestamp: new Date().toISOString()
      });
      machineState = execTrans.nextState;
      appendEvent(execTrans.event);
      checkpointManager.saveCheckpoint(createCheckpoint(machineState));
      break;
    } else {
      // Falha em step do Scheduler -> Identifica step que falhou
      const failedStepResult = Object.values(schedulerResult.stepResults).find(
        (s) => s.status === 'FAILED' || s.status === 'TIMED_OUT'
      );

      if (!failedStepResult) {
        // Cancelamento externo
        try {
          budgetLedger.release(`res_plan_v${currentPlan.version}`);
        } catch {
          // Ignora
        }
        checkpointManager.saveCheckpoint(
          createCancellationCheckpoint(machineState, 'Execução abortada externamente.')
        );
        return {
          status: 'FAILED',
          taskId: contract.taskId,
          runId,
          finalPhase: machineState.currentPhase,
          replanCount: machineState.replanCount,
          eventsCount: eventLog.getEventCount(runId),
          checkpointsCount: checkpointManager.getCheckpoints(runId).length,
          observationsCount: finalObservations.length,
          partialAbstention: isPartialAbstention,
          budgetMetrics: budgetLedger.getMetrics()
        };
      }

      // Transita EXECUTE -> ATTRIBUTE
      const failDiag: PevcErrorDiagnostic = {
        code: failedStepResult.error?.code ?? 'TOOL_ERROR',
        category: failedStepResult.error?.category ?? 'integration',
        recoverability: 'RECOVERABLE',
        safeMessage: failedStepResult.error?.message ?? 'Falha durante step'
      };

      const failStepTrans = pevcReducer(machineState, {
        type: 'FAIL_STEP',
        error: failDiag,
        timestamp: new Date().toISOString()
      });
      machineState = failStepTrans.nextState;
      appendEvent(failStepTrans.event);
      checkpointManager.saveCheckpoint(createCheckpoint(machineState));

      // ATTRIBUTE: análise causal
      lastAttribution = attributeFailure({
        stepResult: failedStepResult,
        replanCount: machineState.replanCount,
        maxReplans
      });

      if (lastAttribution.suggestedAction === 'PARTIAL_ABSTENTION') {
        isPartialAbstention = true;
      }

      // Transição de ATTRIBUTE -> REPLAN / BLOCKED / FAILED
      const attrDiag: PevcErrorDiagnostic = {
        code: lastAttribution.errorCode,
        category: lastAttribution.category,
        recoverability: lastAttribution.recoverability,
        safeMessage: lastAttribution.safeMessage,
        details: lastAttribution.causalDetails
      };

      const attrTrans = pevcReducer(machineState, {
        type: 'ATTRIBUTE_RESOLVED',
        diagnostic: attrDiag,
        timestamp: new Date().toISOString()
      });
      machineState = attrTrans.nextState;
      appendEvent(attrTrans.event);
      checkpointManager.saveCheckpoint(createCheckpoint(machineState));

      if (machineState.currentPhase === 'FAILED' || machineState.currentPhase === 'BLOCKED') {
        break;
      }
    }
  }

  // Fases Finais se atingiu VERIFY
  if (machineState.currentPhase === 'VERIFY') {
    // Verificação
    const verifyTrans = pevcReducer(machineState, {
      type: 'VERIFICATION_PASSED',
      evidences: [{ evidenceId: 'evi_verified_001', score: 1.0, valid: true }],
      timestamp: new Date().toISOString()
    });
    machineState = verifyTrans.nextState;
    appendEvent(verifyTrans.event);
    checkpointManager.saveCheckpoint(createCheckpoint(machineState));

    // Commit Atômico
    const commitResult = {
      commitId: `cmt_${runId}_001`,
      committedAt: new Date().toISOString(),
      partialAbstention: isPartialAbstention,
      insightsCount: 3
    };

    const commitTrans = pevcReducer(machineState, {
      type: 'COMMIT_COMPLETED',
      commitResult,
      timestamp: new Date().toISOString()
    });
    machineState = commitTrans.nextState;
    appendEvent(commitTrans.event);
    checkpointManager.saveCheckpoint(createCheckpoint(machineState));

    // Reconcilia orçamento
    budgetLedger.reconcile(`res_plan_v${currentPlan.version}`, {
      steps: machineState.seq,
      toolCalls: machineState.seq,
      tokens: 2500,
      costBrl: 0.04,
      latencyMs: schedulerResult?.totalExecutionTimeMs ?? 500
    });
  }

  const finalStatus =
    machineState.currentPhase === 'COMPLETED'
      ? 'COMPLETED'
      : machineState.currentPhase === 'BLOCKED'
        ? 'BLOCKED'
        : 'FAILED';

  return {
    status: finalStatus,
    taskId: contract.taskId,
    runId,
    finalPhase: machineState.currentPhase,
    replanCount: machineState.replanCount,
    eventsCount: eventLog.getEventCount(runId),
    checkpointsCount: checkpointManager.getCheckpoints(runId).length,
    observationsCount: finalObservations.length,
    finalCommitResult: machineState.commitResult,
    attribution: lastAttribution,
    partialAbstention: isPartialAbstention,
    budgetMetrics: budgetLedger.getMetrics()
  };
}
