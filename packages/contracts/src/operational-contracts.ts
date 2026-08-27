import { z } from 'zod';
import {
  TimeframeSchema,
  PostconditionSpecSchema,
  PostconditionSpec,
  RollbackSpecSchema,
  RollbackSpec,
  CampaignOperationSpecSchema,
  CampaignOperationSpec,
  TaskIntentionSchema,
  TaskIntention
} from './task-contract.js';

// Regex padronizadas para validação de formato de IDs semânticos
export const ID_PATTERNS = {
  observation: /^obs_[a-zA-Z0-9_-]+$/,
  evidence: /^evi_[a-zA-Z0-9_-]+$/,
  quarantine: /^quar_[a-zA-Z0-9_-]+$/,
  artifact: /^art_[a-zA-Z0-9_-]+$/,
  commit: /^cmt_[a-zA-Z0-9_-]+$/,
  traceEvent: /^evt_[a-zA-Z0-9_-]+$/,
  checkpoint: /^chk_[a-zA-Z0-9_-]+$/,
  approval: /^appr_[a-zA-Z0-9_-]+$/,
  datasetManifest: /^dsm_[a-zA-Z0-9_-]+$/,
  proposal: /^prop_[a-zA-Z0-9_-]+$/
};

/**
 * 1. Observation
 * Retorno bruto ou pré-processado emitido por Tools antes de validação formal.
 */
export const ObservationSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  observationId: z
    .string()
    .regex(ID_PATTERNS.observation, { message: 'Formato inválido de observationId (obs_...)' }),
  taskId: z.string().min(1),
  runId: z.string().min(1),
  toolCallId: z.string().min(1),
  source: z.enum(['supercerebro', 'meta_ads', 'crm', 'app', 'conversations']),
  capturedAt: z.string().datetime(),
  status: z.enum(['RAW', 'VERIFIED', 'REJECTED']).default('RAW'),
  timeframe: TimeframeSchema,
  payloadHash: z.string().length(64),
  operationalPayload: z.record(z.unknown()),
  redactedPayload: z.record(z.unknown())
});

export type Observation = z.infer<typeof ObservationSchema>;

/**
 * 2. Evidence
 * Fato atômico verificado com locator e score que fundamenta uma claim.
 */
export const EvidenceSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  evidenceId: z
    .string()
    .regex(ID_PATTERNS.evidence, { message: 'Formato inválido de evidenceId (evi_...)' }),
  taskId: z.string().min(1),
  runId: z.string().min(1),
  observationId: z.string().regex(ID_PATTERNS.observation, {
    message: 'Evidence deve referenciar um observationId válido'
  }),
  locator: z.string().min(1, { message: 'locator é obrigatório (ex: jsonpath:$.leads[0])' }),
  claim: z.string().min(1, { message: 'claim factual é obrigatória' }),
  checkId: z.string().min(1),
  score: z.number().min(0.0).max(1.0),
  freshnessSeconds: z.number().nonnegative(),
  status: z.enum(['VALID', 'STALE', 'INVALID']),
  createdAt: z.string().datetime()
});

export type Evidence = z.infer<typeof EvidenceSchema>;

/**
 * 3. QuarantineItem
 * Item retido por anomalia, conflito ou baixa cobertura antes de decisão de descarte/abstenção.
 */
export const QuarantineItemSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  quarantineId: z
    .string()
    .regex(ID_PATTERNS.quarantine, { message: 'Formato inválido de quarantineId (quar_...)' }),
  taskId: z.string().min(1),
  runId: z.string().min(1),
  sourceId: z.string().min(1),
  reasonCode: z.enum([
    'LOW_COVERAGE',
    'SCHEMA_VIOLATION',
    'UNRESOLVED_CONFLICT',
    'PERIOD_MISMATCH',
    'SUSPECTED_INJECTION'
  ]),
  reasonDetails: z.string().min(1),
  quarantinedAt: z.string().datetime(),
  ttlSeconds: z.number().int().positive(),
  requiredResolution: z.string().min(1),
  status: z.enum(['ACTIVE', 'RESOLVED', 'EXPIRED'])
});

