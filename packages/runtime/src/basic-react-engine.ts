import { randomUUID } from 'node:crypto';
import { TaskContract } from '@adzhub/contracts';
import { GovernedTool } from '@adzhub/tools';
import { ChatMessage, ModelAdapter, ToolCallRequest } from './model-adapter-interface.js';
import { buildBaseSystemPrompt } from './system-prompt.js';

export interface BasicReactToolCallRecord {
  toolCallId: string;
  toolName: string;
  input: unknown;
  output: unknown;
  ok: boolean;
  executionTimeMs: number;
  error?: string;
}

export interface BasicReactStep {
  stepIndex: number;
  thought: string | null;
  toolCalls: BasicReactToolCallRecord[];
  tokens: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: {
    costUsd: number;
    costBrl: number;
  };
  latencyMs: number;
  timestamp: string;
}

export interface BasicReactRunMetrics {
  totalSteps: number;
  totalToolCalls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  totalCostBrl: number;
  totalLatencyMs: number;
  durationMs: number;
}

export interface BasicReactRunOptions {
  taskContract: TaskContract;
  modelAdapter: ModelAdapter;
  model?: string;
  tools: GovernedTool<any, any>[];
  apiKey?: string;
  maxSteps?: number;
  onStep?: (step: BasicReactStep) => void;
  signal?: AbortSignal;
}

export interface BasicReactRunResult {
  runId: string;
  taskId: string;
  clientId: string;
  tenantId: string;
  mode: 'BASIC_REACT';
  status: 'COMPLETED' | 'FAILED' | 'MAX_STEPS_EXCEEDED' | 'CANCELLED';
  finalOutput: string;
  trace: BasicReactStep[];
  metrics: BasicReactRunMetrics;
  taskContract: TaskContract;
  verified: false;
  evidenceCoverage: null;
  error?: string;
}

/**
 * Motor executor do baseline ingênuo Basic/ReAct.
 * Executa tarefas iterando pensamentos e chamadas de ferramentas de forma direta,
 * registrando traces mínimos para comparação com o modo governado PEV-C,
 * sem invocar verificadores silenciosos.
 */
