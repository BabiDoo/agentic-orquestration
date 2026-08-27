import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  GovernedTool,
  OpenAIFunctionToolSchema,
  ToolCallResult,
  ToolDefinition,
  ToolExecutionContext
} from './tool-interface.js';

/**
 * Sanitiza mensagens de erro para evitar vazamento de paths do sistema operacional ou stacks internas.
 */
function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    let msg = error.message;
    // Remove caminhos absolutos do Windows ou Unix caso existam na mensagem
    msg = msg.replace(/[a-zA-Z]:\\[^:\n\r]+/g, '[REDACTED_PATH]');
    msg = msg.replace(/\/(?:[a-zA-Z0-9._-]+\/)+[a-zA-Z0-9._-]+/g, '[REDACTED_PATH]');
    return msg;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Ocorreu um erro interno durante a execução da ferramenta.';
}

/**
 * Converte schemas Zod para JSON Schema compatível com OpenAI/OpenRouter Function Calling.
 */
export function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  // Desembrulha optional, nullable, default e effects
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return zodToJsonSchema(schema.unwrap());
  }

  if (schema instanceof z.ZodDefault) {
    const inner = zodToJsonSchema(schema._def.innerType);
    return { ...inner, default: schema._def.defaultValue() };
  }

  if (schema instanceof z.ZodEffects) {
    return zodToJsonSchema(schema._def.schema);
  }

  if (schema instanceof z.ZodString) {
    const res: Record<string, unknown> = { type: 'string' };
    if (schema.description) res.description = schema.description;
    return res;
  }

  if (schema instanceof z.ZodNumber) {
    const res: Record<string, unknown> = { type: 'number' };
    if (schema.description) res.description = schema.description;
    return res;
  }

  if (schema instanceof z.ZodBoolean) {
    const res: Record<string, unknown> = { type: 'boolean' };
    if (schema.description) res.description = schema.description;
    return res;
  }

  if (schema instanceof z.ZodEnum) {
    return {
      type: 'string',
      enum: schema._def.values,
      description: schema.description
    };
  }

  if (schema instanceof z.ZodArray) {
    return {
      type: 'array',
      items: zodToJsonSchema(schema._def.type),
      description: schema.description
    };
  }

  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const fieldSchema = value as z.ZodTypeAny;
      properties[key] = zodToJsonSchema(fieldSchema);

      const isOptional =
        fieldSchema instanceof z.ZodOptional ||
        fieldSchema instanceof z.ZodDefault ||
        (fieldSchema instanceof z.ZodNullable &&
          fieldSchema._def.innerType instanceof z.ZodOptional);

      if (!isOptional) {
        required.push(key);
      }
    }

    const res: Record<string, unknown> = {
      type: 'object',
      properties,
      additionalProperties: false
    };

    if (required.length > 0) {
      res.required = required;
    }
    if (schema.description) {
      res.description = schema.description;
    }

    return res;
  }

  if (schema instanceof z.ZodRecord) {
    return {
      type: 'object',
      additionalProperties: zodToJsonSchema(schema._def.valueType),
      description: schema.description
    };
  }

  return {
    type: 'object',
    description: schema.description
  };
}

/**
 * Executa uma Tool de forma estritamente governada:
 * 1. Valida input schema
 * 2. Aplica timeout e correlationId
 * 3. Executa handler isolado
 * 4. Valida output schema
 * 5. Avalia pós-condições declaradas
 * 6. Formata retorno uniforme sem stack sensível
 */