export type QuarantineItem = z.infer<typeof QuarantineItemSchema>;

/**
 * 4. Artifact
 * Entidade candidata ou definitiva produzida pela execução agêntica (Insight, Proposta de Decisão, etc.).
 */
export const ArtifactClaimSchema = z.object({
  claimId: z.string().min(1),
  text: z.string().min(1),
  evidenceRefs: z
    .array(z.string().regex(ID_PATTERNS.evidence))
    .min(1, { message: 'Cada claim exige pelo menos 1 evidenceId' })
});

export type ArtifactClaim = z.infer<typeof ArtifactClaimSchema>;

export const ArtifactSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  artifactId: z
    .string()
    .regex(ID_PATTERNS.artifact, { message: 'Formato inválido de artifactId (art_...)' }),
  taskId: z.string().min(1),
  runId: z.string().min(1),
  type: z.enum(['INSIGHT', 'DECISION_PROPOSAL', 'MEETING_AGENDA', 'CREATIVE_BRIEF']),
  version: z.number().int().positive(),
  status: z.enum(['PROVISIONAL', 'VERIFIED', 'COMMITTED', 'REJECTED']),
  claims: z
    .array(ArtifactClaimSchema)
    .min(1, { message: 'Artifact deve conter pelo menos uma claim fundamentada' }),
  evidenceRefs: z
    .array(z.string().regex(ID_PATTERNS.evidence))
    .min(1, { message: 'Artifact exige pelo menos 1 evidenceId' }),
  operationalPayload: z.record(z.unknown()),
  redactedPayload: z.record(z.unknown()),
  createdAt: z.string().datetime(),
  committedAt: z.string().datetime().optional()
});

export type Artifact = z.infer<typeof ArtifactSchema>;

/**
 * 5. CommitRecord
 * Registro imutável de transação atômica que promove um Artifact para a memória definitiva do Supercérebro.
 */
export const CommitRecordSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  commitId: z
    .string()
    .regex(ID_PATTERNS.commit, { message: 'Formato inválido de commitId (cmt_...)' }),
  transactionId: z
    .string()
    .min(1, { message: 'transactionId é obrigatório para commits atômicos' }),
  taskId: z.string().min(1),
  runId: z.string().min(1),
  artifactId: z.string().regex(ID_PATTERNS.artifact, { message: 'Formato inválido de artifactId' }),
  policyRef: z.string().min(1, { message: 'policyRef é obrigatório para comprovar autorização' }),
  evidenceRefs: z
    .array(z.string().regex(ID_PATTERNS.evidence))
    .min(1, { message: 'CommitRecord exige pelo menos 1 evidenceId' }),
  committedAt: z.string().datetime(),
  stateHash: z.string().length(64, { message: 'stateHash deve ser SHA-256 de 64 caracteres' })
});

export type CommitRecord = z.infer<typeof CommitRecordSchema>;

/**
 * 6. TraceEvent
 * Evento append-only de rastreabilidade e causalidade da máquina de estados.
 */
export const TracePhaseSchema = z.enum([
  'PLAN',
  'EXECUTE',
  'VERIFY',
  'COMMIT',
  'ATTRIBUTE',
  'REPLAN'
]);

export type TracePhase = z.infer<typeof TracePhaseSchema>;

export const TraceEventSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  eventId: z
    .string()
    .regex(ID_PATTERNS.traceEvent, { message: 'Formato inválido de eventId (evt_...)' }),
  seq: z.number().int().min(1, { message: 'seq deve ser um inteiro positivo e monotônico' }),
  taskId: z.string().min(1),
  runId: z.string().min(1),
  eventType: z.string().min(1),
  causationId: z.string().optional(),
  correlationId: z.string().min(1),
  phase: TracePhaseSchema,
  operationalPayload: z.record(z.unknown()),
  redactedPayload: z.record(z.unknown()),
  timestamp: z.string().datetime()
});

export type TraceEvent = z.infer<typeof TraceEventSchema>;

