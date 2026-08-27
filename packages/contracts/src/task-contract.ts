import { z } from 'zod';
import { createHash } from 'node:crypto';

/**
 * Intenções canônicas do ciclo operacional de marketing (PEV-C).
 */
export const TaskIntentionSchema = z.enum([
  'PERFORMANCE_RECONCILIATION',
  'ACCOUNT_DIAGNOSIS',
  'DATA_QUALITY_AUDIT',
  'MEETING_AGENDA_GENERATION',
  'CREATIVE_BRIEF_GENERATION',
  'ACTION_RECOMMENDATION',
  'CAMPAIGN_OPERATION',
  'EXECUTION_TRACE_QUERY',
  // Intenções complementares/delegativas
  'PROPOSAL_DELEGATION',
  'EXTERNAL_WRITE_PAUSE',
  'EXTERNAL_WRITE_REACTIVATE',
  'ANALYTICAL_AUDIT',
  'COPY_GENERATION',
  'GOVERNANCE_TEAM_QUERY'
]);

export type TaskIntention = z.infer<typeof TaskIntentionSchema>;

/**
 * Operações atômicas de gestão de tráfego e campanhas.
 */
export const CampaignOperationTypeSchema = z.enum([
  'PAUSE',
  'REACTIVATE',
  'UPDATE_BUDGET',
  'UPDATE_SCHEDULE',
  'CREATE_EXPERIMENT',
  'PUBLISH_CREATIVE'
]);

export type CampaignOperationType = z.infer<typeof CampaignOperationTypeSchema>;

/**
 * Alvo da operação de mídia.
 */
export const CampaignTargetTypeSchema = z.enum(['CAMPAIGN', 'AD_SET', 'AD', 'CREATIVE']);
export type CampaignTargetType = z.infer<typeof CampaignTargetTypeSchema>;

/**
 * Especificação estruturada da operação em campanha.
 */
export const CampaignOperationSpecSchema = z.object({
  operation: CampaignOperationTypeSchema,
  targetType: CampaignTargetTypeSchema,
  targetId: z.string().min(1, { message: 'targetId é obrigatório' }),
  parameters: z.record(z.unknown()).optional()
});

export type CampaignOperationSpec = z.infer<typeof CampaignOperationSpecSchema>;

/**
 * Operador de comparação para pós-condições determinísticas.
 */
export const PostconditionComparisonOperatorSchema = z.enum([
  'EQUALS',
  'CONTAINS',
  'GREATER_OR_EQUAL',
  'LESS_OR_EQUAL',
  'MATCHES_REGEX',
  'NOT_EMPTY'
]);

export type PostconditionComparisonOperator = z.infer<typeof PostconditionComparisonOperatorSchema>;

/**
 * Pós-condição obrigatória verificada via Tool de re-leitura ativa.
 */
export const PostconditionSpecSchema = z.object({
  checkTool: z.string().min(1, { message: 'checkTool de re-leitura é obrigatório' }),
  targetField: z.string().min(1, { message: 'targetField é obrigatório' }),
  expectedValue: z.unknown(),
  comparisonOperator: PostconditionComparisonOperatorSchema.default('EQUALS'),
  timeoutSeconds: z.number().positive().optional(),
  maxRetries: z.number().int().nonnegative().optional()
});

export type PostconditionSpec = z.infer<typeof PostconditionSpecSchema>;
export type PostconditionSpecInput = z.input<typeof PostconditionSpecSchema>;

/**
 * Especificação de rollback e reversibilidade para operações de escrita.
 */
export const RollbackSpecSchema = z.object({
  isReversible: z.boolean(),
  rollbackOp: z.string().optional(),
  previousStateSnapshot: z.record(z.unknown()).optional(),
  rollbackWindowSeconds: z.number().positive().optional()
});

export type RollbackSpec = z.infer<typeof RollbackSpecSchema>;
export type RollbackSpecInput = z.input<typeof RollbackSpecSchema>;

/**
 * Catálogo canônico de efeitos permitidos / conhecidos pelo Microkernel PEV-C.
 */
export const AllowedEffectSchema = z.enum([
  'read:memory',
  'read:meta',
  'read:crm',
  'read:app',
  'write:staging',
  'write:insight',
  'external_write',
  'demo:control'
]);

export type AllowedEffect = z.infer<typeof AllowedEffectSchema>;

/**
 * Schema do Timeframe da tarefa com validação temporal estrita.
 */
export const TimeframeSchema = z
  .object({
    since: z.string().datetime({ message: 'since deve ser uma data ISO-8601 válida' }),
    until: z.string().datetime({ message: 'until deve ser uma data ISO-8601 válida' }),
    timezone: z.string().min(1, { message: 'timezone é obrigatório' })
  })
  .refine(
    (data) => {
      const sinceDate = new Date(data.since);
      const untilDate = new Date(data.until);
      return sinceDate.getTime() <= untilDate.getTime();
    },
    {
      message: 'Período invertido: since não pode ser posterior a until',
      path: ['since']
    }
  );

export type Timeframe = z.infer<typeof TimeframeSchema>;

/**
 * Schema de Budgets operacionais (limites de execução).
 */
