import {
  AllowedEffect,
  TaskContract,
  PolicyEvaluatedEvent,
  TracePhase,
  Approval
} from '@adzhub/contracts';
import { ApprovalManager } from './approval-manager.js';

/**
 * @adzhub/policy
 * Capability Broker deny-by-default, controle de autoridade fora do prompt, validação JIT e avaliação de políticas.
 */

export type PolicyDecision = 'ALLOW' | 'DENY' | 'REQUIRES_APPROVAL';

export type PolicyErrorCode =
  | 'POLICY_ALLOWED'
  | 'POLICY_DENIED'
  | 'APPROVAL_REQUIRED'
  | 'PROPOSAL_HASH_MISMATCH'
  | 'SELF_APPROVAL_FORBIDDEN'
  | 'RESOURCE_STALE';

export interface PolicySubject {
  id: string;
  role?: string;
  type?: 'agent' | 'user' | 'system';
}

export interface PolicyTaskContext {
  taskId: string;
  clientId: string;
  tenantId?: string;
  allowedEffects: string[] | readonly string[];
  forbiddenEffects?: string[] | readonly string[];
  approvalPolicy?: {
    externalWritesRequireApproval?: boolean;
    autoApproveReadOnly?: boolean;
  };
}

export interface PolicyAction {
  name: string;
  effect?: AllowedEffect | string;
  parameters?: Record<string, unknown>;
}

export interface PolicyResource {
  type: string;
  id?: string;
  clientId?: string;
  uri?: string;
}

export interface PolicyEnvironment {
  mode: 'Governed' | 'Basic';
  env?: 'production' | 'staging' | 'demo' | 'test';
  externalWritesEnabled?: boolean;
  demoControl?: boolean;
}

export interface PolicyEvaluationRequest {
  subject?: PolicySubject | string | null;
  task?: PolicyTaskContext | TaskContract | null;
  action?: PolicyAction | AllowedEffect | string | null;
  resource?: PolicyResource | string | null;
  environment?: PolicyEnvironment | null;
  // Propriedades legadas ou atalhos
  clientId?: string;
}

export interface PolicyEvaluationResult {
  decision: PolicyDecision;
  reason: string;
  code: PolicyErrorCode;
  evaluatedAt: string;
  dimensions: {
    subject: PolicySubject | string | null;
    task: PolicyTaskContext | null;
    action: string | null;
    resource: PolicyResource | string | null;
    environment: PolicyEnvironment | null;
  };
  eventPayload: {
    subject: string;
    action: string;
    resource: string;
    decision: PolicyDecision;
    reason: string;
    code: PolicyErrorCode;
    details?: Record<string, unknown>;
  };
}

export interface JitEvaluationRequest extends PolicyEvaluationRequest {
  operation?: string;
  approval?: Approval | null;
  proposalHash?: string;
  proposerId?: string;
  resourceFreshnessSeconds?: number;
  maxFreshnessSeconds?: number;
  now?: Date;
}

export interface JitEvaluationResult extends PolicyEvaluationResult {
  isFresh: boolean;
  hashMatch: boolean;
  jitValidatedAt: string;
}

export class CapabilityBroker {
  private defaultAllowedEffects: Set<string>;
  private approvalManager: ApprovalManager;

  constructor(defaultAllowedEffects: string[] = [], approvalManager?: ApprovalManager) {
    this.defaultAllowedEffects = new Set(defaultAllowedEffects);
    this.approvalManager = approvalManager ?? new ApprovalManager();
  }

