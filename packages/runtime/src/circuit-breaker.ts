import { GovernedTool, ToolCallResult, ToolExecutionContext } from '@adzhub/tools';

/**
 * Estados do Circuit Breaker.
 */
export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Métricas e estado atual de um Circuit Breaker.
 */
export interface CircuitBreakerMetrics {
  integrationKey: string;
  state: CircuitBreakerState;
  failureCount: number;
  consecutiveFailures: number;
  tripCount: number;
  lastFailureTime?: string;
  lastStateChangeTime: string;
}

/**
 * Opções de configuração para política de retry com jitter.
 */
export interface RetryPolicyOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxJitterMs?: number;
}

/**
 * Classifica se um erro ocorrido é transitório (elegível para retry) ou definitivo.
 * Schema e Policy nunca sofrem retry.
 */
export function isTransientError(errorCode?: string, errorMessage?: string): boolean {
  if (!errorCode && !errorMessage) return false;

  // Erros NÃO elegíveis para retry por definição
  if (
    errorCode === 'INVALID_SCHEMA' ||
    errorCode === 'POLICY_DENIED' ||
    errorCode === 'APPROVAL_REQUIRED' ||
    errorCode === 'PROMPT_INJECTION_DETECTED' ||
    errorCode === 'INVALID_TASK' ||
    errorCode === 'BUDGET_EXCEEDED'
  ) {
    return false;
  }

  // Erros transitórios de rede, timeout e indisponibilidade
  if (
    errorCode === 'TOOL_TIMEOUT' ||
    errorCode === 'TOOL_ERROR' ||
    (errorMessage &&
      (errorMessage.toLowerCase().includes('timeout') ||
        errorMessage.toLowerCase().includes('tempo limite') ||
        errorMessage.toLowerCase().includes('indisponível') ||
        errorMessage.includes('503') ||
        errorMessage.includes('502') ||
        errorMessage.includes('504') ||
        errorMessage.includes('ECONNRESET') ||
        errorMessage.includes('ETIMEDOUT')))
  ) {
    return true;
  }

  return false;
}

/**
 * Calcula delay com jitter determinístico ou aleatório controlado.
 */
export function calculateJitterDelay(
  baseDelayMs = 50,
  maxJitterMs = 100,
  randomFn = Math.random
): number {
  return baseDelayMs + Math.floor(randomFn() * maxJitterMs);
}

/**
 * Circuit Breaker com limiar configurável (padrão: 2 falhas consecutivas).
 */
export class CircuitBreaker {
  public readonly integrationKey: string;
  private state: CircuitBreakerState = 'CLOSED';
  private failureCount = 0;
  private consecutiveFailures = 0;
  private tripCount = 0;
  private lastFailureTime?: string;
  private lastStateChangeTime: string = new Date().toISOString();
  private readonly failureThreshold: number;

  constructor(integrationKey: string, failureThreshold = 2) {
    this.integrationKey = integrationKey;
    this.failureThreshold = failureThreshold;
  }

  public getState(): CircuitBreakerState {
    return this.state;
  }

  public isOpen(): boolean {
    return this.state === 'OPEN';
  }

  public recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.lastStateChangeTime = new Date().toISOString();
    }
    this.consecutiveFailures = 0;
  }

  public recordFailure(): void {
    this.failureCount++;
    this.consecutiveFailures++;
    this.lastFailureTime = new Date().toISOString();

    if (this.consecutiveFailures >= this.failureThreshold) {
      if (this.state !== 'OPEN') {
        this.state = 'OPEN';
        this.tripCount++;
        this.lastStateChangeTime = new Date().toISOString();
      }
    }
  }

  public getMetrics(): CircuitBreakerMetrics {
    return {
      integrationKey: this.integrationKey,
      state: this.state,
      failureCount: this.failureCount,
      consecutiveFailures: this.consecutiveFailures,
      tripCount: this.tripCount,
      lastFailureTime: this.lastFailureTime,
      lastStateChangeTime: this.lastStateChangeTime
    };
  }

  public reset(): void {
    this.state = 'CLOSED';
    this.consecutiveFailures = 0;
    this.lastStateChangeTime = new Date().toISOString();
  }
}

/**
 * Registry de Circuit Breakers particionado por runId e chave de integração.
 */
