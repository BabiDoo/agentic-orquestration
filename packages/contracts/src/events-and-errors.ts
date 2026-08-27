import { z } from 'zod';
import { TracePhaseSchema } from './operational-contracts.js';

/**
 * Catálogo dos 21 eventos normativos do ciclo de vida da máquina PEV-C.
 */
export const RuntimeEventTypeSchema = z.enum([
  'TASK_ACCEPTED',
  'PLAN_CREATED',
  'TOOL_CALL_STARTED',
  'TOOL_CALL_COMPLETED',
  'TOOL_CALL_FAILED',
  'OBSERVATION_STAGED',
  'VERIFICATION_STARTED',
  'VERIFICATION_COMPLETED',
  'VERIFICATION_FAILED',
  'QUARANTINE_RECORDED',
  'POLICY_EVALUATED',
  'APPROVAL_REQUESTED',
  'APPROVAL_RESOLVED',
  'ATTRIBUTE_FAILED',
  'REPLAN_TRIGGERED',
  'COMMIT_STARTED',
  'COMMIT_COMPLETED',
  'COMMIT_REJECTED',
  'RUN_COMPLETED',
  'RUN_BLOCKED',
  'RUN_FAILED'
]);

export type RuntimeEventType = z.infer<typeof RuntimeEventTypeSchema>;

/**
 * Catálogo dos 15 códigos canônicos de falha e diagnóstico.
 */
export const RuntimeErrorCodeSchema = z.enum([
  'INVALID_TASK',
  'BUDGET_EXCEEDED',
  'POLICY_DENIED',
  'APPROVAL_REQUIRED',
  'INVALID_SCHEMA',
  'POSTCONDITION_FAILED',
  'PERIOD_MISMATCH',
  'SEMANTIC_CONFLICT',
  'LOW_COVERAGE',
  'CIRCUIT_OPEN',
  'TOOL_TIMEOUT',
  'TOOL_ERROR',
  'PROMPT_INJECTION_DETECTED',
  'COMMIT_REJECTED',
  'INTERNAL_ERROR'
]);

export type RuntimeErrorCode = z.infer<typeof RuntimeErrorCodeSchema>;

/**
 * Classificação de recuperabilidade da falha.
 */
export const RecoverabilitySchema = z.enum(['FATAL', 'RECOVERABLE', 'REQUIRES_APPROVAL']);

export type Recoverability = z.infer<typeof RecoverabilitySchema>;

/**
 * Schema canônico do Erro Diagnóstico do Runtime.
 */
export const RuntimeDiagnosticErrorSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  code: RuntimeErrorCodeSchema,
  recoverability: RecoverabilitySchema,
  phase: TracePhaseSchema,
  safeMessage: z.string().min(1),
  details: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime()
});

export type RuntimeDiagnosticError = z.infer<typeof RuntimeDiagnosticErrorSchema>;

/**
 * Mapeamento padrão de recuperabilidade por código de erro.
 */
export const DEFAULT_ERROR_METADATA: Record<
  RuntimeErrorCode,
  { defaultRecoverability: Recoverability; defaultSafeMessage: string }
> = {
  INVALID_TASK: {
    defaultRecoverability: 'FATAL',
    defaultSafeMessage: 'O contrato da tarefa é inválido ou contém parâmetros inconsistentes.'
  },
  BUDGET_EXCEEDED: {
    defaultRecoverability: 'FATAL',
    defaultSafeMessage: 'O limite de recursos (passos, tokens ou custo) foi atingido.'
  },
  POLICY_DENIED: {
    defaultRecoverability: 'FATAL',
    defaultSafeMessage: 'Ação solicitada foi bloqueada pelas políticas de segurança.'
  },
  APPROVAL_REQUIRED: {
    defaultRecoverability: 'REQUIRES_APPROVAL',
    defaultSafeMessage: 'Ação de mutação externa exige aprovação prévia.'
  },
  INVALID_SCHEMA: {
    defaultRecoverability: 'RECOVERABLE',
    defaultSafeMessage: 'Os dados retornados pela ferramenta não atendem ao schema esperado.'
  },
  POSTCONDITION_FAILED: {
    defaultRecoverability: 'RECOVERABLE',
    defaultSafeMessage: 'Pós-condição determinística violada durante a verificação.'
  },
  PERIOD_MISMATCH: {
    defaultRecoverability: 'RECOVERABLE',
    defaultSafeMessage: 'Incompatibilidade entre o período dos dados e o contrato da tarefa.'
  },
  SEMANTIC_CONFLICT: {
    defaultRecoverability: 'RECOVERABLE',
    defaultSafeMessage: 'Conflito semântico ou divergência entre fontes de dados.'
  },
  LOW_COVERAGE: {
    defaultRecoverability: 'RECOVERABLE',
    defaultSafeMessage: 'Cobertura de dados insuficiente para embasar conclusões definitivas.'
  },
  CIRCUIT_OPEN: {
    defaultRecoverability: 'FATAL',
    defaultSafeMessage: 'Integração temporariamente indisponível após falhas consecutivas.'
  },
  TOOL_TIMEOUT: {
    defaultRecoverability: 'RECOVERABLE',
    defaultSafeMessage: 'Tempo limite esgotado ao aguardar resposta da ferramenta.'
  },
  TOOL_ERROR: {
    defaultRecoverability: 'RECOVERABLE',
    defaultSafeMessage: 'Falha durante a execução da ferramenta externa.'
  },
  PROMPT_INJECTION_DETECTED: {
    defaultRecoverability: 'RECOVERABLE',
    defaultSafeMessage: 'Conteúdo não confiável descartado para preservar as diretivas do sistema.'
  },
  COMMIT_REJECTED: {
    defaultRecoverability: 'FATAL',
    defaultSafeMessage: 'Transação de persistência atômica abortada para evitar inconsistências.'
  },
  INTERNAL_ERROR: {
    defaultRecoverability: 'FATAL',
    defaultSafeMessage: 'Ocorreu um erro interno inesperado durante a execução.'
  }
};

