import { randomUUID, createHash } from 'node:crypto';
import { Artifact, CommitRecord, OperationalValidators, canonicalizeJson } from '@adzhub/contracts';
import { AdzHubDatabase } from './sqlite-database.js';

export interface CommitArtifactInput {
  transactionId: string;
  taskId: string;
  runId: string;
  artifactId: string;
  policyRef: string;
  now?: Date;
}

export interface CommitArtifactResult {
  ok: boolean;
  commitRecord?: CommitRecord;
  artifact?: Artifact;
  isIdempotentReplay: boolean;
  error?: string;
  errorCode?: 'COMMIT_REJECTED' | 'INVALID_SCHEMA' | 'POLICY_DENIED';
  details?: Record<string, unknown>;
}

export class AtomicCommitEngine {
  private db: AdzHubDatabase;

  constructor(db: AdzHubDatabase) {
    this.db = db;
  }

  /**
   * Executa o commit atômico de um artefato provisório para a memória definitiva do Supercérebro.
   *
   * Invariantes garantidos dentro da transação ACID (Anti-TOCTOU):
   * 1. Recarrega task_contracts, artifacts, evidence e policy em transação isolada.
   * 2. Confere que todas as EvidenceRefs existem e possuem status 'VERIFIED'.
   * 3. Confere que o artefato está no estado 'PROVISIONAL'.
   * 4. Calcula stateHash SHA-256 e gera CommitRecord imutável.
   * 5. Promove o artefato para 'COMMITTED' e grava CommitRecord na mesma transação.
   * 6. Qualquer falha aborta e executa rollback imediato gerando COMMIT_REJECTED.
   * 7. Idempotência determinística para reexecuções com o mesmo transactionId.
   */
  public commitArtifact(input: CommitArtifactInput): CommitArtifactResult {
    const committedAt = (input.now ?? new Date()).toISOString();

    // 0. Checagem prévia de formato do transactionId
    if (!input.transactionId || input.transactionId.trim().length === 0) {
      return {
        ok: false,
        error: 'transactionId é obrigatório para commits atômicos',
        errorCode: 'COMMIT_REJECTED',
        isIdempotentReplay: false
      };
    }

    try {
      return this.db.transaction(() => {
        // 1. Idempotência: Checa se este transactionId já foi confirmado anteriormente
        const existingCommitRow = this.db
          .prepare('SELECT * FROM commits WHERE transaction_id = ?')
          .get(input.transactionId) as Record<string, unknown> | undefined;

        if (existingCommitRow) {
          const committedArtifactRow = this.db
            .prepare('SELECT * FROM artifacts WHERE artifact_id = ?')
            .get(String(existingCommitRow.artifact_id)) as Record<string, unknown> | undefined;

          if (!committedArtifactRow) {
            throw new Error(
              `Inconsistência interna: Commit ${input.transactionId} existe mas artefato não foi encontrado.`
            );
          }

          const existingCommitRecord: CommitRecord = {
            schemaVersion: '1.0.0',
            commitId: String(existingCommitRow.commit_id),
            transactionId: String(existingCommitRow.transaction_id),
            taskId: String(existingCommitRow.task_id),
            runId: String(existingCommitRow.run_id),
            artifactId: String(existingCommitRow.artifact_id),
            policyRef: String(existingCommitRow.policy_ref),
            evidenceRefs: JSON.parse(String(existingCommitRow.evidence_refs_json)),
            stateHash: String(existingCommitRow.state_hash),
            committedAt: String(existingCommitRow.committed_at)
          };

          const existingArtifact: Artifact = {
            schemaVersion: '1.0.0',
            artifactId: String(committedArtifactRow.artifact_id),
            taskId: String(committedArtifactRow.task_id),
            runId: String(committedArtifactRow.run_id),
            type: committedArtifactRow.type as Artifact['type'],
            version: Number(committedArtifactRow.version),
            status: 'COMMITTED',
            claims: JSON.parse(String(committedArtifactRow.claims_json)),
            evidenceRefs: JSON.parse(String(committedArtifactRow.evidence_refs_json)),
            operationalPayload: JSON.parse(String(committedArtifactRow.operational_payload_json)),
            redactedPayload: JSON.parse(String(committedArtifactRow.redacted_payload_json)),
            createdAt: String(committedArtifactRow.created_at),
            committedAt: String(committedArtifactRow.committed_at)
          };

          return {
            ok: true,
            commitRecord: existingCommitRecord,
            artifact: existingArtifact,
            isIdempotentReplay: true
          };
        }

        // 2. Recarrega o artefato provisório dentro da transação
        const artifactRow = this.db
          .prepare('SELECT * FROM artifacts WHERE artifact_id = ? AND task_id = ?')
          .get(input.artifactId, input.taskId) as Record<string, unknown> | undefined;

        if (!artifactRow) {
          throw new Error(
            `Artefato provisório '${input.artifactId}' não encontrado para a tarefa '${input.taskId}'.`
          );
        }

        const currentStatus = String(artifactRow.status);
        if (currentStatus === 'COMMITTED') {
          throw new Error(
            `Artefato '${input.artifactId}' já foi promovido para COMMITTED em outra transação.`
          );
        }

        if (currentStatus !== 'PROVISIONAL') {
          throw new Error(
            `Artefato '${input.artifactId}' não está em estado PROVISIONAL (status atual: '${currentStatus}').`
          );
        }

        const rawClaims = JSON.parse(String(artifactRow.claims_json)) as Artifact['claims'];
        const rawEvidenceRefs = JSON.parse(String(artifactRow.evidence_refs_json)) as string[];

        if (!rawEvidenceRefs || rawEvidenceRefs.length === 0) {
          throw new Error(
            `Artefato '${input.artifactId}' não possui nenhuma evidenceRef associada.`
          );
        }

        // 3. Validação Anti-TOCTOU de Evidências: Todas devem existir e ter status VERIFIED
        for (const evdId of rawEvidenceRefs) {
          const evidenceRow = this.db
            .prepare('SELECT * FROM evidence WHERE evidence_id = ? AND task_id = ?')
            .get(evdId, input.taskId) as Record<string, unknown> | undefined;

          if (!evidenceRow) {
            throw new Error(
              `Evidência '${evdId}' referenciada pelo artefato não foi encontrada na base de evidências.`
            );
          }

          if (String(evidenceRow.status) !== 'VERIFIED') {
            throw new Error(
              `Evidência '${evdId}' está com status '${String(evidenceRow.status)}' (exige 'VERIFIED' para commit definitivo).`
            );
          }

          const score = Number(evidenceRow.verification_score);
          if (isNaN(score) || score < 0.5) {
            throw new Error(
              `Evidência '${evdId}' possui score de verificação insuficiente (${score} < 0.50).`
            );
          }
        }

        // 4. Calcula State Hash imutável da transação
        const statePayload = {
          transactionId: input.transactionId,
          taskId: input.taskId,
          runId: input.runId,
          artifactId: input.artifactId,
          policyRef: input.policyRef,
          evidenceRefs: rawEvidenceRefs,
          claims: rawClaims,
          committedAt
        };
        const stateHash = createHash('sha256').update(canonicalizeJson(statePayload)).digest('hex');

        // 5. Gera e valida o CommitRecord
        const commitId = `cmt_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
        const commitRecordCandidate: CommitRecord = {
          schemaVersion: '1.0.0',
          commitId,
          transactionId: input.transactionId,
          taskId: input.taskId,
          runId: input.runId,
          artifactId: input.artifactId,
          policyRef: input.policyRef,
          evidenceRefs: rawEvidenceRefs,
          committedAt,
          stateHash
        };

        const validatedCommit = OperationalValidators.validateCommitRecord(commitRecordCandidate);

        // 6. Insere CommitRecord no SQLite
        this.db
          .prepare(
            `
            INSERT INTO commits (
              commit_id, transaction_id, task_id, run_id, artifact_id,
              policy_ref, evidence_refs_json, state_hash, committed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
          )
          .run(
            validatedCommit.commitId,
            validatedCommit.transactionId,
            validatedCommit.taskId,
            validatedCommit.runId,
            validatedCommit.artifactId,
            validatedCommit.policyRef,
            JSON.stringify(validatedCommit.evidenceRefs),
            validatedCommit.stateHash,
            validatedCommit.committedAt
          );

        // 7. Promove o Artifact para COMMITTED
        this.db
          .prepare(
            `
            UPDATE artifacts
            SET status = 'COMMITTED', committed_at = ?
            WHERE artifact_id = ?
          `
          )
          .run(committedAt, input.artifactId);

        const committedArtifact: Artifact = {
          schemaVersion: '1.0.0',
          artifactId: String(artifactRow.artifact_id),
          taskId: String(artifactRow.task_id),
          runId: String(artifactRow.run_id),
          type: artifactRow.type as Artifact['type'],
          version: Number(artifactRow.version),
          status: 'COMMITTED',
          claims: rawClaims,
          evidenceRefs: rawEvidenceRefs,
          operationalPayload: JSON.parse(String(artifactRow.operational_payload_json)),
          redactedPayload: JSON.parse(String(artifactRow.redacted_payload_json)),
          createdAt: String(artifactRow.created_at),
          committedAt
        };

        return {
          ok: true,
          commitRecord: validatedCommit,
          artifact: committedArtifact,
          isIdempotentReplay: false
        };
      });
    } catch (err: unknown) {
      // Falha dentro da transação causa rollback automático no banco
      const message = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        errorCode: 'COMMIT_REJECTED',
        error: `COMMIT_REJECTED: Transação de persistência atômica abortada: ${message}`,
        isIdempotentReplay: false,
        details: {
          artifactId: input.artifactId,
          taskId: input.taskId,
          transactionId: input.transactionId
        }
      };
    }
  }
}