export class BasicReactEngine {
  public async execute(options: BasicReactRunOptions): Promise<BasicReactRunResult> {
    const startTime = performance.now();
    const runId = `run_react_${randomUUID().slice(0, 8)}`;
    const { taskContract, modelAdapter } = options;
    const model = options.model ?? 'openai/gpt-4o-mini';

    // 1. Filtragem estrita de ferramentas autorizadas pelo TaskContract
    const allowedEffectsSet = new Set(taskContract.effects.allowed);
    const availableTools = options.tools.filter((t) => allowedEffectsSet.has(t.effect));
    const openAiTools = availableTools.map((t) => t.toOpenAISchema());

    // 2. Construção do System Prompt Base unificado
    const systemPrompt = buildBaseSystemPrompt(taskContract);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: taskContract.goal }
    ];

    const maxSteps = options.maxSteps ?? taskContract.budgets?.maxSteps ?? 10;
    const trace: BasicReactStep[] = [];

    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalCostUsd = 0;
    let totalCostBrl = 0;
    let totalLatencyMs = 0;
    let totalToolCallsCount = 0;
    let finalOutput = '';
    let status: BasicReactRunResult['status'] = 'COMPLETED';
    let errorMessage: string | undefined = undefined;

    try {
      for (let step = 1; step <= maxSteps; step++) {
        if (options.signal?.aborted) {
          status = 'CANCELLED';
          errorMessage = 'Execução cancelada pelo usuário via AbortSignal.';
          break;
        }

        // 3. Chamada ao Modelo LLM (OpenRouter / Mock)
        const response = await modelAdapter.generate({
          model,
          messages,
          tools: openAiTools.length > 0 ? openAiTools : undefined,
          apiKey: options.apiKey,
          signal: options.signal,
          temperature: 0.2
        });

        totalPromptTokens += response.metrics.promptTokens;
        totalCompletionTokens += response.metrics.completionTokens;
        totalCostUsd =
          Math.round((totalCostUsd + response.metrics.costUsd) * 1_000_000) / 1_000_000;
        totalCostBrl = Math.round((totalCostBrl + response.metrics.costBrl) * 100_000) / 100_000;
        totalLatencyMs += response.metrics.latencyMs;

        const stepRecord: BasicReactStep = {
          stepIndex: step,
          thought: response.content,
          toolCalls: [],
          tokens: {
            promptTokens: response.metrics.promptTokens,
            completionTokens: response.metrics.completionTokens,
            totalTokens: response.metrics.totalTokens
          },
          cost: {
            costUsd: response.metrics.costUsd,
            costBrl: response.metrics.costBrl
          },
          latencyMs: response.metrics.latencyMs,
          timestamp: new Date().toISOString()
        };

        const toolCalls: ToolCallRequest[] = response.toolCalls ?? [];

        // 4. Execução de Ferramentas Solicitadas (Actions)
        if (toolCalls.length > 0) {
          totalToolCallsCount += toolCalls.length;

          // Adiciona a resposta do assistente ao histórico
          messages.push({
            role: 'assistant',
            content: response.content,
            tool_calls: toolCalls
          });

          for (const tc of toolCalls) {
            const toolName = tc.function.name;
            const targetTool = availableTools.find((t) => t.name === toolName);

            let parsedArgs: unknown = {};
            try {
              parsedArgs = JSON.parse(tc.function.arguments || '{}');
            } catch {
              parsedArgs = {};
            }

            if (!targetTool) {
              const notFoundResult = {
                ok: false,
                error: `A ferramenta '${toolName}' não está autorizada nos effects do contrato ou não existe.`
              };

              stepRecord.toolCalls.push({
                toolCallId: tc.id,
                toolName,
                input: parsedArgs,
                output: notFoundResult,
                ok: false,
                executionTimeMs: 0,
                error: notFoundResult.error
              });

              messages.push({
                role: 'tool',
                tool_call_id: tc.id,
                name: toolName,
                content: JSON.stringify(notFoundResult)
              });
              continue;
            }

            const toolExecutionResult = await targetTool.execute(parsedArgs, {
              taskId: taskContract.taskId,
              runId,
              correlationId: runId,
              toolCallId: tc.id,
              signal: options.signal
            });

            stepRecord.toolCalls.push({
              toolCallId: tc.id,
              toolName,
              input: parsedArgs,
              output: toolExecutionResult.ok ? toolExecutionResult.data : toolExecutionResult.error,
              ok: toolExecutionResult.ok,
              executionTimeMs: toolExecutionResult.executionTimeMs,
              error: toolExecutionResult.ok ? undefined : toolExecutionResult.error
            });

            messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              name: toolName,
              content: JSON.stringify(
                toolExecutionResult.ok
                  ? toolExecutionResult.data
                  : { ok: false, error: toolExecutionResult.error }
              )
            });
          }

          trace.push(stepRecord);
          options.onStep?.(stepRecord);
        } else {
          // 5. Conclusão Final do Raciocínio (Sem chamadas de ferramentas)
          finalOutput = response.content ?? '';
          trace.push(stepRecord);
          options.onStep?.(stepRecord);
          status = 'COMPLETED';
          break;
        }

        if (step === maxSteps && status === 'COMPLETED' && toolCalls.length > 0) {
          status = 'MAX_STEPS_EXCEEDED';
          finalOutput = response.content ?? 'Limite máximo de passos excedido.';
        }
      }
    } catch (err: unknown) {
      status = 'FAILED';
      errorMessage =
        err instanceof Error ? err.message : 'Falha desconhecida na execução do baseline ReAct.';
    }

    const durationMs = Math.round(performance.now() - startTime);

    return {
      runId,
      taskId: taskContract.taskId,
      clientId: taskContract.clientId,
      tenantId: taskContract.tenantId,
      mode: 'BASIC_REACT',
      status,
      finalOutput,
      trace,
      metrics: {
        totalSteps: trace.length,
        totalToolCalls: totalToolCallsCount,
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        totalTokens: totalPromptTokens + totalCompletionTokens,
        totalCostUsd,
        totalCostBrl,
        totalLatencyMs,
        durationMs
      },
      taskContract,
      verified: false,
      evidenceCoverage: null,
      error: errorMessage
    };
  }
}
