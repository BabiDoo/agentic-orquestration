import { createHash } from 'node:crypto';
import {
  Checkpoint,
  TraceEvent,
  TracePhase,
  OperationalValidators,
  canonicalizeJson
} from '@adzhub/contracts';
import {
  PevcMachineState,
  PevcAction,
  pevcReducer,
  createInitialPevcState,
  PevcState
} from './pevc-state-machine.js';
import { AppendOnlyEventLog } from './event-log.js';

/**
 * Erro lançado quando o estado reconstruído durante o replay não coincide com o hash do checkpoint gravado.
 */
export class StateHashDivergenceError extends Error {
  public readonly runId: string;
  public readonly seq: number;
  public readonly expectedHash: string;
  public readonly actualHash: string;

  constructor(params: {
    runId: string;
    seq: number;
    expectedHash: string;
    actualHash: string;
    message?: string;
  }) {
    const formattedMessage =
      params.message ??
      `[StateHashDivergenceError] Divergência de integridade detectada durante o replay no run '${params.runId}' (seq: ${params.seq}). ` +
        `Hash esperado (checkpoint): ${params.expectedHash}, Hash obtido (replay): ${params.actualHash}.`;

    super(formattedMessage);
    this.name = 'StateHashDivergenceError';
    this.runId = params.runId;
    this.seq = params.seq;
    this.expectedHash = params.expectedHash;
    this.actualHash = params.actualHash;
  }
}

/**
 * Mapeia o estado da máquina PEV-C para uma TracePhase compatível com o schema do Checkpoint.
 */
function resolveCheckpointPhase(state: PevcState, previousPhase?: PevcState): TracePhase {
  if (
    state === 'PLAN' ||
    state === 'EXECUTE' ||
    state === 'VERIFY' ||
    state === 'COMMIT' ||
    state === 'ATTRIBUTE' ||
    state === 'REPLAN'
  ) {
    return state;
  }
  if (
    previousPhase &&
    (previousPhase === 'PLAN' ||
      previousPhase === 'EXECUTE' ||
      previousPhase === 'VERIFY' ||
      previousPhase === 'COMMIT' ||
      previousPhase === 'ATTRIBUTE' ||
      previousPhase === 'REPLAN')
  ) {
    return previousPhase;
  }
  return 'PLAN';
}

/**
 * Calcula o hash SHA-256 canônico e determinístico de 64 caracteres de um estado da máquina PEV-C.
 */
