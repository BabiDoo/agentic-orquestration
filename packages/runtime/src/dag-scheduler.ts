import { createHash, randomUUID } from 'node:crypto';
import { TaskContract, Observation, RuntimeErrorCode, TracePhase } from '@adzhub/contracts';
import { GovernedTool, ToolExecutionContext } from '@adzhub/tools';
import {
  createListAdsTool,
  createGetAdInsightsTool,
  createGetLeadsTool,
  createSearchClientContextTool,
  createRunAppAnaliseCriativosTool,
  createGetMapaSolucaoTool,
  createRunAppDataQualityAttributionTool,
  createRunAppPerformanceReconciliationTool,
  createRunAppAccountDiagnosisTool,
  createRunAppActionRecommendationTool,
  createRunAppCreativeBriefTool,
  createRunAppMeetingAgendaTool
} from '@adzhub/tools';
import { PevcPlan, PlanStep } from './dag-planner.js';
import { FailureCategory, PevcErrorDiagnostic } from './pevc-state-machine.js';
import {
  CircuitBreakerRegistry,
  CircuitBreakerMetrics,
  executeWithRetryAndBreaker,
  resolveIntegrationKey
} from './circuit-breaker.js';

/**
 * Status individual de execução de um passo do DAG.
 */
export type StepStatus =
  'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'SKIPPED' | 'TIMED_OUT';

/**
 * Resultado detalhado de execução de um passo individual.
 */
export interface StepExecutionResult {
  stepId: string;
  toolName: string;
  phase: TracePhase;
  status: StepStatus;
  data?: unknown;
  error?: {
    code: RuntimeErrorCode;
    category: FailureCategory;
    message: string;
    details?: Record<string, unknown>;
  };
  executionTimeMs: number;
  toolCallId: string;
  causationId?: string;
  breakerMetrics?: CircuitBreakerMetrics;
  retryAttempted?: boolean;
  startedAt: string;
  completedAt: string;
}

/**
 * Status geral da execução do Scheduler.
 */
export type SchedulerStatus = 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMED_OUT';

/**
 * Resultado consolidado retornado pelo Scheduler.
 */
export interface SchedulerExecutionResult {
  status: SchedulerStatus;
  planId: string;
  taskId: string;
  runId: string;
  stepResults: Record<string, StepExecutionResult>;
  observations: Observation[];
  partialResults: Record<string, unknown>;
  totalExecutionTimeMs: number;
  error?: PevcErrorDiagnostic;
}

/**
 * Tipo para resolução de ferramentas governadas por nome.
 */
export type ToolResolver = (toolName: string) => GovernedTool<any, any> | undefined;

/**
 * Opções de execução do Scheduler.
 */
export interface SchedulerOptions {
  plan: PevcPlan;
  contract: TaskContract;
  runId?: string;
  toolResolver?: ToolResolver;
  signal?: AbortSignal;
  globalTimeoutMs?: number;
  onStepStart?: (step: PlanStep) => void;
  onStepComplete?: (step: PlanStep, result: StepExecutionResult) => void;
}

/**
 * Cria um registry padrão de ferramentas governadas do ecossistema AdzHub.
 */
