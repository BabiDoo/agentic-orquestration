import { describe, it, expect } from 'vitest';
import {
  PevcDAGScheduler,
  executeDAGPlan,
  createDefaultToolResolver,
  ToolResolver
} from './dag-scheduler.js';
import { createCanonicalDAGPlan } from './dag-planner.js';
import { TaskContract, validateTaskContract, OperationalValidators } from '@adzhub/contracts';
import { createTool, GovernedTool } from '@adzhub/tools';
import { z } from 'zod';

describe('PEV-C DAG Scheduler and Fork/Join (M3-03)', () => {
  const contract: TaskContract = validateTaskContract({
    schemaVersion: '1.0.0',
    taskId: 'task_audit_s0_001',
    clientId: 'cli_housewhey',
    tenantId: 'ten_main',
    goal: 'Auditoria de criativos e reconciliação Meta e CRM',
    timeframe: {
      since: '2026-08-01T00:00:00.000Z',
      until: '2026-08-15T23:59:59.000Z',
      timezone: 'America/Sao_Paulo'
    },
    effects: {
      allowed: ['read:memory', 'read:meta', 'read:crm', 'write:staging', 'write:insight'],
      forbidden: ['external_write']
    },
    budgets: {
      maxSteps: 10,
      maxToolCalls: 10,
      maxTokens: 10000,
      maxCostBrl: 1.0,
      timeoutMs: 30000
    },
    successCriteria: {
      minEvidenceCoverage: 0.8,
      requireVerifiedClaims: true
    },
    approvalPolicy: {
      externalWritesRequireApproval: true,
      autoApproveReadOnly: true
    }
  });

  const runId = 'run_sched_001';

  it('deve executar o plano canônico com sucesso e gerar observações formatadas para staging', async () => {
    const plan = createCanonicalDAGPlan({ contract, runId });
    const result = await executeDAGPlan({ plan, contract, runId });

    expect(result.status).toBe('COMPLETED');
    expect(result.taskId).toBe(contract.taskId);
    expect(result.runId).toBe(runId);
    expect(Object.keys(result.stepResults)).toHaveLength(6);

    // Todos os 6 passos concluídos com sucesso
    for (const step of plan.steps) {
      expect(result.stepResults[step.stepId]?.status).toBe('SUCCESS');
    }

    // Observações geradas para staging
    expect(result.observations.length).toBeGreaterThan(0);
    for (const obs of result.observations) {
      expect(OperationalValidators.validateObservation(obs)).toBeTruthy();
      expect(obs.status).toBe('RAW');
    }
  });

  it('deve paralelizar somente leituras independentes de Meta e CRM (Fork/Join)', async () => {
    const plan = createCanonicalDAGPlan({ contract, runId });

    const stepStartTimes: Record<string, number> = {};
    const stepEndTimes: Record<string, number> = {};

    const scheduler = new PevcDAGScheduler({
      plan,
      contract,
      runId,
      onStepStart: (step) => {
        stepStartTimes[step.stepId] = performance.now();
      },
      onStepComplete: (step) => {
        stepEndTimes[step.stepId] = performance.now();
      }
    });

    const result = await scheduler.execute();
    expect(result.status).toBe('COMPLETED');

    const endContext = stepEndTimes['step_context'] ?? 0;
    const startMeta = stepStartTimes['step_fetch_meta'] ?? 0;
    const startCrm = stepStartTimes['step_fetch_crm'] ?? 0;
    const endMeta = stepEndTimes['step_fetch_meta'] ?? 0;
    const endCrm = stepEndTimes['step_fetch_crm'] ?? 0;
    const startJoin = stepStartTimes['step_join_analysis'] ?? 0;

    // Contexto iniciou e completou antes de Meta e CRM
    expect(endContext).toBeLessThanOrEqual(startMeta + 10);
    expect(endContext).toBeLessThanOrEqual(startCrm + 10);

    // Join iniciou após Meta e CRM completarem
    expect(startJoin).toBeGreaterThanOrEqual(Math.min(endMeta, endCrm));
  });

  it('deve propagar cancelamento via AbortSignal para passos ativos e pendentes', async () => {
    const plan = createCanonicalDAGPlan({ contract, runId });
    const abortController = new AbortController();

    // Cancelar imediatamente após o primeiro passo (step_context)
    const scheduler = new PevcDAGScheduler({
      plan,
      contract,
      runId,
      signal: abortController.signal,
      onStepComplete: (step) => {
        if (step.stepId === 'step_context') {
          abortController.abort();
        }
      }
    });

    const result = await scheduler.execute();

    expect(result.status).toBe('CANCELLED');
    expect(result.stepResults['step_context']?.status).toBe('SUCCESS');

    // Passos posteriores devem estar marcados como CANCELLED
    expect(['CANCELLED', 'SKIPPED']).toContain(result.stepResults['step_fetch_meta']?.status);
    expect(['CANCELLED', 'SKIPPED']).toContain(result.stepResults['step_fetch_crm']?.status);
    expect(result.stepResults['step_join_analysis']?.status).toBe('CANCELLED');
  });

  it('deve registrar e atribuir timeouts especificamente ao stepId responsável', async () => {
    const plan = createCanonicalDAGPlan({ contract, runId });

    // Mock de ferramenta com timeout proposital
    const slowTool: GovernedTool<any, any> = createTool({
      name: 'list_ads',
      description: 'Slow mock tool',
      effect: 'read:meta',
      inputSchema: z.object({}).passthrough(),
      outputSchema: z.object({}).passthrough(),
      handler: async () => {
        await new Promise((r) => setTimeout(r, 500));
        return { ok: true };
      }
    });

    const defaultResolver = createDefaultToolResolver();
    const mockResolver: ToolResolver = (name) => {
      if (name === 'list_ads') return slowTool;
      return defaultResolver(name);
    };

    // Ajusta o timeout estimado do step_fetch_meta para 50ms (forçando timeout)
    const modifiedPlan = {
      ...plan,
      steps: plan.steps.map((s) =>
        s.stepId === 'step_fetch_meta'
          ? {
              ...s,
              estimatedBudget: { ...s.estimatedBudget, estimatedTimeoutMs: 50 }
            }
          : s
      )
    };

    const result = await executeDAGPlan({
      plan: modifiedPlan,
      contract,
      runId,
      toolResolver: mockResolver
    });

    expect(result.status).toBe('TIMED_OUT');
    expect(result.stepResults['step_fetch_meta']?.status).toBe('TIMED_OUT');
    expect(result.stepResults['step_fetch_meta']?.error?.code).toBe('TOOL_TIMEOUT');
    expect(result.error?.code).toBe('TOOL_TIMEOUT');
  });

  it('deve manter resultados parciais identificados no Join mesmo se houver falha subsequente', async () => {
    const plan = createCanonicalDAGPlan({ contract, runId });

    // Mock de ferramenta falhando propositalmente no Join
    const failingJoinTool: GovernedTool<any, any> = createTool({
      name: 'run_app_analise_criativos',
      description: 'Failing app',
      effect: 'write:staging',
      inputSchema: z.object({}).passthrough(),
      outputSchema: z.object({}).passthrough(),
      handler: async () => {
        throw new Error('Falha controlada na reconciliação downstream');
      }
    });

    const defaultResolver = createDefaultToolResolver();
    const mockResolver: ToolResolver = (name) => {
      if (name === 'run_app_analise_criativos') return failingJoinTool;
      return defaultResolver(name);
    };

    const result = await executeDAGPlan({
      plan,
      contract,
      runId,
      toolResolver: mockResolver
    });

    expect(result.status).toBe('FAILED');
    expect(result.stepResults['step_join_analysis']?.status).toBe('FAILED');

    // Resultados parciais de contexto, meta e crm foram preservados e identificados por stepId
    expect(result.partialResults['step_context']).toBeDefined();
    expect(result.partialResults['step_fetch_meta']).toBeDefined();
    expect(result.partialResults['step_fetch_crm']).toBeDefined();
  });
});
