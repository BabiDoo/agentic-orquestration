import { randomUUID } from 'node:crypto';
import {
  Approval,
  TaskContract,
  OperationalValidators,
  calculateProposalHash
} from '@adzhub/contracts';
import { PolicyEnvironment, PolicyTaskContext } from './index.js';
import { isExternalMutationEffect } from './effect-classifier.js';

export type ApprovalValidationCode =
  | 'VALID'
  | 'INVALID_SCHEMA'
  | 'NOT_APPROVED'
  | 'TASK_MISMATCH'
  | 'SCOPE_MISMATCH'
  | 'GENERIC_SCOPE_REJECTED'
  | 'EXPIRED'
  | 'MODEL_SELF_APPROVAL_FORBIDDEN'
  | 'SELF_APPROVAL_FORBIDDEN'
  | 'PROPOSAL_HASH_MISMATCH'
  | 'RESOURCE_STALE'
  | 'EXTERNAL_WRITE_DISABLED_IN_DEMO';

export interface ApprovalValidationResult {
  valid: boolean;
  code: ApprovalValidationCode;
  reason: string;
  approval?: Approval;
}

/**
 * Palavras-chave ou padrões genéricos proibidos como escopo de aprovação.
 */
const FORBIDDEN_GENERIC_SCOPES = new Set([
  '*',
  'all',
  'any',
  'admin',
  'root',
  'everything',
  'default'
]);

/**
 * Identificadores ou atores reservados que não podem conceder aprovação (modelos/agentes).
 */
const FORBIDDEN_ACTOR_PATTERNS = [
  /^agent/i,
  /^llm/i,
  /^model/i,
  /^system_auto/i,
  /^self/i,
  /^bot/i,
  /^assistant/i
];

export class ApprovalManager {
  private approvals: Map<string, Approval> = new Map();

  /**
   * Cria uma solicitação formal de aprovação para uma ação de risco/mutação externa vinculada a proposalHash.
   */
  public requestApproval(params: {
    taskId: string;
    runId: string;
    scope: string;
    requestedBy: string;
    proposalHash?: string;
    proposerId?: string;
    proposal?: {
      resource: string;
      operation: string;
      payload: unknown;
      previousStateSnapshot?: unknown;
    };
    reason?: string;
    ttlSeconds?: number;
  }): Approval {
    const trimmedScope = params.scope.trim();

    if (!trimmedScope || FORBIDDEN_GENERIC_SCOPES.has(trimmedScope.toLowerCase())) {
      throw new Error(
        `Escopo de aprovação inválido: '${params.scope}'. Escopos genéricos como wildcard (*) ou 'all' são estritamente proibidos.`
      );
    }

    let calculatedHash = params.proposalHash;
    if (!calculatedHash && params.proposal) {
      calculatedHash = calculateProposalHash(params.proposal);
    }

    const now = new Date();
    const ttl = params.ttlSeconds ?? 3600; // 1 hora por padrão
    const expiresAt = new Date(now.getTime() + ttl * 1000).toISOString();
    const rawId = randomUUID().replace(/-/g, '').slice(0, 12);
    const approvalId = `appr_${rawId}`;

    const approval: Approval = {
      schemaVersion: '1.0.0',
      approvalId,
      taskId: params.taskId,
      runId: params.runId,
      scope: trimmedScope,
      actor: params.requestedBy, // Solicitante inicial
      decision: 'REJECTED', // Inicia pendente/não aprovado até resolução explícita
      proposalHash: calculatedHash,
      proposerId: params.proposerId ?? params.requestedBy,
      reason: params.reason ?? 'Aguardando decisão de operador humano.',
      requestedAt: now.toISOString(),
      expiresAt
    };

    const validated = OperationalValidators.validateApproval(approval);
    this.approvals.set(validated.approvalId, validated);
    return validated;
  }

