import { describe, it, expect } from 'vitest';
import {
  RuntimeEventTypeSchema,
  RuntimeErrorCodeSchema,
  RuntimeDiagnosticErrorSchema,
  createDiagnosticError,
  DEFAULT_ERROR_METADATA,
  GenericRuntimeEventSchema,
  GenericRuntimeEvent,
  RuntimeErrorCode,
  RuntimeEventType
} from './events-and-errors.js';

describe('Catálogo de Eventos e Erros do Microkernel PEV-C (M0-05)', () => {
  const ALL_EVENT_TYPES: RuntimeEventType[] = [
    'TASK_ACCEPTED',
    'PLAN_CREATED',
    'TOOL_CALL_STARTED',
    'TOOL_CALL_COMPLETED',
    'TOOL_CALL_FAILED',
    'OBSERVATION_STAGED',
    'VERIFICATION_STARTED',
    'VERIFICATION_COMPLETED',
    'VERIFICATION_FAILED',
    'QUARANTINE_RECORDED',
    'POLICY_EVALUATED',
    'APPROVAL_REQUESTED',
    'APPROVAL_RESOLVED',
    'ATTRIBUTE_FAILED',
    'REPLAN_TRIGGERED',
    'COMMIT_STARTED',
    'COMMIT_COMPLETED',
    'COMMIT_REJECTED',
    'RUN_COMPLETED',
    'RUN_BLOCKED',
    'RUN_FAILED'
  ];

  const ALL_ERROR_CODES: RuntimeErrorCode[] = [
    'INVALID_TASK',
    'BUDGET_EXCEEDED',
    'POLICY_DENIED',
    'APPROVAL_REQUIRED',
    'INVALID_SCHEMA',
    'POSTCONDITION_FAILED',
    'PERIOD_MISMATCH',
    'SEMANTIC_CONFLICT',
    'LOW_COVERAGE',
    'CIRCUIT_OPEN',
    'TOOL_TIMEOUT',
    'TOOL_ERROR',
    'PROMPT_INJECTION_DETECTED',
    'COMMIT_REJECTED',
    'INTERNAL_ERROR'
  ];

  it('deve validar todos os 21 eventos normativos do guia', () => {
    expect(ALL_EVENT_TYPES).toHaveLength(21);
    for (const evtType of ALL_EVENT_TYPES) {
      expect(RuntimeEventTypeSchema.parse(evtType)).toBe(evtType);
    }
  });

  it('deve validar todos os 15 códigos de erro normativos de INVALID_TASK a INTERNAL_ERROR', () => {
    expect(ALL_ERROR_CODES).toHaveLength(15);
    for (const errCode of ALL_ERROR_CODES) {
      expect(RuntimeErrorCodeSchema.parse(errCode)).toBe(errCode);
      expect(DEFAULT_ERROR_METADATA[errCode]).toBeDefined();
      expect(DEFAULT_ERROR_METADATA[errCode].defaultSafeMessage).toBeTruthy();
    }
  });

  it('deve criar e validar RuntimeDiagnosticError com campos seguros e recoverability', () => {
    const error = createDiagnosticError('PERIOD_MISMATCH', 'VERIFY', undefined, {
      expectedSince: '2026-08-01',
      actualSince: '2026-07-01'
    });

    const parsed = RuntimeDiagnosticErrorSchema.parse(error);
    expect(parsed.code).toBe('PERIOD_MISMATCH');
    expect(parsed.recoverability).toBe('RECOVERABLE');
    expect(parsed.phase).toBe('VERIFY');
    expect(parsed.safeMessage).toBe(
      'Incompatibilidade entre o período dos dados e o contrato da tarefa.'
    );
    expect(parsed.details).toBeDefined();
  });

  it('deve permitir mensagens customizadas seguras no construtor de erro', () => {
    const error = createDiagnosticError(
      'POLICY_DENIED',
      'EXECUTE',
      'Ação external_write:pause_ad requer aprovação prévia.'
    );

    expect(error.safeMessage).toBe('Ação external_write:pause_ad requer aprovação prévia.');
    expect(error.recoverability).toBe('FATAL');
  });

  it('deve serializar e deserializar eventos mantendo conformidade com snapshot', () => {
    const sampleEvent: GenericRuntimeEvent = {
      schemaVersion: '1.0.0',
      eventId: 'evt_test_001',
      seq: 1,
      taskId: 'task_s0',
      runId: 'run_101',
      correlationId: 'corr_test_001',
      phase: 'PLAN',
      eventType: 'TASK_ACCEPTED',
      payload: {
        contractHash: 'a'.repeat(64)
      },
      timestamp: '2026-08-21T10:00:00.000Z'
    };

    // Valida schema
    const parsed = GenericRuntimeEventSchema.parse(sampleEvent);

    // Serialização JSON
    const jsonStr = JSON.stringify(parsed);
    const deserialized = GenericRuntimeEventSchema.parse(JSON.parse(jsonStr));

    expect(deserialized).toEqual(sampleEvent);
    expect(deserialized).toMatchSnapshot();
  });

  it('deve serializar e deserializar erro diagnóstico mantendo conformidade com snapshot', () => {
    const sampleError = {
      schemaVersion: '1.0.0' as const,
      code: 'LOW_COVERAGE' as const,
      recoverability: 'RECOVERABLE' as const,
      phase: 'VERIFY' as const,
      safeMessage: 'Cobertura de dados insuficiente para embasar conclusões definitivas.',
      details: { coverage: 0.42, minThreshold: 0.8 },
      timestamp: '2026-08-21T10:00:00.000Z'
    };

    const parsed = RuntimeDiagnosticErrorSchema.parse(sampleError);
    const jsonStr = JSON.stringify(parsed);
    const deserialized = RuntimeDiagnosticErrorSchema.parse(JSON.parse(jsonStr));

    expect(deserialized).toEqual(sampleError);
    expect(deserialized).toMatchSnapshot();
  });
});
