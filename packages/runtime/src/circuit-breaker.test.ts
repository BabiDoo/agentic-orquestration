import { describe, it, expect, vi } from 'vitest';
import {
  CircuitBreaker,
  CircuitBreakerRegistry,
  executeWithRetryAndBreaker,
  isTransientError
} from './circuit-breaker.js';
import { createTool, GovernedTool } from '@adzhub/tools';
import { z } from 'zod';

describe('Retry and Circuit Breaker (M3-07)', () => {
  it('deve classificar corretamente falhas transitórias vs erros de schema/policy', () => {
    // Transitórios
    expect(isTransientError('TOOL_TIMEOUT', 'Tempo limite atingido')).toBe(true);
    expect(isTransientError('TOOL_ERROR', '503 Service Unavailable')).toBe(true);
    expect(isTransientError(undefined, 'Conexão caiu ECONNRESET')).toBe(true);

    // Definitivos (NUNCA fazem retry)
    expect(isTransientError('INVALID_SCHEMA', 'Schema mismatch')).toBe(false);
    expect(isTransientError('POLICY_DENIED', 'Blocked by policy')).toBe(false);
    expect(isTransientError('APPROVAL_REQUIRED', 'Needs manager approval')).toBe(false);
    expect(isTransientError('PROMPT_INJECTION_DETECTED', 'Injection found')).toBe(false);
  });

  it('deve realizar no máximo 1 retry com jitter para falhas transitórias e ter sucesso', async () => {
    let callCount = 0;

    const flakyTool: GovernedTool<any, any> = createTool({
      name: 'flaky_tool',
      description: 'Tool that fails once with timeout then succeeds',
      effect: 'read:meta',
      inputSchema: z.object({}).passthrough(),
      outputSchema: z.object({ success: z.boolean() }),
      handler: async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('503 Service Unavailable (temporary failure)');
        }
        return { success: true };
      }
    });

    const breaker = new CircuitBreaker('meta_ads', 2);
    const mockSleep = vi.fn().mockResolvedValue(undefined);

    const result = await executeWithRetryAndBreaker({
      tool: flakyTool,
      input: {},
      breaker,
      retryOptions: { maxRetries: 1, baseDelayMs: 20, maxJitterMs: 30 },
      sleepFn: mockSleep
    });

    expect(result.ok).toBe(true);
    expect(callCount).toBe(2); // 1 chamada inicial + 1 retry
    expect(result.retryAttempted).toBe(true);
    expect(mockSleep).toHaveBeenCalledTimes(1);
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('não deve fazer retry para falhas de schema ou policy', async () => {
    let callCount = 0;

    const schemaFailingTool: GovernedTool<any, any> = createTool({
      name: 'schema_failing_tool',
      description: 'Tool that returns invalid schema',
      effect: 'read:meta',
      inputSchema: z.object({}).passthrough(),
      outputSchema: z.object({ required_field: z.string() }),
      handler: (async () => {
        callCount++;
        return { invalid_field: 123 } as any; // Viola o output schema
      }) as any
    });

    const breaker = new CircuitBreaker('meta_ads', 2);
    const mockSleep = vi.fn().mockResolvedValue(undefined);

    const result = await executeWithRetryAndBreaker({
      tool: schemaFailingTool,
      input: {},
      breaker,
      retryOptions: { maxRetries: 1 },
      sleepFn: mockSleep
    });

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('INVALID_SCHEMA');
    expect(callCount).toBe(1); // APENAS 1 tentativa, ZERO retries
    expect(result.retryAttempted).toBe(false);
    expect(mockSleep).not.toHaveBeenCalled();
  });

  it('duas falhas da integração no run devem abrir o circuit breaker', async () => {
    let callCount = 0;

    const persistentFailingTool: GovernedTool<any, any> = createTool({
      name: 'failing_tool',
      description: 'Tool that always fails',
      effect: 'read:crm',
      inputSchema: z.object({}).passthrough(),
      outputSchema: z.object({}).passthrough(),
      handler: async () => {
        callCount++;
        throw new Error('503 Service Unavailable');
      }
    });

    const breaker = new CircuitBreaker('crm', 2);
    const mockSleep = vi.fn().mockResolvedValue(undefined);

    // 1ª chamada (falha inicial + 1 retry = 2 execuções) -> 1ª falha consolidada
    const res1 = await executeWithRetryAndBreaker({
      tool: persistentFailingTool,
      input: {},
      breaker,
      retryOptions: { maxRetries: 1 },
      sleepFn: mockSleep
    });

    expect(res1.ok).toBe(false);
    expect(breaker.getState()).toBe('CLOSED');
    expect(breaker.getMetrics().failureCount).toBe(1);

    // 2ª chamada (falha inicial + 1 retry = 2 execuções) -> 2ª falha consolidada -> ABRE O BREAKER
    const res2 = await executeWithRetryAndBreaker({
      tool: persistentFailingTool,
      input: {},
      breaker,
      retryOptions: { maxRetries: 1 },
      sleepFn: mockSleep
    });

    expect(res2.ok).toBe(false);
    expect(breaker.getState()).toBe('OPEN');
    expect(breaker.isOpen()).toBe(true);
    expect(breaker.getMetrics().failureCount).toBe(2);
    expect(breaker.getMetrics().tripCount).toBe(1);
    expect(callCount).toBe(4);
  });

  it('breaker aberto deve gerar CIRCUIT_OPEN e impedir novas chamadas à ferramenta', async () => {
    let toolExecutionCount = 0;

    const dummyTool: GovernedTool<any, any> = createTool({
      name: 'dummy_tool',
      description: 'Dummy tool',
      effect: 'read:crm',
      inputSchema: z.object({}).passthrough(),
      outputSchema: z.object({}).passthrough(),
      handler: async () => {
        toolExecutionCount++;
        return { ok: true };
      }
    });

    const breaker = new CircuitBreaker('crm', 2);
    // Força breaker para estado OPEN
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.isOpen()).toBe(true);

    // Executa ferramenta com breaker OPEN
    const result = await executeWithRetryAndBreaker({
      tool: dummyTool,
      input: {},
      breaker
    });

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('CIRCUIT_OPEN');
    expect(result.error).toContain('Circuito aberto');
    expect(toolExecutionCount).toBe(0); // A ferramenta subjacente NÃO foi chamada
    expect(result.breakerMetrics?.state).toBe('OPEN');
  });

  it('deve expor o estado do breaker no resultado e suportar registry por runId', () => {
    const registry = new CircuitBreakerRegistry();
    const runId = 'run_breaker_001';

    const metaBreaker = registry.getBreaker(runId, 'meta_ads');
    const crmBreaker = registry.getBreaker(runId, 'crm');

    metaBreaker.recordFailure();
    metaBreaker.recordFailure();

    crmBreaker.recordSuccess();

    const metrics = registry.getAllMetricsForRun(runId);
    expect(metrics).toHaveLength(2);

    const metaMetric = metrics.find((m) => m.integrationKey === 'meta_ads')!;
    const crmMetric = metrics.find((m) => m.integrationKey === 'crm')!;

    expect(metaMetric.state).toBe('OPEN');
    expect(metaMetric.failureCount).toBe(2);
    expect(crmMetric.state).toBe('CLOSED');
    expect(crmMetric.consecutiveFailures).toBe(0);
  });
});
