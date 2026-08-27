import { describe, it, expect } from 'vitest';
import { AppendOnlyEventLog, EventLogSequenceViolationError } from './event-log.js';
import { REDACTED_API_KEY_SENTINEL } from './byok-security.js';

describe('Append-Only Event Log (M3-05)', () => {
  const taskId = 'task_creative_audit_001';
  const runId = 'run_event_log_001';

  it('deve atribuir seq único e monotônico (1, 2, 3...) para cada evento do run', () => {
    const log = new AppendOnlyEventLog();

    const ev1 = log.append({
      taskId,
      runId,
      eventType: 'TASK_ACCEPTED',
      correlationId: 'corr_001',
      phase: 'PLAN',
      operationalPayload: { task: 'init' }
    });

    const ev2 = log.append({
      taskId,
      runId,
      eventType: 'PLAN_CREATED',
      causationId: ev1.eventId,
      correlationId: 'corr_001',
      phase: 'PLAN',
      operationalPayload: { steps: 5 }
    });

    const ev3 = log.append({
      taskId,
      runId,
      eventType: 'OBSERVATION_STAGED',
      causationId: ev2.eventId,
      correlationId: 'corr_001',
      phase: 'EXECUTE',
      operationalPayload: { obsCount: 2 }
    });

    expect(ev1.seq).toBe(1);
    expect(ev2.seq).toBe(2);
    expect(ev3.seq).toBe(3);
    expect(log.getEventCount(runId)).toBe(3);
  });

  it('deve rejeitar quebras de sequência ou seq duplicado com EventLogSequenceViolationError', () => {
    const log = new AppendOnlyEventLog();

    log.append({
      taskId,
      runId,
      seq: 1, // esperado 1
      eventType: 'TASK_ACCEPTED',
      correlationId: 'corr_001',
      phase: 'PLAN'
    });

    // Tenta forçar seq 5 pulando 2, 3, 4
    expect(() =>
      log.append({
        taskId,
        runId,
        seq: 5,
        eventType: 'PLAN_CREATED',
        correlationId: 'corr_001',
        phase: 'PLAN'
      })
    ).toThrow(EventLogSequenceViolationError);

    // Tenta reutilizar seq 1 (duplicado)
    expect(() =>
      log.append({
        taskId,
        runId,
        seq: 1,
        eventType: 'PLAN_CREATED',
        correlationId: 'corr_001',
        phase: 'PLAN'
      })
    ).toThrow(EventLogSequenceViolationError);
  });

  it('deve redigir dados sensíveis e chaves de API nos payloads antes de persistir', () => {
    const log = new AppendOnlyEventLog();
    const sensitiveKey = 'sk-or-v1-abcdef0123456789abcdef0123456789';

    const ev = log.append({
      taskId,
      runId,
      eventType: 'TOOL_CALL_STARTED',
      correlationId: 'corr_001',
      phase: 'EXECUTE',
      operationalPayload: {
        config: {
          apiKey: sensitiveKey,
          authHeader: `Bearer ${sensitiveKey}`
        },
        safeData: 'valor público'
      },
      redactedPayload: {
        rawKey: sensitiveKey
      }
    });

    expect(ev.operationalPayload.config).toBeDefined();
    expect((ev.operationalPayload.config as any).apiKey).toBe(REDACTED_API_KEY_SENTINEL);
    expect((ev.operationalPayload.config as any).authHeader).toBe(REDACTED_API_KEY_SENTINEL);
    expect(ev.operationalPayload.safeData).toBe('valor público');
    expect((ev.redactedPayload as any).rawKey).toBe(REDACTED_API_KEY_SENTINEL);

    // O log persistido também está redigido
    const retrieved = log.getEventBySeq(runId, 1);
    expect((retrieved?.operationalPayload.config as any).apiKey).toBe(REDACTED_API_KEY_SENTINEL);
  });

  it('deve manter integridade de metadados causais e imutabilidade do log', () => {
    const log = new AppendOnlyEventLog();

    const ev1 = log.append({
      taskId,
      runId,
      eventType: 'TASK_ACCEPTED',
      correlationId: 'corr_001',
      phase: 'PLAN',
      timestamp: '2026-08-25T10:00:00.000Z'
    });

    const ev2 = log.append({
      taskId,
      runId,
      eventType: 'PLAN_CREATED',
      causationId: ev1.eventId,
      correlationId: 'corr_001',
      phase: 'PLAN',
      timestamp: '2026-08-25T10:00:01.000Z'
    });

    expect(ev2.causationId).toBe(ev1.eventId);
    expect(ev2.correlationId).toBe('corr_001');

    // Imutabilidade: alterar o array retornado não afeta o log interno
    const events = log.getEvents(runId);
    (events[0] as any).eventType = 'MUTATED';

    const eventsAgain = log.getEvents(runId);
    expect(eventsAgain[0]?.eventType).toBe('TASK_ACCEPTED');
  });

  it('deve preservar a ordem e formatar mensagens no padrão Server-Sent Events (SSE)', async () => {
    const log = new AppendOnlyEventLog();
    const receivedEvents: string[] = [];

    // Inscreve um listener SSE
    const unsubscribe = log.subscribe(runId, (event) => {
      receivedEvents.push(log.formatSSEMessage(event));
    });

    log.append({
      taskId,
      runId,
      eventType: 'TASK_ACCEPTED',
      correlationId: 'corr_001',
      phase: 'PLAN'
    });

    log.append({
      taskId,
      runId,
      eventType: 'PLAN_CREATED',
      correlationId: 'corr_001',
      phase: 'PLAN'
    });

    expect(receivedEvents).toHaveLength(2);
    expect(receivedEvents[0]).toContain('id: 1\nevent: TASK_ACCEPTED\n');
    expect(receivedEvents[1]).toContain('id: 2\nevent: PLAN_CREATED\n');

    unsubscribe();

    // Novo evento não deve chegar ao listener desinscrito
    log.append({
      taskId,
      runId,
      eventType: 'RUN_COMPLETED',
      correlationId: 'corr_001',
      phase: 'COMMIT'
    });

    expect(receivedEvents).toHaveLength(2);
  });

  it('deve suportar replay histórico no streaming SSE a partir de um seq específico', () => {
    const log = new AppendOnlyEventLog();

    log.append({ taskId, runId, eventType: 'EVENT_1', correlationId: 'c1', phase: 'PLAN' });
    log.append({ taskId, runId, eventType: 'EVENT_2', correlationId: 'c1', phase: 'EXECUTE' });
    log.append({ taskId, runId, eventType: 'EVENT_3', correlationId: 'c1', phase: 'VERIFY' });

    const replayedSeqs: number[] = [];
    log.subscribe(
      runId,
      (ev) => {
        replayedSeqs.push(ev.seq);
      },
      { fromSeq: 2 }
    );

    // Deve ter recebido o histórico dos seqs 2 e 3 imediatamente
    expect(replayedSeqs).toEqual([2, 3]);

    // Novo evento adicionado
    log.append({ taskId, runId, eventType: 'EVENT_4', correlationId: 'c1', phase: 'COMMIT' });
    expect(replayedSeqs).toEqual([2, 3, 4]);
  });
});