export const TaskBudgetsSchema = z.object({
  maxSteps: z.number().int().min(1, { message: 'maxSteps deve ser pelo menos 1' }),
  maxToolCalls: z.number().int().min(0, { message: 'maxToolCalls não pode ser negativo' }),
  maxTokens: z.number().int().min(1, { message: 'maxTokens deve ser pelo menos 1' }),
  maxCostBrl: z.number().min(0, { message: 'maxCostBrl não pode ser negativo' }),
  timeoutMs: z.number().int().min(100, { message: 'timeoutMs deve ser de no mínimo 100ms' })
});

export type TaskBudgets = z.infer<typeof TaskBudgetsSchema>;

/**
 * Schema de Critérios de Sucesso da tarefa.
 */
export const SuccessCriteriaSchema = z.object({
  minEvidenceCoverage: z
    .number()
    .min(0.0, { message: 'minEvidenceCoverage mínimo é 0.0' })
    .max(1.0, { message: 'minEvidenceCoverage máximo é 1.0' }),
  requireVerifiedClaims: z.boolean()
});

export type SuccessCriteria = z.infer<typeof SuccessCriteriaSchema>;

/**
 * Schema de Política de Aprovação da tarefa.
 */
export const ApprovalPolicySchema = z.object({
  externalWritesRequireApproval: z.boolean(),
  autoApproveReadOnly: z.boolean()
});

export type ApprovalPolicy = z.infer<typeof ApprovalPolicySchema>;

/**
 * Schema Canônico do TaskContract v1.
 */
export const TaskContractSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  taskId: z.string().min(1, { message: 'taskId é obrigatório' }),
  clientId: z.string().min(1, { message: 'clientId é obrigatório' }),
  tenantId: z.string().min(1, { message: 'tenantId é obrigatório' }),
  goal: z.string().min(1, { message: 'goal é obrigatório' }),
  intention: TaskIntentionSchema.optional(),
  campaignOperation: CampaignOperationSpecSchema.optional(),
  timeframe: TimeframeSchema,
  effects: z.object({
    allowed: z
      .array(AllowedEffectSchema)
      .min(1, { message: 'Pelo menos um effect permitido é obrigatório' }),
    forbidden: z.array(AllowedEffectSchema).optional()
  }),
  budgets: TaskBudgetsSchema,
  successCriteria: SuccessCriteriaSchema,
  approvalPolicy: ApprovalPolicySchema,
  expectedPostcondition: PostconditionSpecSchema.optional(),
  idempotencyKey: z.string().min(1).optional(),
  rollbackSpec: RollbackSpecSchema.optional(),
  proposalHash: z.string().length(64).optional(),
  metadata: z.record(z.unknown()).optional()
});

export type TaskContract = z.infer<typeof TaskContractSchema>;

/**
 * Canonicaliza recursivamente um valor JS para serialização determinística em JSON.
 */
export function canonicalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    const canonicalArray = obj.map((item) => canonicalizeJson(item));
    return `[${canonicalArray.join(',')}]`;
  }

  const record = obj as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  const pairs = sortedKeys.map((key) => `"${key}":${canonicalizeJson(record[key])}`);
  return `{${pairs.join(',')}}`;
}

/**
 * Gera o hash determinístico SHA-256 de um TaskContract.
 */
export function calculateContractHash(contract: TaskContract): string {
  const canonical = canonicalizeJson(contract);
  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Calcula o hash determinístico SHA-256 de uma proposta operacional.
 * proposal_hash = sha256(canonicalJson({ resource, operation, payload, previousStateSnapshot }))
 */
export function calculateProposalHash(proposal: {
  resource: string;
  operation: string;
  payload: unknown;
  previousStateSnapshot?: unknown;
}): string {
  const canonical = canonicalizeJson({
    resource: proposal.resource,
    operation: proposal.operation,
    payload: proposal.payload,
    previousStateSnapshot: proposal.previousStateSnapshot ?? null
  });
  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Gera uma chave de idempotência determinística vinculada à tarefa, operação e hash da proposta.
 */
export function generateDeterministicIdempotencyKey(
  taskId: string,
  operation: string,
  proposalHash: string
): string {
  const input = `${taskId}:${operation}:${proposalHash}`;
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Valida um TaskContract de forma segura retornando dados tipados ou lançando erro Zod detalhado.
 */
export function validateTaskContract(data: unknown): TaskContract {
  return TaskContractSchema.parse(data);
}

export type DeepReadonly<T> = T extends (infer R)[]
  ? ReadonlyArray<DeepReadonly<R>>
  : T extends (...args: unknown[]) => unknown
    ? T
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;

/**
 * Congela profundamente o contrato tornando-o estritamente imutável após TASK_ACCEPTED.
 */
export function freezeTaskContract(contract: TaskContract): DeepReadonly<TaskContract> {
  // Realiza cópia profunda antes do freeze para desvincular de referências externas
  const cloned = JSON.parse(JSON.stringify(contract));

  function deepFreeze<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    Object.freeze(obj);
    for (const key of Object.keys(obj)) {
      const val = (obj as Record<string, unknown>)[key];
      if (val !== null && typeof val === 'object') {
        deepFreeze(val);
      }
    }
    return obj;
  }

  return deepFreeze(cloned) as DeepReadonly<TaskContract>;
}