  /**
   * Avalia uma requisição de ação contra 5 dimensões obrigatórias (deny-by-default):
   * 1. Subject (identidade do requisitante)
   * 2. Task (contrato, clientId e allowedEffects)
   * 3. Action (efeito solicitado)
   * 4. Resource (alvo da ação e isolamento de cliente)
   * 5. Environment (modo de execução e ambiente)
   */
  public evaluate(request: PolicyEvaluationRequest): PolicyEvaluationResult {
    const evaluatedAt = new Date().toISOString();

    // 1. Extração e validação do Subject
    let subjectObj: PolicySubject | string | null = null;
    let subjectId: string | null = null;
    if (typeof request.subject === 'string' && request.subject.trim().length > 0) {
      subjectId = request.subject.trim();
      subjectObj = subjectId;
    } else if (
      request.subject &&
      typeof request.subject === 'object' &&
      'id' in request.subject &&
      request.subject.id
    ) {
      subjectId = request.subject.id;
      subjectObj = request.subject;
    }

    // 2. Extração e validação da Task
    let taskContext: PolicyTaskContext | null = null;
    if (request.task && typeof request.task === 'object') {
      const rawTask = request.task as Record<string, unknown>;
      const taskId = (rawTask.taskId as string) || '';
      const clientId = (rawTask.clientId as string) || (request.clientId as string) || '';

      let allowedEffects: string[] = [];
      if (
        rawTask.effects &&
        typeof rawTask.effects === 'object' &&
        Array.isArray((rawTask.effects as Record<string, unknown>).allowed)
      ) {
        allowedEffects = (rawTask.effects as { allowed: string[] }).allowed;
      } else if (Array.isArray(rawTask.allowedEffects)) {
        allowedEffects = rawTask.allowedEffects as string[];
      } else if (this.defaultAllowedEffects.size > 0) {
        allowedEffects = Array.from(this.defaultAllowedEffects);
      }

      let forbiddenEffects: string[] = [];
      if (
        rawTask.effects &&
        typeof rawTask.effects === 'object' &&
        Array.isArray((rawTask.effects as Record<string, unknown>).forbidden)
      ) {
        forbiddenEffects = (rawTask.effects as { forbidden: string[] }).forbidden;
      } else if (Array.isArray(rawTask.forbiddenEffects)) {
        forbiddenEffects = rawTask.forbiddenEffects as string[];
      }

      let approvalPolicy = undefined;
      if (rawTask.approvalPolicy && typeof rawTask.approvalPolicy === 'object') {
        approvalPolicy = rawTask.approvalPolicy as PolicyTaskContext['approvalPolicy'];
      }

      if (taskId && clientId) {
        taskContext = {
          taskId,
          clientId,
          tenantId: rawTask.tenantId as string | undefined,
          allowedEffects,
          forbiddenEffects,
          approvalPolicy
        };
      }
    }

    // 3. Extração e validação da Action
    let actionName: string | null = null;
    if (typeof request.action === 'string' && request.action.trim().length > 0) {
      actionName = request.action.trim();
    } else if (request.action && typeof request.action === 'object' && request.action.name) {
      actionName = request.action.name;
    }

    // 4. Extração e validação do Resource
    let resourceObj: PolicyResource | string | null = null;
    let resourceStr: string | null = null;
    let resourceClientId: string | undefined = undefined;
    if (typeof request.resource === 'string' && request.resource.trim().length > 0) {
      resourceStr = request.resource.trim();
      resourceObj = resourceStr;
      // Extrair clientId de URI se no formato cliente:xxx ou similar
      if (resourceStr.startsWith('client:')) {
        resourceClientId = resourceStr.split(':')[1];
      }
    } else if (request.resource && typeof request.resource === 'object' && request.resource.type) {
      resourceObj = request.resource;
      resourceStr = `${request.resource.type}:${request.resource.id ?? '*'}`;
      resourceClientId = request.resource.clientId;
    }

    // 5. Extração e validação do Environment
    let envObj: PolicyEnvironment | null = null;
    if (
      request.environment &&
      typeof request.environment === 'object' &&
      request.environment.mode
    ) {
      envObj = request.environment;
    }

    // Dimensões agregadas para retorno
    const dimensions = {
      subject: subjectObj,
      task: taskContext,
      action: actionName,
      resource: resourceObj,
      environment: envObj
    };

    // Helper para gerar o resultado
    const makeResult = (
      decision: PolicyDecision,
      code: PolicyErrorCode,
      reason: string
    ): PolicyEvaluationResult => ({
      decision,
      code,
      reason,
      evaluatedAt,
      dimensions,
      eventPayload: {
        subject: subjectId ?? 'unknown',
        action: actionName ?? 'unknown',
        resource: resourceStr ?? 'unknown',
        decision,
        code,
        reason,
        details: {
          taskId: taskContext?.taskId,
          clientId: taskContext?.clientId,
          environmentMode: envObj?.mode
        }
      }
    });

    // VERIFICAÇÃO 1: Campos obrigatórios das 5 dimensões (Deny-by-default)
    if (!subjectId) {
      return makeResult(
        'DENY',
        'POLICY_DENIED',
        'Missing required dimension: subject must be provided'
      );
    }
    if (!taskContext) {
      return makeResult(
        'DENY',
        'POLICY_DENIED',
        'Missing required dimension: valid task with taskId and clientId must be provided'
      );
    }
    if (!actionName) {
      return makeResult(
        'DENY',
        'POLICY_DENIED',
        'Missing required dimension: action must be provided'
      );
    }
    if (!resourceStr) {
      return makeResult(
        'DENY',
        'POLICY_DENIED',
        'Missing required dimension: resource must be provided'
      );
    }
    if (!envObj) {
      return makeResult(
        'DENY',
        'POLICY_DENIED',
        'Missing required dimension: environment with mode must be provided'
      );
    }

    // VERIFICAÇÃO 2: Isolamento multi-tenant (task.clientId deve corresponder ao resource.clientId)
    if (resourceClientId && resourceClientId !== taskContext.clientId) {
      return makeResult(
        'DENY',
        'POLICY_DENIED',
        `CLIENT_MISMATCH: Cross-client access denied (task clientId '${taskContext.clientId}' does not match resource clientId '${resourceClientId}')`
      );
    }

    // VERIFICAÇÃO 3: Action deve existir em effects.allowed e não estar em forbidden
    const isExplicitlyForbidden =
      taskContext.forbiddenEffects && taskContext.forbiddenEffects.includes(actionName);
    if (isExplicitlyForbidden) {
      return makeResult(
        'DENY',
        'POLICY_DENIED',
        `ACTION_FORBIDDEN: Action '${actionName}' is explicitly forbidden by task contract`
      );
    }

    const isAllowed = taskContext.allowedEffects.includes(actionName);
    if (!isAllowed) {
      return makeResult(
        'DENY',
        'POLICY_DENIED',
        `ACTION_NOT_ALLOWED: Action '${actionName}' is not in allowed effects [${taskContext.allowedEffects.join(', ')}]`
      );
    }

    // VERIFICAÇÃO 4: Ações de escrita externa e controle de aprovação (Human-in-the-Loop)
    if (actionName === 'external_write') {
      // Se estamos em demo ou escritas externas estão desabilitadas
      if (envObj.env === 'demo' || envObj.externalWritesEnabled === false) {
        return makeResult(
          'REQUIRES_APPROVAL',
          'APPROVAL_REQUIRED',
          'APPROVAL_REQUIRED: External write operations require explicit operator approval (disabled by default in demo/safe mode)'
        );
      }

      // Se a política da tarefa exige aprovação para escrita externa
      if (taskContext.approvalPolicy?.externalWritesRequireApproval !== false) {
        return makeResult(
          'REQUIRES_APPROVAL',
          'APPROVAL_REQUIRED',
          'APPROVAL_REQUIRED: External write operations require operator approval by task approval policy'
        );
      }
    }

    // Aprovado pela política
    return makeResult('ALLOW', 'POLICY_ALLOWED', 'Action permitted by policy');
  }

