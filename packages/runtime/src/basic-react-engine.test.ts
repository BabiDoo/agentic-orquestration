import { describe, expect, it } from 'vitest';
import { TaskContract } from '@adzhub/contracts';
import { createAppTools, createMarketingTools, createMemoryTools } from '@adzhub/tools';
import { BasicReactEngine, MockModelAdapter, buildBaseSystemPrompt } from './index.js';

describe('Basic/ReAct Baseline Engine (M2-07)', () => {
  const timeframe = {
    since: '2026-08-01T00:00:00.000Z',
    until: '2026-08-20T23:59:59.000Z',
    timezone: 'America/Sao_Paulo'
  };

  const s0Contract: TaskContract = {
    schemaVersion: '1.0.0',
    taskId: 'task_s0_housewhey_analysis',
    clientId: 'cli_housewhey',
    tenantId: 'hub_spot',
    goal: 'Analisar performance de criativos e reconciliar Meta Ads com vendas reais no CRM',
    timeframe,
    effects: {
      allowed: ['read:memory', 'read:meta', 'read:crm', 'read:app'],
      forbidden: ['external_write']
    },
    budgets: {
      maxSteps: 10,
      maxToolCalls: 5,
      maxTokens: 8000,
      maxCostBrl: 2.5,
      timeoutMs: 30000
    },
    successCriteria: {
      minEvidenceCoverage: 0.8,
      requireVerifiedClaims: true
    },
    approvalPolicy: {
      externalWritesRequireApproval: true,
      autoApproveReadOnly: true
    },
    metadata: {
      scenario: 'S0',
      requester: 'Aline (Gestão de Tráfego SPOT)'
    }
  };

  // Instancia todas as ferramentas reais governadas do Monorepo
  const allTools = [
    ...Object.values(createMemoryTools()),
    ...Object.values(createMarketingTools()),
    ...Object.values(createAppTools())
  ];

  describe('buildBaseSystemPrompt', () => {
    it('constrói prompt com todas as diretrizes e dados do contrato da tarefa', () => {
      const prompt = buildBaseSystemPrompt(s0Contract);

      expect(prompt).toContain('task_s0_housewhey_analysis');
      expect(prompt).toContain('cli_housewhey');
      expect(prompt).toContain('hub_spot');
      expect(prompt).toContain('read:meta');
      expect(prompt).toContain('read:app');
      expect(prompt).toContain('DIRETRIZES METODOLÓGICAS DE EXECUÇÃO');
    });
  });

  describe('Execução Ponta a Ponta do Cenário S0 (Housewhey Nominal)', () => {
    it('executa a cadeia ReAct completa (Thought -> list_ads -> run_app_analise_criativos -> Conclusão)', async () => {
      const mockAdapter = new MockModelAdapter();

      // Passo 1: LLM decide listar anúncios
      mockAdapter.enqueueResponse({
        content:
          'Pensamento ReAct: Preciso primeiro inspecionar os anúncios ativos do cliente Housewhey.',
        toolCalls: [
          {
            id: 'call_meta_list_01',
            type: 'function',
            function: {
              name: 'list_ads',
              arguments: JSON.stringify({
                client_id: 'cli_housewhey',
                since: timeframe.since,
                until: timeframe.until
              })
            }
          }
        ],
        metrics: {
          promptTokens: 300,
          completionTokens: 50,
          totalTokens: 350,
          costUsd: 0.0005,
          costBrl: 0.00275,
          latencyMs: 30,
          finishReason: 'tool_calls'
        }
      });

      // Passo 2: LLM decide rodar o App de Análise de Criativos
      mockAdapter.enqueueResponse({
        content:
          'Pensamento ReAct: Anúncios obtidos. Agora vou executar a análise profunda de criativos com reconciliação de vendas.',
        toolCalls: [
          {
            id: 'call_app_creative_02',
            type: 'function',
            function: {
              name: 'run_app_analise_criativos',
              arguments: JSON.stringify({
                client_id: 'cli_housewhey',
                timeframe,
                benchmark_cpa_brl: 85.0
              })
            }
          }
        ],
        metrics: {
          promptTokens: 850,
          completionTokens: 80,
          totalTokens: 930,
          costUsd: 0.0012,
          costBrl: 0.0066,
          latencyMs: 45,
          finishReason: 'tool_calls'
        }
      });

      // Passo 3: LLM finaliza com parecer técnico fundamentado
      mockAdapter.enqueueResponse({
        content: `Diagnóstico Técnico Final (S0 Housewhey):
- Top Performer: Anúncio ad_whey_baunilha_01 apresentou excelente retenção e ROAS sustentável, sendo recomendado para ESCALA.
- Queima Crítica de Verba: Anúncio ad_namorados_casal_03 saturou, atingindo CPA elevado no CRM, sendo recomendada sua PAUSA imediata.
- Cobertura de Join: 100% dos eventos reconciliados com sucesso.`,
        toolCalls: undefined,
        metrics: {
          promptTokens: 1400,
          completionTokens: 120,
          totalTokens: 1520,
          costUsd: 0.0018,
          costBrl: 0.0099,
          latencyMs: 60,
          finishReason: 'stop'
        }
      });

      const engine = new BasicReactEngine();
      const stepEvents: number[] = [];

      const result = await engine.execute({
        taskContract: s0Contract,
        modelAdapter: mockAdapter,
        model: 'mock/test-model',
        tools: allTools,
        onStep: (step) => {
          stepEvents.push(step.stepIndex);
        }
      });

      // 1. Verificação de status e contrato
      expect(result.status).toBe('COMPLETED');
      expect(result.mode).toBe('BASIC_REACT');
      expect(result.taskId).toBe('task_s0_housewhey_analysis');
      expect(result.clientId).toBe('cli_housewhey');

      // 2. Não chama verificadores PEV-C silenciosamente
      expect(result.verified).toBe(false);
      expect(result.evidenceCoverage).toBeNull();

      // 3. Trace e steps registrados
      expect(result.trace).toHaveLength(3);
      expect(stepEvents).toEqual([1, 2, 3]);

      // Checa detalhes do step 1 (list_ads)
      const step1 = result.trace[0]!;
      expect(step1.thought).toContain('inspecionar os anúncios');
      expect(step1.toolCalls).toHaveLength(1);
      expect(step1.toolCalls[0]?.toolName).toBe('list_ads');
      expect(step1.toolCalls[0]?.ok).toBe(true);

      // Checa detalhes do step 2 (run_app_analise_criativos)
      const step2 = result.trace[1]!;
      expect(step2.thought).toContain('análise profunda de criativos');
      expect(step2.toolCalls).toHaveLength(1);
      expect(step2.toolCalls[0]?.toolName).toBe('run_app_analise_criativos');
      expect(step2.toolCalls[0]?.ok).toBe(true);

      // Checa step 3 (conclusão textual)
      const step3 = result.trace[2]!;
      expect(step3.thought).toContain('Diagnóstico Técnico Final');
      expect(step3.toolCalls).toHaveLength(0);

      // 4. Métricas agregadas
      expect(result.metrics.totalSteps).toBe(3);
      expect(result.metrics.totalToolCalls).toBe(2);
      expect(result.metrics.totalTokens).toBe(2800);
      expect(result.metrics.totalCostUsd).toBeGreaterThan(0);
      expect(result.metrics.totalCostBrl).toBeGreaterThan(0);
      expect(result.metrics.totalLatencyMs).toBe(135);
      expect(result.metrics.durationMs).toBeGreaterThanOrEqual(0);

      // 5. Saída final
      expect(result.finalOutput).toContain('Top Performer');
      expect(result.finalOutput).toContain('ad_namorados_casal_03');
    });

    it('rejeita chamadas a ferramentas não autorizadas no effects.allowed do contrato', async () => {
      // Contrato restrito que só permite read:memory
      const memoryOnlyContract: TaskContract = {
        ...s0Contract,
        effects: {
          allowed: ['read:memory']
        }
      };

      const mockAdapter = new MockModelAdapter();

      // LLM tenta chamar list_ads (que exige read:meta)
      mockAdapter.enqueueResponse({
        content: 'Tentando listar anúncios...',
        toolCalls: [
          {
            id: 'call_unauthorized_01',
            type: 'function',
            function: {
              name: 'list_ads',
              arguments: JSON.stringify({ client_id: 'cli_housewhey', timeframe })
            }
          }
        ]
      });

      // Em seguida desiste e conclui
      mockAdapter.enqueueResponse({
        content: 'Não tenho permissão para acessar os anúncios Meta.',
        toolCalls: undefined
      });

      const engine = new BasicReactEngine();
      const result = await engine.execute({
        taskContract: memoryOnlyContract,
        modelAdapter: mockAdapter,
        tools: allTools
      });

      expect(result.status).toBe('COMPLETED');
      expect(result.trace).toHaveLength(2);

      const step1 = result.trace[0]!;
      expect(step1.toolCalls[0]?.ok).toBe(false);
      expect(step1.toolCalls[0]?.error).toContain('não está autorizada');
    });

    it('interrompe a execução com MAX_STEPS_EXCEEDED quando atinge o limite de passos', async () => {
      const tightContract: TaskContract = {
        ...s0Contract,
        budgets: {
          ...s0Contract.budgets,
          maxSteps: 2
        }
      };

      const mockAdapter = new MockModelAdapter();
      // Sempre gera tool calls sem nunca concluir
      mockAdapter.setHandler(() => ({
        content: 'Loop infinito de tool calls...',
        toolCalls: [
          {
            id: 'call_loop',
            type: 'function',
            function: {
              name: 'search_client_context',
              arguments: JSON.stringify({ client_id: 'cli_housewhey', query: 'teste' })
            }
          }
        ]
      }));

      const engine = new BasicReactEngine();
      const result = await engine.execute({
        taskContract: tightContract,
        modelAdapter: mockAdapter,
        tools: allTools,
        maxSteps: 2
      });

      expect(result.status).toBe('MAX_STEPS_EXCEEDED');
      expect(result.trace).toHaveLength(2);
    });

    it('cancela a execução de forma limpa quando o AbortSignal é disparado', async () => {
      const abortController = new AbortController();
      const mockAdapter = new MockModelAdapter();

      mockAdapter.setHandler(() => {
        abortController.abort();
        return {
          content: 'Processando...',
          toolCalls: [
            {
              id: 'call_1',
              type: 'function',
              function: {
                name: 'search_client_context',
                arguments: JSON.stringify({ client_id: 'cli_housewhey', query: 'teste' })
              }
            }
          ]
        };
      });

      const engine = new BasicReactEngine();
      const result = await engine.execute({
        taskContract: s0Contract,
        modelAdapter: mockAdapter,
        tools: allTools,
        signal: abortController.signal
      });

      expect(result.status).toBe('CANCELLED');
      expect(result.error).toContain('cancelada');
    });
  });
});
