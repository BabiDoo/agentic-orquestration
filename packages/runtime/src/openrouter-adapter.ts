import { z } from 'zod';
import {
  ChatMessage,
  ModelAdapter,
  ModelAdapterError,
  ModelGenerationRequest,
  ModelGenerationResponse,
  ToolCallRequest
} from './model-adapter-interface.js';
import {
  calculateModelCost,
  getAllowedModelsList,
  isModelAllowed,
  ModelMetadata
} from './model-allowlist.js';

export interface OpenRouterAdapterOptions {
  defaultApiKey?: string;
  baseUrl?: string;
  defaultTimeoutMs?: number;
  fetchFn?: typeof fetch;
}

export class OpenRouterAdapter implements ModelAdapter {
  private readonly defaultApiKey?: string;
  private readonly baseUrl: string;
  private readonly defaultTimeoutMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(options: OpenRouterAdapterOptions = {}) {
    this.defaultApiKey = options.defaultApiKey;
    this.baseUrl = options.baseUrl ?? 'https://openrouter.ai/api/v1';
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 30000;
    this.fetchFn = options.fetchFn ?? globalThis.fetch;
  }

  public isModelAllowed(model: string): boolean {
    return isModelAllowed(model);
  }

  public getAllowlist(): ModelMetadata[] {
    return getAllowedModelsList();
  }

  private normalizeOpenRouterModel(model: string): string {
    if (model === 'anthropic/claude-3-5-sonnet') {
      return 'anthropic/claude-3.5-sonnet';
    }
    if (model === 'google/gemini-2.5-flash' || model === 'google/gemini-2.0-flash') {
      return 'google/gemini-2.0-flash-001';
    }
    if (model === 'google/gemini-1.5-flash') {
      return 'google/gemini-flash-1.5';
    }
    if (model === 'google/gemini-1.5-pro') {
      return 'google/gemini-pro-1.5';
    }
    return model;
  }

  public async generate(request: ModelGenerationRequest): Promise<ModelGenerationResponse> {
    // 1. Validação estrita de Allowlist de Modelos
    if (!this.isModelAllowed(request.model)) {
      throw new ModelAdapterError({
        code: 'MODEL_NOT_ALLOWED',
        message: `O modelo '${request.model}' não consta na allowlist de modelos autorizados.`,
        safeMessage: `Modelo não autorizado. Selecione um dos modelos permitidos na allowlist.`
      });
    }

    // 2. Resolução segura de Chave (BYOK)
    const apiKey = request.apiKey || this.defaultApiKey;
    if (!apiKey) {
      throw new ModelAdapterError({
        code: 'MODEL_UNAUTHORIZED',
        message: 'Chave de API OpenRouter não fornecida.',
        safeMessage:
          'Chave de API OpenRouter não informada. Forneça uma chave temporária válida (BYOK).'
      });
    }

    const targetModel = this.normalizeOpenRouterModel(request.model);
    const timeoutMs = request.timeoutMs ?? this.defaultTimeoutMs;
    const abortController = new AbortController();

    const activeSignal = request.signal
      ? this.combineSignals(request.signal, abortController.signal)
      : abortController.signal;

    const timeoutTimer = setTimeout(() => {
      abortController.abort(new Error('TIMEOUT_TRIGGERED'));
    }, timeoutMs);

    const startTime = performance.now();

    try {
      // 3. Montagem segura do payload para OpenRouter / OpenAI format
      const payload: Record<string, unknown> = {
        model: targetModel,
        messages: request.messages.map((m) => this.formatMessageForApi(m)),
        temperature: request.temperature ?? 0.2
      };

      if (request.maxTokens) {
        payload.max_tokens = request.maxTokens;
      }

      if (request.tools && request.tools.length > 0) {
        payload.tools = request.tools;
      }

      if (request.responseFormat) {
        payload.response_format = request.responseFormat;
      }

      const response = await this.fetchFn(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://adzhub.ai',
          'X-Title': 'AdzHub PEV-C Microkernel',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: activeSignal
      });

      clearTimeout(timeoutTimer);
      const latencyMs = Math.round(performance.now() - startTime);

      if (!response.ok) {
        await this.handleHttpError(response);
      }

      const responseData = (await response.json()) as {
        id?: string;
        model?: string;
        choices?: Array<{
          message?: {
            role?: string;
            content?: string | null;
            tool_calls?: Array<{
              id: string;
              type: 'function';
              function: { name: string; arguments: string };
            }>;
          };
          finish_reason?: string;
        }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        };
      };

      const choice = responseData.choices?.[0];
      const content = choice?.message?.content ?? null;
      const rawToolCalls = choice?.message?.tool_calls;

