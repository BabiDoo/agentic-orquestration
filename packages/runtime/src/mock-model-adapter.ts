import { z } from 'zod';
import {
  ModelAdapter,
  ModelAdapterError,
  ModelGenerationRequest,
  ModelGenerationResponse
} from './model-adapter-interface.js';
import {
  calculateModelCost,
  getAllowedModelsList,
  isModelAllowed,
  ModelMetadata
} from './model-allowlist.js';

export type MockResponseHandler = (
  request: ModelGenerationRequest
) => Promise<Partial<ModelGenerationResponse>> | Partial<ModelGenerationResponse>;

export class MockModelAdapter implements ModelAdapter {
  private responseQueue: Array<Partial<ModelGenerationResponse>> = [];
  private customHandler?: MockResponseHandler;
  public recordedRequests: ModelGenerationRequest[] = [];

  constructor(options?: {
    responses?: Array<Partial<ModelGenerationResponse>>;
    handler?: MockResponseHandler;
  }) {
    if (options?.responses) {
      this.responseQueue = [...options.responses];
    }
    this.customHandler = options?.handler;
  }

  public enqueueResponse(response: Partial<ModelGenerationResponse>): void {
    this.responseQueue.push(response);
  }

  public setHandler(handler: MockResponseHandler): void {
    this.customHandler = handler;
  }

  public clear(): void {
    this.responseQueue = [];
    this.recordedRequests = [];
    this.customHandler = undefined;
  }

  public isModelAllowed(model: string): boolean {
    return isModelAllowed(model) || model.startsWith('mock/');
  }

  public getAllowlist(): ModelMetadata[] {
    return getAllowedModelsList();
  }

  public async generate(request: ModelGenerationRequest): Promise<ModelGenerationResponse> {
    this.recordedRequests.push(request);

    if (!this.isModelAllowed(request.model)) {
      throw new ModelAdapterError({
        code: 'MODEL_NOT_ALLOWED',
        message: `O modelo '${request.model}' não consta na allowlist de modelos autorizados.`,
        safeMessage: 'Modelo não autorizado pela allowlist.'
      });
    }

    let responsePartial: Partial<ModelGenerationResponse> = {};

    if (this.customHandler) {
      responsePartial = await this.customHandler(request);
    } else if (this.responseQueue.length > 0) {
      responsePartial = this.responseQueue.shift()!;
    } else {
      // Resposta padrão caso a fila esteja vazia
      responsePartial = {
        content: 'Análise determinística Housewhey gerada pelo MockModelAdapter.',
        toolCalls: undefined
      };
    }

    const promptTokens = responsePartial.metrics?.promptTokens ?? 150;
    const completionTokens = responsePartial.metrics?.completionTokens ?? 80;
    const totalTokens = promptTokens + completionTokens;
    const { costUsd, costBrl } = calculateModelCost(request.model, promptTokens, completionTokens);

    return {
      content: responsePartial.content ?? null,
      toolCalls: responsePartial.toolCalls,
      structuredOutput: responsePartial.structuredOutput,
      metrics: {
        promptTokens,
        completionTokens,
        totalTokens,
        costUsd: responsePartial.metrics?.costUsd ?? costUsd,
        costBrl: responsePartial.metrics?.costBrl ?? costBrl,
        latencyMs: responsePartial.metrics?.latencyMs ?? 15,
        finishReason:
          responsePartial.metrics?.finishReason ??
          (responsePartial.toolCalls ? 'tool_calls' : 'stop')
      },
      modelUsed: responsePartial.modelUsed ?? request.model
    };
  }

  public async generateStructured<T>(
    request: ModelGenerationRequest,
    schema: z.ZodType<T>
  ): Promise<{ output: T; response: ModelGenerationResponse }> {
    const response = await this.generate({
      ...request,
      responseFormat: { type: 'json_object' }
    });

    if (!response.content) {
      throw new ModelAdapterError({
        code: 'INVALID_STRUCTURED_OUTPUT',
        message: 'O modelo mock retornou conteúdo nulo ou vazio.',
        safeMessage: 'Falha na obtenção de saída estruturada do modelo.'
      });
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(response.content);
    } catch {
      throw new ModelAdapterError({
        code: 'INVALID_STRUCTURED_OUTPUT',
        message: `JSON inválido no mock: ${response.content}`,
        safeMessage: 'A saída retornada pelo modelo contém JSON corrompido.'
      });
    }

    const validation = schema.safeParse(parsedJson);
    if (!validation.success) {
      const issues = validation.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
      throw new ModelAdapterError({
        code: 'INVALID_STRUCTURED_OUTPUT',
        message: `Validação Zod de saída estruturada falhou: ${issues}`,
        safeMessage: `A estrutura gerada pelo modelo não atende ao schema (${issues}).`
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
}
