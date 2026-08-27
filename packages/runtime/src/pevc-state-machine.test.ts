import { describe, it, expect } from 'vitest';
import {
  createInitialPevcState,
  pevcReducer,
  InvalidStateTransitionError
} from './pevc-state-machine.js';
import { OperationalValidators } from '@adzhub/contracts';

describe('PEV-C State Machine Reducer (M3-01)', () => {
  const taskId = 'task_creative_audit_001';
  const runId = 'run_pevc_test_001';
  const isoTime = '2026-08-25T10:00:00.000Z';

  it('deve inicializar o estado inicial da máquina corretamente', () => {
    const initialState = createInitialPevcState({
      taskId,
      runId,
      maxReplans: 2
    });

    expect(initialState.taskId).toBe(taskId);
    expect(initialState.runId).toBe(runId);
    expect(initialState.currentPhase).toBe('PLAN');
    expect(initialState.seq).toBe(0);
    expect(initialState.replanCount).toBe(0);
    expect(initialState.maxReplans).toBe(2);
    expect(initialState.observations).toEqual([]);
    expect(initialState.evidences).toEqual([]);
  });

  it('deve executar o caminho feliz completo: PLAN -> EXECUTE -> VERIFY -> COMMIT -> COMPLETED', () => {
    let state = createInitialPevcState({ taskId, runId });

    // 1. INITIALIZE (PLAN)
    const initRes = pevcReducer(state, {
      type: 'INITIALIZE',
      timestamp: '2026-08-25T10:00:00.000Z'
    });
    state = initRes.nextState;
    expect(state.currentPhase).toBe('PLAN');
    expect(state.seq).toBe(1);
    expect(initRes.event.eventType).toBe('TASK_ACCEPTED');
    expect(initRes.event.phase).toBe('PLAN');
    expect(OperationalValidators.validateTraceEvent(initRes.event)).toBeTruthy();

    // 2. PLAN_SUBMITTED (PLAN -> EXECUTE)
    const planRes = pevcReducer(state, {
      type: 'PLAN_SUBMITTED',
      plan: { version: 1, steps: ['fetch_meta', 'fetch_crm'] },
      timestamp: '2026-08-25T10:00:01.000Z'
    });
    state = planRes.nextState;
    expect(state.currentPhase).toBe('EXECUTE');
    expect(state.seq).toBe(2);
    expect(planRes.event.eventType).toBe('PLAN_CREATED');
    expect(planRes.event.causationId).toBe(initRes.event.eventId);
    expect(OperationalValidators.validateTraceEvent(planRes.event)).toBeTruthy();

    // 3. EXECUTION_COMPLETED (EXECUTE -> VERIFY)
    const execRes = pevcReducer(state, {
      type: 'EXECUTION_COMPLETED',
      observations: [
        { observationId: 'obs_1', payloadHash: 'a'.repeat(64) },
        { observationId: 'obs_2', payloadHash: 'b'.repeat(64) }
      ],
      timestamp: '2026-08-25T10:00:02.000Z'
    });
    state = execRes.nextState;
    expect(state.currentPhase).toBe('VERIFY');
    expect(state.seq).toBe(3);
    expect(state.observations).toHaveLength(2);
    expect(execRes.event.eventType).toBe('OBSERVATION_STAGED');
    expect(execRes.event.causationId).toBe(planRes.event.eventId);
    expect(OperationalValidators.validateTraceEvent(execRes.event)).toBeTruthy();

    // 4. VERIFICATION_PASSED (VERIFY -> COMMIT)
    const verifyRes = pevcReducer(state, {
      type: 'VERIFICATION_PASSED',
      evidences: [{ evidenceId: 'evi_1', score: 1.0 }],
      timestamp: '2026-08-25T10:00:03.000Z'
    });
    state = verifyRes.nextState;
    expect(state.currentPhase).toBe('COMMIT');
    expect(state.seq).toBe(4);
    expect(state.evidences).toHaveLength(1);
    expect(verifyRes.event.eventType).toBe('VERIFICATION_COMPLETED');
    expect(verifyRes.event.causationId).toBe(execRes.event.eventId);
    expect(OperationalValidators.validateTraceEvent(verifyRes.event)).toBeTruthy();

    // 5. COMMIT_COMPLETED (COMMIT -> COMPLETED)
    const commitRes = pevcReducer(state, {
      type: 'COMMIT_COMPLETED',
      commitResult: { commitId: 'cmt_001', committedAt: isoTime },
      timestamp: '2026-08-25T10:00:04.000Z'
    });
    state = commitRes.nextState;
    expect(state.currentPhase).toBe('COMPLETED');
    expect(state.seq).toBe(5);
    expect(commitRes.event.eventType).toBe('COMMIT_COMPLETED');
    expect(commitRes.event.causationId).toBe(verifyRes.event.eventId);
    expect(OperationalValidators.validateTraceEvent(commitRes.event)).toBeTruthy();
  });

  it('deve suportar ciclo de recuperação: FAIL_STEP -> ATTRIBUTE -> REPLAN -> EXECUTE', () => {
    let state = createInitialPevcState({ taskId, runId, maxReplans: 2 });
    state = pevcReducer(state, { type: 'INITIALIZE', timestamp: isoTime }).nextState;
    state = pevcReducer(state, {
      type: 'PLAN_SUBMITTED',
      plan: { version: 1 },
      timestamp: isoTime
    }).nextState;

    // Falha durante EXECUTE
    const failRes = pevcReducer(state, {
      type: 'FAIL_STEP',
      error: {
        code: 'TOOL_TIMEOUT',
        category: 'integration',
        recoverability: 'RECOVERABLE',
        safeMessage: 'Meta Ads API timeout'
      },
      timestamp: isoTime
    });
    state = failRes.nextState;
    expect(state.currentPhase).toBe('ATTRIBUTE');
    expect(failRes.event.eventType).toBe('TOOL_CALL_FAILED');
    expect(OperationalValidators.validateTraceEvent(failRes.event)).toBeTruthy();

    // Atribuição resolve como recuperável -> transita para REPLAN
    const attrRes = pevcReducer(state, {
      type: 'ATTRIBUTE_RESOLVED',
      diagnostic: {
        code: 'TOOL_TIMEOUT',
        category: 'integration',
        recoverability: 'RECOVERABLE',
        safeMessage: 'Falha de integração transitória recuperável com fallback local'
      },
      timestamp: isoTime
    });
    state = attrRes.nextState;
    expect(state.currentPhase).toBe('REPLAN');
    expect(attrRes.event.eventType).toBe('REPLAN_TRIGGERED');
    expect(OperationalValidators.validateTraceEvent(attrRes.event)).toBeTruthy();

    // Replanejamento submetido -> volta para EXECUTE
    const replanRes = pevcReducer(state, {
      type: 'REPLAN_SUBMITTED',
      plan: { version: 2, fallback: true },
      timestamp: isoTime
    });
    state = replanRes.nextState;
    expect(state.currentPhase).toBe('EXECUTE');
    expect(state.replanCount).toBe(1);
    expect(replanRes.event.eventType).toBe('PLAN_CREATED');
    expect(OperationalValidators.validateTraceEvent(replanRes.event)).toBeTruthy();
  });

  it('deve transitar para FAILED quando o limite de replans for atingido', () => {
    let state = createInitialPevcState({ taskId, runId, maxReplans: 1 });
    state = pevcReducer(state, { type: 'INITIALIZE', timestamp: isoTime }).nextState;
    state = pevcReducer(state, {
      type: 'PLAN_SUBMITTED',
      plan: { version: 1 },
      timestamp: isoTime
    }).nextState;

    // 1º Replan
    state = pevcReducer(state, {
      type: 'FAIL_STEP',
      error: {
        code: 'TOOL_ERROR',
        category: 'integration',
        recoverability: 'RECOVERABLE',
        safeMessage: 'Falha 1'
      },
      timestamp: isoTime
    }).nextState;
    state = pevcReducer(state, {
      type: 'ATTRIBUTE_RESOLVED',
      diagnostic: {
        code: 'TOOL_ERROR',
        category: 'integration',
        recoverability: 'RECOVERABLE',
        safeMessage: 'Falha 1'
      },
      timestamp: isoTime
    }).nextState;
    expect(state.currentPhase).toBe('REPLAN');

    state = pevcReducer(state, {
      type: 'REPLAN_SUBMITTED',
      plan: { version: 2 },
      timestamp: isoTime
    }).nextState;
    expect(state.replanCount).toBe(1);

    // 2º Falha -> agora replanCount (1) >= maxReplans (1)
    state = pevcReducer(state, {
      type: 'FAIL_STEP',
      error: {
        code: 'TOOL_ERROR',
        category: 'integration',
        recoverability: 'RECOVERABLE',
        safeMessage: 'Falha 2'
      },
      timestamp: isoTime
    }).nextState;

    const secondAttrRes = pevcReducer(state, {
      type: 'ATTRIBUTE_RESOLVED',
      diagnostic: {
        code: 'TOOL_ERROR',
        category: 'integration',
        recoverability: 'RECOVERABLE',
        safeMessage: 'Tentativa de replan adicional'
      },
      timestamp: isoTime
    });

    expect(secondAttrRes.nextState.currentPhase).toBe('FAILED');
    expect(secondAttrRes.event.eventType).toBe('RUN_FAILED');
  });

  it('deve transitar para BLOCKED quando exigir aprovação e permitir UNBLOCK_APPROVED', () => {
    let state = createInitialPevcState({ taskId, runId });
    state = pevcReducer(state, { type: 'INITIALIZE', timestamp: isoTime }).nextState;
    state = pevcReducer(state, {
      type: 'PLAN_SUBMITTED',
      plan: { version: 1 },
      timestamp: isoTime
    }).nextState;

    // Falha exigindo aprovação
    state = pevcReducer(state, {
      type: 'FAIL_STEP',
      error: {
        code: 'APPROVAL_REQUIRED',
        category: 'policy',
        recoverability: 'REQUIRES_APPROVAL',
        safeMessage: 'Escrita em CRM requer aprovação do gestor'
      },
      timestamp: isoTime
    }).nextState;

    const blockRes = pevcReducer(state, {
      type: 'ATTRIBUTE_RESOLVED',
      diagnostic: {
        code: 'APPROVAL_REQUIRED',
        category: 'policy',
        recoverability: 'REQUIRES_APPROVAL',
        safeMessage: 'Aprovação humana necessária'
      },
      timestamp: isoTime
    });

    state = blockRes.nextState;
    expect(state.currentPhase).toBe('BLOCKED');
    expect(blockRes.event.eventType).toBe('APPROVAL_REQUESTED');

    // Desbloqueio após aprovação
    const unblockRes = pevcReducer(state, {
      type: 'UNBLOCK_APPROVED',
      targetPhase: 'EXECUTE',
      approvalId: 'appr_123',
      timestamp: isoTime
    });

    state = unblockRes.nextState;
    expect(state.currentPhase).toBe('EXECUTE');
    expect(unblockRes.event.eventType).toBe('APPROVAL_RESOLVED');
  });

  it('deve rejeitar transições inválidas com InvalidStateTransitionError', () => {
    const state = createInitialPevcState({ taskId, runId });

    // Tentar executar EXECUTION_COMPLETED direto de PLAN sem antes submeter o plano
    expect(() =>
      pevcReducer(state, {
        type: 'EXECUTION_COMPLETED',
        observations: [],
        timestamp: isoTime
      })
    ).toThrow(InvalidStateTransitionError);

    // Tentar COMMIT_COMPLETED direto de PLAN
    expect(() =>
      pevcReducer(state, {
        type: 'COMMIT_COMPLETED',
        commitResult: {},
        timestamp: isoTime
      })
    ).toThrow(InvalidStateTransitionError);

    // Tentar UNBLOCK_APPROVED quando não está em BLOCKED
    expect(() =>
      pevcReducer(state, {
        type: 'UNBLOCK_APPROVED',
        targetPhase: 'EXECUTE',
        approvalId: 'appr_1',
        timestamp: isoTime
      })
    ).toThrow(InvalidStateTransitionError);
  });

  it('deve rejeitar qualquer transição a partir de estados terminais (COMPLETED / FAILED)', () => {
    let state = createInitialPevcState({ taskId, runId });
    state = pevcReducer(state, { type: 'INITIALIZE', timestamp: isoTime }).nextState;
    state = pevcReducer(state, {
      type: 'PLAN_SUBMITTED',
      plan: {},
      timestamp: isoTime
    }).nextState;
    state = pevcReducer(state, {
      type: 'EXECUTION_COMPLETED',
      observations: [],
      timestamp: isoTime
    }).nextState;
    state = pevcReducer(state, {
      type: 'VERIFICATION_PASSED',
      evidences: [],
      timestamp: isoTime
    }).nextState;
    state = pevcReducer(state, {
      type: 'COMMIT_COMPLETED',
      commitResult: {},
      timestamp: isoTime
    }).nextState;

    expect(state.currentPhase).toBe('COMPLETED');

    // Nenhuma ação permitida após COMPLETED
    expect(() =>
      pevcReducer(state, {
        type: 'PLAN_SUBMITTED',
        plan: {},
        timestamp: isoTime
      })
    ).toThrow(InvalidStateTransitionError);

    // Falha fatal leva a FAILED
    let failedState = createInitialPevcState({ taskId, runId });
    failedState = pevcReducer(failedState, {
      type: 'FAIL_FATAL',
      error: {
        code: 'INTERNAL_ERROR',
        category: 'runtime',
        recoverability: 'FATAL',
        safeMessage: 'Erro fatal irrecuperável'
      },
      timestamp: isoTime
    }).nextState;

    expect(failedState.currentPhase).toBe('FAILED');
    expect(() =>
      pevcReducer(failedState, {
        type: 'INITIALIZE',
        timestamp: isoTime
      })
    ).toThrow(InvalidStateTransitionError);
  });

  it('deve ser 100% puro e determinístico: mesmas entradas produzem rigorosamente a mesma saída', () => {
    const stateA = createInitialPevcState({ taskId, runId });
    const stateB = createInitialPevcState({ taskId, runId });

    const action = {
      type: 'INITIALIZE' as const,
      timestamp: '2026-08-25T12:00:00.000Z'
    };

    const resA = pevcReducer(stateA, action);
    const resB = pevcReducer(stateB, action);

    expect(resA).toEqual(resB);
  });
});
