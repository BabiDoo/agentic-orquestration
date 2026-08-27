import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AtomicCommitEngine } from './atomic-commit-engine.js';
import { ArtifactRepository } from './artifact-repository.js';
import { AdzHubDatabase, createDatabase } from './sqlite-database.js';

describe('@adzhub/data - M5-07 Garantir append-only e invariantes de persistência', () => {
  let db: AdzHubDatabase;
  let repository: ArtifactRepository;
  let engine: AtomicCommitEngine;

  const taskId = 'task_invariants_001';
  const runId = 'run_invariants_001';

  beforeEach(() => {
    db = createDatabase(':memory:');
    repository = new ArtifactRepository(db);
    engine = new AtomicCommitEngine(db);

    // Seed task_contracts
    db.prepare(
      `
      INSERT INTO task_contracts (task_id, client_id, tenant_id, contract_hash, contract_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    ).run(
      taskId,
      'cli_housewhey',
      'tenant_main',
      'contract_hash_001',
      '{}',
      new Date().toISOString()
    );

    // Seed runs
    db.prepare(
      `
      INSERT INTO runs (run_id, task_id, client_id, mode, status, started_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    ).run(runId, taskId, 'cli_housewhey', 'GOVERNED_PEVC', 'EXECUTING', new Date().toISOString());
  });

  afterEach(() => {
    db.close();
  });

  it('invariante 1: committed exige commitId e vinculação na tabela commits', () => {
    // 1. Inserir evidência válida
    const evidenceId = 'evi_valid_001';
    db.prepare(
      `
      INSERT INTO observations_staging (
        observation_id, tool_call_id, run_id, task_id, source, locator,
        schema_version, status, captured_at, payload_hash, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      'obs_1',
      'tcall_1',
      runId,
      taskId,
      'meta_ads',
      'locator_1',
      '1.0.0',
      'VERIFIED',
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
      evidenceId,
      'obs_1',
      taskId,
      runId,
      'locator_1',
      0.95,
      new Date().toISOString(),
      '[]',
      'VERIFIED',
      'hash_1'
    );

    // 2. Estagiar e commitar
    const staged = repository.stageArtifact({
      taskId,
      runId,
      type: 'INSIGHT',
      version: 1,
      claims: [{ claimId: 'c1', text: 'Insight verificado', evidenceRefs: [evidenceId] }],
      evidenceRefs: [evidenceId]
    });

    const commitResult = engine.commitArtifact({
      transactionId: 'txn_inv_001',
      taskId,
      runId,
      artifactId: staged.artifact.artifactId,
      policyRef: 'pol_ref_01'
    });

    expect(commitResult.ok).toBe(true);
    expect(commitResult.commitRecord?.commitId).toMatch(/^cmt_[a-f0-9]+$/);

    // Consulta que vincula artefatos confirmados com o commit
    const committedWithCommitId = db
      .prepare(
        `
      SELECT a.*, c.commit_id, c.transaction_id, c.state_hash
      FROM artifacts a
      JOIN commits c ON a.artifact_id = c.artifact_id
      WHERE a.task_id = ? AND a.status = 'COMMITTED'
    `
      )
      .all(taskId) as Record<string, unknown>[];

    expect(committedWithCommitId.length).toBe(1);
    expect(committedWithCommitId[0]?.commit_id).toBe(commitResult.commitRecord?.commitId);
    expect(committedWithCommitId[0]?.status).toBe('COMMITTED');
  });

  it('invariante 2: trace_events e commits são estritamente append-only (bloqueio de UPDATE e DELETE via triggers)', () => {
    // 1. Inserir um evento de trace
    db.prepare(
      `
      INSERT INTO trace_events (
        event_id, run_id, task_id, seq, phase, event_type, correlation_id,
        operational_payload_json, redacted_payload_json, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      'evt_append_01',
      runId,
      taskId,
      1,
      'PLAN',
      'TASK_ACCEPTED',
      'corr_01',
      '{}',
      '{}',
      new Date().toISOString()
    );

    // Tentativa de UPDATE no trace_event deve ser bloqueada pelo trigger
    expect(() => {
      db.prepare("UPDATE trace_events SET phase = 'EXECUTE' WHERE event_id = ?").run(
        'evt_append_01'
      );
    }).toThrow(/Append-only violation: trace_events cannot be updated/i);

    // Tentativa de DELETE no trace_event deve ser bloqueada pelo trigger
    expect(() => {
      db.prepare('DELETE FROM trace_events WHERE event_id = ?').run('evt_append_01');
    }).toThrow(/Append-only violation: trace_events cannot be deleted/i);

    // 2. Inserir commit direto para testar trigger de commits
    // Primeiro estagia um artefato
    db.prepare(
      `
      INSERT INTO artifacts (
        artifact_id, task_id, run_id, type, version, status, claims_json,
        evidence_refs_json, operational_payload_json, redacted_payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      'art_dummy_01',
      taskId,
      runId,
      'INSIGHT',
      1,
      'COMMITTED',
      '[]',
      '[]',
      '{}',
      '{}',
      new Date().toISOString()
    );

    db.prepare(
      `
      INSERT INTO commits (
        commit_id, transaction_id, task_id, run_id, artifact_id,
        policy_ref, evidence_refs_json, state_hash, committed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      'cmt_dummy_01',
      'txn_dummy_01',
      taskId,
      runId,
      'art_dummy_01',
      'pol_01',
      '[]',
      'hash',
      new Date().toISOString()
    );

    // Tentativa de UPDATE no commit deve ser bloqueada pelo trigger
    expect(() => {
      db.prepare("UPDATE commits SET policy_ref = 'hacked' WHERE commit_id = ?").run(
        'cmt_dummy_01'
      );
    }).toThrow(/Append-only violation: commits cannot be updated/i);

    // Tentativa de DELETE no commit deve ser bloqueada pelo trigger
    expect(() => {
      db.prepare('DELETE FROM commits WHERE commit_id = ?').run('cmt_dummy_01');
    }).toThrow(/Append-only violation: commits cannot be deleted/i);
  });

  it('invariante 3 (Property-based test): unverified_memory_writes == 0 em 50 execuções com dados aleatórios/não verificados', () => {
    let unverifiedMemoryWrites = 0;

    const invalidStatuses = [
      'RAW',
      'QUARANTINED',
      'REJECTED',
      'EXPIRED',
      'PENDING',
      'INVALID_SCHEMA'
    ];

    for (let i = 1; i <= 50; i++) {
      const observationId = `obs_fuzz_${i}`;
      const evdId = `evi_fuzz_${i}`;
      const artId = `art_fuzz_${i}`;
      const status = invalidStatuses[i % invalidStatuses.length]!;
      const score = (i % 5) * 0.1; // 0.0 a 0.4 (insuficiente)

      // Inserir observação e evidência com status NÃO-VERIFIED
      db.prepare(
        `
        INSERT INTO observations_staging (
          observation_id, tool_call_id, run_id, task_id, source, locator,
          schema_version, status, captured_at, payload_hash, payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        observationId,
        `tcall_${i}`,
        runId,
        taskId,
        'meta_ads',
        `loc_${i}`,
        '1.0.0',
        status,
        new Date().toISOString(),
        `hash_${i}`,
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
        evdId,
        observationId,
        taskId,
        runId,
        `loc_${i}`,
        score,
        new Date().toISOString(),
        '[]',
        status,
        `hash_${i}`
      );

      // Estagiar artefato provisório
      repository.stageArtifact({
        artifactId: artId,
        taskId,
        runId,
        type: 'INSIGHT',
        version: i,
        claims: [{ claimId: `clm_${i}`, text: `Claim não verificada ${i}`, evidenceRefs: [evdId] }],
        evidenceRefs: [evdId]
      });

      // Tentar efetuar commit
      const res = engine.commitArtifact({
        transactionId: `txn_fuzz_${i}`,
        taskId,
        runId,
        artifactId: artId,
        policyRef: 'pol_fuzz'
      });

      // O commit DEVE falhar
      if (res.ok) {
        unverifiedMemoryWrites++;
      }
    }

    // Prova formal: Zero gravações não verificadas
    expect(unverifiedMemoryWrites).toBe(0);

    // Confere no banco que nenhum desses 50 artefatos atingiu status COMMITTED
    const committedCount = db
      .prepare("SELECT COUNT(*) as count FROM artifacts WHERE task_id = ? AND status = 'COMMITTED'")
      .get(taskId) as { count: number };
    expect(committedCount.count).toBe(0);
  });

  it('invariante 4 (Concorrência): concorrência não gera duas versões definitivas iguais', () => {
    const evidenceId = 'evi_concurrent_01';
    db.prepare(
      `
      INSERT INTO observations_staging (
        observation_id, tool_call_id, run_id, task_id, source, locator,
        schema_version, status, captured_at, payload_hash, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      'obs_c1',
      'tcall_c1',
      runId,
      taskId,
      'meta_ads',
      'locator_c1',
      '1.0.0',
      'VERIFIED',
      new Date().toISOString(),
      'hash_c1',
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
      'obs_c1',
      taskId,
      runId,
      'locator_c1',
      0.95,
      new Date().toISOString(),
      '[]',
      'VERIFIED',
      'hash_c1'
    );

    // Estagia artefato versão 1
    const staged = repository.stageArtifact({
      taskId,
      runId,
      type: 'INSIGHT',
      version: 1,
      claims: [{ claimId: 'c1', text: 'Insight concorrente', evidenceRefs: [evidenceId] }],
      evidenceRefs: [evidenceId]
    });

    // Simula dois workers tentando commitar concorrentemente o mesmo artefato com transactionIds distintos
    const worker1 = engine.commitArtifact({
      transactionId: 'txn_worker_01',
      taskId,
      runId,
      artifactId: staged.artifact.artifactId,
      policyRef: 'pol_01'
    });

    const worker2 = engine.commitArtifact({
      transactionId: 'txn_worker_02',
      taskId,
      runId,
      artifactId: staged.artifact.artifactId,
      policyRef: 'pol_01'
    });

    // Um worker deve ter tido sucesso e o outro deve ter sido rejeitado determinística e seguramente
    const successCount = (worker1.ok ? 1 : 0) + (worker2.ok ? 1 : 0);
    expect(successCount).toBe(1);

    if (worker1.ok) {
      expect(worker2.ok).toBe(false);
      expect(worker2.errorCode).toBe('COMMIT_REJECTED');
      expect(worker2.error).toContain('já foi promovido para COMMITTED em outra transação');
    } else {
      expect(worker1.ok).toBe(false);
      expect(worker1.errorCode).toBe('COMMIT_REJECTED');
    }

    // No banco, apenas 1 registro de commit definitivo existe para a versão 1
    const commits = db
      .prepare('SELECT * FROM commits WHERE artifact_id = ?')
      .all(staged.artifact.artifactId);
    expect(commits.length).toBe(1);
  });
});