/**
 * 7. Checkpoint
 * Snapshot de estado para suportar recuperação e replay determinístico.
 */
export const CheckpointSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  checkpointId: z
    .string()
    .regex(ID_PATTERNS.checkpoint, { message: 'Formato inválido de checkpointId (chk_...)' }),
  taskId: z.string().min(1),
  runId: z.string().min(1),
  seq: z.number().int().min(1),
  stateHash: z.string().length(64),
  phase: TracePhaseSchema,
  serializedState: z.record(z.unknown()),
  createdAt: z.string().datetime()
});

export type Checkpoint = z.infer<typeof CheckpointSchema>;

/**
 * 8. Approval
 * Concessão ou rejeição formal para operações de risco ou escritas externas.
 */
export const ApprovalSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  approvalId: z
    .string()
    .regex(ID_PATTERNS.approval, { message: 'Formato inválido de approvalId (appr_...)' }),
  taskId: z.string().min(1),
  runId: z.string().min(1),
  scope: z.string().min(1, { message: 'scope da aprovação é obrigatório' }),
  actor: z.string().min(1, { message: 'actor responsável pela decisão é obrigatório' }),
  decision: z.enum(['APPROVED', 'REJECTED', 'EXPIRED']),
  proposalHash: z.string().length(64).optional(),
  proposerId: z.string().optional(),
  resourceFreshnessSeconds: z.number().nonnegative().optional(),
  reason: z.string().optional(),
  requestedAt: z.string().datetime(),
  decidedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime()
});

export type Approval = z.infer<typeof ApprovalSchema>;

/**
 * 9. DatasetManifest
 * Manifesto de integridade de fixtures e datasets sintéticos.
 */
export const DatasetFileManifestSchema = z.object({
  filename: z.string().min(1),
  fileHash: z.string().length(64),
  byteSize: z.number().int().nonnegative(),
  purpose: z.string().min(1)
});

export type DatasetFileManifest = z.infer<typeof DatasetFileManifestSchema>;

export const DatasetManifestSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  manifestId: z
    .string()
    .regex(ID_PATTERNS.datasetManifest, { message: 'Formato inválido de manifestId (dsm_...)' }),
  datasetVersion: z.string().min(1),
  globalHash: z.string().length(64),
  clientId: z.string().min(1),
  origin: z.string().min(1).default('synthetic_seed'),
  synthetic: z.literal(true),
  timeframe: TimeframeSchema,
  files: z.array(DatasetFileManifestSchema).min(1),
  generatedAt: z.string().datetime()
});

export type DatasetManifest = z.infer<typeof DatasetManifestSchema>;

/**
 * Funções utilitárias de validação segura para os objetos operacionais
 */
export const OperationalValidators = {
  validateObservation: (data: unknown): Observation => ObservationSchema.parse(data),
  validateEvidence: (data: unknown): Evidence => EvidenceSchema.parse(data),
  validateQuarantineItem: (data: unknown): QuarantineItem => QuarantineItemSchema.parse(data),
  validateArtifact: (data: unknown): Artifact => ArtifactSchema.parse(data),
  validateCommitRecord: (data: unknown): CommitRecord => CommitRecordSchema.parse(data),
  validateTraceEvent: (data: unknown): TraceEvent => TraceEventSchema.parse(data),
  validateCheckpoint: (data: unknown): Checkpoint => CheckpointSchema.parse(data),
  validateApproval: (data: unknown): Approval => ApprovalSchema.parse(data),
  validateDatasetManifest: (data: unknown): DatasetManifest => DatasetManifestSchema.parse(data),
  validatePostconditionSpec: (data: unknown): PostconditionSpec =>
    PostconditionSpecSchema.parse(data),
  validateRollbackSpec: (data: unknown): RollbackSpec => RollbackSpecSchema.parse(data),
  validateCampaignOperationSpec: (data: unknown): CampaignOperationSpec =>
    CampaignOperationSpecSchema.parse(data),
  validateTaskIntention: (data: unknown): TaskIntention => TaskIntentionSchema.parse(data)
};
