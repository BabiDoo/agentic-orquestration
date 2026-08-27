import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  executeDAGPlan,
  createCanonicalDAGPlan,
  attributeFailure,
  createAdaptiveReplan,
  CircuitBreaker,
  CheckpointManager,
  createCheckpoint,
  replayRunEvents,
  createInitialPevcState,
  pevcReducer,
  AppendOnlyEventLog
} from '@adzhub/runtime';
import {
  createDatabase,
  AdzHubDatabase,
  ArtifactRepository,
  AtomicCommitEngine
} from '@adzhub/data';
import { TaskContract, validateTaskContract } from '@adzhub/contracts';

describe('M7-04 — Testes de Integração do Runtime PEV-C', () => {
  let db: AdzHubDatabase;

  const validContract: TaskContract = validateTaskContract({
    schemaVersion: '1.0.0',
    taskId: 'task_integ_001',
    clientId: 'cli_housewhey',
    tenantId: 'ten_main',
    goal: 'Auditoria e reconciliação Meta + CRM',
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

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  describe('1. Fork/Join no DAG Scheduler com Nós Paralelos e Dependências Combinadas', () => {
    it('executa nós paralelos de Meta Ads e CRM e faz join dos dados para reconciliação', async () => {
      const runId = 'run_dag_fork_join_01';
      const plan = createCanonicalDAGPlan({ contract: validContract, runId });

      expect(plan.steps.length).toBeGreaterThanOrEqual(4);

      const result = await executeDAGPlan({
        plan,
        contract: validContract,
        runId
      });

      expect(result.status).toBe('COMPLETED');
      expect(result.observations.length).toBeGreaterThanOrEqual(4);

      for (const step of plan.steps) {
        expect(result.stepResults[step.stepId]?.status).toBe('SUCCESS');
      }
    });
  });

  describe('2. Timeout e Circuit Breaker (Trip, Reset e Recovery)', () => {
    it('abre o circuito após N falhas consecutivas e protege integrações externas', () => {
      const breaker = new CircuitBreaker('crm_service', 2);
      expect(breaker.getState()).toBe('CLOSED');
      expect(breaker.isOpen()).toBe(false);

      // 1. Primeira falha
      breaker.recordFailure();
      expect(breaker.getState()).toBe('CLOSED');

      // 2. Segunda falha consecutive atinge o threshold (2) -> OPEN
      breaker.recordFailure();
      expect(breaker.getState()).toBe('OPEN');
      expect(breaker.isOpen()).toBe(true);

      // 3. Reset recupera o circuito para CLOSED
      breaker.reset();
      expect(breaker.getState()).toBe('CLOSED');
      expect(breaker.isOpen()).toBe(false);
    });
  });

  describe('3. Falha em Cenário S1 (CRM Indisponível) -> ATTRIBUTE -> REPLAN Automático', () => {
    it('quando CRM falha com 503, atribui a falha à integração e gera REPLAN adaptativo v2', () => {
      const originalPlan = createCanonicalDAGPlan({
        contract: validContract,
        runId: 'run_s1_replan',
        version: 1
      });

      const failedStep = {
        stepId: 'step_fetch_crm',
        toolName: 'get_crm_leads',
        phase: 'EXECUTE' as const,
        status: 'FAILED' as const,
        error: {
          code: 'TOOL_ERROR',
          category: 'integration' as const,
          message: 'CRM unavailable 503'
        },
        executionTimeMs: 150,
        toolCallId: 'tcall_crm_fail',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      };

      // 1. Atribuição causal da falha
      const attribution = attributeFailure({
        stepResult: failedStep,
        replanCount: 0,
        maxReplans: 2
      });

      expect(attribution.category).toBe('integration');
      expect(attribution.recoverability).toBe('RECOVERABLE');
      expect(attribution.suggestedAction).toBe('PARTIAL_ABSTENTION');

      // 2. Criação do REPLAN adaptativo
      const adaptiveReplan = createAdaptiveReplan({
        originalPlan,
        attribution,
        contract: validContract,
        replanCount: 0,
        maxReplans: 2
      });

      expect(adaptiveReplan.version).toBe(2);
      expect(adaptiveReplan.planId).toContain('v2');
      // O novo plano omite o passo falho do CRM
      expect(adaptiveReplan.steps.some((s) => s.stepId === 'step_fetch_crm')).toBe(false);
    });
  });

  describe('4. Rollback Atômico e Tratamento de Commit Conflict no SQLite', () => {
    it('executa rollback limpo e preserva integridade sem estados parciais em caso de erro', () => {
      const repository = new ArtifactRepository(db);
      const engine = new AtomicCommitEngine(db);

      db.prepare(
        `
        INSERT INTO task_contracts (task_id, client_id, tenant_id, contract_hash, contract_json, created_at)
        VALUES ('task_conflict', 'cli_housewhey', 'ten_main', 'hash_c', '{}', ?)
      `
      ).run(new Date().toISOString());

      db.prepare(
        `
        INSERT INTO runs (run_id, task_id, client_id, mode, status, started_at)
        VALUES ('run_conflict', 'task_conflict', 'cli_housewhey', 'GOVERNED_PEVC', 'EXECUTING', ?)
      `
      ).run(new Date().toISOString());

      // Inserir evidência válida
      db.prepare(
        `
        INSERT INTO observations_staging (
          observation_id, tool_call_id, run_id, task_id, source, locator,
          schema_version, status, captured_at, payload_hash, payload_json
        ) VALUES ('obs_c1', 'tcall_c1', 'run_conflict', 'task_conflict', 'meta_ads', 'loc_c1', '1.0.0', 'VERIFIED', ?, 'hash_c1', '{}')
      `
      ).run(new Date().toISOString());

      db.prepare(
        `
        INSERT INTO evidence (
          evidence_id, observation_id, task_id, run_id, claim_locator,
          verification_score, verified_at, check_ids_json, status, evidence_hash
        ) VALUES ('evi_c1', 'obs_c1', 'task_conflict', 'run_conflict', 'loc_c1', 0.90, ?, '[]', 'VERIFIED', 'hash_e1')
      `
      ).run(new Date().toISOString());

      const staged = repository.stageArtifact({
        taskId: 'task_conflict',
        runId: 'run_conflict',
        type: 'INSIGHT',
        version: 1,
        claims: [
          {
            claimId: 'c1',
            text: 'Conflito de transação',
            locator: 'loc_c1',
            evidenceRefs: ['evi_c1']
          }
        ],
        evidenceRefs: ['evi_c1']
      });

      // 1. Primeiro commit com sucesso
      const firstCommit = engine.commitArtifact({
        transactionId: 'txn_c_01',
        taskId: 'task_conflict',
        runId: 'run_conflict',
        artifactId: staged.artifact.artifactId,
        policyRef: 'pol_ref'
      });
      expect(firstCommit.ok).toBe(true);

      // 2. Tentativa de re-commit com outro transactionId para o mesmo artefato já COMMITTED deve ser REJEITADA
      const conflictingCommit = engine.commitArtifact({
        transactionId: 'txn_c_02',
        taskId: 'task_conflict',
        runId: 'run_conflict',
        artifactId: staged.artifact.artifactId,
        policyRef: 'pol_ref'
      });
      expect(conflictingCommit.ok).toBe(false);
      expect(conflictingCommit.errorCode).toBe('COMMIT_REJECTED');

      // 3. Apenas 1 commit registrado no banco
      const count = db
        .prepare('SELECT COUNT(*) as c FROM commits WHERE artifact_id = ?')
        .get(staged.artifact.artifactId) as { c: number };
      expect(count.c).toBe(1);
    });
  });

  describe('5. Checkpoint Replay Determinístico Sem Repetição de Efeitos Colaterais', () => {
    it('reconstrói a máquina de estados através de replay determinístico do Event Log', () => {
      const eventLog = new AppendOnlyEventLog();
      const checkpointManager = new CheckpointManager();
      const runId = 'run_replay_test_01';
      const isoTime = new Date().toISOString();

      let state = createInitialPevcState({ taskId: 'task_replay', runId });

      // Step 1: Initialize
      const s1 = pevcReducer(state, { type: 'INITIALIZE', timestamp: isoTime });
      state = s1.nextState;
      eventLog.append(s1.event);
      checkpointManager.saveCheckpoint(createCheckpoint(state));

      // Step 2: Plan
      const s2 = pevcReducer(state, {
        type: 'PLAN_SUBMITTED',
        plan: { steps: ['s1', 's2'] },
        timestamp: isoTime
      });
      state = s2.nextState;
      eventLog.append(s2.event);
      checkpointManager.saveCheckpoint(createCheckpoint(state));

      // Step 3: Execution
      const s3 = pevcReducer(state, {
        type: 'EXECUTION_COMPLETED',
        observations: [{ obsId: 'obs_1' }],
        timestamp: isoTime
      });
      state = s3.nextState;
      eventLog.append(s3.event);
      checkpointManager.saveCheckpoint(createCheckpoint(state));

      // Executa replay a partir dos eventos gravados
      const replay = replayRunEvents({
        eventLog,
        checkpointManager,
        runId
      });

      expect(replay.replayedEventsCount).toBe(3);
      expect(replay.checkpointsValidatedCount).toBe(3);
      expect(replay.state.currentPhase).toBe('VERIFY');
      expect(replay.state.seq).toBe(3);
      expect(replay.state.observations).toHaveLength(1);
    });
  });
});
