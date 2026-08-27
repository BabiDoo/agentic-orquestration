import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ArtifactRepository } from './artifact-repository.js';
import { AdzHubDatabase, createDatabase } from './sqlite-database.js';

describe('@adzhub/data - M5-05 ArtifactRepository & memory.stage_artifact', () => {
  let db: AdzHubDatabase;
  let repository: ArtifactRepository;

  const validClaims = [
    {
      claimId: 'clm_cpa_01',
      text: 'O criativo ad_video_01 teve CPA de R$ 42,00 abaixo da meta de R$ 85,00',
      evidenceRefs: ['evi_meta_00000001', 'evi_crm_000000002']
    }
  ];

  const validEvidenceRefs = ['evi_meta_00000001', 'evi_crm_000000002'];

  beforeEach(() => {
    db = createDatabase(':memory:');
    repository = new ArtifactRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('cria artefato que nasce obrigatoriamente com status PROVISIONAL', () => {
    const result = repository.stageArtifact({
      taskId: 'task_creative_audit',
      runId: 'run_pevc_001',
      type: 'INSIGHT',
      version: 1,
      claims: validClaims,
      evidenceRefs: validEvidenceRefs,
      operationalPayload: { efficiencyScore: 0.95 }
    });

    expect(result.artifact.artifactId).toMatch(/^art_[a-f0-9]+$/);
    expect(result.artifact.status).toBe('PROVISIONAL');
    expect(result.artifact.committedAt).toBeUndefined();
    expect(result.artifact.version).toBe(1);
    expect(result.isIdempotentReplay).toBe(false);
    expect(result.effectKey).toHaveLength(64);
  });

  it('staging contém task, run, type, version, claims e candidate EvidenceRefs', () => {
    const result = repository.stageArtifact({
      taskId: 'task_audit_02',
      runId: 'run_002',
      type: 'DECISION_PROPOSAL',
      version: 2,
      claims: validClaims,
      evidenceRefs: validEvidenceRefs,
      operationalPayload: { action: 'scale_budget', amountBrl: 500 },
      redactedPayload: { action: 'scale_budget' }
    });

    const stored = repository.getArtifactById(result.artifact.artifactId);
    expect(stored).toBeDefined();
    expect(stored?.taskId).toBe('task_audit_02');
    expect(stored?.runId).toBe('run_002');
    expect(stored?.type).toBe('DECISION_PROPOSAL');
    expect(stored?.version).toBe(2);
    expect(stored?.claims).toEqual(validClaims);
    expect(stored?.evidenceRefs).toEqual(validEvidenceRefs);
    expect(stored?.operationalPayload).toEqual({ action: 'scale_budget', amountBrl: 500 });
  });

  it('staging é idempotente por chave de efeito', () => {
    const input = {
      taskId: 'task_audit_idempotent',
      runId: 'run_003',
      type: 'INSIGHT' as const,
      version: 1,
      claims: validClaims,
      evidenceRefs: validEvidenceRefs,
      operationalPayload: { metric: 'ROAS', value: 3.8 }
    };

    // Primeira chamada
    const res1 = repository.stageArtifact(input);
    expect(res1.isIdempotentReplay).toBe(false);

    // Segunda chamada idêntica
    const res2 = repository.stageArtifact(input);
    expect(res2.isIdempotentReplay).toBe(true);
    expect(res2.artifact.artifactId).toBe(res1.artifact.artifactId);
    expect(res2.effectKey).toBe(res1.effectKey);

    // Total no banco continua sendo 1
    const provisional = repository.getProvisionalArtifacts('task_audit_idempotent');
    expect(provisional.length).toBe(1);
  });

  it('artefato provisório NÃO fica visível como memória definitiva (getCommittedArtifacts)', () => {
    repository.stageArtifact({
      taskId: 'task_isolation_01',
      runId: 'run_004',
      type: 'INSIGHT',
      version: 1,
      claims: validClaims,
      evidenceRefs: validEvidenceRefs
    });

    // Provisórios contém o artefato
    const provisional = repository.getProvisionalArtifacts('task_isolation_01');
    expect(provisional.length).toBe(1);
    expect(provisional[0]?.status).toBe('PROVISIONAL');

    // Memória definitiva (committed) NÃO enxerga o artefato provisório
    const committed = repository.getCommittedArtifacts('task_isolation_01');
    expect(committed.length).toBe(0);
  });

  it('impede sobrescrita de artefatos já efetivados (COMMITTED)', () => {
    const staged = repository.stageArtifact({
      taskId: 'task_committed_test',
      runId: 'run_005',
      type: 'INSIGHT',
      version: 1,
      claims: validClaims,
      evidenceRefs: validEvidenceRefs
    });

    // Simula commit no banco
    db.prepare(
      "UPDATE artifacts SET status = 'COMMITTED', committed_at = ? WHERE artifact_id = ?"
    ).run(new Date().toISOString(), staged.artifact.artifactId);

    // Tentativa de re-estagiar a mesma versão comita deve lançar erro
    expect(() => {
      repository.stageArtifact({
        taskId: 'task_committed_test',
        runId: 'run_005',
        type: 'INSIGHT',
        version: 1, // Mesma versão já confirmada
        claims: validClaims,
        evidenceRefs: validEvidenceRefs
      });
    }).toThrow(/já foi efetivado \(COMMITTED\)/i);
  });
});