  /**
   * Resolve uma solicitação de aprovação por um operador humano ou autoridade de segurança.
   * Modelos ou agentes são estritamente impedidos de resolver aprovações.
   * Proponente é impedido de aprovar sua própria proposta (Segregação de Funções - Invariante 11).
   */
  public resolveApproval(params: {
    approvalId: string;
    decision: 'APPROVED' | 'REJECTED';
    actor: string;
    signedProposalHash?: string;
    reason?: string;
    now?: Date;
  }): Approval {
    const existing = this.approvals.get(params.approvalId);
    if (!existing) {
      throw new Error(`Aprovação '${params.approvalId}' não encontrada no registro.`);
    }

    const currentTime = params.now ?? new Date();
    if (new Date(existing.expiresAt).getTime() <= currentTime.getTime()) {
      const expiredRecord: Approval = {
        ...existing,
        decision: 'EXPIRED',
        reason: 'Solicitação de aprovação expirou antes da resolução.',
        decidedAt: currentTime.toISOString()
      };
      this.approvals.set(existing.approvalId, expiredRecord);
      return expiredRecord;
    }

    const actor = params.actor.trim();
    if (!actor) {
      throw new Error('Identificador do actor responsável pela aprovação é obrigatório.');
    }

    // Invariante 11: Segregação de Funções (Proponente não pode aprovar própria proposta)
    if (existing.proposerId && actor === existing.proposerId) {
      throw new Error(
        `Violação de segregação de funções: O proponente '${actor}' não possui permissão para aprovar sua própria proposta.`
      );
    }

    // Regra anti-presunção: Nenhuma aprovação pode ser concedida por modelo ou agente
    for (const pattern of FORBIDDEN_ACTOR_PATTERNS) {
      if (pattern.test(actor)) {
        throw new Error(
          `Violação de segurança: Modelos ou agentes ('${actor}') não possuem autoridade para conceder aprovações.`
        );
      }
    }

    // Invariante 6: Aprovação Vinculada ao Hash (Se assinado, hash deve coincidir)
    if (
      params.signedProposalHash &&
      existing.proposalHash &&
      params.signedProposalHash !== existing.proposalHash
    ) {
      throw new Error(
        `Violação de hash-binding: O hash assinado (${params.signedProposalHash}) não corresponde ao hash da proposta (${existing.proposalHash}).`
      );
    }

    const resolved: Approval = {
      ...existing,
      decision: params.decision,
      actor,
      proposalHash: params.signedProposalHash ?? existing.proposalHash,
      reason:
        params.reason ??
        (params.decision === 'APPROVED'
          ? 'Aprovado por operador humano.'
          : 'Rejeitado por operador.'),
      decidedAt: currentTime.toISOString()
    };

    const validated = OperationalValidators.validateApproval(resolved);
    this.approvals.set(validated.approvalId, validated);
    return validated;
  }

  /**
   * Valida estritamente um token/registro de aprovação contra escopo, expiração, tarefa, hash-binding e segregação.
   */
  public validateApproval(
    approval: unknown,
    expected: {
      taskId: string;
      scope: string;
      proposalHash?: string;
      proposerId?: string;
      maxFreshnessSeconds?: number;
      resourceFreshnessSeconds?: number;
      now?: Date;
    }
  ): ApprovalValidationResult {
    let parsed: Approval;
    try {
      parsed = OperationalValidators.validateApproval(approval);
    } catch (err: unknown) {
      return {
        valid: false,
        code: 'INVALID_SCHEMA',
        reason: `Schema de aprovação inválido: ${err instanceof Error ? err.message : String(err)}`
      };
    }

    // 1. Decisão deve ser explicitamente APPROVED
    if (parsed.decision !== 'APPROVED') {
      return {
        valid: false,
        code: 'NOT_APPROVED',
        reason: `Aprovação está com status '${parsed.decision}'. Ação bloqueada.`,
        approval: parsed
      };
    }

    // 2. TaskId deve coincidir exatamente
    if (parsed.taskId !== expected.taskId) {
      return {
        valid: false,
        code: 'TASK_MISMATCH',
        reason: `Incompatibilidade de tarefa: aprovação vinculada à tarefa '${parsed.taskId}', mas a execução atual é '${expected.taskId}'.`,
        approval: parsed
      };
    }

    // 3. Validação anti-genérica e correspondência de escopo
    const scopeLower = parsed.scope.toLowerCase().trim();
    if (FORBIDDEN_GENERIC_SCOPES.has(scopeLower)) {
      return {
        valid: false,
        code: 'GENERIC_SCOPE_REJECTED',
        reason: `Aprovação com escopo genérico ('${parsed.scope}') é inválida por diretriz de segurança.`,
        approval: parsed
      };
    }

    const expectedScopeLower = expected.scope.toLowerCase().trim();
    if (scopeLower !== expectedScopeLower && !this.isScopeCovered(scopeLower, expectedScopeLower)) {
      return {
        valid: false,
        code: 'SCOPE_MISMATCH',
        reason: `Escopo da aprovação ('${parsed.scope}') não cobre o escopo requisitado ('${expected.scope}').`,
        approval: parsed
      };
    }

    // 4. Verificação de Expiração Temporal
    const currentTime = (expected.now ?? new Date()).getTime();
    const expiryTime = new Date(parsed.expiresAt).getTime();
    if (currentTime >= expiryTime) {
      return {
        valid: false,
        code: 'EXPIRED',
        reason: `Token de aprovação expirou em ${parsed.expiresAt}.`,
        approval: parsed
      };
    }

    // 5. Validação de Actor não-modelo
    for (const pattern of FORBIDDEN_ACTOR_PATTERNS) {
      if (pattern.test(parsed.actor)) {
        return {
          valid: false,
          code: 'MODEL_SELF_APPROVAL_FORBIDDEN',
          reason: `Actor '${parsed.actor}' é inválido. Modelos não podem presumir ou conceder auto-aprovação.`,
          approval: parsed
        };
      }
    }

    // 6. Invariante 11: Segregação de Funções (Proponente não pode aprovar)
    if (expected.proposerId && parsed.actor === expected.proposerId) {
      return {
        valid: false,
        code: 'SELF_APPROVAL_FORBIDDEN',
        reason: `Violação de segregação de funções: o autor '${parsed.actor}' é o proponente da tarefa e não pode aprovar a si mesmo.`,
        approval: parsed
      };
    }

    // 7. Invariante 6: Aprovação Vinculada ao Hash (Hash-Binding)
    if (expected.proposalHash) {
      if (!parsed.proposalHash) {
        return {
          valid: false,
          code: 'PROPOSAL_HASH_MISMATCH',
          reason: 'Aprovação não possui proposalHash vinculado para verificação criptográfica.',
          approval: parsed
        };
      }
      if (parsed.proposalHash !== expected.proposalHash) {
        return {
          valid: false,
          code: 'PROPOSAL_HASH_MISMATCH',
          reason: `Hash da proposta divergiu: assinado '${parsed.proposalHash}' vs atual '${expected.proposalHash}'. Qualquer mutação no payload invalida a autorização.`,
          approval: parsed
        };
      }
    }

    // 8. Invariante 10: Freshness Pré-Write (Verificação de idade do recurso)
    if (
      expected.maxFreshnessSeconds !== undefined &&
      expected.resourceFreshnessSeconds !== undefined &&
      expected.resourceFreshnessSeconds > expected.maxFreshnessSeconds
    ) {
      return {
        valid: false,
        code: 'RESOURCE_STALE',
        reason: `Recurso obsoleto (lido há ${expected.resourceFreshnessSeconds}s, limite: ${expected.maxFreshnessSeconds}s). Releitura obrigatória antes da escrita.`,
        approval: parsed
      };
    }

    return {
      valid: true,
      code: 'VALID',
      reason: `Aprovação válida concedida por '${parsed.actor}' para escopo '${parsed.scope}' com hash ${parsed.proposalHash ?? 'N/A'}.`,
      approval: parsed
    };
  }

