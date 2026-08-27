import { describe, it, expect } from 'vitest';
import { executeGovernedPevcTask } from './attribute-replan.js';
import { TaskContract, validateTaskContract } from '@adzhub/contracts';
import {
  createMarketingTools,
  createMemoryTools,
  createAppTools,
  GovernedTool
} from '@adzhub/tools';
import { AppendOnlyEventLog } from './event-log.js';
import { CheckpointManager, replayRunEvents, createCheckpoint } from './checkpoint-replay.js';
import { createInitialPevcState, pevcReducer } from './pevc-state-machine.js';
import { BudgetLedger } from './budget-ledger.js';

describe('Gate M3 — Validação Integrada do Runtime Governed PEV-C', () => {
  const baseContract: TaskContract = validateTaskContract({
    schemaVersion: '1.0.0',
    taskId: 'task_gate_m3_audit',
    clientId: 'cli_housewhey',
    tenantId: 'ten_main',
    goal: 'Auditoria completa de criativos com reconciliação de dados Meta e CRM',
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
      maxSteps: 12,
      maxToolCalls: 10,
      maxTokens: 15000,
      maxCostBrl: 2.0,
      timeoutMs: 40000
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

  it('Gate M3.1: Trace reproduz todas as transições da máquina PEV-C', async () => {
    const result = await executeGovernedPevcTask({
      contract: baseContract,
      runId: 'run_gate_m3_trace'
    });

    expect(result.status).toBe('COMPLETED');
    expect(result.finalPhase).toBe('COMPLETED');
    // Deve ter registrado eventos para todas as fases normativas
    expect(result.eventsCount).toBeGreaterThanOrEqual(5);
    expect(result.checkpointsCount).toBeGreaterThanOrEqual(5);
    expect(result.observationsCount).toBeGreaterThan(0);
    expect(result.finalCommitResult).toBeDefined();
  });

  it('Gate M3.2: Cancelamento e budget excessivo não deixam efeitos pendentes', async () => {
    // 1. Cancelamento imediato
    const abortCtrl = new AbortController();
    abortCtrl.abort();

    const cancelResult = await executeGovernedPevcTask({
      contract: baseContract,
      runId: 'run_gate_m3_cancel',
      signal: abortCtrl.signal
    });

    expect(cancelResult.status).toBe('FAILED');
    expect(cancelResult.budgetMetrics.reserved.tokens).toBe(0); // Liberação de orçamento

    // 2. Budget excessivo
    const tightContract: TaskContract = {
      ...baseContract,
      budgets: {
        ...baseContract.budgets,
        maxSteps: 1 // Teto de 1 passo dispara rejeição preventiva
      }
    };

    const budgetLedger = new BudgetLedger(tightContract.budgets);
    expect(() =>
      budgetLedger.reserve('res_overflow', {
        steps: 5,
        toolCalls: 5,
        tokens: 2000,
        costBrl: 0.1,
        latencyMs: 5000
      })
    ).toThrow();
    expect(budgetLedger.getMetrics().reserved.steps).toBe(0);
    expect(budgetLedger.getMetrics().used.steps).toBe(0);
  });

  it('Gate M3.3: Replay reconstrói estado determinístico e não duplica chamadas confirmadas', () => {
    const eventLog = new AppendOnlyEventLog();
    const checkpointManager = new CheckpointManager();
    const runId = 'run_gate_m3_replay';
    const isoTime = '2026-08-25T10:00:00.000Z';

    // Grava transições
    let state = createInitialPevcState({ taskId: baseContract.taskId, runId });
    const s1 = pevcReducer(state, { type: 'INITIALIZE', timestamp: isoTime });
    state = s1.nextState;
    eventLog.append(s1.event);
    checkpointManager.saveCheckpoint(createCheckpoint(state));

    const s2 = pevcReducer(state, {
      type: 'PLAN_SUBMITTED',
      plan: { version: 1 },
      timestamp: isoTime
    });
    state = s2.nextState;
    eventLog.append(s2.event);
    checkpointManager.saveCheckpoint(createCheckpoint(state));

    const s3 = pevcReducer(state, {
      type: 'EXECUTION_COMPLETED',
      observations: [{ obsId: 'obs_1', payloadHash: 'a'.repeat(64) }],
      timestamp: isoTime
    });
    state = s3.nextState;
    eventLog.append(s3.event);
    checkpointManager.saveCheckpoint(createCheckpoint(state));

    const s4 = pevcReducer(state, {
      type: 'VERIFICATION_PASSED',
      evidences: [{ evidenceId: 'evi_1', score: 1.0 }],
      timestamp: isoTime
    });
    state = s4.nextState;
    eventLog.append(s4.event);
    checkpointManager.saveCheckpoint(createCheckpoint(state));

    const s5 = pevcReducer(state, {
      type: 'COMMIT_COMPLETED',
      commitResult: { commitId: 'cmt_001' },
      timestamp: isoTime
    });
    state = s5.nextState;
    eventLog.append(s5.event);
    checkpointManager.saveCheckpoint(createCheckpoint(state));

    // Executa Replay
    const replay = replayRunEvents({
      eventLog,
      checkpointManager,
      runId
    });

    expect(replay.state.currentPhase).toBe('COMPLETED');
    expect(replay.replayedEventsCount).toBe(5);
    expect(replay.checkpointsValidatedCount).toBe(5);
  });

  it('Gate M3.4: S1 demonstra ATTRIBUTE → REPLAN com abstenção parcial honesta', async () => {
    // Instancia ferramentas com o Cenário S1 injetado (CRM indisponível)
    const memoryTools = createMemoryTools();
    const marketingTools = createMarketingTools({ scenario: 'S1' });
    const appTools = createAppTools();

    const toolMap = new Map<string, GovernedTool<any, any>>();
    toolMap.set(memoryTools.searchClientContextTool.name, memoryTools.searchClientContextTool);
    toolMap.set(marketingTools.listAdsTool.name, marketingTools.listAdsTool);
    toolMap.set(marketingTools.getAdInsightsTool.name, marketingTools.getAdInsightsTool);
    toolMap.set(marketingTools.getLeadsTool.name, marketingTools.getLeadsTool);
    toolMap.set('get_crm_leads', marketingTools.getLeadsTool);
    toolMap.set(appTools.runAppAnaliseCriativosTool.name, appTools.runAppAnaliseCriativosTool);
    toolMap.set(appTools.getMapaSolucaoTool.name, appTools.getMapaSolucaoTool);

    const s1Resolver = (toolName: string) => toolMap.get(toolName);

    const result = await executeGovernedPevcTask({
      contract: baseContract,
      runId: 'run_gate_m3_scenario_s1',
      toolResolver: s1Resolver,
      maxReplans: 2
    });

    // 1. O run deve concluir com sucesso graças à abstenção parcial adaptativa
    expect(result.status).toBe('COMPLETED');
    expect(result.finalPhase).toBe('COMPLETED');

    // 2. Deve ter executado exatamente 1 REPLAN (v1 -> v2)
    expect(result.replanCount).toBe(1);

    // 3. A atribuição causal deve ter diagnosticado falha de integração
    expect(result.attribution).toBeDefined();
    expect(result.attribution?.category).toBe('integration');
    expect(result.attribution?.suggestedAction).toBe('PARTIAL_ABSTENTION');

    // 4. Deve ter anotado abstenção parcial honesta
    expect(result.partialAbstention).toBe(true);
    expect(result.finalCommitResult).toBeDefined();
    expect(result.finalCommitResult?.partialAbstention).toBe(true);
  });
});