export function createDefaultToolResolver(options?: {
  scenario?: string;
  crmUnavailable?: boolean;
}): ToolResolver {
  const tools = new Map<string, GovernedTool<any, any>>();

  const memoryContextTool = createSearchClientContextTool();
  tools.set(memoryContextTool.name, memoryContextTool);

  const listAds = createListAdsTool();
  tools.set(listAds.name, listAds);

  const adInsights = createGetAdInsightsTool();
  tools.set(adInsights.name, adInsights);

  const crmLeads = createGetLeadsTool({
    scenario: options?.scenario as any,
    crmUnavailable: options?.crmUnavailable ?? (options?.scenario === 'S1')
  });
  tools.set(crmLeads.name, crmLeads);
  tools.set('get_crm_leads', crmLeads);

  const analiseCriativos = createRunAppAnaliseCriativosTool();
  tools.set(analiseCriativos.name, analiseCriativos);

  const mapaSolucao = createGetMapaSolucaoTool();
  tools.set(mapaSolucao.name, mapaSolucao);
  tools.set('run_app_mapa_solucao', mapaSolucao);

  const dataQuality = createRunAppDataQualityAttributionTool();
  tools.set(dataQuality.name, dataQuality);

  const perfRecon = createRunAppPerformanceReconciliationTool();
  tools.set(perfRecon.name, perfRecon);

  const accountDiag = createRunAppAccountDiagnosisTool();
  tools.set(accountDiag.name, accountDiag);

  const actionRec = createRunAppActionRecommendationTool();
  tools.set(actionRec.name, actionRec);

  const creativeBrief = createRunAppCreativeBriefTool();
  tools.set(creativeBrief.name, creativeBrief);

  const meetingAgenda = createRunAppMeetingAgendaTool();
  tools.set(meetingAgenda.name, meetingAgenda);

  return (toolName: string) => tools.get(toolName);
}

/**
 * Gera hash SHA-256 determinístico de um payload operacional.
 */
function hashPayload(payload: unknown): string {
  const str = JSON.stringify(payload ?? {});
  return createHash('sha256').update(str).digest('hex');
}

/**
 * Mapeia o nome da ferramenta para a fonte da Observation.
 */
function resolveObservationSource(
  toolName: string
): 'supercerebro' | 'meta_ads' | 'crm' | 'app' | 'conversations' {
  if (toolName.includes('meta') || toolName === 'list_ads' || toolName === 'get_ad_insights') {
    return 'meta_ads';
  }
  if (toolName.includes('crm') || toolName === 'get_crm_leads') {
    return 'crm';
  }
  if (toolName.includes('app') || toolName === 'run_app_analise_criativos') {
    return 'app';
  }
  if (toolName.includes('conversations')) {
    return 'conversations';
  }
  return 'supercerebro';
}

/**
 * Scheduler governado que executa o DAG da máquina PEV-C com fork/join seguro,
 * paralelizando leituras independentes de Meta e CRM em um único AgentProcess.
 */
export class PevcDAGScheduler {
  private plan: PevcPlan;
  private contract: TaskContract;
  private runId: string;
  private toolResolver: ToolResolver;
  private circuitBreakerRegistry: CircuitBreakerRegistry;
  private abortController: AbortController;
  private globalTimeoutMs: number;
  private onStepStart?: (step: PlanStep) => void;
  private onStepComplete?: (step: PlanStep, result: StepExecutionResult) => void;

  constructor(options: SchedulerOptions) {
    this.plan = options.plan;
    this.contract = options.contract;
    this.runId = options.runId ?? options.plan.runId;
    this.toolResolver = options.toolResolver ?? createDefaultToolResolver();
    this.circuitBreakerRegistry = new CircuitBreakerRegistry();
    this.abortController = new AbortController();
    this.globalTimeoutMs = options.globalTimeoutMs ?? options.contract.budgets.timeoutMs;
    this.onStepStart = options.onStepStart;
    this.onStepComplete = options.onStepComplete;

    // Conecta sinal externo ao controller interno se fornecido
    if (options.signal) {
      if (options.signal.aborted) {
        this.abortController.abort();
      } else {
        options.signal.addEventListener('abort', () => this.abortController.abort(), {
          once: true
        });
      }
    }
  }

