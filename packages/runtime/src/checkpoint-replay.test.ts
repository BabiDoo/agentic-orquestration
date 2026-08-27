import { describe, it, expect } from 'vitest';
import {
  createCheckpoint,
  createCancellationCheckpoint,
  calculateStateHash,
  CheckpointManager,
  replayRunEvents,
  StateHashDivergenceError
} from './checkpoint-replay.js';
import { createInitialPevcState, pevcReducer } from './pevc-state-machine.js';
import { AppendOnlyEventLog } from './event-log.js';
import { OperationalValidators } from '@adzhub/contracts';

describe('Checkpoints and Deterministic Replay (M3-06)', () => {
  const taskId = 'task_creative_audit_001';
  const runId = 'run_replay_test_001';
  const isoTime = '2026-08-25T10:00:00.000Z';

  it('deve criar checkpoint com seq e stateHash SHA-256 de 64 caracteres válido', () => {
    let state = createInitialPevcState({ taskId, runId });
    state = pevcReducer(state, { type: 'INITIALIZE', timestamp: isoTime }).nextState;

    const checkpoint = createCheckpoint(state);

    expect(checkpoint.checkpointId).toBe(`chk_${runId}_1`);
    expect(checkpoint.seq).toBe(1);
    expect(checkpoint.stateHash).toHaveLength(64);
    expect(/^[a-f0-9]{64}$/.test(checkpoint.stateHash)).toBe(true);
    expect(checkpoint.phase).toBe('PLAN');
    expect(OperationalValidators.validateCheckpoint(checkpoint)).toBeTruthy();
  });

  it('deve reconstruir exatamente o mesmo estado a partir dos eventos gravados no Event Log', () => {
    const eventLog = new AppendOnlyEventLog();
    const checkpointManager = new CheckpointManager();

    // Executa máquina e grava eventos e checkpoints
    let state = createInitialPevcState({ taskId, runId });

    // Step 1: Initialize
    const step1 = pevcReducer(state, { type: 'INITIALIZE', timestamp: isoTime });
    state = step1.nextState;
    eventLog.append(step1.event);
    checkpointManager.saveCheckpoint(createCheckpoint(state));

    // Step 2: Plan
    const step2 = pevcReducer(state, {
      type: 'PLAN_SUBMITTED',
      plan: { version: 1, steps: ['list_ads', 'get_leads'] },
      timestamp: isoTime
    });
    state = step2.nextState;
    eventLog.append(step2.event);
    checkpointManager.saveCheckpoint(createCheckpoint(state));

    // Step 3: Execution completed
    const step3 = pevcReducer(state, {
      type: 'EXECUTION_COMPLETED',
      observations: [{ obsId: 'obs_1', payloadHash: 'a'.repeat(64) }],
      timestamp: isoTime
    });
    state = step3.nextState;
    eventLog.append(step3.event);
    checkpointManager.saveCheckpoint(createCheckpoint(state));

    // Step 4: Verification passed
    const step4 = pevcReducer(state, {
      type: 'VERIFICATION_PASSED',
      evidences: [{ evidenceId: 'evi_1', score: 1.0 }],
      timestamp: isoTime
    });
    state = step4.nextState;
    eventLog.append(step4.event);
    checkpointManager.saveCheckpoint(createCheckpoint(state));

    // Step 5: Commit completed
    const step5 = pevcReducer(state, {
      type: 'COMMIT_COMPLETED',
      commitResult: { commitId: 'cmt_001', success: true },
      timestamp: isoTime
    });
    state = step5.nextState;
    eventLog.append(step5.event);
    checkpointManager.saveCheckpoint(createCheckpoint(state));

    // Replay do run completo
    const replay = replayRunEvents({
      eventLog,
      checkpointManager,
      runId
    });

    expect(replay.replayedEventsCount).toBe(5);
    expect(replay.checkpointsValidatedCount).toBe(5);
    expect(replay.state.currentPhase).toBe('COMPLETED');
    expect(replay.state.seq).toBe(5);
    expect(replay.stateHash).toBe(calculateStateHash(state));
    expect(replay.state.observations).toHaveLength(1);
    expect(replay.state.evidences).toHaveLength(1);
  });

  it('deve encerrar o replay imediatamente com StateHashDivergenceError caso haja divergência de hash', () => {
    const eventLog = new AppendOnlyEventLog();
    const checkpointManager = new CheckpointManager();

    let state = createInitialPevcState({ taskId, runId });

    // Step 1: Initialize
    const step1 = pevcReducer(state, { type: 'INITIALIZE', timestamp: isoTime });
    state = step1.nextState;
    eventLog.append(step1.event);

    // Salva checkpoint forjando um stateHash adulterado
    const tamperedCheckpoint = {
      ...createCheckpoint(state),
      stateHash: 'f'.repeat(64) // hash inválido forjado
    };
    checkpointManager.saveCheckpoint(tamperedCheckpoint);

    // Replay deve falhar com StateHashDivergenceError
    expect(() =>
      replayRunEvents({
        eventLog,
        checkpointManager,
        runId
      })
    ).toThrow(StateHashDivergenceError);

    try {
      replayRunEvents({
        eventLog,
        checkpointManager,
        runId
      });
    } catch (err: any) {
      expect(err.name).toBe('StateHashDivergenceError');
      expect(err.expectedHash).toBe('f'.repeat(64));
      expect(err.actualHash).toBe(calculateStateHash(state));
      expect(err.seq).toBe(1);
    }
  });

  it('deve produzir checkpoint final em cancelamento registrando o motivo', () => {
    let state = createInitialPevcState({ taskId, runId });
    state = pevcReducer(state, { type: 'INITIALIZE', timestamp: isoTime }).nextState;
    state = pevcReducer(state, {
      type: 'PLAN_SUBMITTED',
      plan: { version: 1 },
      timestamp: isoTime
    }).nextState;

    const cancelCheckpoint = createCancellationCheckpoint(
      state,
      'Execução cancelada pelo usuário via interface.'
    );

    expect(cancelCheckpoint.checkpointId).toContain('cancel');
    expect(cancelCheckpoint.serializedState.metadata).toBeDefined();
    expect((cancelCheckpoint.serializedState.metadata as any).cancelled).toBe(true);
    expect((cancelCheckpoint.serializedState.metadata as any).cancellationReason).toBe(
      'Execução cancelada pelo usuário via interface.'
    );
    expect(OperationalValidators.validateCheckpoint(cancelCheckpoint)).toBeTruthy();
  });

  it('deve garantir que o replay rastreia efeitos confirmados sem repeti-los', () => {
    const eventLog = new AppendOnlyEventLog();

    let state = createInitialPevcState({ taskId, runId });
    const initRes = pevcReducer(state, { type: 'INITIALIZE', timestamp: isoTime });
    state = initRes.nextState;
    eventLog.append(initRes.event);

    const planRes = pevcReducer(state, {
      type: 'PLAN_SUBMITTED',
      plan: { version: 1 },
      timestamp: isoTime
    });
    state = planRes.nextState;
    eventLog.append(planRes.event);

    const execRes = pevcReducer(state, {
      type: 'EXECUTION_COMPLETED',
      observations: [{ obsId: 'obs_1' }],
      timestamp: isoTime
    });
    state = execRes.nextState;

    // Simula evento com toolCallId e efeitos confirmados no payload
    const customExecEvent = {
      ...execRes.event,
      operationalPayload: {
        ...execRes.event.operationalPayload,
        toolCallId: 'call_tool_fetch_meta_123',
        effects: ['read:meta']
      }
    };
    eventLog.append(customExecEvent);

    const replay = replayRunEvents({
      eventLog,
      runId
    });

    expect(replay.confirmedToolCalls).toContain('call_tool_fetch_meta_123');
    expect(replay.confirmedEffects).toContain('read:meta');
  });
});
