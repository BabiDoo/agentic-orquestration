import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AtomicCommitEngine } from './atomic-commit-engine.js';
import { ArtifactRepository } from './artifact-repository.js';
import { AdzHubDatabase, createDatabase } from './sqlite-database.js';

describe('@adzhub/data - M5-06 memory.commit_artifact atômico', () => {
  let db: AdzHubDatabase;
  let repository: ArtifactRepository;
  let engine: AtomicCommitEngine;

  const taskId = 'task_creative_audit_001';
  const runId = 'run_pevc_001';
  const evidenceId = 'evi_meta_00000001';

  beforeEach(() => {
    db = createDatabase(':memory:');
    repository = new ArtifactRepository(db);
    engine = new AtomicCommitEngine(db);

    // Inserir observação prévia no banco
    db.prepare(
      `
      INSERT INTO observations_staging (
        observation_id, tool_call_id, run_id, task_id, source, locator,
        schema_version, status, captured_at, payload_hash, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      'obs_meta_00000001',
      'tcall_001',
      runId,
      taskId,
      'meta_ads',
      'meta:ad:123',
      '1.0.0',
      'VERIFIED',
      new Date().toISOString(),
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      '{}'
    );

    // Inserir evidência verificada no banco
    db.prepare(
      `
      INSERT INTO evidence (
        evidence_id, observation_id, task_id, run_id, claim_locator,
        verification_score, verified_at, check_ids_json, status, evidence_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      evidenceId,
      'obs_meta_00000001',
      taskId,
      runId,
      'meta:ad:123:cpa',
      0.95,
      new Date().toISOString(),
      '["chk_structural_01"]',
      'VERIFIED',
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
  });

  afterEach(() => {
    db.close();
  });

  it('recarrega estado e efetiva o commit atômico promovendo artifact para COMMITTED', () => {
    // 1. Estagiar artefato provisório
    const staged = repository.stageArtifact({
      taskId,
      runId,
      type: 'INSIGHT',
      version: 1,
      claims: [
        {
          claimId: 'clm_1',
          text: 'Anúncio ad_123 com CPA R$ 42,00 abaixo da meta',
          evidenceRefs: [evidenceId]
        }
      ],
      evidenceRefs: [evidenceId],
      operationalPayload: { cpaBrl: 42.0 }
    });

    expect(staged.artifact.status).toBe('PROVISIONAL');

    // 2. Executar commit atômico
    const commitResult = engine.commitArtifact({
      transactionId: 'txn_commit_001',
      taskId,
      runId,
      artifactId: staged.artifact.artifactId,
      policyRef: 'pol_audit_001'
    });

    expect(commitResult.ok).toBe(true);
    expect(commitResult.isIdempotentReplay).toBe(false);
    expect(commitResult.commitRecord?.commitId).toMatch(/^cmt_[a-f0-9]+$/);
    expect(commitResult.commitRecord?.transactionId).toBe('txn_commit_001');
    expect(commitResult.artifact?.status).toBe('COMMITTED');
    expect(commitResult.artifact?.committedAt).toBeDefined();

    // 3. Verifica se o artefato agora aparece na memória definitiva
    const committedList = repository.getCommittedArtifacts(taskId);
    expect(committedList.length).toBe(1);
    expect(committedList[0]?.status).toBe('COMMITTED');

    // Não deve mais aparecer como provisório
    const provisionalList = repository.getProvisionalArtifacts(taskId);
    expect(provisionalList.length).toBe(0);
  });

  it('impede TOCTOU e rejeita commit se a evidência referenciada não possuir status VERIFIED', () => {
    // Inserir evidência não verificada (status: 'QUARANTINED')
    const unverifiedEvdId = 'evi_quarantined_01';
    db.prepare(
      `
      INSERT INTO evidence (
        evidence_id, observation_id, task_id, run_id, claim_locator,
        verification_score, verified_at, check_ids_json, status, evidence_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      unverifiedEvdId,
      'obs_meta_00000001',
      taskId,
      runId,
      'meta:ad:123:cpa',
      0.3,
      new Date().toISOString(),
      '["chk_low_coverage"]',
      'QUARANTINED',
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );

    const staged = repository.stageArtifact({
      taskId,
      runId,
      type: 'INSIGHT',
      version: 1,
      claims: [
        { claimId: 'clm_1', text: 'Claim sem evidência válida', evidenceRefs: [unverifiedEvdId] }
      ],
      evidenceRefs: [unverifiedEvdId]
    });

    const commitResult = engine.commitArtifact({
      transactionId: 'txn_commit_toctou',
      taskId,
      runId,
      artifactId: staged.artifact.artifactId,
      policyRef: 'pol_audit_001'
    });

    expect(commitResult.ok).toBe(false);
    expect(commitResult.errorCode).toBe('COMMIT_REJECTED');
    expect(commitResult.error).toContain("status 'QUARANTINED' (exige 'VERIFIED'");

    // Garante que o artefato permanece PROVISIONAL no banco (Rollback da transação)
    const stored = repository.getArtifactById(staged.artifact.artifactId);
    expect(stored?.status).toBe('PROVISIONAL');
    expect(stored?.committedAt).toBeUndefined();
  });

  it('rejeita commit se a evidência referenciada não existir no banco de evidências', () => {
    const staged = repository.stageArtifact({
      taskId,
      runId,
      type: 'INSIGHT',
      version: 1,
      claims: [
        { claimId: 'clm_1', text: 'Claim com ref fantasma', evidenceRefs: ['evi_ghost_000009'] }
      ],
      evidenceRefs: ['evi_ghost_000009']
    });

    const commitResult = engine.commitArtifact({
      transactionId: 'txn_commit_ghost',
      taskId,
      runId,
      artifactId: staged.artifact.artifactId,
      policyRef: 'pol_audit_001'
    });

    expect(commitResult.ok).toBe(false);
    expect(commitResult.errorCode).toBe('COMMIT_REJECTED');
    expect(commitResult.error).toContain('não foi encontrada na base de evidências');
  });

  it('executa commit duplicado de forma idempotente quando retransmitido com mesmo transactionId', () => {
    const staged = repository.stageArtifact({
      taskId,
      runId,
      type: 'INSIGHT',
      version: 1,
      claims: [{ claimId: 'clm_1', text: 'Insight com CPA validado', evidenceRefs: [evidenceId] }],
      evidenceRefs: [evidenceId]
    });

    // Primeiro commit
    const commit1 = engine.commitArtifact({
      transactionId: 'txn_idempotent_01',
      taskId,
      runId,
      artifactId: staged.artifact.artifactId,
      policyRef: 'pol_audit_001'
    });

    expect(commit1.ok).toBe(true);
    expect(commit1.isIdempotentReplay).toBe(false);

    // Segundo commit com mesmo transactionId
    const commit2 = engine.commitArtifact({
      transactionId: 'txn_idempotent_01',
      taskId,
      runId,
      artifactId: staged.artifact.artifactId,
      policyRef: 'pol_audit_001'
    });

    expect(commit2.ok).toBe(true);
    expect(commit2.isIdempotentReplay).toBe(true);
    expect(commit2.commitRecord?.commitId).toBe(commit1.commitRecord?.commitId);
    expect(commit2.artifact?.artifactId).toBe(staged.artifact.artifactId);

    // Total de commits gravados no SQLite continua sendo exatamente 1
    const totalCommits = db
      .prepare('SELECT COUNT(*) as count FROM commits WHERE task_id = ?')
      .get(taskId) as { count: number };
    expect(totalCommits.count).toBe(1);
  });
});
