import { describe, it, expect } from 'vitest';
import { BudgetLedger, BudgetExceededError } from './budget-ledger.js';
import { TaskBudgets } from '@adzhub/contracts';

describe('Budget Ledger (M3-04)', () => {
  const sampleBudgets: TaskBudgets = {
    maxSteps: 10,
    maxToolCalls: 8,
    maxTokens: 5000,
    maxCostBrl: 1.5,
    timeoutMs: 15000
  };

  it('deve inicializar o ledger com todas as 5 dimensões e métricas zeradas', () => {
    const ledger = new BudgetLedger(sampleBudgets);
    const metrics = ledger.getMetrics();

    expect(metrics.limits.maxSteps).toBe(10);
    expect(metrics.limits.maxToolCalls).toBe(8);
    expect(metrics.limits.maxTokens).toBe(5000);
    expect(metrics.limits.maxCostBrl).toBe(1.5);
    expect(metrics.limits.timeoutMs).toBe(15000);

    expect(metrics.used).toEqual({ steps: 0, toolCalls: 0, tokens: 0, costBrl: 0, latencyMs: 0 });
    expect(metrics.reserved).toEqual({
      steps: 0,
      toolCalls: 0,
      tokens: 0,
      costBrl: 0,
      latencyMs: 0
    });
    expect(metrics.available).toEqual({
      steps: 10,
      toolCalls: 8,
      tokens: 5000,
      costBrl: 1.5,
      latencyMs: 15000
    });
    expect(metrics.activeReservationsCount).toBe(0);
    expect(metrics.isExceeded).toBe(false);
  });

  it('deve executar o fluxo de duas fases: reserva preventiva -> reconciliação com consumo real', () => {
    const ledger = new BudgetLedger(sampleBudgets);

    // 1. Reserva preventiva do passo 1
    const res1 = ledger.reserve(
      'res_step_1',
      {
        steps: 1,
        toolCalls: 1,
        tokens: 800,
        costBrl: 0.1,
        latencyMs: 2000
      },
      { stepId: 'step_1', toolName: 'list_ads' }
    );

    expect(res1.reservationId).toBe('res_step_1');
    let metrics = ledger.getMetrics();
    expect(metrics.reserved.tokens).toBe(800);
    expect(metrics.reserved.steps).toBe(1);
    expect(metrics.used.tokens).toBe(0);
    expect(metrics.available.tokens).toBe(4200);
    expect(metrics.activeReservationsCount).toBe(1);

    // 2. Reconciliação do passo 1 (consumiu menos tokens que o previsto)
    const recon1 = ledger.reconcile('res_step_1', {
      steps: 1,
      toolCalls: 1,
      tokens: 650,
      costBrl: 0.08,
      latencyMs: 1500
    });

    expect(recon1.actualUsed.tokens).toBe(650);
    expect(recon1.variance.tokens).toBe(-150); // Usou 150 a menos que o estimado

    metrics = ledger.getMetrics();
    expect(metrics.reserved.tokens).toBe(0);
    expect(metrics.used.tokens).toBe(650);
    expect(metrics.used.steps).toBe(1);
    expect(metrics.used.costBrl).toBe(0.08);
    expect(metrics.available.tokens).toBe(4350);
    expect(metrics.activeReservationsCount).toBe(0);
  });

  it('deve rejeitar reserva e disparar BUDGET_EXCEEDED quando qualquer dimensão exceder o limite', () => {
    const ledger = new BudgetLedger(sampleBudgets);

    // Tenta reservar mais tokens do que o permitido
    expect(() =>
      ledger.reserve('res_overflow_tokens', {
        steps: 1,
        toolCalls: 1,
        tokens: 6000, // Limite é 5000
        costBrl: 0.1,
        latencyMs: 1000
      })
    ).toThrow(BudgetExceededError);

    try {
      ledger.reserve('res_overflow_tokens', {
        steps: 1,
        toolCalls: 1,
        tokens: 6000,
        costBrl: 0.1,
        latencyMs: 1000
      });
    } catch (err: any) {
      expect(err.code).toBe('BUDGET_EXCEEDED');
      expect(err.dimension).toBe('tokens');
      expect(err.requested).toBe(6000);
      expect(err.limit).toBe(5000);
    }

    // Tenta reservar mais custo em BRL do que o permitido
    expect(() =>
      ledger.reserve('res_overflow_cost', {
        steps: 1,
        toolCalls: 1,
        tokens: 100,
        costBrl: 2.0, // Limite é 1.5
        latencyMs: 1000
      })
    ).toThrow(BudgetExceededError);

    // O estado do ledger não é corrompido após a rejeição
    const metrics = ledger.getMetrics();
    expect(metrics.reserved.tokens).toBe(0);
    expect(metrics.used.tokens).toBe(0);
    expect(metrics.available.tokens).toBe(5000);
  });

  it('deve garantir que o saldo disponível nunca fica negativo', () => {
    const tightBudgets: TaskBudgets = {
      maxSteps: 2,
      maxToolCalls: 2,
      maxTokens: 100,
      maxCostBrl: 0.05,
      timeoutMs: 1000
    };

    const ledger = new BudgetLedger(tightBudgets);

    // Reserva o valor exato do limite
    ledger.reserve('res_full', {
      steps: 2,
      toolCalls: 2,
      tokens: 100,
      costBrl: 0.05,
      latencyMs: 1000
    });

    const metrics = ledger.getMetrics();
    expect(metrics.available.steps).toBe(0);
    expect(metrics.available.toolCalls).toBe(0);
    expect(metrics.available.tokens).toBe(0);
    expect(metrics.available.costBrl).toBe(0);
    expect(metrics.available.latencyMs).toBe(0);

    // getAvailable nunca retorna número menor que 0
    expect(ledger.getAvailable('tokens')).toBeGreaterThanOrEqual(0);
    expect(ledger.getAvailable('costBrl')).toBeGreaterThanOrEqual(0);
  });

  it('deve permitir liberação (release) de reserva não executada (ex: cancelamento)', () => {
    const ledger = new BudgetLedger(sampleBudgets);

    ledger.reserve('res_cancel', {
      steps: 2,
      toolCalls: 2,
      tokens: 1500,
      costBrl: 0.3,
      latencyMs: 3000
    });

    expect(ledger.getMetrics().reserved.tokens).toBe(1500);
    expect(ledger.getMetrics().available.tokens).toBe(3500);

    // Libera a reserva
    ledger.release('res_cancel');

    const metrics = ledger.getMetrics();
    expect(metrics.reserved.tokens).toBe(0);
    expect(metrics.used.tokens).toBe(0);
    expect(metrics.available.tokens).toBe(5000);
    expect(metrics.activeReservationsCount).toBe(0);
  });

  it('deve suportar débito direto (recordDirectUsage) respeitando os limites', () => {
    const ledger = new BudgetLedger(sampleBudgets);

    ledger.recordDirectUsage({
      steps: 1,
      toolCalls: 1,
      tokens: 200,
      costBrl: 0.05,
      latencyMs: 300
    });

    const metrics = ledger.getMetrics();
    expect(metrics.used.tokens).toBe(200);
    expect(metrics.available.tokens).toBe(4800);

    // Tentar débito direto que ultrapassa limite
    expect(() =>
      ledger.recordDirectUsage({
        steps: 10 // já usamos 1, limite é 10 -> 1 + 10 = 11 > 10
      })
    ).toThrow(BudgetExceededError);
  });

  it('deve gerar métricas finais completas distinguindo reservado, usado, disponível e variância', () => {
    const ledger = new BudgetLedger(sampleBudgets);

    // Reserva 1: Executada e reconciliada
    ledger.reserve('res_1', {
      steps: 1,
      toolCalls: 1,
      tokens: 1000,
      costBrl: 0.2,
      latencyMs: 2000
    });
    ledger.reconcile('res_1', {
      steps: 1,
      toolCalls: 1,
      tokens: 1100,
      costBrl: 0.22,
      latencyMs: 2100
    });

    // Reserva 2: Ainda ativa (em andamento)
    ledger.reserve('res_2', { steps: 1, toolCalls: 1, tokens: 500, costBrl: 0.1, latencyMs: 1000 });

    const metrics = ledger.getMetrics();

    expect(metrics.used.tokens).toBe(1100);
    expect(metrics.reserved.tokens).toBe(500);
    expect(metrics.available.tokens).toBe(5000 - 1100 - 500); // 3400
    expect(metrics.variance.tokens).toBe(100); // usou 100 a mais que estimado na res_1
    expect(metrics.activeReservationsCount).toBe(1);
    expect(metrics.isExceeded).toBe(false);
  });
});