  /**
   * Avalia a execução de uma ação governada considerando aprovações, task policy, hash-binding e restrições de ambiente.
   */
  public evaluateActionExecution(params: {
    action: string;
    resource: string;
    task: PolicyTaskContext | TaskContract;
    environment: PolicyEnvironment;
    approval?: Approval | null;
    proposalHash?: string;
    proposerId?: string;
    resourceFreshnessSeconds?: number;
    maxFreshnessSeconds?: number;
    now?: Date;
  }): {
    allowed: boolean;
    decision: 'ALLOW' | 'DENY' | 'REQUIRES_APPROVAL';
    code: string;
    reason: string;
    approval?: Approval;
  } {
    const isMutation =
      isExternalMutationEffect(params.action) || params.action === 'external_write';
    const taskId =
      ('taskId' in params.task
        ? params.task.taskId
        : (params.task as Record<string, string>).taskId) || '';

    // Se for mutação externa em ambiente de demonstração, permanece desabilitada fisicamente
    if (
      isMutation &&
      (params.environment.env === 'demo' || params.environment.externalWritesEnabled === false)
    ) {
      return {
        allowed: false,
        decision: 'DENY',
        code: 'EXTERNAL_WRITE_DISABLED_IN_DEMO',
        reason:
          'Mesmo com aprovação, external_write permanece desabilitado no ambiente de demonstração para evitar efeitos colaterais reais.'
      };
    }

    // Se não for mutação externa, segue fluxo normal
    if (!isMutation) {
      return {
        allowed: true,
        decision: 'ALLOW',
        code: 'POLICY_ALLOWED',
        reason: 'Operação não requer aprovação de mutação externa.'
      };
    }

    // Mutação externa requer aprovação válida
    if (!params.approval) {
      return {
        allowed: false,
        decision: 'REQUIRES_APPROVAL',
        code: 'APPROVAL_REQUIRED',
        reason: `Ação de escrita externa '${params.action}' requer aprovação explícita de operador humano.`
      };
    }

    const expectedScope = `${params.action}:${params.resource}`;
    const validation = this.validateApproval(params.approval, {
      taskId,
      scope: expectedScope,
      proposalHash: params.proposalHash,
      proposerId: params.proposerId,
      resourceFreshnessSeconds: params.resourceFreshnessSeconds,
      maxFreshnessSeconds: params.maxFreshnessSeconds,
      now: params.now
    });

    if (!validation.valid) {
      return {
        allowed: false,
        decision: 'REQUIRES_APPROVAL',
        code: validation.code,
        reason: validation.reason,
        approval: validation.approval
      };
    }

    return {
      allowed: true,
      decision: 'ALLOW',
      code: 'POLICY_ALLOWED',
      reason: validation.reason,
      approval: validation.approval
    };
  }

  /**
   * Helper para verificar se um escopo de aprovação cobre um escopo alvo (ex: "external_write:meta_ad" cobre "external_write:meta_ad:123")
   */
  private isScopeCovered(approvalScope: string, targetScope: string): boolean {
    if (approvalScope === targetScope) return true;
    if (targetScope.startsWith(approvalScope + ':')) return true;
    return false;
  }
}