export function calculateStateHash(state: PevcMachineState | Record<string, unknown>): string {
  const canonical = canonicalizeJson(state);
  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Cria um snapshot de Checkpoint determinístico e validado para o estado atual da máquina PEV-C.
 */
export function createCheckpoint(
  state: PevcMachineState,
  options?: { checkpointId?: string; createdAt?: string }
): Checkpoint {
  const cleanRun = state.runId.replace(/[^a-zA-Z0-9_-]/g, '');
  const checkpointId = options?.checkpointId ?? `chk_${cleanRun}_${state.seq}`;
  const stateHash = calculateStateHash(state);
  const phase = resolveCheckpointPhase(state.currentPhase, state.previousPhase);
  const createdAt = options?.createdAt ?? new Date().toISOString();

  const checkpoint: Checkpoint = {
    schemaVersion: '1.0.0',
    checkpointId,
    taskId: state.taskId,
    runId: state.runId,
    seq: state.seq,
    stateHash,
    phase,
    serializedState: JSON.parse(JSON.stringify(state)),
    createdAt
  };

  return OperationalValidators.validateCheckpoint(checkpoint);
}

/**
 * Cria um checkpoint final com anotação explícita em cenários de cancelamento ou bloqueio.
 */
export function createCancellationCheckpoint(
  state: PevcMachineState,
  reason: string,
  options?: { checkpointId?: string }
): Checkpoint {
  const cleanRun = state.runId.replace(/[^a-zA-Z0-9_-]/g, '');
  const checkpointId = options?.checkpointId ?? `chk_${cleanRun}_cancel_${state.seq}`;
  const stateWithCancellationMeta: PevcMachineState = {
    ...state,
    metadata: {
      ...state.metadata,
      cancelled: true,
      cancellationReason: reason,
      cancelledAt: new Date().toISOString()
    }
  };

  return createCheckpoint(stateWithCancellationMeta, { checkpointId });
}

/**
 * Gerenciador append-only de persistência e consulta de Checkpoints particionado por run.
 */
export class CheckpointManager {
  private checkpointsByRun: Map<string, Checkpoint[]>;

  constructor() {
    this.checkpointsByRun = new Map();
  }

  /**
   * Salva um novo checkpoint no armazenamento imutável.
   */
  public saveCheckpoint(checkpoint: Checkpoint): Checkpoint {
    const validated = OperationalValidators.validateCheckpoint(checkpoint);
    let list = this.checkpointsByRun.get(validated.runId);
    if (!list) {
      list = [];
      this.checkpointsByRun.set(validated.runId, list);
    }
    list.push(JSON.parse(JSON.stringify(validated)));
    return JSON.parse(JSON.stringify(validated));
  }

  /**
   * Retorna todos os checkpoints registrados para um run ordenados por seq.
   */
  public getCheckpoints(runId: string): Checkpoint[] {
    const list = this.checkpointsByRun.get(runId);
    return list ? JSON.parse(JSON.stringify(list)) : [];
  }

  /**
   * Busca um checkpoint específico pelo número de seq.
   */
  public getCheckpointBySeq(runId: string, seq: number): Checkpoint | undefined {
    const list = this.checkpointsByRun.get(runId);
    const found = list?.find((c) => c.seq === seq);
    return found ? JSON.parse(JSON.stringify(found)) : undefined;
  }

  /**
   * Retorna o checkpoint mais recente registrado para o run.
   */
  public getLatestCheckpoint(runId: string): Checkpoint | undefined {
    const list = this.checkpointsByRun.get(runId);
    if (!list || list.length === 0) return undefined;
    return JSON.parse(JSON.stringify(list[list.length - 1]));
  }
}

/**
 * Resultado do processo de Replay Determinístico.
 */
export interface ReplayResult {
  state: PevcMachineState;
  replayedEventsCount: number;
  stateHash: string;
  confirmedEffects: string[];
  confirmedToolCalls: string[];
  checkpointsValidatedCount: number;
}

/**
 * Converte um TraceEvent gravado de volta na respectiva PevcAction para alimentar o reducer puro.
 */
function mapTraceEventToPevcAction(event: TraceEvent, currentState: PevcMachineState): PevcAction {
  const timestamp = event.timestamp;
  const eventId = event.eventId;
  const opPayload = event.operationalPayload ?? {};

  switch (event.eventType) {
    case 'TASK_ACCEPTED':
      return {
        type: 'INITIALIZE',
        timestamp,
        eventId,
        metadata: (opPayload.metadata as Record<string, unknown>) ?? {}
      };

    case 'PLAN_CREATED':
      if (currentState.currentPhase === 'REPLAN') {
        return {
          type: 'REPLAN_SUBMITTED',
          plan: (opPayload.replanPlan ?? opPayload.plan ?? {}) as Record<string, unknown>,
          timestamp,
          eventId
        };
      }
      return {
        type: 'PLAN_SUBMITTED',
        plan: (opPayload.plan ?? {}) as Record<string, unknown>,
        timestamp,
        eventId
      };

    case 'OBSERVATION_STAGED':
      return {
        type: 'EXECUTION_COMPLETED',
        observations: (opPayload.observations as Array<Record<string, unknown>>) ?? [],
        timestamp,
        eventId
      };

    case 'VERIFICATION_COMPLETED':
      return {
        type: 'VERIFICATION_PASSED',
        evidences: (opPayload.evidences as Array<Record<string, unknown>>) ?? [],
        timestamp,
        eventId
      };

    case 'COMMIT_COMPLETED':
      return {
        type: 'COMMIT_COMPLETED',
        commitResult: (opPayload.commitResult ?? {}) as Record<string, unknown>,
        timestamp,
        eventId
      };

    case 'TOOL_CALL_FAILED':
    case 'VERIFICATION_FAILED':
    case 'COMMIT_REJECTED':
    case 'ATTRIBUTE_FAILED':
      return {
        type: 'FAIL_STEP',
        error: (opPayload.error ?? {
          code: 'TOOL_ERROR',
          category: 'integration',
          recoverability: 'RECOVERABLE',
          safeMessage: 'Falha durante step registrada no trace'
        }) as any,
        timestamp,
        eventId
      };

    case 'REPLAN_TRIGGERED':
    case 'APPROVAL_REQUESTED':
    case 'RUN_FAILED':
      if (currentState.currentPhase === 'ATTRIBUTE') {
        return {
          type: 'ATTRIBUTE_RESOLVED',
          diagnostic: (opPayload.diagnostic ?? {
            code: 'TOOL_ERROR',
            category: 'integration',
            recoverability:
              event.eventType === 'APPROVAL_REQUESTED'
                ? 'REQUIRES_APPROVAL'
                : event.eventType === 'REPLAN_TRIGGERED'
                  ? 'RECOVERABLE'
                  : 'FATAL',
            safeMessage: String(opPayload.reason ?? 'Resolução da falha atribuída')
          }) as any,
          timestamp,
          eventId
        };
      }
      if (event.eventType === 'RUN_FAILED') {
        return {
          type: 'FAIL_FATAL',
          error: (opPayload.error ?? {
            code: 'INTERNAL_ERROR',
            category: 'runtime',
            recoverability: 'FATAL',
            safeMessage: 'Falha fatal registrada'
          }) as any,
          timestamp,
          eventId
        };
      }
      if (event.eventType === 'APPROVAL_REQUESTED') {
        return {
          type: 'BLOCK_REQUESTED',
          reason: String(opPayload.reason ?? 'Aprovação solicitada'),
          scope: opPayload.scope as string | undefined,
          timestamp,
          eventId
        };
      }
      return {
        type: 'INITIALIZE',
        timestamp,
        eventId
      };

    case 'APPROVAL_RESOLVED':
      return {
        type: 'UNBLOCK_APPROVED',
        targetPhase: (opPayload.targetPhase as any) ?? 'EXECUTE',
        approvalId: String(opPayload.approvalId ?? 'appr_unknown'),
        timestamp,
        eventId
      };

    case 'RUN_BLOCKED':
      return {
        type: 'BLOCK_REQUESTED',
        reason: String(opPayload.reason ?? 'Execução bloqueada'),
        scope: opPayload.scope as string | undefined,
        timestamp,
        eventId
      };

    default:
      // Se for outro evento de trace, simula ação compatível
      return {
        type: 'INITIALIZE',
        timestamp,
        eventId
      };
  }
}

/**
 * Reexecuta de forma determinística e livre de IO todos os eventos de um run,
 * validando hashes de estado contra checkpoints e garantindo zero duplicação de efeitos.
 */
export function replayRunEvents(params: {
  eventLog: AppendOnlyEventLog;
  checkpointManager?: CheckpointManager;
  runId: string;
  targetSeq?: number;
  maxReplans?: number;
}): ReplayResult {
  const { eventLog, checkpointManager, runId, targetSeq, maxReplans = 2 } = params;

  const events = eventLog.getEvents(runId, 1, targetSeq);
  if (events.length === 0) {
    throw new Error(`Nenhum evento encontrado no EventLog para o run '${runId}'.`);
  }

  const firstEvent = events[0]!;
  let currentState: PevcMachineState = createInitialPevcState({
    taskId: firstEvent.taskId,
    runId,
    maxReplans
  });

  const confirmedEffectsSet = new Set<string>();
  const confirmedToolCallsSet = new Set<string>();
  let checkpointsValidatedCount = 0;

  for (const event of events) {
    // Registra efeitos e tool calls confirmados sem reexecutar IO
    if (event.operationalPayload) {
      if (typeof event.operationalPayload.toolCallId === 'string') {
        confirmedToolCallsSet.add(event.operationalPayload.toolCallId);
      }
      if (Array.isArray(event.operationalPayload.effects)) {
        for (const eff of event.operationalPayload.effects) {
          confirmedEffectsSet.add(String(eff));
        }
      }
    }

    const action = mapTraceEventToPevcAction(event, currentState);
    const transition = pevcReducer(currentState, action);
    currentState = transition.nextState;

    // Se houver checkpoint salvo para o seq atual, valida integridade do hash
    if (checkpointManager) {
      const checkpoint = checkpointManager.getCheckpointBySeq(runId, currentState.seq);
      if (checkpoint) {
        const actualHash = calculateStateHash(currentState);
        if (actualHash !== checkpoint.stateHash) {
          throw new StateHashDivergenceError({
            runId,
            seq: currentState.seq,
            expectedHash: checkpoint.stateHash,
            actualHash
          });
        }
        checkpointsValidatedCount++;
      }
    }
  }

  const finalStateHash = calculateStateHash(currentState);

  return {
    state: currentState,
    replayedEventsCount: events.length,
    stateHash: finalStateHash,
    confirmedEffects: Array.from(confirmedEffectsSet),
    confirmedToolCalls: Array.from(confirmedToolCallsSet),
    checkpointsValidatedCount
  };
}