export async function executeTool<TInput, TOutput>(
  definition: ToolDefinition<TInput, TOutput>,
  rawParams: unknown,
  rawContext?: Partial<ToolExecutionContext>
): Promise<ToolCallResult<TOutput>> {
  const startTime = performance.now();
  const toolCallId =
    rawContext?.toolCallId || `tcall_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const correlationId =
    rawContext?.correlationId || `corr_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const timeoutMs = rawContext?.timeoutMs ?? 10000;

  const fullContext: ToolExecutionContext = {
    toolCallId,
    correlationId,
    taskId: rawContext?.taskId,
    runId: rawContext?.runId,
    timeoutMs,
    signal: rawContext?.signal
  };

  // 1. Validação de Input Schema
  const inputValidation = definition.inputSchema.safeParse(rawParams);
  if (!inputValidation.success) {
    const elapsedMs = Math.round((performance.now() - startTime) * 100) / 100;
    const formattedErrors = inputValidation.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');

    return {
      ok: false,
      error: `Parâmetros inválidos para a ferramenta '${definition.name}': ${formattedErrors}`,
      errorCode: 'INVALID_SCHEMA',
      toolCallId,
      correlationId,
      executionTimeMs: elapsedMs,
      timestamp: new Date().toISOString()
    };
  }

  const validatedInput = inputValidation.data;

  // 2. Execução com Timeout e AbortSignal
  let rawOutput: TOutput;
  try {
    const abortController = new AbortController();
    const activeSignal = fullContext.signal
      ? anySignal([fullContext.signal, abortController.signal])
      : abortController.signal;

    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        abortController.abort();
        const err = new Error(`TIMEOUT_TRIGGERED`);
        err.name = 'TimeoutError';
        reject(err);
      }, timeoutMs);

      activeSignal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
        },
        { once: true }
      );
    });

    const executionPromise = definition.handler(validatedInput, {
      ...fullContext,
      signal: activeSignal
    });

    rawOutput = await Promise.race([executionPromise, timeoutPromise]);
  } catch (err: unknown) {
    const elapsedMs = Math.round((performance.now() - startTime) * 100) / 100;

    if (
      err instanceof Error &&
      (err.name === 'TimeoutError' || err.message === 'TIMEOUT_TRIGGERED')
    ) {
      return {
        ok: false,
        error: `A execução da ferramenta '${definition.name}' excedeu o tempo limite de ${timeoutMs}ms.`,
        errorCode: 'TOOL_TIMEOUT',
        toolCallId,
        correlationId,
        executionTimeMs: elapsedMs,
        timestamp: new Date().toISOString()
      };
    }

    if (fullContext.signal?.aborted) {
      return {
        ok: false,
        error: `A execução da ferramenta '${definition.name}' foi cancelada.`,
        errorCode: 'TOOL_ERROR',
        toolCallId,
        correlationId,
        executionTimeMs: elapsedMs,
        timestamp: new Date().toISOString()
      };
    }

    const safeMessage = sanitizeErrorMessage(err);
    return {
      ok: false,
      error: `Falha na execução de '${definition.name}': ${safeMessage}`,
      errorCode: 'TOOL_ERROR',
      toolCallId,
      correlationId,
      executionTimeMs: elapsedMs,
      timestamp: new Date().toISOString()
    };
  }

  // 3. Validação de Output Schema
  const outputValidation = definition.outputSchema.safeParse(rawOutput);
  if (!outputValidation.success) {
    const elapsedMs = Math.round((performance.now() - startTime) * 100) / 100;
    const formattedErrors = outputValidation.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');

    return {
      ok: false,
      error: `Saída da ferramenta '${definition.name}' violou o contrato de saída: ${formattedErrors}`,
      errorCode: 'INVALID_SCHEMA',
      toolCallId,
      correlationId,
      executionTimeMs: elapsedMs,
      timestamp: new Date().toISOString()
    };
  }

  const validatedOutput = outputValidation.data;

  // 4. Avaliação de Pós-Condições
  if (definition.postconditions && definition.postconditions.length > 0) {
    for (const postcondition of definition.postconditions) {
      try {
        const postResult = await postcondition.check(validatedInput, validatedOutput, fullContext);
        const isValid = typeof postResult === 'boolean' ? postResult : postResult.valid;
        const customMessage =
          typeof postResult === 'object' && postResult.message ? postResult.message : undefined;

        if (!isValid) {
          const elapsedMs = Math.round((performance.now() - startTime) * 100) / 100;
          return {
            ok: false,
            error: `Pós-condição '${postcondition.name}' falhou para a ferramenta '${definition.name}'${customMessage ? `: ${customMessage}` : '.'}`,
            errorCode: 'POSTCONDITION_FAILED',
            toolCallId,
            correlationId,
            executionTimeMs: elapsedMs,
            timestamp: new Date().toISOString()
          };
        }
      } catch (postErr) {
        const elapsedMs = Math.round((performance.now() - startTime) * 100) / 100;
        const safeMessage = sanitizeErrorMessage(postErr);
        return {
          ok: false,
          error: `Erro ao avaliar pós-condição '${postcondition.name}' em '${definition.name}': ${safeMessage}`,
          errorCode: 'POSTCONDITION_FAILED',
          toolCallId,
          correlationId,
          executionTimeMs: elapsedMs,
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  // 5. Sucesso
  const elapsedMs = Math.round((performance.now() - startTime) * 100) / 100;
  return {
    ok: true,
    data: validatedOutput,
    toolCallId,
    correlationId,
    executionTimeMs: elapsedMs,
    timestamp: new Date().toISOString()
  };
}

/**
 * Cria uma Tool governada que encapsula a definição e o runner seguro.
 */
export function createTool<TInput, TOutput>(
  definition: ToolDefinition<TInput, TOutput>
): GovernedTool<TInput, TOutput> {
  return {
    definition,
    name: definition.name,
    description: definition.description,
    effect: definition.effect,
    execute(params: unknown, context?: Partial<ToolExecutionContext>) {
      return executeTool(definition, params, context);
    },
    toOpenAISchema(): OpenAIFunctionToolSchema {
      return {
        type: 'function',
        function: {
          name: definition.name,
          description: definition.description,
          parameters: zodToJsonSchema(definition.inputSchema)
        }
      };
    }
  };
}

/**
 * Helper para combinar múltiplos AbortSignals.
 */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      return signal;
    }
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return controller.signal;
}
