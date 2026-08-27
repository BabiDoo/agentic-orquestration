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

export interface GoogleGeminiAdapterOptions {
  defaultApiKey?: string;
  baseUrl?: string;
  defaultTimeoutMs?: number;
  fetchFn?: typeof fetch;
}

export class GoogleGeminiAdapter implements ModelAdapter {
  private readonly defaultApiKey?: string;
  public readonly baseUrl: string;
  private readonly defaultTimeoutMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(options: GoogleGeminiAdapterOptions = {}) {
    this.defaultApiKey = options.defaultApiKey;
    this.baseUrl = options.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta';
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 30000;
    this.fetchFn = options.fetchFn ?? globalThis.fetch;
  }

  public isModelAllowed(model: string): boolean {
    return isModelAllowed(model) || model.includes('gemini');
  }

  public getAllowlist(): ModelMetadata[] {
    return getAllowedModelsList();
  }

  private normalizeGeminiModel(model: string): string {
    const clean = model.replace('google/', '').trim();
    if (clean === 'gemini-2.5-flash' || clean === 'gemini-2.0-flash' || clean === 'gemini-2.0-flash-001') {
      return 'gemini-2.5-flash';
    }
    if (clean === 'gemini-1.5-flash' || clean === 'gemini-1.5-flash-001' || clean === 'gemini-1.5-flash-002') {
      return 'gemini-1.5-flash';
    }
    if (clean === 'gemini-1.5-pro' || clean === 'gemini-1.5-pro-001' || clean === 'gemini-1.5-pro-002') {
      return 'gemini-1.5-pro';
    }
    if (clean === 'gemini-2.5-pro' || clean === 'gemini-2.5-pro-001') {
      return 'gemini-2.5-pro';
    }
    if (!clean.startsWith('gemini-')) {
      return 'gemini-2.5-flash';
    }
    return clean;
  }

  public async generate(request: ModelGenerationRequest): Promise<ModelGenerationResponse> {
    const apiKey = (request.apiKey || this.defaultApiKey)?.trim();
    if (!apiKey) {
      throw new ModelAdapterError({
        code: 'MODEL_UNAUTHORIZED',
        message: 'Chave de API do Google Gemini não fornecida.',
        safeMessage:
          'Chave de API do Google Gemini não informada. Forneça uma chave válida do Google AI Studio (AIzaSy...).'
      });
    }

    const timeoutMs = request.timeoutMs ?? this.defaultTimeoutMs;
    const abortController = new AbortController();

    const activeSignal = request.signal
      ? this.combineSignals(request.signal, abortController.signal)
      : abortController.signal;

    const timeoutTimer = setTimeout(() => {
      abortController.abort(new Error('TIMEOUT_TRIGGERED'));
    }, timeoutMs);

    const startTime = performance.now();

    // 0. Detecção inteligente de chave OpenRouter enviada por engano para o Gemini Adapter
    if (apiKey.startsWith('sk-or') || apiKey.startsWith('sk-')) {
      try {
        console.log('[GoogleGeminiAdapter] Chave OpenRouter detectada (sk-...). Roteando para OpenRouter API...');
        let fullPromptText = '';
        for (const msg of request.messages) {
          if (msg.role === 'system') {
            fullPromptText += `[DIRETRIZ DO SISTEMA]:\n${msg.content || ''}\n\n`;
          } else if (msg.role === 'user') {
            fullPromptText += `[MENSAGEM DO USUÁRIO]:\n${msg.content || ''}\n\n`;
          } else if (msg.role === 'assistant') {
            fullPromptText += `[RESPOSTA ANTERIOR]:\n${msg.content || ''}\n\n`;
          }
        }

        const orModel = request.model.startsWith('google/') ? request.model : `google/${request.model}`;
        const orRes = await this.fetchFn('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://adzhub.ai',
            'X-Title': 'AdzHub PEV-C Microkernel',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: orModel === 'google/gemini-2.5-flash' ? 'google/gemini-2.0-flash-001' : orModel,
            messages: [{ role: 'user', content: fullPromptText }]
          }),
          signal: activeSignal
        });