  /**
   * Avaliação Just-In-Time (JIT) pré-dispatch (Invariantes 3, 6, 10, 11).
   * Reavalia todas as 5 dimensões no milissegundo exato anterior à chamada da Tool,
   * verificando autoridade, aprovação vinculada ao hash (SHA-256), segregação de funções e freshness do recurso.
   */
  public evaluateJustInTime(request: JitEvaluationRequest): JitEvaluationResult {
    const jitValidatedAt = new Date().toISOString();
    const baseEval = this.evaluate(request);

    let isFresh = true;
    let hashMatch = true;

    // Se já foi negado nas dimensões estáticas, retorna imediatamente
    if (baseEval.decision === 'DENY') {
      return {
        ...baseEval,
        isFresh,
        hashMatch,
        jitValidatedAt
      };
    }

    // Invariante 10: Freshness Pré-Write
    if (
      request.maxFreshnessSeconds !== undefined &&
      request.resourceFreshnessSeconds !== undefined &&
      request.resourceFreshnessSeconds > request.maxFreshnessSeconds
    ) {
      isFresh = false;
      return {
        ...baseEval,
        decision: 'DENY',
        code: 'RESOURCE_STALE',
        reason: `Invariante 10 violada: Recurso '${typeof request.resource === 'string' ? request.resource : request.resource?.type}' está obsoleto (lido há ${request.resourceFreshnessSeconds}s, limite: ${request.maxFreshnessSeconds}s). Releitura obrigatória imediatamente pré-write.`,
        isFresh: false,
        hashMatch,
        jitValidatedAt
      };
    }

    // Para ações que exigem aprovação (ex: external_write)
    const actionName =
      typeof request.action === 'string' ? request.action : request.action?.name ?? '';

    if (actionName === 'external_write') {
      const resourceStr =
        typeof request.resource === 'string'
          ? request.resource
          : `${request.resource?.type}:${request.resource?.id ?? '*'}`;

      const approvalEval = this.approvalManager.evaluateActionExecution({
        action: actionName,
        resource: resourceStr,
        task: request.task as PolicyTaskContext | TaskContract,
        environment: request.environment!,
        approval: request.approval,
        proposalHash: request.proposalHash,
        proposerId: request.proposerId,
        resourceFreshnessSeconds: request.resourceFreshnessSeconds,
        maxFreshnessSeconds: request.maxFreshnessSeconds,
        now: request.now
      });

      if (!approvalEval.allowed) {
        if (approvalEval.code === 'PROPOSAL_HASH_MISMATCH') {
          hashMatch = false;
        }

        return {
          ...baseEval,
          decision: approvalEval.decision,
          code: approvalEval.code as PolicyErrorCode,
          reason: approvalEval.reason,
          isFresh,
          hashMatch,
          jitValidatedAt
        };
      }
    }

    return {
      ...baseEval,
      decision: 'ALLOW',
      code: 'POLICY_ALLOWED',
      reason: 'Autorização JIT concedida com conformidade de 5 dimensões, freshness e hash-binding.',
      isFresh,
      hashMatch,
      jitValidatedAt
    };
  }

  /**
   * Converte a avaliação de política em um evento normativo POLICY_EVALUATED.
   */
  public createPolicyEvaluatedEvent(
    result: PolicyEvaluationResult,
    context: {
      eventId?: string;
      seq: number;
      taskId: string;
      runId: string;
      correlationId: string;
      causationId?: string;
      phase?: TracePhase;
    }
  ): PolicyEvaluatedEvent {
    return {
      schemaVersion: '1.0.0',
      eventId: (context.eventId ??
        `evt_pol_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`) as `evt_${string}`,
      eventType: 'POLICY_EVALUATED',
      seq: context.seq,
      taskId: context.taskId,
      runId: context.runId,
      correlationId: context.correlationId,
      causationId: context.causationId,
      phase: context.phase ?? 'PLAN',
      timestamp: result.evaluatedAt,
      payload: {
        subject: result.eventPayload.subject,
        action: result.eventPayload.action,
        resource: result.eventPayload.resource,
        decision: result.decision,
        reason: result.reason,
        code: result.code,
        details: result.eventPayload.details
      }
    };
  }
}

export * from './effect-classifier.js';
export * from './approval-manager.js';