/**
 * Função utilitária para criação segura e padronizada de erros de diagnóstico.
 */
export function createDiagnosticError(
  code: RuntimeErrorCode,
  phase: z.infer<typeof TracePhaseSchema>,
  customSafeMessage?: string,
  details?: Record<string, unknown>
): RuntimeDiagnosticError {
  const meta = DEFAULT_ERROR_METADATA[code];
  return {
    schemaVersion: '1.0.0',
    code,
    recoverability: meta.defaultRecoverability,
    phase,
    safeMessage: customSafeMessage ?? meta.defaultSafeMessage,
    details,
    timestamp: new Date().toISOString()
  };
}

/**
 * Schemas para eventos tipados do runtime com discriminated unions no eventType.
 */
export const TypedEventBaseSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  eventId: z.string().regex(/^evt_[a-zA-Z0-9_-]+$/),
  seq: z.number().int().min(1),
  taskId: z.string().min(1),
  runId: z.string().min(1),
  correlationId: z.string().min(1),
  causationId: z.string().optional(),
  phase: TracePhaseSchema,
  timestamp: z.string().datetime()
});

export const TaskAcceptedEventSchema = TypedEventBaseSchema.extend({
  eventType: z.literal('TASK_ACCEPTED'),
  payload: z.object({ contractHash: z.string().length(64) })
});

export const PlanCreatedEventSchema = TypedEventBaseSchema.extend({
  eventType: z.literal('PLAN_CREATED'),
  payload: z.object({
    stepsCount: z.number().int().positive(),
    estimatedCostBrl: z.number().nonnegative()
  })
});

export const ToolCallCompletedEventSchema = TypedEventBaseSchema.extend({
  eventType: z.literal('TOOL_CALL_COMPLETED'),
  payload: z.object({
    toolName: z.string(),
    observationId: z.string(),
    durationMs: z.number().nonnegative()
  })
});

export const VerificationCompletedEventSchema = TypedEventBaseSchema.extend({
  eventType: z.literal('VERIFICATION_COMPLETED'),
  payload: z.object({ checkId: z.string(), score: z.number().min(0).max(1), passed: z.boolean() })
});

export const PolicyEvaluatedEventSchema = TypedEventBaseSchema.extend({
  eventType: z.literal('POLICY_EVALUATED'),
  payload: z.object({
    subject: z.string(),
    action: z.string(),
    resource: z.string(),
    decision: z.enum(['ALLOW', 'DENY', 'REQUIRES_APPROVAL']),
    reason: z.string(),
    code: z.string().optional(),
    details: z.record(z.unknown()).optional()
  })
});

export type PolicyEvaluatedEvent = z.infer<typeof PolicyEvaluatedEventSchema>;

export const CommitCompletedEventSchema = TypedEventBaseSchema.extend({
  eventType: z.literal('COMMIT_COMPLETED'),
  payload: z.object({ commitId: z.string(), artifactId: z.string(), transactionId: z.string() })
});

export const RunFailedEventSchema = TypedEventBaseSchema.extend({
  eventType: z.literal('RUN_FAILED'),
  payload: z.object({ error: RuntimeDiagnosticErrorSchema })
});

export const GenericRuntimeEventSchema = TypedEventBaseSchema.extend({
  eventType: RuntimeEventTypeSchema,
  payload: z.record(z.unknown())
});

export type GenericRuntimeEvent = z.infer<typeof GenericRuntimeEventSchema>;
