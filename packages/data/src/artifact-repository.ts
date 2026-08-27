import { randomUUID, createHash } from 'node:crypto';
import { Artifact, OperationalValidators, canonicalizeJson } from '@adzhub/contracts';
import { AdzHubDatabase, createDatabase } from './sqlite-database.js';

export interface StageArtifactInput {
  artifactId?: string;
  taskId: string;
  runId: string;
  type: 'INSIGHT' | 'DECISION_PROPOSAL' | 'MEETING_AGENDA' | 'CREATIVE_BRIEF';
  version?: number;
  claims: Array<{
    claimId: string;
    text: string;
    evidenceRefs: string[];
  }>;
  evidenceRefs: string[];
  operationalPayload?: Record<string, unknown>;
  redactedPayload?: Record<string, unknown>;
}

export interface StagedArtifactResult {
  artifact: Artifact;
  isIdempotentReplay: boolean;
  effectKey: string;
}

export class ArtifactRepository {
  private db: AdzHubDatabase;

  constructor(db?: AdzHubDatabase) {
    this.db = db ?? createDatabase(':memory:');
  }

  /**
   * Realiza o staging determinístico e idempotente de um artefato provisório.
   * O artefato nasce OBRIGATORIAMENTE com status 'PROVISIONAL'.
   */
  public stageArtifact(input: StageArtifactInput): StagedArtifactResult {
    const version = input.version ?? 1;
    const rawId = input.artifactId ?? `art_${randomUUID().replace(/-/g, '').slice(0, 12)}`;

    // 1. Gera chave determinística do efeito para idempotência
    const effectPayload = {
      taskId: input.taskId,
      runId: input.runId,
      type: input.type,
      version,
      claims: input.claims,
      evidenceRefs: input.evidenceRefs,
      operationalPayload: input.operationalPayload ?? {}
    };
    const effectKey = createHash('sha256').update(canonicalizeJson(effectPayload)).digest('hex');

    // 2. Constrói o objeto do Artifact com status PROVISIONAL obrigatório
    const candidateArtifact: Artifact = {
      schemaVersion: '1.0.0',
      artifactId: rawId,
      taskId: input.taskId,
      runId: input.runId,
      type: input.type,
      version,
      status: 'PROVISIONAL', // Sempre nasce PROVISIONAL
      claims: input.claims,
      evidenceRefs: input.evidenceRefs,
      operationalPayload: input.operationalPayload ?? {},
      redactedPayload: input.redactedPayload ?? { type: input.type, version },
      createdAt: new Date().toISOString()
    };

    // 3. Valida contra o schema canônico
    const validated = OperationalValidators.validateArtifact(candidateArtifact);

    // 4. Verifica se já existe um artefato para esta mesma (taskId, type, version)
    const existingRow = this.db
      .prepare('SELECT * FROM artifacts WHERE task_id = ? AND type = ? AND version = ?')
      .get(validated.taskId, validated.type, validated.version) as
      Record<string, unknown> | undefined;

    if (existingRow) {
      const existingStatus = String(existingRow.status);

      // Invariante de imutabilidade: Memória definitiva (COMMITTED) não pode ser sobrescrita por staging
      if (existingStatus === 'COMMITTED') {
        throw new Error(
          `Conflito de versão: Artefato '${validated.type}' v${validated.version} já foi efetivado (COMMITTED) e não pode ser re-estagiado.`
        );
      }

      // Se já está PROVISIONAL, atualiza de forma idempotente mantendo o artifact_id original
      const existingArtifactId = String(existingRow.artifact_id);
      const updatedArtifact: Artifact = {
        ...validated,
        artifactId: existingArtifactId,
        createdAt: String(existingRow.created_at)
      };

      this.db
        .prepare(
          `
          UPDATE artifacts
          SET claims_json = ?, evidence_refs_json = ?, operational_payload_json = ?, redacted_payload_json = ?
          WHERE artifact_id = ?
        `
        )
        .run(
          JSON.stringify(updatedArtifact.claims),
          JSON.stringify(updatedArtifact.evidenceRefs),
          JSON.stringify(updatedArtifact.operationalPayload),
          JSON.stringify(updatedArtifact.redactedPayload),
          existingArtifactId
        );

      return {
        artifact: updatedArtifact,
        isIdempotentReplay: true,
        effectKey
      };
    }

    // 5. Novo staging: Insere no banco SQLite
    this.db
      .prepare(
        `
        INSERT INTO artifacts (
          artifact_id, task_id, run_id, type, version, status,
          claims_json, evidence_refs_json, operational_payload_json,
          redacted_payload_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        validated.artifactId,
        validated.taskId,
        validated.runId,
        validated.type,
        validated.version,
        validated.status,
        JSON.stringify(validated.claims),
        JSON.stringify(validated.evidenceRefs),
        JSON.stringify(validated.operationalPayload),
        JSON.stringify(validated.redactedPayload),
        validated.createdAt
      );

    return {
      artifact: validated,
      isIdempotentReplay: false,
      effectKey
    };
  }

  /**
   * Busca um artefato específico por artifactId.
   */
  public getArtifactById(artifactId: string): Artifact | undefined {
    const row = this.db.prepare('SELECT * FROM artifacts WHERE artifact_id = ?').get(artifactId);
    return row ? this.mapRowToArtifact(row) : undefined;
  }

  /**
   * Retorna apenas os artefatos CONFIRMADOS (COMMITTED), garantindo que artefatos provisórios
   * nunca sejam visíveis como memória definitiva para o Supercérebro ou consultas normais.
   */
  public getCommittedArtifacts(taskId: string): Artifact[] {
    const rows = this.db
      .prepare(
        "SELECT * FROM artifacts WHERE task_id = ? AND status = 'COMMITTED' ORDER BY version ASC"
      )
      .all(taskId);
    return rows.map((r) => this.mapRowToArtifact(r));
  }

  /**
   * Retorna os artefatos em quarentena / provisórios para o pipeline de verificação.
   */
  public getProvisionalArtifacts(taskId: string): Artifact[] {
    const rows = this.db
      .prepare(
        "SELECT * FROM artifacts WHERE task_id = ? AND status = 'PROVISIONAL' ORDER BY version ASC"
      )
      .all(taskId);
    return rows.map((r) => this.mapRowToArtifact(r));
  }

  /**
   * Mapeia uma linha do SQLite para o modelo tipado Artifact.
   */
  private mapRowToArtifact(row: Record<string, unknown>): Artifact {
    return {
      schemaVersion: '1.0.0',
      artifactId: String(row.artifact_id),
      taskId: String(row.task_id),
      runId: String(row.run_id),
      type: row.type as Artifact['type'],
      version: Number(row.version),
      status: row.status as Artifact['status'],
      claims: JSON.parse(String(row.claims_json)),
      evidenceRefs: JSON.parse(String(row.evidence_refs_json)),
      operationalPayload: JSON.parse(String(row.operational_payload_json)),
      redactedPayload: JSON.parse(String(row.redacted_payload_json)),
      createdAt: String(row.created_at),
      committedAt: row.committed_at ? String(row.committed_at) : undefined
    };
  }
}
