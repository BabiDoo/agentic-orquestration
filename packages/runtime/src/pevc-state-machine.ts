import {
  TraceEvent,
  TracePhase,
  RuntimeEventType,
  Recoverability,
  RuntimeErrorCode
} from '@adzhub/contracts';

/**
 * Catálogo canônico dos 9 estados da Máquina PEV-C.
 */
export type PevcState =
  | 'PLAN'
  | 'EXECUTE'
  | 'VERIFY'
  | 'COMMIT'
  | 'ATTRIBUTE'
  | 'REPLAN'
  | 'BLOCKED'
  | 'FAILED'
  | 'COMPLETED';

/**
 * Categorias causais de falha segundo a arquitetura do microkernel PEV-C.
 */
export type FailureCategory =
  'integration' | 'data' | 'policy' | 'context' | 'plan' | 'model' | 'runtime';

/**
 * Informações estruturadas da última falha causal atribuída.
 */
export interface PevcErrorDiagnostic {
  code: RuntimeErrorCode;
  category: FailureCategory;
  recoverability: Recoverability;
  safeMessage: string;
  details?: Record<string, unknown>;
}

/**
 * Estado imutável da Máquina PEV-C.
 */
export interface PevcMachineState {
  taskId: string;
  runId: string;
  correlationId: string;
  currentPhase: PevcState;
  previousPhase?: PevcState;
  seq: number;
  lastEventId?: string;
  lastCausationId?: string;
  replanCount: number;
  maxReplans: number;
  plan?: Record<string, unknown>;
  observations: Array<Record<string, unknown>>;
  evidences: Array<Record<string, unknown>>;
  commitResult?: Record<string, unknown>;
  lastError?: PevcErrorDiagnostic;
  metadata: Record<string, unknown>;
}

/**
 * Ações discretas que alimentam o reducer determinístico.
 */
export type PevcAction =
  | {
      type: 'INITIALIZE';
      timestamp: string;
      eventId?: string;
      metadata?: Record<string, unknown>;
    }
  | {
      type: 'PLAN_SUBMITTED';
      plan: Record<string, unknown>;
      timestamp: string;
      eventId?: string;
      metadata?: Record<string, unknown>;
    }
  | {
      type: 'EXECUTION_COMPLETED';
      observations: Array<Record<string, unknown>>;
      timestamp: string;
      eventId?: string;
      metadata?: Record<string, unknown>;
    }
  | {
      type: 'VERIFICATION_PASSED';
      evidences: Array<Record<string, unknown>>;
      timestamp: string;
      eventId?: string;
      metadata?: Record<string, unknown>;
    }
  | {
      type: 'COMMIT_COMPLETED';
      commitResult: Record<string, unknown>;
      timestamp: string;
      eventId?: string;
      metadata?: Record<string, unknown>;
    }
  | {
      type: 'FAIL_STEP';
      error: PevcErrorDiagnostic;
      timestamp: string;
      eventId?: string;
      metadata?: Record<string, unknown>;
    }
  | {
      type: 'ATTRIBUTE_RESOLVED';
      diagnostic: PevcErrorDiagnostic;
      timestamp: string;
      eventId?: string;
      metadata?: Record<string, unknown>;
    }
  | {
      type: 'REPLAN_SUBMITTED';
      plan: Record<string, unknown>;
      timestamp: string;
      eventId?: string;
      metadata?: Record<string, unknown>;
    }
  | {
      type: 'BLOCK_REQUESTED';
      reason: string;
      scope?: string;
      timestamp: string;
      eventId?: string;
      metadata?: Record<string, unknown>;
    }
  | {
      type: 'UNBLOCK_APPROVED';
      targetPhase: 'PLAN' | 'EXECUTE' | 'COMMIT';
      approvalId: string;
      timestamp: string;
      eventId?: string;
      metadata?: Record<string, unknown>;
    }
  | {
      type: 'FAIL_FATAL';
      error: PevcErrorDiagnostic;
      timestamp: string;
      eventId?: string;
      metadata?: Record<string, unknown>;
    };

/**
 * Resultado determinístico retornado pelo reducer.
 */
export interface PevcTransitionResult {
  nextState: PevcMachineState;
  event: TraceEvent;
}

/**
 * Erro disparado quando uma transição não é permitida pela matriz de estados.
 */
export class InvalidStateTransitionError extends Error {
  public readonly currentPhase: PevcState;
  public readonly actionType: string;
  public readonly reason: string;