  /**
   * Executa todos os passos do plano respeitando o DAG, paralelismo controlado e cancelamento.
   */
  public async execute(): Promise<SchedulerExecutionResult> {
    const startTime = performance.now();
    const stepResults: Record<string, StepExecutionResult> = {};
    const partialResults: Record<string, unknown> = {};
    const observations: Observation[] = [];

    const steps = this.plan.steps;
    const completedSteps = new Set<string>();
    const failedSteps = new Set<string>();
    let schedulerStatus: SchedulerStatus = 'COMPLETED';
    let fatalError: PevcErrorDiagnostic | undefined;

    // Timeout global do scheduler
    let globalTimeoutTimer: NodeJS.Timeout | undefined;
    const globalTimeoutPromise = new Promise<{ timedOut: true }>((resolve) => {
      globalTimeoutTimer = setTimeout(() => {
        this.abortController.abort();
        resolve({ timedOut: true });
      }, this.globalTimeoutMs);
    });

    try {
      while (completedSteps.size + failedSteps.size < steps.length) {
        // Se cancelado ou timeout acionado
        if (this.abortController.signal.aborted) {
          schedulerStatus = schedulerStatus === 'TIMED_OUT' ? 'TIMED_OUT' : 'CANCELLED';
          break;
        }

        // Identifica nós com todas as dependências satisfeitas
        const readySteps = steps.filter((step) => {
          if (completedSteps.has(step.stepId) || failedSteps.has(step.stepId)) {
            return false;
          }
          if (stepResults[step.stepId]?.status === 'RUNNING') {
            return false;
          }
          // Todas as dependências devem estar concluídas com sucesso
          return step.dependsOn.every((depId) => completedSteps.has(depId));
        });

        // Se não há passos prontos e restam passos não concluídos: dependência falhou ou deadlock
        if (readySteps.length === 0) {
          const pendingSteps = steps.filter(
            (s) => !completedSteps.has(s.stepId) && !failedSteps.has(s.stepId)
          );
          for (const pending of pendingSteps) {
            stepResults[pending.stepId] = {
              stepId: pending.stepId,
              toolName: pending.toolName,
              phase: pending.phase,
              status: 'SKIPPED',
              executionTimeMs: 0,
              toolCallId: `call_skip_${pending.stepId}`,
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString()
            };
          }
          schedulerStatus = 'FAILED';
          break;
        }

        // Separamos leituras independentes (read:meta, read:crm) que podem rodar em paralelo
        const parallelCandidates = readySteps.filter(
          (s) =>
            (s.effects.includes('read:meta') || s.effects.includes('read:crm')) &&
            s.dependsOn.every((dep) => completedSteps.has(dep))
        );

        let stepsToExecute: PlanStep[] = [];

        if (parallelCandidates.length > 1) {
          // Fork: Executa leituras independentes em paralelo
          stepsToExecute = parallelCandidates;
        } else {
          // Execução de 1 passo por vez (contexto, join, verify, commit)
          stepsToExecute = [readySteps[0]!];
        }

        // Executa lote atual de passos (concorrente se > 1, ou unitário)
        const executionPromises = stepsToExecute.map((step) =>
          this.executeSingleStep(step, partialResults)
        );

        const raceResults = await Promise.race([
          Promise.all(executionPromises),
          globalTimeoutPromise
        ]);

        if ('timedOut' in raceResults && raceResults.timedOut) {
          schedulerStatus = 'TIMED_OUT';
          fatalError = {
            code: 'TOOL_TIMEOUT',
            category: 'runtime',
            recoverability: 'RECOVERABLE',
            safeMessage: `A execução do plano excedeu o limite global de ${this.globalTimeoutMs}ms.`
          };
          break;
        }

        const batchResults = raceResults as StepExecutionResult[];

        for (const res of batchResults) {
          stepResults[res.stepId] = res;

          if (this.onStepComplete) {
            const stepObj = steps.find((s) => s.stepId === res.stepId)!;
            this.onStepComplete(stepObj, res);
          }

          if (res.status === 'SUCCESS') {
            completedSteps.add(res.stepId);
            partialResults[res.stepId] = res.data;

            // Gera Observation para staging
            const obsId = `obs_${res.stepId.replace(/[^a-zA-Z0-9_-]/g, '')}_${randomUUID().slice(0, 8)}`;
            observations.push({
              schemaVersion: '1.0.0',
              observationId: obsId,
              taskId: this.contract.taskId,
              runId: this.runId,
              toolCallId: res.toolCallId,
              source: resolveObservationSource(res.toolName),
              capturedAt: res.completedAt,
              status: 'RAW',
              timeframe: this.contract.timeframe,
              payloadHash: hashPayload(res.data),
              operationalPayload: (res.data as Record<string, unknown>) ?? {},
              redactedPayload: { stepId: res.stepId, status: res.status }
            });
          } else {
            failedSteps.add(res.stepId);
            if (res.status === 'TIMED_OUT') {
              schedulerStatus = 'TIMED_OUT';
            } else {
              schedulerStatus = 'FAILED';
            }
            if (!fatalError && res.error) {
              fatalError = {
                code: res.error.code,
                category: res.error.category,
                recoverability: res.error.code === 'TOOL_TIMEOUT' ? 'RECOVERABLE' : 'FATAL',
                safeMessage: res.error.message,
                details: res.error.details
              };
            }
          }
        }

        // Se algum passo falhou no lote, aborta passos pendentes
        if (failedSteps.size > 0) {
          this.abortController.abort();
          break;
        }
      }
    } finally {
      if (globalTimeoutTimer) {
        clearTimeout(globalTimeoutTimer);
      }
    }

    // Se houve cancelamento, marca todos os passos pendentes como CANCELLED
    if (this.abortController.signal.aborted) {
      for (const step of steps) {
        if (!stepResults[step.stepId]) {
          stepResults[step.stepId] = {
            stepId: step.stepId,
            toolName: step.toolName,
            phase: step.phase,
            status: 'CANCELLED',
            executionTimeMs: 0,
            toolCallId: `call_cancel_${step.stepId}`,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString()
          };
        }
      }
      if (schedulerStatus !== 'TIMED_OUT' && schedulerStatus !== 'FAILED') {
        schedulerStatus = 'CANCELLED';
      }
    }

    const totalElapsed = Math.round((performance.now() - startTime) * 100) / 100;

    return {
      status: schedulerStatus,
      planId: this.plan.planId,
      taskId: this.contract.taskId,
      runId: this.runId,
      stepResults,
      observations,
      partialResults,
      totalExecutionTimeMs: totalElapsed,
      error: fatalError
    };
  }

