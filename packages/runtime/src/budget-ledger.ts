import { TaskBudgets, RuntimeErrorCode } from '@adzhub/contracts';

/**
 * As 5 dimensões normativas de controle de orçamento do Microkernel PEV-C.
 */
export type BudgetDimension = 'steps' | 'toolCalls' | 'tokens' | 'costBrl' | 'latencyMs';

/**
 * Valores parciais de orçamento para operações de reserva ou reconciliação.
 */
export interface BudgetAmounts {
  steps?: number;
  toolCalls?: number;
  tokens?: number;
  costBrl?: number;
  latencyMs?: number;
}

/**
 * Valores normalizados e completos nas 5 dimensões de orçamento.
 */
export interface NormalizedBudgetAmounts {
  steps: number;
  toolCalls: number;
  tokens: number;
  costBrl: number;
  latencyMs: number;
}

/**
 * Limites máximos estritos do contrato de execução.
 */
export interface BudgetLimits {
  maxSteps: number;
  maxToolCalls: number;
  maxTokens: number;
  maxCostBrl: number;
  timeoutMs: number;
}

/**
 * Registro de uma reserva de orçamento em andamento.
 */
export interface BudgetReservation {
  reservationId: string;
  stepId?: string;
  toolName?: string;
  estimated: NormalizedBudgetAmounts;
  createdAt: string;
}

/**
 * Métricas consolidadas do Ledger distinguindo limites, reservado, usado e disponível.
 */
export interface BudgetMetrics {
  limits: BudgetLimits;
  reserved: NormalizedBudgetAmounts;
  used: NormalizedBudgetAmounts;
  available: NormalizedBudgetAmounts;
  variance: NormalizedBudgetAmounts;
  activeReservationsCount: number;
  isExceeded: boolean;
  exceededDimension?: BudgetDimension;
}

/**
 * Erro estruturado lançado quando uma alocação ou consumo excede os limites contratuais.
 */
export class BudgetExceededError extends Error {
  public readonly code: RuntimeErrorCode = 'BUDGET_EXCEEDED';
  public readonly dimension: BudgetDimension;
  public readonly requested: number;
  public readonly available: number;
  public readonly limit: number;
  public readonly currentUsed: number;
  public readonly currentReserved: number;

  constructor(params: {
    dimension: BudgetDimension;
    requested: number;
    available: number;
    limit: number;
    currentUsed: number;
    currentReserved: number;
    message?: string;
  }) {
    const formattedMessage =
      params.message ??
      `[BUDGET_EXCEEDED] Limite de orçamento excedido na dimensão '${params.dimension}'. ` +
        `Requisitado: ${params.requested}, Disponível: ${params.available}, Limite: ${params.limit} ` +
        `(Usado: ${params.currentUsed}, Reservado: ${params.currentReserved}).`;

    super(formattedMessage);
    this.name = 'BudgetExceededError';
    this.dimension = params.dimension;
    this.requested = params.requested;
    this.available = params.available;
    this.limit = params.limit;
    this.currentUsed = params.currentUsed;
    this.currentReserved = params.currentReserved;
  }
}

/**
 * Normaliza valores parciais preenchendo valores ausentes com 0 e arredondando custos.
 */
export function normalizeBudgetAmounts(amounts?: BudgetAmounts): NormalizedBudgetAmounts {
  return {
    steps: Math.max(0, Math.round(amounts?.steps ?? 0)),
    toolCalls: Math.max(0, Math.round(amounts?.toolCalls ?? 0)),
    tokens: Math.max(0, Math.round(amounts?.tokens ?? 0)),
    costBrl: Math.max(0, Number((amounts?.costBrl ?? 0).toFixed(4))),
    latencyMs: Math.max(0, Math.round(amounts?.latencyMs ?? 0))
  };
}

/**
 * Budget Ledger com controle estrito em duas fases (reserva/reconciliação),
 * garantindo ausência de saldos negativos e rastreabilidade total nas 5 dimensões.
 */
export class BudgetLedger {
  private limits: BudgetLimits;
  private used: NormalizedBudgetAmounts;
  private reserved: NormalizedBudgetAmounts;
  private totalVariance: NormalizedBudgetAmounts;
  private reservations: Map<string, BudgetReservation>;

  constructor(budgets: TaskBudgets) {
    this.limits = {
      maxSteps: budgets.maxSteps,
      maxToolCalls: budgets.maxToolCalls,
      maxTokens: budgets.maxTokens,
      maxCostBrl: Number(budgets.maxCostBrl.toFixed(4)),
      timeoutMs: budgets.timeoutMs
    };

    this.used = {
      steps: 0,
      toolCalls: 0,
      tokens: 0,
      costBrl: 0,
      latencyMs: 0
    };

    this.reserved = {
      steps: 0,
      toolCalls: 0,
      tokens: 0,
      costBrl: 0,
      latencyMs: 0
    };

    this.totalVariance = {
      steps: 0,
      toolCalls: 0,
      tokens: 0,
      costBrl: 0,
      latencyMs: 0
    };

    this.reservations = new Map();
  }

