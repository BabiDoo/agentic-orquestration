import { z } from 'zod';
import { AllowedEffect, RuntimeErrorCode } from '@adzhub/contracts';

/**
 * Contexto de execução governado fornecido a cada invocação de Tool.
 */
export interface ToolExecutionContext {
  toolCallId: string;
  correlationId: string;
  taskId?: string;
  runId?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Schema Zod para validação do contexto de execução.
 */
export const ToolExecutionContextSchema = z.object({
  toolCallId: z.string().min(1, { message: 'toolCallId é obrigatório' }),
  correlationId: z.string().min(1, { message: 'correlationId é obrigatório' }),
  taskId: z.string().optional(),
  runId: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
  signal: z.instanceof(AbortSignal).optional()
});

/**
 * Pós-condição verificável declarada por uma Tool.
 */
export interface ToolPostcondition<TInput = unknown, TOutput = unknown> {
  name: string;
  description?: string;
  check: (
    input: TInput,
    output: TOutput,
    context: ToolExecutionContext
  ) =>
    | Promise<boolean | { valid: boolean; message?: string }>
    | (boolean | { valid: boolean; message?: string });
}

/**
 * Definição imutável e declarativa de uma Tool governada.
 */
export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  effect: AllowedEffect;
  inputSchema: z.ZodType<TInput, z.ZodTypeDef, any>;
  outputSchema: z.ZodType<TOutput, z.ZodTypeDef, any>;
  postconditions?: ToolPostcondition<TInput, TOutput>[];
  handler: (params: TInput, context: ToolExecutionContext) => Promise<TOutput>;
}

/**
 * Resultado padronizado retornado por qualquer invocação de Tool.
 * Garante que erros sejam uniformes e não vazem stacks sensíveis.
 */
export interface ToolCallResult<TOutput = unknown> {
  ok: boolean;
  data?: TOutput;
  error?: string;
  errorCode?: RuntimeErrorCode;
  toolCallId: string;
  correlationId: string;
  executionTimeMs: number;
  timestamp: string;
}

/**
 * Schema Zod do envelope ToolCallResult.
 */
export const ToolCallResultSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  errorCode: z.string().optional(),
  toolCallId: z.string().min(1),
  correlationId: z.string().min(1),
  executionTimeMs: z.number().nonnegative(),
  timestamp: z.string().datetime()
});

/**
 * Schema compatível com formato de Function Calling do OpenAI / OpenRouter.
 */
export interface OpenAIFunctionToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/**
 * Interface da Tool governada instanciada e encapsulada.
 */
export interface GovernedTool<TInput = unknown, TOutput = unknown> {
  readonly definition: ToolDefinition<TInput, TOutput>;
  readonly name: string;
  readonly description: string;
  readonly effect: AllowedEffect;
  execute(
    params: unknown,
    context?: Partial<ToolExecutionContext>
  ): Promise<ToolCallResult<TOutput>>;
  toOpenAISchema(): OpenAIFunctionToolSchema;
}