        if (orRes.ok) {
          clearTimeout(timeoutTimer);
          const latencyMs = Math.round(performance.now() - startTime);
          const orData = (await orRes.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
            usage?: { prompt_tokens?: number; completion_tokens?: number };
          };

          return {
            content: orData.choices?.[0]?.message?.content ?? null,
            modelUsed: `openrouter/${orModel}`,
            metrics: {
              promptTokens: orData.usage?.prompt_tokens ?? 200,
              completionTokens: orData.usage?.completion_tokens ?? 400,
              totalTokens: (orData.usage?.prompt_tokens ?? 200) + (orData.usage?.completion_tokens ?? 400),
              costUsd: 0.001,
              costBrl: 0.0055,
              latencyMs,
              finishReason: 'stop'
            }
          };
        }
      } catch (orDirectErr) {
        console.warn('[GoogleGeminiAdapter] Roteamento direto OpenRouter falhou:', orDirectErr);
      }
    }

    const targetModel = this.normalizeGeminiModel(request.model);

    try {
      console.log(`[GoogleGeminiAdapter] Chamando Google Gemini API (${targetModel})...`);

      let fullPromptText = '';
      for (const msg of request.messages) {
        if (msg.role === 'system') {
          fullPromptText += `[DIRETRIZ DO SISTEMA]:\n${msg.content || ''}\n\n`;
        } else if (msg.role === 'user') {
          fullPromptText += `[MENSAGEM DO USUÁRIO]:\n${msg.content || ''}\n\n`;
        } else if (msg.role === 'assistant') {
          fullPromptText += `[RESPOSTA ANTERIOR]:\n${msg.content || ''}\n\n`;
        }
      }

      const nativePayload = {
        contents: [
          {
            parts: [{ text: fullPromptText.trim() || 'Olá' }]
          }
        ],
        generationConfig: {
          temperature: request.temperature ?? 0.3,
          maxOutputTokens: request.maxTokens ?? 4096
        }
      };

      // 1. Modelos candidatos modernos e suportados (sem gemini-pro obsoleto)
      const candidateModels = [
        targetModel,
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-2.5-pro',
        'gemini-1.5-pro',
        'gemini-2.0-flash-001',
        'gemini-1.5-flash-latest',
        'gemini-1.5-pro-latest'
      ];

      // Remove duplicatas mantendo a ordem
      const uniqueCandidates = Array.from(new Set(candidateModels));
      let lastErrorText = '';
      let lastStatus = 500;
      let primaryErrorText = '';

      for (const candidate of uniqueCandidates) {
        for (const apiVersion of ['v1beta', 'v1']) {
          const candidateUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models/${candidate}:generateContent?key=${encodeURIComponent(apiKey)}`;
          try {
            const res = await this.fetchFn(candidateUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
              },
              body: JSON.stringify(nativePayload),
              signal: activeSignal
            });

            if (res.ok) {
              clearTimeout(timeoutTimer);
              const latencyMs = Math.round(performance.now() - startTime);
              const nativeData = (await res.json()) as {
                candidates?: Array<{
                  content?: { parts?: Array<{ text?: string }> };
                  finishReason?: string;
                }>;
                usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
              };

              const candidateObj = nativeData.candidates?.[0];
              const textOutput = candidateObj?.content?.parts?.map((p) => p.text || '').join('') ?? null;
              const promptTokens = nativeData.usageMetadata?.promptTokenCount ?? 200;
              const completionTokens = nativeData.usageMetadata?.candidatesTokenCount ?? 400;
              const cost = calculateModelCost(request.model, promptTokens, completionTokens);

              const rawFinish = candidateObj?.finishReason;
              let finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error' = 'stop';
              if (rawFinish === 'MAX_TOKENS') {
                finishReason = 'length';
              } else if (rawFinish === 'SAFETY' || rawFinish === 'RECITATION') {
                finishReason = 'content_filter';
              }

              console.log(`[GoogleGeminiAdapter] Sucesso com ${candidate} (${apiVersion}, ${latencyMs}ms, finishReason: ${finishReason})!`);
              return {
                content: textOutput,
                modelUsed: candidate,
                metrics: {
                  promptTokens,
                  completionTokens,
                  totalTokens: promptTokens + completionTokens,
                  costUsd: cost.costUsd,
                  costBrl: cost.costBrl,
                  latencyMs,
                  finishReason
                }
              };
            } else {
              const errBody = await res.text();
              lastStatus = res.status;
              lastErrorText = errBody;
              if (candidate === targetModel && !primaryErrorText) {
                primaryErrorText = errBody;
              }
              console.warn(`[GoogleGeminiAdapter] ${candidate} (${apiVersion}) retornou ${res.status}`);
            }
          } catch (fetchErr: unknown) {
            console.warn(`[GoogleGeminiAdapter] Erro ao tentar ${candidate} (${apiVersion}):`, fetchErr);
          }
        }
      }

      // 2. Se nenhum modelo candidato funcionou, consultar ListModels para descobrir os modelos disponíveis na conta
      try {
        console.log('[GoogleGeminiAdapter] Consultando ModelService.ListModels para descobrir modelos ativos...');
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
        const listRes = await this.fetchFn(listUrl, {
          method: 'GET',
          headers: { 'x-goog-api-key': apiKey },
          signal: activeSignal
        });

        if (listRes.ok) {
          const listData = (await listRes.json()) as {
            models?: Array<{ name: string; supportedGenerationMethods?: string[] }>;
          };

          const availableModel = listData.models?.find(
            (m) =>
              m.supportedGenerationMethods?.includes('generateContent') &&
              m.name.includes('gemini')
          );

          if (availableModel) {
            const discoveredName = availableModel.name.replace('models/', '');
            console.log(`[GoogleGeminiAdapter] Modelo descoberto via ListModels: ${discoveredName}`);
            const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${discoveredName}:generateContent?key=${encodeURIComponent(apiKey)}`;
            const directRes = await this.fetchFn(directUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
              },
              body: JSON.stringify(nativePayload),
              signal: activeSignal
            });

            if (directRes.ok) {
              clearTimeout(timeoutTimer);
              const latencyMs = Math.round(performance.now() - startTime);
              const nativeData = (await directRes.json()) as {
                candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
                usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
              };

              const textOutput = nativeData.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') ?? null;
              const promptTokens = nativeData.usageMetadata?.promptTokenCount ?? 200;
              const completionTokens = nativeData.usageMetadata?.candidatesTokenCount ?? 400;
              const cost = calculateModelCost(request.model, promptTokens, completionTokens);

              return {
                content: textOutput,
                modelUsed: discoveredName,
                metrics: {
                  promptTokens,
                  completionTokens,
                  totalTokens: promptTokens + completionTokens,
                  costUsd: cost.costUsd,
                  costBrl: cost.costBrl,
                  latencyMs,
                  finishReason: 'stop'
                }
              };
            }
          }
        }
      } catch (listErr: unknown) {
        console.warn('[GoogleGeminiAdapter] ListModels falhou:', listErr);
      }

      // 3. Fallback OpenRouter: Caso a chave seja compatível com OpenRouter
      try {
        console.log('[GoogleGeminiAdapter] Tentando rota OpenRouter como último fallback...');
        const orRes = await this.fetchFn('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://adzhub.ai',
            'X-Title': 'AdzHub PEV-C Microkernel',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.0-flash-001',
            messages: [{ role: 'user', content: fullPromptText }]
          }),
          signal: activeSignal
        });

        if (orRes.ok) {
          clearTimeout(timeoutTimer);
          const latencyMs = Math.round(performance.now() - startTime);
          const orData = (await orRes.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
            usage?: { prompt_tokens?: number; completion_tokens?: number };
          };

          return {
            content: orData.choices?.[0]?.message?.content ?? null,
            modelUsed: 'openrouter/google/gemini-2.0-flash-001',
            metrics: {
              promptTokens: orData.usage?.prompt_tokens ?? 200,
              completionTokens: orData.usage?.completion_tokens ?? 400,
              totalTokens: (orData.usage?.prompt_tokens ?? 200) + (orData.usage?.completion_tokens ?? 400),
              costUsd: 0.001,
              costBrl: 0.0055,
              latencyMs,
              finishReason: 'stop'
            }
          };
        }
      } catch (orErr: unknown) {
        console.warn('[GoogleGeminiAdapter] Fallback OpenRouter falhou:', orErr);
      }

      clearTimeout(timeoutTimer);
      const reportedError = primaryErrorText || lastErrorText || 'Modelo não encontrado ou chave inválida';
      throw new ModelAdapterError({
        code: (lastStatus === 401 || lastStatus === 403) ? 'MODEL_UNAUTHORIZED' : 'MODEL_UPSTREAM_ERROR',
        message: `Erro Google Gemini (${lastStatus}): ${reportedError}`,
        safeMessage: `Erro na API do Google Gemini (${lastStatus}): ${reportedError.slice(0, 150)}`,
        status: lastStatus
      });
    } catch (err: unknown) {
      clearTimeout(timeoutTimer);
      if (err instanceof ModelAdapterError) throw err;
      if (err instanceof Error && (err.name === 'AbortError' || err.message === 'TIMEOUT_TRIGGERED')) {
        throw new ModelAdapterError({
          code: 'MODEL_TIMEOUT',
          message: `Timeout ao aguardar resposta do Google Gemini (${timeoutMs}ms).`,
          safeMessage: 'A requisição ao Google Gemini excedeu o limite de tempo estipulado.',
          isRetryable: true
        });
      }
      throw new ModelAdapterError({
        code: 'MODEL_UPSTREAM_ERROR',
        message: err instanceof Error ? err.message : String(err),
        safeMessage: 'Falha de comunicação com a API do Google Gemini.'
      });
    }
  }

  public async generateStructured<T>(
    request: ModelGenerationRequest,
    schema: z.ZodType<T>
  ): Promise<{ output: T; response: ModelGenerationResponse }> {
    const rawResponse = await this.generate({
      ...request,
      responseFormat: { type: 'json_object' }
    });

    if (!rawResponse.content) {
      throw new ModelAdapterError({
        code: 'INVALID_STRUCTURED_OUTPUT',
        message: 'Google Gemini retornou conteúdo nulo para structured output.'
      });
    }

    try {
      const parsedJson = JSON.parse(rawResponse.content);
      const validated = schema.parse(parsedJson);
      return { output: validated, response: rawResponse };
    } catch (err: unknown) {
      throw new ModelAdapterError({
        code: 'INVALID_STRUCTURED_OUTPUT',
        message: `Falha ao validar JSON contra o schema Zod: ${err instanceof Error ? err.message : String(err)}`
      });
    }
  }

  private combineSignals(userSignal: AbortSignal, internalSignal: AbortSignal): AbortSignal {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    userSignal.addEventListener('abort', onAbort, { once: true });
    internalSignal.addEventListener('abort', onAbort, { once: true });
    return controller.signal;
  }
}
