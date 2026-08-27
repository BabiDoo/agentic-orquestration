import { describe, it, expect } from 'vitest';
import {
  OperationalValidators,
  Observation,
  Evidence,
  Artifact,
  CommitRecord,
  TraceEvent,
  Checkpoint,
  Approval,
  DatasetManifest,
  QuarantineItem
} from './operational-contracts.js';

describe('Contratos Operacionais do Microkernel PEV-C (M0-04)', () => {
  const sampleTimeframe = {
    since: '2026-08-01T00:00:00.000Z',
    until: '2026-08-20T23:59:59.000Z',
    timezone: 'America/Sao_Paulo'
  };

  it('1. Observation: deve validar retorno de Tool em staging com payloads separados', () => {
    const rawObs: Observation = {
      schemaVersion: '1.0.0',
      observationId: 'obs_meta_ads_001',
      taskId: 'task_s0',
      runId: 'run_101',
      toolCallId: 'call_meta_list_01',
      source: 'meta_ads',
      capturedAt: '2026-08-21T10:00:00.000Z',
      status: 'RAW',
      timeframe: sampleTimeframe,
      payloadHash: 'a'.repeat(64),
      operationalPayload: { adsCount: 5, totalSpend: 1500 },
      redactedPayload: { adsCount: 5, totalSpend: '[REDACTED]' }
    };

    const validated = OperationalValidators.validateObservation(rawObs);
    expect(validated.observationId).toBe('obs_meta_ads_001');
    expect(validated.status).toBe('RAW');
  });

  it('2. Evidence: deve validar evidência factual vinculada a observationId', () => {
    const rawEvidence: Evidence = {
      schemaVersion: '1.0.0',
      evidenceId: 'evi_cpa_ad_01',
      taskId: 'task_s0',
      runId: 'run_101',
      observationId: 'obs_meta_ads_001',
      locator: 'jsonpath:$.ads[0].spend',
      claim: 'Anúncio ad_123 consumiu R$ 500,00',
      checkId: 'check_structural_01',
      score: 1.0,
      freshnessSeconds: 120,
      status: 'VALID',
      createdAt: '2026-08-21T10:05:00.000Z'
    };

    const validated = OperationalValidators.validateEvidence(rawEvidence);
    expect(validated.evidenceId).toBe('evi_cpa_ad_01');
    expect(validated.observationId).toBe('obs_meta_ads_001');
  });

  it('2. Evidence: deve rejeitar Evidence com observationId mal formatado', () => {
    expect(() =>
      OperationalValidators.validateEvidence({
        schemaVersion: '1.0.0',
        evidenceId: 'evi_01',
        taskId: 'task_s0',
        runId: 'run_101',
        observationId: 'invalid_id_format',
        locator: 'row:1',
        claim: 'Claim',
        checkId: 'c1',
        score: 1.0,
        freshnessSeconds: 10,
        status: 'VALID',
        createdAt: '2026-08-21T10:05:00.000Z'
      })
    ).toThrowError(/observationId/);
  });

  it('3. QuarantineItem: deve registrar retenção por anomalia/baixa cobertura', () => {
    const quarantine: QuarantineItem = {
      schemaVersion: '1.0.0',
      quarantineId: 'quar_crm_lead_999',
      taskId: 'task_s2',
      runId: 'run_102',
      sourceId: 'obs_crm_002',
      reasonCode: 'LOW_COVERAGE',
      reasonDetails: 'Taxa de match de UTM abaixo do threshold mínimo (0.45 < 0.80)',
      quarantinedAt: '2026-08-21T10:10:00.000Z',
      ttlSeconds: 3600,
      requiredResolution: 'Aguardar reconciliação manual ou novos leads com UTM normalizada',
      status: 'ACTIVE'
    };

    const validated = OperationalValidators.validateQuarantineItem(quarantine);
    expect(validated.reasonCode).toBe('LOW_COVERAGE');
    expect(validated.status).toBe('ACTIVE');
  });

  it('4. Artifact: deve conter claims fundamentadas e lista de evidenceRefs', () => {
    const artifact: Artifact = {
      schemaVersion: '1.0.0',
      artifactId: 'art_decision_proposal_01',
      taskId: 'task_s0',
      runId: 'run_101',
      type: 'DECISION_PROPOSAL',
      version: 1,
      status: 'PROVISIONAL',
      claims: [
        {
          claimId: 'claim_01',
          text: 'Criativo ad_01 gerou 12 vendas com CPA de R$ 25,00',
          evidenceRefs: ['evi_cpa_ad_01']
        }
      ],
      evidenceRefs: ['evi_cpa_ad_01'],
      operationalPayload: { recommendation: 'MANTER' },
      redactedPayload: { recommendation: 'MANTER' },
      createdAt: '2026-08-21T10:15:00.000Z'
    };

    const validated = OperationalValidators.validateArtifact(artifact);
    expect(validated.artifactId).toBe('art_decision_proposal_01');
    expect(validated.status).toBe('PROVISIONAL');
  });

  it('5. CommitRecord: deve validar transação atômica de promoção com evidenceRefs e policyRef', () => {
    const commit: CommitRecord = {
      schemaVersion: '1.0.0',
      commitId: 'cmt_tx_999',
      transactionId: 'tx_sqlite_atomic_001',
      taskId: 'task_s0',
      runId: 'run_101',
      artifactId: 'art_decision_proposal_01',
      policyRef: 'policy_check_verified_01',
      evidenceRefs: ['evi_cpa_ad_01'],
      committedAt: '2026-08-21T10:20:00.000Z',
      stateHash: 'b'.repeat(64)
    };

    const validated = OperationalValidators.validateCommitRecord(commit);
    expect(validated.transactionId).toBe('tx_sqlite_atomic_001');
    expect(validated.evidenceRefs).toHaveLength(1);
  });

  it('5. CommitRecord: deve REJEITAR commit sem evidenceRefs (invariante crítica)', () => {
    const invalidCommit = {
      schemaVersion: '1.0.0',
      commitId: 'cmt_tx_invalid',
      transactionId: 'tx_sqlite_002',
      taskId: 'task_s0',
      runId: 'run_101',
      artifactId: 'art_decision_proposal_01',
      policyRef: 'policy_check_01',
      evidenceRefs: [], // VAZIO: proibido
      committedAt: '2026-08-21T10:20:00.000Z',
      stateHash: 'c'.repeat(64)
    };

    expect(() => OperationalValidators.validateCommitRecord(invalidCommit)).toThrow();
  });

  it('6. TraceEvent: deve registrar causalidade e fase da máquina PEV-C', () => {
    const event: TraceEvent = {
      schemaVersion: '1.0.0',
      eventId: 'evt_seq_001',
      seq: 1,
      taskId: 'task_s0',
      runId: 'run_101',
      eventType: 'TASK_ACCEPTED',
      correlationId: 'corr_run_101',
      phase: 'PLAN',
      operationalPayload: { contractHash: 'd'.repeat(64) },
      redactedPayload: { contractHash: 'd'.repeat(64) },
      timestamp: '2026-08-21T10:00:00.000Z'
    };

    const validated = OperationalValidators.validateTraceEvent(event);
    expect(validated.seq).toBe(1);
    expect(validated.phase).toBe('PLAN');
  });

  it('7. Checkpoint: deve validar snapshot de estado para replay', () => {
    const checkpoint: Checkpoint = {
      schemaVersion: '1.0.0',
      checkpointId: 'chk_step_05',
      taskId: 'task_s0',
      runId: 'run_101',
      seq: 5,
      stateHash: 'e'.repeat(64),
      phase: 'VERIFY',
      serializedState: { currentStep: 5, memoryStatus: 'STAGING' },
      createdAt: '2026-08-21T10:12:00.000Z'
    };

    const validated = OperationalValidators.validateCheckpoint(checkpoint);
    expect(validated.checkpointId).toBe('chk_step_05');
  });

  it('8. Approval: deve registrar aprovação humana explícita com expiração', () => {
    const approval: Approval = {
      schemaVersion: '1.0.0',
      approvalId: 'appr_pause_ad_01',
      taskId: 'task_s5',
      runId: 'run_105',
      scope: 'external_write:pause_ad:ad_123',
      actor: 'user:aline_gestora',
      decision: 'APPROVED',
      reason: 'CPA acima do dobro da meta histórica',
      requestedAt: '2026-08-21T11:00:00.000Z',
      decidedAt: '2026-08-21T11:05:00.000Z',
      expiresAt: '2026-08-21T12:00:00.000Z'
    };

    const validated = OperationalValidators.validateApproval(approval);
    expect(validated.decision).toBe('APPROVED');
    expect(validated.actor).toBe('user:aline_gestora');
  });

  it('9. DatasetManifest: deve conter arquivos e hashes globais imutáveis', () => {
    const manifest: DatasetManifest = {
      schemaVersion: '1.0.0',
      manifestId: 'dsm_housewhey_v1',
      datasetVersion: '1.0.0',
      globalHash: 'f'.repeat(64),
      clientId: 'cli_housewhey',
      origin: 'synthetic_generator',
      synthetic: true,
      timeframe: sampleTimeframe,
      files: [
        {
          filename: 'api_meta_ads.json',
          fileHash: '1'.repeat(64),
          byteSize: 4096,
          purpose: 'Mídia e métricas de anúncios'
        }
      ],
      generatedAt: '2026-08-21T09:00:00.000Z'
    };

    const validated = OperationalValidators.validateDatasetManifest(manifest);
    expect(validated.synthetic).toBe(true);
    expect(validated.origin).toBe('synthetic_generator');
    expect(validated.timeframe.timezone).toBe('America/Sao_Paulo');
    expect(validated.files).toHaveLength(1);
  });
});