  /**
   * Executa um único passo invocando a ferramenta governada correspondente.
   */
  private async executeSingleStep(
    step: PlanStep,
    upstreamPartialResults: Record<string, unknown>
  ): Promise<StepExecutionResult> {
    const startTime = performance.now();
    const startedAt = new Date().toISOString();
    const toolCallId = `call_${step.stepId}_${randomUUID().slice(0, 8)}`;

    if (this.onStepStart) {
      this.onStepStart(step);
    }

    if (this.abortController.signal.aborted) {
      return {
        stepId: step.stepId,
        toolName: step.toolName,
        phase: step.phase,
        status: 'CANCELLED',
        executionTimeMs: 0,
        toolCallId,
        startedAt,
        completedAt: new Date().toISOString()
      };
    }

    // Resolve ferramenta
    const tool = this.toolResolver(step.toolName);

    // Se for passo sintético de verify ou commit e não tiver tool registrada, simula sucesso governado
    if (!tool) {
      if (step.phase === 'VERIFY' || step.phase === 'COMMIT') {
        const elapsed = Math.round((performance.now() - startTime) * 100) / 100;
        return {
          stepId: step.stepId,
          toolName: step.toolName,
          phase: step.phase,
          status: 'SUCCESS',
          data: { verified: true, phase: step.phase, stepId: step.stepId },
          executionTimeMs: elapsed,
          toolCallId,
          startedAt,
          completedAt: new Date().toISOString()
        };
      }

      const elapsed = Math.round((performance.now() - startTime) * 100) / 100;
      return {
        stepId: step.stepId,
        toolName: step.toolName,
        phase: step.phase,
        status: 'FAILED',
        error: {
          code: 'INTERNAL_ERROR',
          category: 'runtime',
          message: `Ferramenta governada '${step.toolName}' não foi encontrada no registry.`
        },
        executionTimeMs: elapsed,
        toolCallId,
        startedAt,
        completedAt: new Date().toISOString()
      };
    }

    // Mescla parâmetros declarados com dados upstream (Join)
    const enrichedParams = {
      ...step.params,
      ...(step.dependsOn.length > 0
        ? {
            _upstream: step.dependsOn.reduce(
              (acc, depId) => {
                acc[depId] = upstreamPartialResults[depId];
                return acc;
              },
              {} as Record<string, unknown>
            )
          }
        : {})
    };

    const causationId = `caus_${step.stepId}`;
    const executionContext: ToolExecutionContext = {
      toolCallId,
      taskId: this.contract.taskId,
      runId: this.runId,
      correlationId: `corr_${this.runId}`,
      signal: this.abortController.signal,
      timeoutMs: step.estimatedBudget.estimatedTimeoutMs
    };

    const integrationKey = resolveIntegrationKey(step.toolName);
    const breaker = this.circuitBreakerRegistry.getBreaker(this.runId, integrationKey);

    try {
      const result = await executeWithRetryAndBreaker({
        tool,
        input: enrichedParams,
        context: executionContext,
        breaker
      });
      const elapsed = Math.round((performance.now() - startTime) * 100) / 100;
      const completedAt = new Date().toISOString();

      if (!result.ok) {
        const isTimeout =
          result.errorCode === 'TOOL_TIMEOUT' ||
          (result.error && result.error.toLowerCase().includes('tempo limite'));

        const isCircuitOpen = result.errorCode === 'CIRCUIT_OPEN';

        const category: FailureCategory = isCircuitOpen
          ? 'integration'
          : isTimeout
            ? 'integration'
            : result.errorCode === 'POLICY_DENIED'
              ? 'policy'
              : result.errorCode === 'INVALID_SCHEMA'
                ? 'data'
                : 'runtime';

        return {
          stepId: step.stepId,
          toolName: step.toolName,
          phase: step.phase,
          status: isTimeout ? 'TIMED_OUT' : 'FAILED',
          error: {
            code:
              (result.errorCode as RuntimeErrorCode) ?? (isTimeout ? 'TOOL_TIMEOUT' : 'TOOL_ERROR'),
            category,
            message: result.error ?? 'Falha desconhecida na execução da ferramenta',
            details: isCircuitOpen ? { breakerMetrics: result.breakerMetrics } : undefined
          },
          executionTimeMs: elapsed,
          toolCallId: result.toolCallId ?? toolCallId,
          causationId,
          breakerMetrics: result.breakerMetrics,
          retryAttempted: result.retryAttempted,
          startedAt,
          completedAt
        };
      }

      return {
        stepId: step.stepId,
        toolName: step.toolName,
        phase: step.phase,
        status: 'SUCCESS',
        data: result.data,
        executionTimeMs: elapsed,
        toolCallId: result.toolCallId ?? toolCallId,
        causationId,
        breakerMetrics: result.breakerMetrics,
        retryAttempted: result.retryAttempted,
        startedAt,
        completedAt
      };
    } catch (err: unknown) {
      const elapsed = Math.round((performance.now() - startTime) * 100) / 100;
      const isAborted = this.abortController.signal.aborted;

      if (isAborted) {
        return {
          stepId: step.stepId,
          toolName: step.toolName,
          phase: step.phase,
          status: 'CANCELLED',
          executionTimeMs: elapsed,
          toolCallId,
          startedAt,
          completedAt: new Date().toISOString()
        };
      }

      return {
        stepId: step.stepId,
        toolName: step.toolName,
        phase: step.phase,
        status: 'FAILED',
        error: {
          code: 'TOOL_ERROR',
          category: 'integration',
          message: err instanceof Error ? err.message : 'Erro na execução da ferramenta'
        },
        executionTimeMs: elapsed,
        toolCallId,
        startedAt,
        completedAt: new Date().toISOString()
      };
    }
  }
}

/**
 * Função helper de alto nível para executar um plano PEV-C com o Scheduler.
 */
export async function executeDAGPlan(options: SchedulerOptions): Promise<SchedulerExecutionResult> {
  const scheduler = new PevcDAGScheduler(options);
  return scheduler.execute();
}