export class CircuitBreakerRegistry {
  private breakers: Map<string, Map<string, CircuitBreaker>>;

  constructor() {
    this.breakers = new Map();
  }

  public getBreaker(runId: string, integrationKey: string): CircuitBreaker {
    let runMap = this.breakers.get(runId);
    if (!runMap) {
      runMap = new Map();
      this.breakers.set(runId, runMap);
    }

    let breaker = runMap.get(integrationKey);
    if (!breaker) {
      breaker = new CircuitBreaker(integrationKey, 2);
      runMap.set(integrationKey, breaker);
    }

    return breaker;
  }

  public getAllMetricsForRun(runId: string): CircuitBreakerMetrics[] {
    const runMap = this.breakers.get(runId);
    if (!runMap) return [];
    return Array.from(runMap.values()).map((b) => b.getMetrics());
  }

  public clearRun(runId: string): void {
    this.breakers.delete(runId);
  }
}

/**
 * Helper para derivar a chave de integração a partir da ferramenta.
 */
export function resolveIntegrationKey(toolName: string): string {
  if (toolName.includes('meta') || toolName === 'list_ads' || toolName === 'get_ad_insights') {
    return 'meta_ads';
  }
  if (toolName.includes('crm') || toolName === 'get_leads' || toolName === 'get_crm_leads') {
    return 'crm';
  }
  if (
    toolName.includes('app') ||
    toolName === 'run_app_analise_criativos' ||
    toolName === 'get_mapa_solucao'
  ) {
    return 'app';
  }
  if (
    toolName.includes('memory') ||
    toolName.includes('context') ||
    toolName.includes('supercerebro')
  ) {
    return 'supercerebro';
  }
  return toolName;
}

/**
 * Executa uma ferramenta governada com proteção de Circuit Breaker e no máximo 1 retry com jitter.
 */
export async function executeWithRetryAndBreaker<TInput = unknown, TOutput = unknown>(params: {
  tool: GovernedTool<TInput, TOutput>;
  input: TInput;
  context?: Partial<ToolExecutionContext>;
  breaker?: CircuitBreaker;
  retryOptions?: RetryPolicyOptions;
  sleepFn?: (ms: number) => Promise<void>;
}): Promise<
  ToolCallResult<TOutput> & {
    breakerMetrics?: CircuitBreakerMetrics;
    retryAttempted?: boolean;
  }
> {
  const { tool, input, context, breaker, retryOptions, sleepFn = defaultSleep } = params;
  const maxRetries = retryOptions?.maxRetries ?? 1;
  const baseDelayMs = retryOptions?.baseDelayMs ?? 50;
  const maxJitterMs = retryOptions?.maxJitterMs ?? 100;

  // 1. Verifica se o circuito está aberto
  if (breaker && breaker.isOpen()) {
    const metrics = breaker.getMetrics();
    return {
      ok: false,
      error: `Circuito aberto para a integração '${breaker.integrationKey}' após falhas consecutivas. Novas chamadas foram bloqueadas para prevenir sobrecarga.`,
      errorCode: 'CIRCUIT_OPEN',
      toolCallId: `call_blocked_${Date.now()}`,
      correlationId: context?.correlationId ?? `corr_blocked_${Date.now()}`,
      executionTimeMs: 0,
      timestamp: new Date().toISOString(),
      breakerMetrics: metrics,
      retryAttempted: false
    };
  }

  // 2. Primeira tentativa
  let result = await tool.execute(input, context);
  let retryAttempted = false;

  // 3. Se falhou e for transitório, tenta no máximo 1 retry com jitter
  if (!result.ok && isTransientError(result.errorCode, result.error) && maxRetries > 0) {
    if (!context?.signal?.aborted) {
      retryAttempted = true;
      const delay = calculateJitterDelay(baseDelayMs, maxJitterMs);
      await sleepFn(delay);

      if (!context?.signal?.aborted) {
        result = await tool.execute(input, context);
      }
    }
  }

  // 4. Atualiza o Circuit Breaker
  if (breaker) {
    if (result.ok) {
      breaker.recordSuccess();
    } else {
      breaker.recordFailure();
    }
  }

  return {
    ...result,
    breakerMetrics: breaker?.getMetrics(),
    retryAttempted
  };
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
