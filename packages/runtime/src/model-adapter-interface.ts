import { z } from 'zod';
import { OpenAIFunctionToolSchema } from '@adzhub/tools';
import { ModelMetadata } from './model-allowlist.js';

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ToolCallRequest {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatMessage {
  role: ChatRole;
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCallRequest[];
}

export type FinishReason =
  'stop' | 'tool_calls' | 'length' | 'content_filter' | 'timeout' | 'error';

export interface ModelMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  costBrl: number;
  latencyMs: number;
  finishReason: FinishReason;
}

export interface ModelGenerationRequest {
  model: string;
  messages: ChatMessage[];
  tools?: OpenAIFunctionToolSchema[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?:
    { type: 'json_object' } | { type: 'json_schema'; schema: Record<string, unknown> };
  timeoutMs?: number;
  apiKey?: string;
  signal?: AbortSignal;
}

export interface ModelGenerationResponse {
  content: string | null;
  toolCalls?: ToolCallRequest[];
  structuredOutput?: unknown;
  metrics: ModelMetrics;
  modelUsed: string;
}

export type ModelAdapterErrorCode =
  | 'MODEL_UNAUTHORIZED'
  | 'MODEL_NOT_ALLOWED'
  | 'MODEL_RATE_LIMITED'
  | 'MODEL_TIMEOUT'
  | 'MODEL_UPSTREAM_ERROR'
  | 'INVALID_STRUCTURED_OUTPUT'
  | 'MODEL_INVALID_REQUEST';

export class ModelAdapterError extends Error {
  public readonly code: ModelAdapterErrorCode;
  public readonly status?: number;
  public readonly safeMessage: string;
  public readonly isRetryable: boolean;

  constructor(options: {
    code: ModelAdapterErrorCode;
    message: string;
    status?: number;
    safeMessage?: string;
    isRetryable?: boolean;
  }) {
    super(options.message);
    this.name = 'ModelAdapterError';
    this.code = options.code;
    this.status = options.status;
    this.safeMessage = options.safeMessage ?? options.message;
    this.isRetryable = options.isRetryable ?? false;
  }
}

/**
 * Interface abstrata do adaptador de modelo LLM.
 * Desacopla o runtime de provedores de IA específicos.
 */
export interface ModelAdapter {
  generate(request: ModelGenerationRequest): Promise<ModelGenerationResponse>;
  generateStructured<T>(
    request: ModelGenerationRequest,
    schema: z.ZodType<T>
  ): Promise<{ output: T; response: ModelGenerationResponse }>;
  isModelAllowed(model: string): boolean;
  getAllowlist(): ModelMetadata[];
}