  /**
   * Retorna os limites configurados no ledger.
   */
  public getLimits(): BudgetLimits {
    return { ...this.limits };
  }

  /**
   * Obtém o limite máximo para uma dimensão específica.
   */
  private getLimitForDimension(dimension: BudgetDimension): number {
    switch (dimension) {
      case 'steps':
        return this.limits.maxSteps;
      case 'toolCalls':
        return this.limits.maxToolCalls;
      case 'tokens':
        return this.limits.maxTokens;
      case 'costBrl':
        return this.limits.maxCostBrl;
      case 'latencyMs':
        return this.limits.timeoutMs;
    }
  }

  /**
   * Calcula o saldo atualmente disponível para uma dimensão (nunca negativo).
   */
  public getAvailable(dimension: BudgetDimension): number {
    const limit = this.getLimitForDimension(dimension);
    const committed = this.used[dimension] + this.reserved[dimension];
    const available = limit - committed;
    return available < 0 ? 0 : Number(available.toFixed(4));
  }

  /**
   * Verifica preventivamente se uma quantidade estimada cabe no orçamento disponível sem realizar a reserva.
   */
  public checkAvailability(estimate: BudgetAmounts): {
    canAllocate: boolean;
    exceededDimension?: BudgetDimension;
    details: Record<string, { requested: number; available: number; limit: number }>;
  } {
    const normalized = normalizeBudgetAmounts(estimate);
    const dimensions: BudgetDimension[] = ['steps', 'toolCalls', 'tokens', 'costBrl', 'latencyMs'];
    const details: Record<string, { requested: number; available: number; limit: number }> = {};

    let canAllocate = true;
    let exceededDimension: BudgetDimension | undefined;

    for (const dim of dimensions) {
      const requested = normalized[dim];
      const available = this.getAvailable(dim);
      const limit = this.getLimitForDimension(dim);

      details[dim] = { requested, available, limit };

      if (requested > available) {
        canAllocate = false;
        if (!exceededDimension) {
          exceededDimension = dim;
        }
      }
    }

    return { canAllocate, exceededDimension, details };
  }

  /**
   * Fase 1: Reserva preventiva de recursos antes de iniciar a execução de um passo/tool call.
   * Se qualquer dimensão exceder o limite disponível, lança BudgetExceededError e não altera o ledger.
   */
  public reserve(
    reservationId: string,
    estimated: BudgetAmounts,
    metadata?: { stepId?: string; toolName?: string }
  ): BudgetReservation {
    if (this.reservations.has(reservationId)) {
      throw new Error(`Reserva com ID '${reservationId}' já existe no ledger.`);
    }

    const normalized = normalizeBudgetAmounts(estimated);
    const check = this.checkAvailability(normalized);

    if (!check.canAllocate && check.exceededDimension) {
      const dim = check.exceededDimension;
      throw new BudgetExceededError({
        dimension: dim,
        requested: normalized[dim],
        available: this.getAvailable(dim),
        limit: this.getLimitForDimension(dim),
        currentUsed: this.used[dim],
        currentReserved: this.reserved[dim]
      });
    }

    // Aplica a reserva
    this.reserved.steps += normalized.steps;
    this.reserved.toolCalls += normalized.toolCalls;
    this.reserved.tokens += normalized.tokens;
    this.reserved.costBrl = Number((this.reserved.costBrl + normalized.costBrl).toFixed(4));
    this.reserved.latencyMs += normalized.latencyMs;

    const reservation: BudgetReservation = {
      reservationId,
      stepId: metadata?.stepId,
      toolName: metadata?.toolName,
      estimated: normalized,
      createdAt: new Date().toISOString()
    };

    this.reservations.set(reservationId, reservation);
    return reservation;
  }

  /**
   * Fase 2: Reconciliação a posteriori após a conclusão da execução.
   * Remove a reserva estimada e debita o consumo real efetivo no saldo usado.
   */
  public reconcile(
    reservationId: string,
    actualUsed: BudgetAmounts
  ): { actualUsed: NormalizedBudgetAmounts; variance: NormalizedBudgetAmounts } {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) {
      throw new Error(`Reserva com ID '${reservationId}' não encontrada para reconciliação.`);
    }

    const actual = normalizeBudgetAmounts(actualUsed);
    const estimated = reservation.estimated;

