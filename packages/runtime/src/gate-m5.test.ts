import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  AdzHubDatabase,
  createDatabase,
  ArtifactRepository,
  AtomicCommitEngine
} from '@adzhub/data';
import { CapabilityBroker, ApprovalManager } from '@adzhub/policy';
import { TaskContract } from '@adzhub/contracts';

describe('GATE M5 — Capability Broker, policy e commit atômico', () => {
  let db: AdzHubDatabase;
  let repository: ArtifactRepository;
  let commitEngine: AtomicCommitEngine;
  let broker: CapabilityBroker;
  let approvalManager: ApprovalManager;

  const validTask: TaskContract = {
    schemaVersion: '1.0.0',
    taskId: 'task_gate_m5',
    clientId: 'cli_housewhey',
    tenantId: 'tenant_main',
    goal: 'Executar auditoria criativa e validação de autoridade',
    timeframe: {
      since: '2026-08-01T00:00:00.000Z',
      until: '2026-08-20T23:59:59.000Z',
      timezone: 'America/Sao_Paulo'
    },
    effects: {
      allowed: [
        'read:meta',
        'read:crm',
        'read:memory',
        'write:staging',
        'write:insight',
        'external_write'
      ]
    },
    budgets: {
      maxSteps: 10,
      maxToolCalls: 20,
      maxTokens: 50000,
      maxCostBrl: 15.0,
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
  };

  beforeEach(() => {
    db = createDatabase(':memory:');
    repository = new ArtifactRepository(db);
    commitEngine = new AtomicCommitEngine(db);
    broker = new CapabilityBroker();
    approvalManager = new ApprovalManager();

    // Registrar task_contract no banco
    db.prepare(
      `
      INSERT INTO task_contracts (task_id, client_id, tenant_id, contract_hash, contract_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    ).run(
      validTask.taskId,
      validTask.clientId,
      validTask.tenantId,
      'hash_task_m5',
      JSON.stringify(validTask),
      new Date().toISOString()
    );

    // Registrar run no banco
    db.prepare(
      `
      INSERT INTO runs (run_id, task_id, client_id, mode, status, started_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    ).run(
      'run_gate_m5',
      validTask.taskId,
      validTask.clientId,
      'GOVERNED_PEVC',
      'EXECUTING',
      new Date().toISOString()
    );
  });

  afterEach(() => {
    db.close();
  });

  it('Gate M5.1: Zero commits no Governed sem EvidenceRefs válidas', () => {
    // 1. Tentar commitar artefato sem nenhuma evidência no banco
    const stagedNoEvidence = repository.stageArtifact({
      taskId: validTask.taskId,
      runId: 'run_gate_m5',
      type: 'INSIGHT',
      version: 1,
      claims: [
        { claimId: 'c1', text: 'Afirmação sem evidência', evidenceRefs: ['evi_fake_000001'] }
      ],
      evidenceRefs: ['evi_fake_000001']
    });

    const commitFailGhost = commitEngine.commitArtifact({
      transactionId: 'txn_m5_ghost',
      taskId: validTask.taskId,
      runId: 'run_gate_m5',
      artifactId: stagedNoEvidence.artifact.artifactId,
      policyRef: 'pol_audit'
    });

    expect(commitFailGhost.ok).toBe(false);
    expect(commitFailGhost.errorCode).toBe('COMMIT_REJECTED');

    // 2. Tentar commitar artefato com evidência não verificada (QUARANTINED)
    db.prepare(
      `
      INSERT INTO observations_staging (
        observation_id, tool_call_id, run_id, task_id, source, locator,
        schema_version, status, captured_at, payload_hash, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      'obs_m5_1',
      'tcall_1',
      'run_gate_m5',
      validTask.taskId,
      'meta_ads',
      'loc_1',
      '1.0.0',
      'RAW',
      new Date().toISOString(),
      'hash_1',
      '{}'
    );

    db.prepare(
      `
      INSERT INTO evidence (
        evidence_id, observation_id, task_id, run_id, claim_locator,
        verification_score, verified_at, check_ids_json, status, evidence_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      'evi_quarantined_m5',
      'obs_m5_1',
      validTask.taskId,
      'run_gate_m5',
      'loc_1',
      0.4,
      new Date().toISOString(),
      '[]',
      'QUARANTINED',
      'hash_1'
    );

    const stagedQuarantined = repository.stageArtifact({
      taskId: validTask.taskId,
      runId: 'run_gate_m5',
      type: 'INSIGHT',
      version: 2,
      claims: [
        { claimId: 'c2', text: 'Afirmação em quarentena', evidenceRefs: ['evi_quarantined_m5'] }
      ],
      evidenceRefs: ['evi_quarantined_m5']
    });

    const commitFailQuarantined = commitEngine.commitArtifact({
      transactionId: 'txn_m5_quar',
      taskId: validTask.taskId,
      runId: 'run_gate_m5',
      artifactId: stagedQuarantined.artifact.artifactId,
      policyRef: 'pol_audit'
    });

    expect(commitFailQuarantined.ok).toBe(false);
    expect(commitFailQuarantined.errorCode).toBe('COMMIT_REJECTED');

    // Confere que ZERO artefatos foram commitados no modo Governed
    const committed = repository.getCommittedArtifacts(validTask.taskId);
    expect(committed.length).toBe(0);
  });

  it('Gate M5.2: Cenário S5 é bloqueado (BLOCKED/APPROVAL_REQUIRED) e nenhuma escrita externa ocorre', () => {
    // 1. CapabilityBroker avalia external_write sem aprovação
    const evaluation = broker.evaluate({
      subject: 'agent_pevc',
      task: validTask,
      action: 'external_write',
      resource: { type: 'meta_ad', id: 'ad_123', clientId: 'cli_housewhey' },
      environment: { mode: 'Governed', env: 'production', externalWritesEnabled: true }
    });

    expect(evaluation.decision).toBe('REQUIRES_APPROVAL');
    expect(evaluation.code).toBe('APPROVAL_REQUIRED');

    // 2. ApprovalManager bloqueia ação não aprovada
    const execEval = approvalManager.evaluateActionExecution({
      action: 'external_write',
      resource: 'meta_ad:ad_123',
      task: validTask,
      environment: { mode: 'Governed', env: 'production', externalWritesEnabled: true },
      approval: null
    });

    expect(execEval.allowed).toBe(false);
    expect(execEval.decision).toBe('REQUIRES_APPROVAL');
    expect(execEval.code).toBe('APPROVAL_REQUIRED');

    // 3. Em ambiente de demonstração, external_write permanece fisicamente desabilitado mesmo com aprovação
    const mockHumanApproval = {
      schemaVersion: '1.0.0' as const,
      approvalId: 'appr_m5_human_01',
      taskId: validTask.taskId,
      runId: 'run_gate_m5',
      scope: 'external_write:meta_ad:ad_123',
      actor: 'human_admin',
      decision: 'APPROVED' as const,
      requestedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    };

    const demoExecEval = approvalManager.evaluateActionExecution({
      action: 'external_write',
      resource: 'meta_ad:ad_123',
      task: validTask,
      environment: { mode: 'Governed', env: 'demo', externalWritesEnabled: false },
      approval: mockHumanApproval
    });

    expect(demoExecEval.allowed).toBe(false);
    expect(demoExecEval.decision).toBe('DENY');
    expect(demoExecEval.code).toBe('EXTERNAL_WRITE_DISABLED_IN_DEMO');
  });

  it('Gate M5.3: Rollback deixa artifact fora da memória definitiva em falha de transação', () => {
    // Inserir evidência válida
    const evidenceId = 'evi_rollback_01';
    db.prepare(
      `
      INSERT INTO observations_staging (
        observation_id, tool_call_id, run_id, task_id, source, locator,
        schema_version, status, captured_at, payload_hash, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      'obs_rb_1',
      'tcall_1',
      'run_gate_m5',
      validTask.taskId,
      'meta_ads',
      'loc_rb',
      '1.0.0',
      'VERIFIED',
      new Date().toISOString(),
      'hash_rb',
      '{}'
    );

    db.prepare(
      `
      INSERT INTO evidence (
        evidence_id, observation_id, task_id, run_id, claim_locator,
        verification_score, verified_at, check_ids_json, status, evidence_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      evidenceId,
      'obs_rb_1',
      validTask.taskId,
      'run_gate_m5',
      'loc_rb',
      0.95,
      new Date().toISOString(),
      '[]',
      'VERIFIED',
      'hash_rb'
    );

    const staged = repository.stageArtifact({
      taskId: validTask.taskId,
      runId: 'run_gate_m5',
      type: 'INSIGHT',
      version: 1,
      claims: [{ claimId: 'c1', text: 'Claim válida', evidenceRefs: [evidenceId] }],
      evidenceRefs: [evidenceId]
    });

    // Forçar falha de constraint inserindo previamente um commit com o mesmo transactionId que aponta para outro artefato inexistente
    db.prepare(
      `
      INSERT INTO artifacts (artifact_id, task_id, run_id, type, version, status, claims_json, evidence_refs_json, operational_payload_json, redacted_payload_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      'art_dummy_rb',
      validTask.taskId,
      'run_gate_m5',
      'INSIGHT',
      99,
      'COMMITTED',
      '[]',
      '[]',
      '{}',
      '{}',
      new Date().toISOString()
    );

    db.prepare(
      `
      INSERT INTO commits (commit_id, transaction_id, task_id, run_id, artifact_id, policy_ref, evidence_refs_json, state_hash, committed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      'cmt_clash_01',
      'txn_clash_001',
      validTask.taskId,
      'run_gate_m5',
      'art_dummy_rb',
      'pol_rb',
      '[]',
      'hash_clash',
      new Date().toISOString()
    );

    // Agora tentar commitar o staged com 'txn_clash_001' (vai retornar o commit já existente de outro artefato ou abortar)
    const clashResult = commitEngine.commitArtifact({
      transactionId: 'txn_clash_001',
      taskId: validTask.taskId,
      runId: 'run_gate_m5',
      artifactId: staged.artifact.artifactId,
      policyRef: 'pol_audit'
    });

    expect(clashResult.commitRecord?.artifactId).not.toBe(staged.artifact.artifactId);

    // O artefato original `staged` não foi promovido para COMMITTED
    const storedStaged = repository.getArtifactById(staged.artifact.artifactId);
    expect(storedStaged?.status).toBe('PROVISIONAL');
    expect(storedStaged?.committedAt).toBeUndefined();
  });

  it('Gate M5.4: Idempotência e concorrência passam nos testes de estresse', () => {
    const evidenceId = 'evi_stress_01';
    db.prepare(
      `
      INSERT INTO observations_staging (
        observation_id, tool_call_id, run_id, task_id, source, locator,
        schema_version, status, captured_at, payload_hash, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      'obs_s1',
      'tcall_s1',
      'run_gate_m5',
      validTask.taskId,
      'meta_ads',
      'loc_s1',
      '1.0.0',
      'VERIFIED',
      new Date().toISOString(),
      'hash_s1',
      '{}'
    );

    db.prepare(
      `
      INSERT INTO evidence (
        evidence_id, observation_id, task_id, run_id, claim_locator,
        verification_score, verified_at, check_ids_json, status, evidence_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      evidenceId,
      'obs_s1',
      validTask.taskId,
      'run_gate_m5',
      'loc_s1',
      0.99,
      new Date().toISOString(),
      '[]',
      'VERIFIED',
      'hash_s1'
    );

    const staged = repository.stageArtifact({
      taskId: validTask.taskId,
      runId: 'run_gate_m5',
      type: 'INSIGHT',
      version: 1,
      claims: [
        { claimId: 'c1', text: 'Insight para teste de estresse', evidenceRefs: [evidenceId] }
      ],
      evidenceRefs: [evidenceId]
    });

    // 10 chamadas idempotentes com o mesmo transactionId
    const results = [];
    for (let i = 0; i < 10; i++) {
      results.push(
        commitEngine.commitArtifact({
          transactionId: 'txn_idempotent_stress',
          taskId: validTask.taskId,
          runId: 'run_gate_m5',
          artifactId: staged.artifact.artifactId,
          policyRef: 'pol_audit'
        })
      );
    }

    // Todas as 10 chamadas devem ter ok === true
    expect(results.every((r) => r.ok)).toBe(true);

    // A primeira não é replay, as 9 seguintes são replays idempotentes
    expect(results[0]?.isIdempotentReplay).toBe(false);
    for (let i = 1; i < 10; i++) {
      expect(results[i]?.isIdempotentReplay).toBe(true);
      expect(results[i]?.commitRecord?.commitId).toBe(results[0]?.commitRecord?.commitId);
    }

    // Apenas 1 registro gravado na tabela commits
    const count = db
      .prepare('SELECT COUNT(*) as count FROM commits WHERE task_id = ?')
      .get(validTask.taskId) as { count: number };
    expect(count.count).toBe(1);
  });
});
