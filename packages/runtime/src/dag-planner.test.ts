import { describe, it, expect } from 'vitest';
import {
  createCanonicalDAGPlan,
  validateDAGPlan,
  validateDAGTopologicalSort,
  validateStructuralInvariants,
  PlanValidationError,
  PevcPlan,
  PlanStep
} from './dag-planner.js';
import { TaskContract, validateTaskContract } from '@adzhub/contracts';

describe('DAG Planner with Local DAG (M3-02)', () => {
  const sampleContract: TaskContract = validateTaskContract({
    schemaVersion: '1.0.0',
    taskId: 'task_audit_s0_001',
    clientId: 'client_alpha',
    tenantId: 'tenant_main',
    goal: 'Executar auditoria de criativos e identificar top performers de ROAS',
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

  const runId = 'run_pevc_dag_001';

  it('deve gerar plano canônico contendo versão, steps, dependências, effects e budget previsto', () => {
    const plan = createCanonicalDAGPlan({
      contract: sampleContract,
      runId,
      version: 1
    });

    expect(plan.schemaVersion).toBe('1.0.0');
    expect(plan.version).toBe(1);
    expect(plan.taskId).toBe(sampleContract.taskId);
    expect(plan.runId).toBe(runId);
    expect(plan.steps).toHaveLength(6);
    expect(plan.effectsRequired).toEqual(
      expect.arrayContaining([
        'read:memory',
        'read:meta',
        'read:crm',
        'write:staging',
        'write:insight'
      ])
    );

    expect(plan.totalEstimatedBudget.totalSteps).toBe(6);
    expect(plan.totalEstimatedBudget.totalTokens).toBeGreaterThan(0);
    expect(plan.totalEstimatedBudget.totalCostBrl).toBeGreaterThan(0);
    expect(plan.totalEstimatedBudget.estimatedTimeoutMs).toBeGreaterThan(0);
  });

  it('deve garantir que o contexto precede a coleta', () => {
    const plan = createCanonicalDAGPlan({
      contract: sampleContract,
      runId
    });

    const contextStep = plan.steps.find((s) => s.stepId === 'step_context')!;
    const metaStep = plan.steps.find((s) => s.stepId === 'step_fetch_meta')!;
    const crmStep = plan.steps.find((s) => s.stepId === 'step_fetch_crm')!;

    expect(contextStep.dependsOn).toEqual([]);
    expect(metaStep.dependsOn).toContain('step_context');
    expect(crmStep.dependsOn).toContain('step_context');
  });

  it('deve permitir que Meta Ads e CRM executem em paralelo (sem dependência mútua)', () => {
    const plan = createCanonicalDAGPlan({
      contract: sampleContract,
      runId
    });

    const metaStep = plan.steps.find((s) => s.stepId === 'step_fetch_meta')!;
    const crmStep = plan.steps.find((s) => s.stepId === 'step_fetch_crm')!;

    // Ambos dependem de step_context
    expect(metaStep.dependsOn).toEqual(['step_context']);
    expect(crmStep.dependsOn).toEqual(['step_context']);

    // Não dependem um do outro
    expect(metaStep.dependsOn).not.toContain('step_fetch_crm');
    expect(crmStep.dependsOn).not.toContain('step_fetch_meta');
  });

  it('deve garantir que join, verify e commit aguardam suas dependências', () => {
    const plan = createCanonicalDAGPlan({
      contract: sampleContract,
      runId
    });

    const joinStep = plan.steps.find((s) => s.stepId === 'step_join_analysis')!;
    const verifyStep = plan.steps.find((s) => s.stepId === 'step_verify')!;
    const commitStep = plan.steps.find((s) => s.stepId === 'step_commit')!;

    expect(joinStep.dependsOn).toEqual(
      expect.arrayContaining(['step_fetch_meta', 'step_fetch_crm'])
    );
    expect(verifyStep.dependsOn).toContain('step_join_analysis');
    expect(commitStep.dependsOn).toContain('step_verify');
  });

  it('deve detectar e rejeitar ciclos no DAG (ex: A -> B -> C -> A)', () => {
    const cyclicSteps: PlanStep[] = [
      {
        stepId: 'step_a',
        name: 'Step A',
        toolName: 'tool_a',
        phase: 'EXECUTE',
        dependsOn: ['step_c'],
        effects: ['read:meta'],
        estimatedBudget: { estimatedTokens: 100, estimatedCostBrl: 0.01, estimatedTimeoutMs: 1000 },
        params: {}
      },
      {
        stepId: 'step_b',
        name: 'Step B',
        toolName: 'tool_b',
        phase: 'EXECUTE',
        dependsOn: ['step_a'],
        effects: ['read:crm'],
        estimatedBudget: { estimatedTokens: 100, estimatedCostBrl: 0.01, estimatedTimeoutMs: 1000 },
        params: {}
      },
      {
        stepId: 'step_c',
        name: 'Step C',
        toolName: 'tool_c',
        phase: 'EXECUTE',
        dependsOn: ['step_b'],
        effects: ['write:staging'],
        estimatedBudget: { estimatedTokens: 100, estimatedCostBrl: 0.01, estimatedTimeoutMs: 1000 },
        params: {}
      }
    ];

    expect(() => validateDAGTopologicalSort(cyclicSteps)).toThrow(PlanValidationError);
    try {
      validateDAGTopologicalSort(cyclicSteps);
    } catch (err: any) {
      expect(err.code).toBe('CYCLE_DETECTED');
    }
  });

  it('deve rejeitar passo com auto-dependência (stepId dependendo de si mesmo)', () => {
    const selfDepStep: PlanStep[] = [
      {
        stepId: 'step_loop',
        name: 'Loop Step',
        toolName: 'tool_loop',
        phase: 'EXECUTE',
        dependsOn: ['step_loop'],
        effects: ['read:meta'],
        estimatedBudget: { estimatedTokens: 100, estimatedCostBrl: 0.01, estimatedTimeoutMs: 1000 },
        params: {}
      }
    ];

    expect(() => validateDAGTopologicalSort(selfDepStep)).toThrow(PlanValidationError);
    try {
      validateDAGTopologicalSort(selfDepStep);
    } catch (err: any) {
      expect(err.code).toBe('SELF_DEPENDENCY');
    }
  });

  it('deve rejeitar dependência inexistente no plano', () => {
    const missingDepSteps: PlanStep[] = [
      {
        stepId: 'step_valid',
        name: 'Valid Step',
        toolName: 'tool_v',
        phase: 'EXECUTE',
        dependsOn: ['step_ghost_non_existent'],
        effects: ['read:meta'],
        estimatedBudget: { estimatedTokens: 100, estimatedCostBrl: 0.01, estimatedTimeoutMs: 1000 },
        params: {}
      }
    ];

    expect(() => validateDAGTopologicalSort(missingDepSteps)).toThrow(PlanValidationError);
    try {
      validateDAGTopologicalSort(missingDepSteps);
    } catch (err: any) {
      expect(err.code).toBe('MISSING_DEPENDENCY');
    }
  });

  it('deve rejeitar plano se a ordem estrutural for violada (ex: Meta sem contexto)', () => {
    const invalidOrderSteps: PlanStep[] = [
      {
        stepId: 'step_context',
        name: 'Context',
        toolName: 'search_client_context',
        phase: 'PLAN',
        dependsOn: [],
        effects: ['read:memory'],
        estimatedBudget: { estimatedTokens: 100, estimatedCostBrl: 0.01, estimatedTimeoutMs: 1000 },
        params: {}
      },
      {
        stepId: 'step_fetch_meta',
        name: 'Meta Ads',
        toolName: 'list_ads',
        phase: 'EXECUTE',
        dependsOn: [], // Erro: não depende de step_context
        effects: ['read:meta'],
        estimatedBudget: { estimatedTokens: 100, estimatedCostBrl: 0.01, estimatedTimeoutMs: 1000 },
        params: {}
      }
    ];

    expect(() => validateStructuralInvariants(invalidOrderSteps)).toThrow(PlanValidationError);
    try {
      validateStructuralInvariants(invalidOrderSteps);
    } catch (err: any) {
      expect(err.code).toBe('STRUCTURAL_ORDER_VIOLATION');
    }
  });

  it('deve rejeitar plano se requerer efeito proibido ou não autorizado pelo contrato', () => {
    const rawPlan = createCanonicalDAGPlan({
      contract: sampleContract,
      runId
    });

    // Modifica para tentar executar external_write (que é proibido no contrato)
    const unauthorizedPlan: PevcPlan = {
      ...rawPlan,
      effectsRequired: [...rawPlan.effectsRequired, 'external_write'],
      steps: [
        ...rawPlan.steps,
        {
          stepId: 'step_unauthorized_write',
          name: 'Unauthorized Write',
          toolName: 'mutate_external_campaign',
          phase: 'EXECUTE',
          dependsOn: ['step_context'],
          effects: ['external_write'],
          estimatedBudget: {
            estimatedTokens: 100,
            estimatedCostBrl: 0.01,
            estimatedTimeoutMs: 1000
          },
          params: {}
        }
      ]
    };

    expect(() => validateDAGPlan(unauthorizedPlan, sampleContract)).toThrow(PlanValidationError);
    try {
      validateDAGPlan(unauthorizedPlan, sampleContract);
    } catch (err: any) {
      expect(err.code).toBe('EFFECT_FORBIDDEN');
    }
  });

  it('deve rejeitar plano cujo orçamento estimado exceda os limites do contrato', () => {
    const tightBudgetContract: TaskContract = {
      ...sampleContract,
      budgets: {
        maxSteps: 2, // Limite baixo proposital
        maxToolCalls: 2,
        maxTokens: 500,
        maxCostBrl: 0.01,
        timeoutMs: 2000
      }
    };

    expect(() =>
      createCanonicalDAGPlan({
        contract: tightBudgetContract,
        runId
      })
    ).toThrow(PlanValidationError);

    try {
      createCanonicalDAGPlan({
        contract: tightBudgetContract,
        runId
      });
    } catch (err: any) {
      expect(err.code).toBe('BUDGET_EXCEEDED');
    }
  });

  it('deve suportar replanejamento com versão incrementada (v2)', () => {
    const planV1 = createCanonicalDAGPlan({
      contract: sampleContract,
      runId,
      version: 1
    });

    const planV2 = createCanonicalDAGPlan({
      contract: sampleContract,
      runId,
      version: 2
    });

    expect(planV1.version).toBe(1);
    expect(planV2.version).toBe(2);
    expect(planV2.planId).toContain('v2');
  });

  describe('Intention-Aware DAG Generation (Épico 3)', () => {
    it('deve gerar plano DAG específico para intenção ACTION_RECOMMENDATION', () => {
      const actionContract: TaskContract = {
        ...sampleContract,
        intention: 'ACTION_RECOMMENDATION',
        goal: 'Propor ajuste de orçamento e pausa de criativos ineficientes'
      };

      const plan = createCanonicalDAGPlan({
        contract: actionContract,
        runId
      });

      expect(plan.steps.some((s) => s.toolName === 'run_app_action_recommendation')).toBe(true);
      expect(plan.effectsRequired).toContain('write:staging');
    });

    it('deve gerar plano DAG específico para intenção CREATIVE_BRIEF_GENERATION', () => {
      const briefContract: TaskContract = {
        ...sampleContract,
        intention: 'CREATIVE_BRIEF_GENERATION',
        goal: 'Gerar briefing criativo de hook refresh'
      };

      const plan = createCanonicalDAGPlan({
        contract: briefContract,
        runId
      });

      expect(plan.steps.some((s) => s.toolName === 'run_app_creative_brief')).toBe(true);
      expect(plan.steps.find((s) => s.stepId === 'step_creative_brief')?.dependsOn).toContain(
        'step_fetch_meta'
      );
    });

    it('deve gerar plano DAG específico para intenção MEETING_AGENDA_GENERATION', () => {
      const agendaContract: TaskContract = {
        ...sampleContract,
        intention: 'MEETING_AGENDA_GENERATION',
        goal: 'Gerar pauta de reunião executiva semanal com o cliente'
      };

      const plan = createCanonicalDAGPlan({
        contract: agendaContract,
        runId
      });

      expect(plan.steps.some((s) => s.toolName === 'run_app_meeting_agenda')).toBe(true);
      expect(plan.steps.find((s) => s.stepId === 'step_meeting_agenda')?.dependsOn).toEqual(
        expect.arrayContaining(['step_fetch_meta', 'step_fetch_crm'])
      );
    });
  });
});