  constructor(currentPhase: PevcState, actionType: string, reason: string) {
    super(
      `Transição de estado inválida: Não é permitido executar '${actionType}' a partir do estado '${currentPhase}'. Motivo: ${reason}`
    );
    this.name = 'InvalidStateTransitionError';
    this.currentPhase = currentPhase;
    this.actionType = actionType;
    this.reason = reason;
  }
}

/**
 * Cria o estado inicial padrão para uma nova execução da máquina PEV-C.
 */
export function createInitialPevcState(params: {
  taskId: string;
  runId: string;
  correlationId?: string;
  maxReplans?: number;
  metadata?: Record<string, unknown>;
}): PevcMachineState {
  return {
    taskId: params.taskId,
    runId: params.runId,
    correlationId: params.correlationId ?? `corr_${params.runId}`,
    currentPhase: 'PLAN',
    seq: 0,
    replanCount: 0,
    maxReplans: params.maxReplans ?? 2,
    observations: [],
    evidences: [],
    metadata: params.metadata ?? {}
  };
}

/**
 * Mapeia o estado da máquina para uma TracePhase válida para o TraceEvent.
 */
function resolveTracePhase(state: PevcState, previousPhase?: PevcState): TracePhase {
  switch (state) {
    case 'PLAN':
      return 'PLAN';
    case 'EXECUTE':
      return 'EXECUTE';
    case 'VERIFY':
      return 'VERIFY';
    case 'COMMIT':
      return 'COMMIT';
    case 'ATTRIBUTE':
      return 'ATTRIBUTE';
    case 'REPLAN':
      return 'REPLAN';
    case 'BLOCKED':
    case 'FAILED':
    case 'COMPLETED':
      // Para estados terminais/bloqueados, rastreamos na fase associada
      if (previousPhase && isTracePhase(previousPhase)) {
        return previousPhase;
      }
      return 'PLAN';
    default:
      return 'PLAN';
  }
}

function isTracePhase(phase: PevcState): phase is TracePhase {
  return (
    phase === 'PLAN' ||
    phase === 'EXECUTE' ||
    phase === 'VERIFY' ||
    phase === 'COMMIT' ||
    phase === 'ATTRIBUTE' ||
    phase === 'REPLAN'
  );
}

/**
 * Gera um ID de evento válido no padrão evt_...
 */
function formatEventId(runId: string, seq: number, explicitId?: string): string {
  if (explicitId && /^evt_[a-zA-Z0-9_-]+$/.test(explicitId)) {
    return explicitId;
  }
  const cleanRun = runId.replace(/[^a-zA-Z0-9_-]/g, '');
  return `evt_${cleanRun}_${seq}`;
}

/**
 * Reducer puro e determinístico da Máquina de Estados PEV-C.
 * Sem IO, sem efeitos colaterais assíncronos.
 */
