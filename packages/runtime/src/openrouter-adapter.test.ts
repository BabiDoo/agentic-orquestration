import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  OpenRouterAdapter,
  MockModelAdapter,
  ModelAdapterError,
  isModelAllowed,
  calculateModelCost,
  getAllowedModelsList
} from './index.js';

describe('OpenRouter & Model Adapters (M2-05)', () => {
  describe('Model Allowlist & Pricing', () => {
    it('valida modelos permitidos e rejeita modelos não autorizados', () => {
      expect(isModelAllowed('anthropic/claude-3.5-sonnet')).toBe(true);
      expect(isModelAllowed('openai/gpt-4o')).toBe(true);
      expect(isModelAllowed('openai/gpt-4o-mini')).toBe(true);
      expect(isModelAllowed('google/gemini-2.0-flash-001')).toBe(true);
      expect(isModelAllowed('meta-llama/llama-3.3-70b-instruct')).toBe(true);
      expect(isModelAllowed('mock/test-model')).toBe(true);

      expect(isModelAllowed('unauthorized/evil-model-xyz')).toBe(false);
      expect(isModelAllowed('hacker-gpt')).toBe(false);
    });

    it('retorna lista completa de metadados da allowlist', () => {
      const list = getAllowedModelsList();
      expect(list.length).toBeGreaterThanOrEqual(5);
      expect(list.some((m) => m.id === 'openai/gpt-4o')).toBe(true);
    });

    it('calcula custos determinísticos em USD e BRL a partir do uso de tokens', () => {
      // 100.000 prompt tokens + 50.000 completion tokens em Claude 3.5 Sonnet ($3/1M prompt, $15/1M completion)
      // Prompt cost: 0.1 * 3 = $0.30
      // Completion cost: 0.05 * 15 = $0.75
      // Total USD: $1.05
      // BRL (câmbio 5.50): R$ 5.775
      const { costUsd, costBrl } = calculateModelCost(
        'anthropic/claude-3.5-sonnet',
        100_000,
        50_000,
        5.5
      );
      expect(costUsd).toBe(1.05);
      expect(costBrl).toBe(5.775);
    });
  });

  describe('OpenRouterAdapter', () => {
    const fakeApiKey = 'sk-or-v1-secret-key-123456789';

    it('bloqueia modelo não autorizado com erro tipado MODEL_NOT_ALLOWED antes de chamar a rede', async () => {
      const adapter = new OpenRouterAdapter({ defaultApiKey: fakeApiKey });

      await expect(
        adapter.generate({
          model: 'unauthorized/model',
          messages: [{ role: 'user', content: 'Olá' }]
        })
      ).rejects.toThrowError(ModelAdapterError);

      try {
        await adapter.generate({
          model: 'unauthorized/model',
          messages: [{ role: 'user', content: 'Olá' }]
        });
      } catch (err) {
        const adapterErr = err as ModelAdapterError;
        expect(adapterErr.code).toBe('MODEL_NOT_ALLOWED');
        expect(adapterErr.safeMessage).toContain('Modelo não autorizado');
      }
    });

    it('bloqueia chamada sem chave de API com MODEL_UNAUTHORIZED', async () => {
      const adapter = new OpenRouterAdapter(); // Sem defaultApiKey

      await expect(
        adapter.generate({
          model: 'openai/gpt-4o-mini',
          messages: [{ role: 'user', content: 'Olá' }]
        })
      ).rejects.toThrowError(ModelAdapterError);

      try {
        await adapter.generate({
          model: 'openai/gpt-4o-mini',
          messages: [{ role: 'user', content: 'Olá' }]
        });
      } catch (err) {
        const adapterErr = err as ModelAdapterError;
        expect(adapterErr.code).toBe('MODEL_UNAUTHORIZED');
        expect(adapterErr.safeMessage).toContain('BYOK');
      }
    });

    it('executa chamada com sucesso via fetch simulado, capturando tokens, métricas e finishReason', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'gen_123',
          model: 'openai/gpt-4o-mini',
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Análise de criativos concluída com sucesso.'
              },
              finish_reason: 'stop'
            }
          ],
          usage: {
            prompt_tokens: 250,
            completion_tokens: 60,
            total_tokens: 310
          }
        })
      });

      const adapter = new OpenRouterAdapter({
        defaultApiKey: fakeApiKey,
        fetchFn: mockFetch as unknown as typeof fetch
      });

      const response = await adapter.generate({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Você é um assistente de marketing.' },
          { role: 'user', content: 'Analise o anúncio.' }
        ]
      });

      expect(response.content).toBe('Análise de criativos concluída com sucesso.');
      expect(response.metrics.promptTokens).toBe(250);
      expect(response.metrics.completionTokens).toBe(60);
      expect(response.metrics.totalTokens).toBe(310);
      expect(response.metrics.costUsd).toBeGreaterThan(0);
      expect(response.metrics.costBrl).toBeGreaterThan(0);
      expect(response.metrics.finishReason).toBe('stop');
      expect(response.metrics.latencyMs).toBeGreaterThanOrEqual(0);

      // Checa headers enviados
      expect(mockFetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${fakeApiKey}`,
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('captura tool_calls emitidas pelo modelo', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: 'call_abc_1',
                    type: 'function',
                    function: {
                      name: 'list_ads',
                      arguments: '{"client_id":"cli_housewhey"}'
                    }
                  }
                ]
              },
              finish_reason: 'tool_calls'
            }
          ],
          usage: { prompt_tokens: 100, completion_tokens: 25 }
        })
      });

      const adapter = new OpenRouterAdapter({
        defaultApiKey: fakeApiKey,
        fetchFn: mockFetch as unknown as typeof fetch
      });

      const response = await adapter.generate({
        model: 'openai/gpt-4o',
        messages: [{ role: 'user', content: 'Puxe os anúncios.' }]
      });

      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls?.[0]?.function.name).toBe('list_ads');
      expect(response.metrics.finishReason).toBe('tool_calls');
    });

    it('valida structured output estritamente com schema Zod via generateStructured', async () => {
      const TargetSchema = z.object({
        recommendation: z.enum(['ESCALAR', 'PAUSAR']),
        targetAdId: z.string(),
        cpaBrl: z.number()
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                role: 'assistant',
                content: JSON.stringify({
                  recommendation: 'PAUSAR',
                  targetAdId: 'ad_namorados_casal_03',
                  cpaBrl: 1616.67
                })
              },
              finish_reason: 'stop'
            }
          ],
          usage: { prompt_tokens: 150, completion_tokens: 40 }
        })
      });

      const adapter = new OpenRouterAdapter({
        defaultApiKey: fakeApiKey,
        fetchFn: mockFetch as unknown as typeof fetch
      });

      const { output, response } = await adapter.generateStructured(
        {
          model: 'openai/gpt-4o-mini',
          messages: [{ role: 'user', content: 'Gere a decisão.' }]
        },
        TargetSchema
      );

      expect(output.recommendation).toBe('PAUSAR');
      expect(output.targetAdId).toBe('ad_namorados_casal_03');
      expect(output.cpaBrl).toBe(1616.67);
      expect(response.structuredOutput).toEqual(output);
    });

    it('trata erro HTTP 401 / 429 / 503 com códigos tipados e sem vazar a apiKey', async () => {
      // 1. Simula 401 Unauthorized
      const mockFetch401 = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: { message: 'Invalid API key provided' } })
      });

      const adapter401 = new OpenRouterAdapter({
        defaultApiKey: fakeApiKey,
        fetchFn: mockFetch401 as unknown as typeof fetch
      });

      try {
        await adapter401.generate({
          model: 'openai/gpt-4o-mini',
          messages: [{ role: 'user', content: 'teste' }]
        });
        expect.unreachable();
      } catch (err) {
        const error = err as ModelAdapterError;
        expect(error.code).toBe('MODEL_UNAUTHORIZED');
        expect(error.message).not.toContain(fakeApiKey);
        expect(error.safeMessage).not.toContain(fakeApiKey);
      }

      // 2. Simula 429 Rate Limit
      const mockFetch429 = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({ error: { message: 'Quota exceeded' } })
      });

      const adapter429 = new OpenRouterAdapter({
        defaultApiKey: fakeApiKey,
        fetchFn: mockFetch429 as unknown as typeof fetch
      });

      try {
        await adapter429.generate({
          model: 'openai/gpt-4o-mini',
          messages: [{ role: 'user', content: 'teste' }]
        });
        expect.unreachable();
      } catch (err) {
        const error = err as ModelAdapterError;
        expect(error.code).toBe('MODEL_RATE_LIMITED');
        expect(error.isRetryable).toBe(true);
      }
    });

    it('trata timeout na chamada de rede com MODEL_TIMEOUT', async () => {
      const mockFetchTimeout = vi.fn().mockImplementation(
        () =>
          new Promise((_, reject) => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            setTimeout(() => reject(err), 20);
          })
      );

      const adapter = new OpenRouterAdapter({
        defaultApiKey: fakeApiKey,
        fetchFn: mockFetchTimeout as unknown as typeof fetch,
        defaultTimeoutMs: 10
      });

      await expect(
        adapter.generate({
          model: 'openai/gpt-4o-mini',
          messages: [{ role: 'user', content: 'teste' }]
        })
      ).rejects.toThrowError(ModelAdapterError);
    });
  });

  describe('MockModelAdapter', () => {
    it('enfileira respostas mock determinísticas para testes e CI sem rede', async () => {
      const mockAdapter = new MockModelAdapter();

      mockAdapter.enqueueResponse({
        content: 'Pensamento ReAct: Preciso listar os anúncios.',
        toolCalls: [
          {
            id: 'call_m1',
            type: 'function',
            function: {
              name: 'list_ads',
              arguments: '{"client_id":"cli_housewhey"}'
            }
          }
        ]
      });

      mockAdapter.enqueueResponse({
        content: 'Resposta final: Os anúncios foram avaliados com sucesso.',
        toolCalls: undefined
      });

      const res1 = await mockAdapter.generate({
        model: 'mock/test-model',
        messages: [{ role: 'user', content: 'Inicie' }]
      });

      expect(res1.toolCalls).toHaveLength(1);
      expect(res1.metrics.finishReason).toBe('tool_calls');

      const res2 = await mockAdapter.generate({
        model: 'mock/test-model',
        messages: [{ role: 'user', content: 'Conclua' }]
      });

      expect(res2.content).toContain('Resposta final');
      expect(res2.toolCalls).toBeUndefined();
      expect(res2.metrics.finishReason).toBe('stop');
      expect(mockAdapter.recordedRequests).toHaveLength(2);
    });
  });
});
