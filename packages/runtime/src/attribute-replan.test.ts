import { describe, it, expect } from 'vitest';
import {
  attributeFailure,
  createAdaptiveReplan,
  ReplanLimitExceededError,
  CausalAttributionEvidence
} from './attribute-replan.js';
import { createCanonicalDAGPlan } from './dag-planner.js';
import { TaskContract, validateTaskContract } from '@adzhub/contracts';
import { StepExecutionResult } from './dag-scheduler.js';

describe('ATTRIBUTE and REPLAN (M3-08)', () => {
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

  const runId = 'run_replan_test_001';

  it('deve categorizar e atribuir evidência causal nas 7 categorias normativas', () => {
    // 1. Integration
    const integrationStep: StepExecutionResult = {
      stepId: 'step_fetch_crm',
      toolName: 'get_crm_leads',
      phase: 'EXECUTE',
      status: 'TIMED_OUT',
      error: { code: 'TOOL_TIMEOUT', category: 'integration', message: '503 CRM timeout' },
      executionTimeMs: 2000,
      toolCallId: 'call_1',
      startedAt: '',
      completedAt: ''
    };
    const attrIntegration = attributeFailure({ stepResult: integrationStep, replanCount: 0 });
    expect(attrIntegration.category).toBe('integration');
    expect(attrIntegration.recoverability).toBe('RECOVERABLE');
    expect(attrIntegration.suggestedAction).toBe('PARTIAL_ABSTENTION');

    // 2. Data
    const dataStep: StepExecutionResult = {
      stepId: 'step_data',
      toolName: 'parse_crm',
      phase: 'EXECUTE',
      status: 'FAILED',
      error: {
        code: 'INVALID_SCHEMA',
        category: 'data',
        message: 'Schema mismatch em campo obrigatório'
      },
      executionTimeMs: 100,
      toolCallId: 'call_2',
      startedAt: '',
      completedAt: ''
    };
    const attrData = attributeFailure({ stepResult: dataStep, replanCount: 0 });
    expect(attrData.category).toBe('data');
    expect(attrData.recoverability).toBe('FATAL');

    // 3. Policy
    const policyStep: StepExecutionResult = {
      stepId: 'step_mutate',
      toolName: 'mutate_ads',
      phase: 'EXECUTE',
      status: 'FAILED',
      error: { code: 'POLICY_DENIED', category: 'policy', message: 'Ação bloqueada por política' },
      executionTimeMs: 50,
      toolCallId: 'call_3',
      startedAt: '',
      completedAt: ''
    };
    const attrPolicy = attributeFailure({ stepResult: policyStep, replanCount: 0 });
    expect(attrPolicy.category).toBe('policy');
    expect(attrPolicy.recoverability).toBe('FATAL');

    // 4. Context
    const contextStep: StepExecutionResult = {
      stepId: 'step_context',
      toolName: 'search_client_context',
      phase: 'PLAN',
      status: 'FAILED',
      error: {
        code: 'INTERNAL_ERROR',
        category: 'context',
        message: 'Cliente não encontrado na base de dados'
      },
      executionTimeMs: 50,
      toolCallId: 'call_4',
      startedAt: '',
      completedAt: ''
    };
    const attrContext = attributeFailure({ stepResult: contextStep, replanCount: 0 });
    expect(attrContext.category).toBe('context');

    // 5. Plan
    const planStep: StepExecutionResult = {
      stepId: 'step_dag',
      toolName: 'plan_generator',
      phase: 'PLAN',
      status: 'FAILED',
      error: { code: 'INVALID_TASK', category: 'plan', message: 'Ciclo detectado no grafo' },
      executionTimeMs: 20,
      toolCallId: 'call_5',
      startedAt: '',
      completedAt: ''
    };
    const attrPlan = attributeFailure({ stepResult: planStep, replanCount: 0 });
    expect(attrPlan.category).toBe('plan');

    // 6. Model
    const modelStep: StepExecutionResult = {
      stepId: 'step_llm',
      toolName: 'openrouter_completion',
      phase: 'EXECUTE',
      status: 'FAILED',
      error: { code: 'TOOL_ERROR', category: 'model', message: 'LLM generated malformed JSON' },
      executionTimeMs: 1200,
      toolCallId: 'call_6',
      startedAt: '',
      completedAt: ''
    };
    const attrModel = attributeFailure({ stepResult: modelStep, replanCount: 0 });
    expect(attrModel.category).toBe('model');

    // 7. Runtime
    const runtimeStep: StepExecutionResult = {
      stepId: 'step_system',
      toolName: 'system_core',
      phase: 'EXECUTE',
      status: 'FAILED',
      error: { code: 'INTERNAL_ERROR', category: 'runtime', message: 'Out of memory crash' },
      executionTimeMs: 500,
      toolCallId: 'call_7',
      startedAt: '',
      completedAt: ''
    };
    const attrRuntime = attributeFailure({ stepResult: runtimeStep, replanCount: 0 });
    expect(attrRuntime.category).toBe('runtime');
  });

  it('deve gerar nova versão do plano (v2) adaptando o DAG para abstenção parcial', () => {
    const originalPlan = createCanonicalDAGPlan({ contract, runId, version: 1 });

    const failedStep: StepExecutionResult = {
      stepId: 'step_fetch_crm',
      toolName: 'get_crm_leads',
      phase: 'EXECUTE',
      status: 'FAILED',
      error: {
        code: 'CIRCUIT_OPEN',
        category: 'integration',
        message: 'CRM API 503 indisponível'
      },
      executionTimeMs: 1500,
      toolCallId: 'call_crm_fail',
      startedAt: '',
      completedAt: ''
    };

    const attribution = attributeFailure({ stepResult: failedStep, replanCount: 0, maxReplans: 2 });
    expect(attribution.category).toBe('integration');

    const replanV2 = createAdaptiveReplan({
      originalPlan,
      attribution,
      contract,
      replanCount: 0,
      maxReplans: 2
    });

    expect(replanV2.version).toBe(2);
    expect(replanV2.planId).toContain('v2');

    // O step falho (step_fetch_crm) foi removido do DAG
    expect(replanV2.steps.some((s) => s.stepId === 'step_fetch_crm')).toBe(false);

    // O step de join (step_join_analysis) agora depende APENAS do step_fetch_meta
    const joinStep = replanV2.steps.find((s) => s.stepId === 'step_join_analysis')!;
    expect(joinStep.dependsOn).toEqual(['step_fetch_meta']);
    expect(joinStep.params.partialAbstention).toBe(true);
  });

  it('deve impedir replan e lançar ReplanLimitExceededError quando atingir 2 replans', () => {
    const originalPlan = createCanonicalDAGPlan({ contract, runId, version: 2 });
    const attribution: CausalAttributionEvidence = {
      category: 'integration',
      errorCode: 'CIRCUIT_OPEN',
      recoverability: 'RECOVERABLE',
      safeMessage: 'Falha repetida',
      suggestedAction: 'REPLAN',
      failedStepId: 'step_fetch_crm',
      failedToolName: 'get_crm_leads',
      causalDetails: {
        errorCode: 'CIRCUIT_OPEN',
        errorMessage: 'Falha 2',
        timestamp: new Date().toISOString()
      }
    };

    // Já executou 2 replans (replanCount = 2, maxReplans = 2)
    expect(() =>
      createAdaptiveReplan({
        originalPlan,
        attribution,
        contract,
        replanCount: 2,
        maxReplans: 2
      })
    ).toThrow(ReplanLimitExceededError);
  });
});