export function pevcReducer(state: PevcMachineState, action: PevcAction): PevcTransitionResult {
  const isTerminal = state.currentPhase === 'COMPLETED' || state.currentPhase === 'FAILED';

  if (isTerminal) {
    throw new InvalidStateTransitionError(
      state.currentPhase,
      action.type,
      `A máquina já está em estado terminal '${state.currentPhase}' e não aceita mais transições.`
    );
  }

  const nextSeq = state.seq + 1;
  const eventId = formatEventId(state.runId, nextSeq, action.eventId);
  const causationId = state.lastEventId ?? state.lastCausationId;

  let nextPhase: PevcState = state.currentPhase;
  let eventType: RuntimeEventType;
  let operationalPayload: Record<string, unknown> = {};
  let redactedPayload: Record<string, unknown> = {};
  let updatedPlan = state.plan;
  let updatedObservations = [...state.observations];
  let updatedEvidences = [...state.evidences];
  let updatedCommitResult = state.commitResult;
  let updatedLastError = state.lastError;
  let updatedReplanCount = state.replanCount;

  switch (action.type) {
    case 'INITIALIZE': {
      if (state.seq !== 0) {
        throw new InvalidStateTransitionError(
          state.currentPhase,
          action.type,
          'INITIALIZE só pode ser executado no início da máquina (seq = 0).'
        );
      }
      nextPhase = 'PLAN';
      eventType = 'TASK_ACCEPTED';
      operationalPayload = {
        taskId: state.taskId,
        runId: state.runId,
        metadata: action.metadata ?? state.metadata
      };
      redactedPayload = { taskId: state.taskId, runId: state.runId };
      break;
    }

    case 'PLAN_SUBMITTED': {
      if (state.currentPhase !== 'PLAN') {
        throw new InvalidStateTransitionError(
          state.currentPhase,
          action.type,
          `PLAN_SUBMITTED só é permitido a partir do estado 'PLAN'. Estado atual: '${state.currentPhase}'.`
        );
      }
      nextPhase = 'EXECUTE';
      eventType = 'PLAN_CREATED';
      updatedPlan = action.plan;
      operationalPayload = { plan: action.plan, replanCount: state.replanCount };
      redactedPayload = { planVersion: (action.plan as any)?.version ?? 1 };
      break;
    }

    case 'EXECUTION_COMPLETED': {
      if (state.currentPhase !== 'EXECUTE') {
        throw new InvalidStateTransitionError(
          state.currentPhase,
          action.type,
          `EXECUTION_COMPLETED só é permitido a partir do estado 'EXECUTE'. Estado atual: '${state.currentPhase}'.`
        );
      }
      nextPhase = 'VERIFY';
      eventType = 'OBSERVATION_STAGED';
      updatedObservations = [...state.observations, ...action.observations];
      operationalPayload = {
        observations: action.observations,
        observationCount: action.observations.length,
        totalObservations: updatedObservations.length
      };
      redactedPayload = { count: action.observations.length };
      break;
    }

    case 'VERIFICATION_PASSED': {
      if (state.currentPhase !== 'VERIFY') {
        throw new InvalidStateTransitionError(
          state.currentPhase,
          action.type,
          `VERIFICATION_PASSED só é permitido a partir do estado 'VERIFY'. Estado atual: '${state.currentPhase}'.`
        );
      }
      nextPhase = 'COMMIT';
      eventType = 'VERIFICATION_COMPLETED';
      updatedEvidences = [...state.evidences, ...action.evidences];
      operationalPayload = {
        evidences: action.evidences,
        evidenceCount: action.evidences.length,
        totalEvidences: updatedEvidences.length
      };
      redactedPayload = { count: action.evidences.length };
      break;
    }

    case 'COMMIT_COMPLETED': {
      if (state.currentPhase !== 'COMMIT') {
        throw new InvalidStateTransitionError(
          state.currentPhase,
          action.type,
          `COMMIT_COMPLETED só é permitido a partir do estado 'COMMIT'. Estado atual: '${state.currentPhase}'.`
        );
      }
      nextPhase = 'COMPLETED';
      eventType = 'COMMIT_COMPLETED';
      updatedCommitResult = action.commitResult;
      operationalPayload = { commitResult: action.commitResult };
      redactedPayload = { committed: true };
      break;
    }

    case 'FAIL_STEP': {
      if (
        state.currentPhase !== 'PLAN' &&
        state.currentPhase !== 'EXECUTE' &&
        state.currentPhase !== 'VERIFY' &&
        state.currentPhase !== 'COMMIT'
      ) {
        throw new InvalidStateTransitionError(
          state.currentPhase,
          action.type,
          `FAIL_STEP só é permitido a partir de PLAN, EXECUTE, VERIFY ou COMMIT. Estado atual: '${state.currentPhase}'.`
        );
      }

      nextPhase = 'ATTRIBUTE';
      updatedLastError = action.error;

      if (state.currentPhase === 'EXECUTE') {
        eventType = 'TOOL_CALL_FAILED';
      } else if (state.currentPhase === 'VERIFY') {
        eventType = 'VERIFICATION_FAILED';
      } else if (state.currentPhase === 'COMMIT') {
        eventType = 'COMMIT_REJECTED';
      } else {
        eventType = 'ATTRIBUTE_FAILED';
      }

      operationalPayload = {
        failedPhase: state.currentPhase,
        error: action.error
      };
      redactedPayload = {
        failedPhase: state.currentPhase,
        code: action.error.code,
        category: action.error.category
      };
      break;
    }

    case 'ATTRIBUTE_RESOLVED': {
      if (state.currentPhase !== 'ATTRIBUTE') {
        throw new InvalidStateTransitionError(
          state.currentPhase,
          action.type,
          `ATTRIBUTE_RESOLVED só é permitido a partir do estado 'ATTRIBUTE'. Estado atual: '${state.currentPhase}'.`
        );
      }

      updatedLastError = action.diagnostic;

      if (action.diagnostic.recoverability === 'REQUIRES_APPROVAL') {
        nextPhase = 'BLOCKED';
        eventType = 'APPROVAL_REQUESTED';
        operationalPayload = {
          diagnostic: action.diagnostic,
          reason: action.diagnostic.safeMessage
        };
        redactedPayload = { code: action.diagnostic.code, status: 'BLOCKED_FOR_APPROVAL' };
      } else if (
        action.diagnostic.recoverability === 'RECOVERABLE' &&
        state.replanCount < state.maxReplans
      ) {
        nextPhase = 'REPLAN';
        eventType = 'REPLAN_TRIGGERED';
        operationalPayload = {
          diagnostic: action.diagnostic,
          currentReplans: state.replanCount,
          maxReplans: state.maxReplans
        };
        redactedPayload = {
          replanCount: state.replanCount + 1,
          code: action.diagnostic.code
        };
      } else {
        // FATAL ou limite de replans excedido
        nextPhase = 'FAILED';
        eventType = 'RUN_FAILED';
        operationalPayload = {
          diagnostic: action.diagnostic,
          reason:
            state.replanCount >= state.maxReplans
              ? `Limite máximo de ${state.maxReplans} replans atingido.`
              : action.diagnostic.safeMessage
        };
        redactedPayload = {
          code: action.diagnostic.code,
          fatal: true,
          replanLimitReached: state.replanCount >= state.maxReplans
        };
      }
      break;
    }

    case 'REPLAN_SUBMITTED': {
      if (state.currentPhase !== 'REPLAN') {
        throw new InvalidStateTransitionError(
          state.currentPhase,
          action.type,
          `REPLAN_SUBMITTED só é permitido a partir do estado 'REPLAN'. Estado atual: '${state.currentPhase}'.`
        );
      }
      nextPhase = 'EXECUTE';
      eventType = 'PLAN_CREATED';
      updatedPlan = action.plan;
      updatedReplanCount = state.replanCount + 1;
      operationalPayload = {
        replanPlan: action.plan,
        replanCount: updatedReplanCount
      };
      redactedPayload = { replanCount: updatedReplanCount };
      break;
    }

    case 'BLOCK_REQUESTED': {
      if (state.currentPhase === 'BLOCKED') {
        throw new InvalidStateTransitionError(
          state.currentPhase,
          action.type,
          'A máquina já se encontra em estado BLOCKED.'
        );
      }
      nextPhase = 'BLOCKED';
      eventType = 'RUN_BLOCKED';
      operationalPayload = { reason: action.reason, scope: action.scope };
      redactedPayload = { reason: action.reason };
      break;
    }

    case 'UNBLOCK_APPROVED': {
      if (state.currentPhase !== 'BLOCKED') {
        throw new InvalidStateTransitionError(
          state.currentPhase,
          action.type,
          `UNBLOCK_APPROVED só é permitido a partir do estado 'BLOCKED'. Estado atual: '${state.currentPhase}'.`
        );
      }
      nextPhase = action.targetPhase;
      eventType = 'APPROVAL_RESOLVED';
      operationalPayload = {
        approvalId: action.approvalId,
        targetPhase: action.targetPhase
      };
      redactedPayload = { approvalId: action.approvalId, targetPhase: action.targetPhase };
      break;
    }

    case 'FAIL_FATAL': {
      nextPhase = 'FAILED';
      eventType = 'RUN_FAILED';
      updatedLastError = action.error;
      operationalPayload = { error: action.error };
      redactedPayload = { code: action.error.code, fatal: true };
      break;
    }

    default: {
      const exhaustiveCheck: never = action;
      throw new Error(`Tipo de ação não reconhecido: ${(exhaustiveCheck as any)?.type}`);
    }
  }

  const phaseForTrace = resolveTracePhase(nextPhase, state.currentPhase);

  const event: TraceEvent = {
    schemaVersion: '1.0.0',
    eventId,
    seq: nextSeq,
    taskId: state.taskId,
    runId: state.runId,
    eventType,
    causationId,
    correlationId: state.correlationId,
    phase: phaseForTrace,
    operationalPayload,
    redactedPayload,
    timestamp: action.timestamp
  };

  const nextState: PevcMachineState = {
    taskId: state.taskId,
    runId: state.runId,
    correlationId: state.correlationId,
    currentPhase: nextPhase,
    previousPhase: state.currentPhase,
    seq: nextSeq,
    lastEventId: eventId,
    lastCausationId: causationId,
    replanCount: updatedReplanCount,
    maxReplans: state.maxReplans,
    plan: updatedPlan,
    observations: updatedObservations,
    evidences: updatedEvidences,
    commitResult: updatedCommitResult,
    lastError: updatedLastError,
    metadata: {
      ...state.metadata,
      ...(action.metadata ?? {})
    }
  };

  return { nextState, event };
}