      let toolCalls: ToolCallRequest[] | undefined = undefined;
      if (rawToolCalls && rawToolCalls.length > 0) {
        toolCalls = rawToolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments
          }
        }));
      }

      const promptTokens = responseData.usage?.prompt_tokens ?? 0;
      const completionTokens = responseData.usage?.completion_tokens ?? 0;
      const totalTokens = responseData.usage?.total_tokens ?? promptTokens + completionTokens;

      const { costUsd, costBrl } = calculateModelCost(
        request.model,
        promptTokens,
        completionTokens
      );

      const finishReason = this.mapFinishReason(choice?.finish_reason, toolCalls);

      let structuredOutput: unknown = undefined;
      if (request.responseFormat?.type === 'json_object' && content) {
        try {
          structuredOutput = JSON.parse(content);
        } catch {
          // Mantém structuredOutput undefined se parse falhar
        }
      }

      return {
        content,
        toolCalls,
        structuredOutput,
        metrics: {
          promptTokens,
          completionTokens,
          totalTokens,
          costUsd,
          costBrl,
          latencyMs,
          finishReason
        },
        modelUsed: responseData.model ?? request.model
      };
    } catch (err: unknown) {
      clearTimeout(timeoutTimer);

      if (err instanceof ModelAdapterError) {
        throw err;
      }

      if (activeSignal.aborted || (err instanceof Error && err.name === 'AbortError')) {
        throw new ModelAdapterError({
          code: 'MODEL_TIMEOUT',
          message: `A requisição para o modelo '${request.model}' excedeu o tempo limite de ${timeoutMs}ms.`,
          safeMessage: 'O modelo demorou mais que o esperado para responder (timeout de rede).',
          isRetryable: true
        });
      }

      const errorMsg =
        err instanceof Error ? err.message : 'Falha de rede ao conectar com OpenRouter.';
      throw new ModelAdapterError({
        code: 'MODEL_UPSTREAM_ERROR',
        message: `Falha na comunicação com o OpenRouter: ${errorMsg}`,
        safeMessage: 'Falha de comunicação temporária com o provedor de modelos.',
        isRetryable: true
      });
    }
  }

  public async generateStructured<T>(
    request: ModelGenerationRequest,
    schema: z.ZodType<T>
  ): Promise<{ output: T; response: ModelGenerationResponse }> {
    const generationRequest: ModelGenerationRequest = {
      ...request,
      responseFormat: { type: 'json_object' }
    };

    const response = await this.generate(generationRequest);

    if (!response.content) {
      throw new ModelAdapterError({
        code: 'INVALID_STRUCTURED_OUTPUT',
        message: 'O modelo retornou resposta vazia ao solicitar saída estruturada.',
        safeMessage: 'O modelo não retornou a estrutura de dados esperada.'
      });
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(response.content);
    } catch {
      throw new ModelAdapterError({
        code: 'INVALID_STRUCTURED_OUTPUT',
        message: `Saída do modelo não é um JSON válido: ${response.content.slice(0, 100)}...`,
        safeMessage: 'A saída retornada pelo modelo contém formato JSON corrompido.'
      });
    }

    const validation = schema.safeParse(parsedJson);
    if (!validation.success) {
      const issueDetails = validation.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
      throw new ModelAdapterError({
        code: 'INVALID_STRUCTURED_OUTPUT',
        message: `A saída JSON do modelo violou o schema esperado: ${issueDetails}`,
        safeMessage: `A estrutura gerada pelo modelo não atende aos requisitos de schema (${issueDetails}).`
      });
    }

    return {
      output: validation.data,
      response: {
        ...response,
        structuredOutput: validation.data
      }
    };
  }

  private formatMessageForApi(message: ChatMessage): Record<string, unknown> {
    const formatted: Record<string, unknown> = {
      role: message.role,
      content: message.content
    };

    if (message.name) {
      formatted.name = message.name;
    }
    if (message.tool_call_id) {
      formatted.tool_call_id = message.tool_call_id;
    }
    if (message.tool_calls && message.tool_calls.length > 0) {
      formatted.tool_calls = message.tool_calls;
    }

    return formatted;
  }

  private async handleHttpError(response: Response): Promise<never> {
    let errorDetail = '';
    try {
      const errorJson = (await response.json()) as { error?: { message?: string; code?: string } };
      errorDetail = errorJson.error?.message ?? '';
    } catch {
      errorDetail = response.statusText;
    }

    if (response.status === 401 || response.status === 403) {
      throw new ModelAdapterError({
        code: 'MODEL_UNAUTHORIZED',
        status: response.status,
        message: `Erro de autenticação OpenRouter (HTTP ${response.status}): ${errorDetail}`,
        safeMessage:
          'Chave de API OpenRouter inválida, expirada ou sem permissão para o modelo selecionado.'
      });
    }

    if (response.status === 429) {
      throw new ModelAdapterError({
        code: 'MODEL_RATE_LIMITED',
        status: response.status,
        message: `Limite de taxa excedido no OpenRouter (HTTP 429): ${errorDetail}`,
        safeMessage: 'Limite de requisições ou créditos esgotados na conta OpenRouter.',
        isRetryable: true
      });
    }

    if (response.status >= 500) {
      throw new ModelAdapterError({
        code: 'MODEL_UPSTREAM_ERROR',
        status: response.status,
        message: `Erro no servidor upstream OpenRouter (HTTP ${response.status}): ${errorDetail}`,
        safeMessage: 'O provedor OpenRouter enfrentou uma instabilidade interna temporária.',
        isRetryable: true
      });
    }

    throw new ModelAdapterError({
      code: 'MODEL_INVALID_REQUEST',
      status: response.status,
      message: `Requisição rejeitada pelo OpenRouter (HTTP ${response.status}): ${errorDetail}`,
      safeMessage: 'A requisição enviada ao modelo contém parâmetros inválidos.'
    });
  }

  private mapFinishReason(
    rawReason?: string,
    toolCalls?: ToolCallRequest[]
  ): ModelGenerationResponse['metrics']['finishReason'] {
    if (toolCalls && toolCalls.length > 0) return 'tool_calls';
    if (rawReason === 'tool_calls') return 'tool_calls';
    if (rawReason === 'length') return 'length';
    if (rawReason === 'content_filter') return 'content_filter';
    if (rawReason === 'timeout') return 'timeout';
    return 'stop';
  }

  private combineSignals(sig1: AbortSignal, sig2: AbortSignal): AbortSignal {
    const controller = new AbortController();
    if (sig1.aborted || sig2.aborted) {
      controller.abort();
      return controller.signal;
    }
    sig1.addEventListener('abort', () => controller.abort(), { once: true });
    sig2.addEventListener('abort', () => controller.abort(), { once: true });
    return controller.signal;
  }
}