    // Remove temporariamente a reserva para verificar se o consumo real cabe no limite
    const dimensions: BudgetDimension[] = ['steps', 'toolCalls', 'tokens', 'costBrl', 'latencyMs'];
    for (const dim of dimensions) {
      const limit = this.getLimitForDimension(dim);
      const remainingReserved = this.reserved[dim] - estimated[dim];
      const projectedUsed = this.used[dim] + actual[dim];

      if (projectedUsed + remainingReserved > limit) {
        throw new BudgetExceededError({
          dimension: dim,
          requested: actual[dim],
          available: Math.max(0, limit - this.used[dim] - remainingReserved),
          limit,
          currentUsed: this.used[dim],
          currentReserved: remainingReserved,
          message: `[BUDGET_EXCEEDED] O consumo real após reconciliação excedeu o limite na dimensão '${dim}'. Real: ${actual[dim]}, Estimado: ${estimated[dim]}, Limite: ${limit}.`
        });
      }
    }

    // Debita o consumo real e remove a reserva
    this.reserved.steps -= estimated.steps;
    this.reserved.toolCalls -= estimated.toolCalls;
    this.reserved.tokens -= estimated.tokens;
    this.reserved.costBrl = Number((this.reserved.costBrl - estimated.costBrl).toFixed(4));
    this.reserved.latencyMs -= estimated.latencyMs;

    this.used.steps += actual.steps;
    this.used.toolCalls += actual.toolCalls;
    this.used.tokens += actual.tokens;
    this.used.costBrl = Number((this.used.costBrl + actual.costBrl).toFixed(4));
    this.used.latencyMs += actual.latencyMs;

    // Calcula a variância (real - estimado)
    const variance: NormalizedBudgetAmounts = {
      steps: actual.steps - estimated.steps,
      toolCalls: actual.toolCalls - estimated.toolCalls,
      tokens: actual.tokens - estimated.tokens,
      costBrl: Number((actual.costBrl - estimated.costBrl).toFixed(4)),
      latencyMs: actual.latencyMs - estimated.latencyMs
    };

    this.totalVariance.steps += variance.steps;
    this.totalVariance.toolCalls += variance.toolCalls;
    this.totalVariance.tokens += variance.tokens;
    this.totalVariance.costBrl = Number((this.totalVariance.costBrl + variance.costBrl).toFixed(4));
    this.totalVariance.latencyMs += variance.latencyMs;

    this.reservations.delete(reservationId);
    return { actualUsed: actual, variance };
  }

  /**
   * Libera uma reserva sem debitar consumo (ex: passo cancelado ou pulado).
   */
  public release(reservationId: string): void {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) {
      return;
    }

    this.reserved.steps -= reservation.estimated.steps;
    this.reserved.toolCalls -= reservation.estimated.toolCalls;
    this.reserved.tokens -= reservation.estimated.tokens;
    this.reserved.costBrl = Number(
      (this.reserved.costBrl - reservation.estimated.costBrl).toFixed(4)
    );
    this.reserved.latencyMs -= reservation.estimated.latencyMs;

    this.reservations.delete(reservationId);
  }

  /**
   * Debita consumo diretamente sem reserva prévia (ex: overheads de runtime ou chamadas avulsas).
   */
  public recordDirectUsage(usage: BudgetAmounts): NormalizedBudgetAmounts {
    const normalized = normalizeBudgetAmounts(usage);
    const dimensions: BudgetDimension[] = ['steps', 'toolCalls', 'tokens', 'costBrl', 'latencyMs'];

    for (const dim of dimensions) {
      const requested = normalized[dim];
      const available = this.getAvailable(dim);
      const limit = this.getLimitForDimension(dim);

      if (requested > available) {
        throw new BudgetExceededError({
          dimension: dim,
          requested,
          available,
          limit,
          currentUsed: this.used[dim],
          currentReserved: this.reserved[dim]
        });
      }
    }

    this.used.steps += normalized.steps;
    this.used.toolCalls += normalized.toolCalls;
    this.used.tokens += normalized.tokens;
    this.used.costBrl = Number((this.used.costBrl + normalized.costBrl).toFixed(4));
    this.used.latencyMs += normalized.latencyMs;

    return normalized;
  }

  /**
   * Gera o snapshot completo de métricas do ledger nas 5 dimensões.
   */
  public getMetrics(): BudgetMetrics {
    const available: NormalizedBudgetAmounts = {
      steps: this.getAvailable('steps'),
      toolCalls: this.getAvailable('toolCalls'),
      tokens: this.getAvailable('tokens'),
      costBrl: this.getAvailable('costBrl'),
      latencyMs: this.getAvailable('latencyMs')
    };

    let isExceeded = false;
    let exceededDimension: BudgetDimension | undefined;

    const dimensions: BudgetDimension[] = ['steps', 'toolCalls', 'tokens', 'costBrl', 'latencyMs'];
    for (const dim of dimensions) {
      if (this.used[dim] + this.reserved[dim] > this.getLimitForDimension(dim)) {
        isExceeded = true;
        exceededDimension = dim;
        break;
      }
    }

    return {
      limits: { ...this.limits },
      reserved: { ...this.reserved },
      used: { ...this.used },
      available,
      variance: { ...this.totalVariance },
      activeReservationsCount: this.reservations.size,
      isExceeded,
      exceededDimension
    };
  }
}
