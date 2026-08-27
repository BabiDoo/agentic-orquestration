import { describe, it, expect } from 'vitest';
import {
  CapabilityBroker,
  PolicyEvaluationRequest,
  getEffectMetadata,
  isExternalMutationEffect,
  isInternalPersistenceEffect,
  isReadOperationEffect,
  evaluatePreExecutionRisk,
  assertStaticEffect,
  ApprovalManager
} from './index.js';
import { TaskContract, PolicyEvaluatedEventSchema } from '@adzhub/contracts';

describe('@adzhub/policy - M5-01 Capability Broker deny-by-default', () => {
  const validTask: PolicyEvaluationRequest['task'] = {
    taskId: 'task_creative_audit_001',
    clientId: 'cli_housewhey',
    allowedEffects: ['read:meta', 'read:crm', 'write:staging'],
    forbiddenEffects: ['demo:control'],
    approvalPolicy: {
      externalWritesRequireApproval: true,
      autoApproveReadOnly: true
    }
  };

  const validEnv: PolicyEvaluationRequest['environment'] = {
    mode: 'Governed',
    env: 'production',
    externalWritesEnabled: true
  };

  it('permite ação válida quando todas as 5 dimensões estão corretas e ação está permitida', () => {
    const broker = new CapabilityBroker();
    const result = broker.evaluate({
      subject: { id: 'agent_pevc_01', role: 'executor' },
      task: validTask,
      action: 'read:meta',
      resource: { type: 'meta_campaign', id: 'camp_123', clientId: 'cli_housewhey' },
      environment: validEnv
    });

    expect(result.decision).toBe('ALLOW');
    expect(result.code).toBe('POLICY_ALLOWED');
    expect(result.reason).toContain('Action permitted by policy');
  });

  it('retorna DENY quando qualquer dimensão obrigatória estiver ausente (Deny-by-default)', () => {
    const broker = new CapabilityBroker();

    // Sem subject
    const resNoSubject = broker.evaluate({
      task: validTask,
      action: 'read:meta',
      resource: 'meta:camp_123',
      environment: validEnv
    });
    expect(resNoSubject.decision).toBe('DENY');
    expect(resNoSubject.reason).toContain('Missing required dimension: subject');

    // Sem task
    const resNoTask = broker.evaluate({
      subject: 'agent_01',
      action: 'read:meta',
      resource: 'meta:camp_123',
      environment: validEnv
    });
    expect(resNoTask.decision).toBe('DENY');
    expect(resNoTask.reason).toContain('Missing required dimension: valid task');

    // Sem action
    const resNoAction = broker.evaluate({
      subject: 'agent_01',
      task: validTask,
      resource: 'meta:camp_123',
      environment: validEnv
    });
    expect(resNoAction.decision).toBe('DENY');
    expect(resNoAction.reason).toContain('Missing required dimension: action');

    // Sem resource
    const resNoResource = broker.evaluate({
      subject: 'agent_01',
      task: validTask,
      action: 'read:meta',
      environment: validEnv
    });
    expect(resNoResource.decision).toBe('DENY');
    expect(resNoResource.reason).toContain('Missing required dimension: resource');

    // Sem environment
    const resNoEnv = broker.evaluate({
      subject: 'agent_01',
      task: validTask,
      action: 'read:meta',
      resource: 'meta:camp_123'
    });
    expect(resNoEnv.decision).toBe('DENY');
    expect(resNoEnv.reason).toContain('Missing required dimension: environment');
  });

  it('retorna DENY em caso de mismatch de cliente (task.clientId != resource.clientId)', () => {
    const broker = new CapabilityBroker();
    const result = broker.evaluate({
      subject: 'agent_pevc_01',
      task: {
        taskId: 'task_001',
        clientId: 'cli_housewhey',
        allowedEffects: ['read:meta']
      },
      action: 'read:meta',
      resource: {
        type: 'meta_campaign',
        id: 'camp_999',
        clientId: 'cli_other_company' // Cliente diferente!
      },
      environment: validEnv
    });

    expect(result.decision).toBe('DENY');
    expect(result.reason).toContain('CLIENT_MISMATCH');
    expect(result.reason).toContain('cli_housewhey');
    expect(result.reason).toContain('cli_other_company');
  });

  it('retorna DENY quando action não existe em effects.allowed', () => {
    const broker = new CapabilityBroker();
    const result = broker.evaluate({
      subject: 'agent_pevc_01',
      task: {
        taskId: 'task_001',
        clientId: 'cli_housewhey',
        allowedEffects: ['read:meta'] // Apenas read:meta
      },
      action: 'read:crm', // Não permitido
      resource: { type: 'crm_deal', clientId: 'cli_housewhey' },
      environment: validEnv
    });

    expect(result.decision).toBe('DENY');
    expect(result.reason).toContain('ACTION_NOT_ALLOWED');
    expect(result.reason).toContain('read:crm');
  });

  it('retorna DENY quando action está explicitamente em forbidden', () => {
    const broker = new CapabilityBroker();
    const result = broker.evaluate({
      subject: 'agent_pevc_01',
      task: {
        taskId: 'task_001',
        clientId: 'cli_housewhey',
        allowedEffects: ['read:meta', 'demo:control'],
        forbiddenEffects: ['demo:control'] // Proibido explicitamente
      },
      action: 'demo:control',
      resource: { type: 'system_demo' },
      environment: validEnv
    });

    expect(result.decision).toBe('DENY');
    expect(result.reason).toContain('ACTION_FORBIDDEN');
  });

  it('retorna REQUIRES_APPROVAL para external_write quando política de aprovação está ativa', () => {
    const broker = new CapabilityBroker();
    const result = broker.evaluate({
      subject: 'agent_pevc_01',
      task: {
        taskId: 'task_001',
        clientId: 'cli_housewhey',
        allowedEffects: ['external_write'],
        approvalPolicy: { externalWritesRequireApproval: true }
      },
      action: 'external_write',
      resource: { type: 'meta_ad', id: 'ad_123', clientId: 'cli_housewhey' },
      environment: validEnv
    });

    expect(result.decision).toBe('REQUIRES_APPROVAL');
    expect(result.code).toBe('APPROVAL_REQUIRED');
  });

  it('emite evento normativo POLICY_EVALUATED válido segundo o schema de contratos', () => {
    const broker = new CapabilityBroker();
    const evaluation = broker.evaluate({
      subject: { id: 'agent_audit_01' },
      task: validTask,
      action: 'read:meta',
      resource: { type: 'meta_ad_set', id: 'adset_555', clientId: 'cli_housewhey' },
      environment: validEnv
    });

    const event = broker.createPolicyEvaluatedEvent(evaluation, {
      seq: 1,
      taskId: 'task_creative_audit_001',
      runId: 'run_pevc_123',
      correlationId: 'corr_test_001'
    });

    expect(event.eventType).toBe('POLICY_EVALUATED');
    expect(event.seq).toBe(1);
    expect(event.taskId).toBe('task_creative_audit_001');
    expect(event.payload.decision).toBe('ALLOW');
    expect(event.payload.subject).toBe('agent_audit_01');

    // Valida contra o Zod schema de contratos
    const validated = PolicyEvaluatedEventSchema.parse(event);
    expect(validated.eventType).toBe('POLICY_EVALUATED');
  });

  it('aceita um TaskContract canônico completo de @adzhub/contracts', () => {
    const broker = new CapabilityBroker();
    const fullContract: TaskContract = {
      schemaVersion: '1.0.0',
      taskId: 'task_full_001',
      clientId: 'cli_housewhey',
      tenantId: 'tenant_main',
      goal: 'Analisar campanhas',
      timeframe: {
        since: '2026-08-01T00:00:00.000Z',
        until: '2026-08-20T23:59:59.000Z',
        timezone: 'America/Sao_Paulo'
      },
      effects: {
        allowed: ['read:meta', 'write:staging']
      },
      budgets: {
        maxSteps: 5,
        maxToolCalls: 10,
        maxTokens: 50000,
        maxCostBrl: 10,
        timeoutMs: 30000
      },
      successCriteria: {
        minEvidenceCoverage: 0.8,
        requireVerifiedClaims: true
      },
      approvalPolicy: {
        externalWritesRequireApproval: true,
        autoApproveReadOnly: true
      }
    };

    const result = broker.evaluate({
      subject: 'agent_main',
      task: fullContract,
      action: 'read:meta',
      resource: { type: 'meta_campaign', clientId: 'cli_housewhey' },
      environment: { mode: 'Governed' }
    });

    expect(result.decision).toBe('ALLOW');
  });
});

describe('@adzhub/policy - M5-02 Classificação de effects e risco', () => {
  const allRequiredEffects = [
    'read:memory',
    'read:meta',
    'read:crm',
    'read:app',
    'write:staging',
    'write:insight',
    'external_write',
    'demo:control'
  ] as const;

  it('suporta todos os 8 effects mínimos no EFFECT_CATALOG', () => {
    for (const effect of allRequiredEffects) {
      const meta = getEffectMetadata(effect);
      expect(meta).toBeDefined();
      expect(meta?.effect).toBe(effect);
      expect(['READ', 'INTERNAL_WRITE', 'EXTERNAL_WRITE', 'CONTROL']).toContain(meta?.category);
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(meta?.riskLevel);
    }
  });

  it('separa rigorosamente escrita externa (external_write) de persistência interna (write:staging/insight)', () => {
    // External write
    expect(isExternalMutationEffect('external_write')).toBe(true);
    expect(isInternalPersistenceEffect('external_write')).toBe(false);

    // Internal persistence
    expect(isInternalPersistenceEffect('write:staging')).toBe(true);
    expect(isExternalMutationEffect('write:staging')).toBe(false);
    expect(isInternalPersistenceEffect('write:insight')).toBe(true);
    expect(isExternalMutationEffect('write:insight')).toBe(false);

    // Reads
    expect(isReadOperationEffect('read:meta')).toBe(true);
    expect(isReadOperationEffect('read:crm')).toBe(true);
    expect(isExternalMutationEffect('read:meta')).toBe(false);
    expect(isInternalPersistenceEffect('read:meta')).toBe(false);
  });

  it('avalia previamente risco e approval policy antes da chamada', () => {
    // External write requer aprovação com policy ativa
    const evalExternal = evaluatePreExecutionRisk({
      effect: 'external_write',
      approvalPolicy: { externalWritesRequireApproval: true, autoApproveReadOnly: true },
      environment: { mode: 'Governed', env: 'production', externalWritesEnabled: true }
    });
    expect(evalExternal.requiresApproval).toBe(true);
    expect(evalExternal.riskLevel).toBe('HIGH');
    expect(evalExternal.isExternalMutation).toBe(true);

    // External write em modo demo sempre requer aprovação / bloqueio
    const evalDemo = evaluatePreExecutionRisk({
      effect: 'external_write',
      environment: { mode: 'Governed', env: 'demo', externalWritesEnabled: false }
    });
    expect(evalDemo.requiresApproval).toBe(true);

    // Read normal não requer aprovação
    const evalRead = evaluatePreExecutionRisk({
      effect: 'read:crm',
      approvalPolicy: { externalWritesRequireApproval: true, autoApproveReadOnly: true },
      environment: { mode: 'Governed', env: 'production' }
    });
    expect(evalRead.requiresApproval).toBe(false);
    expect(evalRead.riskLevel).toBe('LOW');

    // Efeito desconhecido é tratado como CRITICAL e requer aprovação
    const evalUnknown = evaluatePreExecutionRisk({
      effect: 'unknown:hack' as any
    });
    expect(evalUnknown.riskLevel).toBe('CRITICAL');
    expect(evalUnknown.requiresApproval).toBe(true);
  });

  it('garante que effect não pode ser inferido de texto ou payloads retornados por Tool', () => {
    // Declaração estática válida
    const validEffect = assertStaticEffect('read:meta', { ads: [{ id: '1' }] });
    expect(validEffect).toBe('read:meta');

    // Tentativa de injeção ou spoofing de effect no payload retornado pela Tool é rejeitada
    expect(() => {
      assertStaticEffect('read:meta', { effect: 'external_write', malicious: true });
    }).toThrow('Violação de segurança: tentativa de inferir/alterar effect');

    // Efeito inválido/não catalogado é rejeitado
    expect(() => {
      assertStaticEffect('unauthorized:exec');
    }).toThrow('Efeito inválido ou desconhecido');
  });
});

describe('@adzhub/policy - M5-03 Fluxo de approval', () => {
  const taskId = 'task_creative_audit_001';
  const runId = 'run_pevc_001';

  it('solicita e resolve aprovação informando scope, actor, expiry e task', () => {
    const manager = new ApprovalManager();
    const requested = manager.requestApproval({
      taskId,
      runId,
      scope: 'external_write:meta_ad:ad_123',
      requestedBy: 'operator_request_01',
      reason: 'Pausar anúncio degradado',
      ttlSeconds: 1800
    });

    expect(requested.approvalId).toMatch(/^appr_[a-f0-9]+$/);
    expect(requested.taskId).toBe(taskId);
    expect(requested.scope).toBe('external_write:meta_ad:ad_123');
    expect(requested.decision).toBe('REJECTED'); // Pendente
    expect(requested.expiresAt).toBeDefined();

    // Resolução por operador humano
    const resolved = manager.resolveApproval({
      approvalId: requested.approvalId,
      decision: 'APPROVED',
      actor: 'human_operator_barbieri',
      reason: 'Aprovado após conferência do CPA'
    });

    expect(resolved.decision).toBe('APPROVED');
    expect(resolved.actor).toBe('human_operator_barbieri');
    expect(resolved.decidedAt).toBeDefined();

    // Validação
    const validation = manager.validateApproval(resolved, {
      taskId,
      scope: 'external_write:meta_ad:ad_123'
    });
    expect(validation.valid).toBe(true);
    expect(validation.code).toBe('VALID');
  });

  it('rejeita aprovações genéricas (ex: wildcard *)', () => {
    const manager = new ApprovalManager();

    // Tentativa de solicitar escopo genérico wildcard
    expect(() => {
      manager.requestApproval({
        taskId,
        runId,
        scope: '*',
        requestedBy: 'operator_01'
      });
    }).toThrow("Escopos genéricos como wildcard (*) ou 'all' são estritamente proibidos.");

    // Tentativa de validar registro com escopo genérico
    const fakeGenericApproval = {
      schemaVersion: '1.0.0' as const,
      approvalId: 'appr_generic0123',
      taskId,
      runId,
      scope: 'ALL',
      actor: 'human_operator',
      decision: 'APPROVED' as const,
      requestedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    };

    const validation = manager.validateApproval(fakeGenericApproval, {
      taskId,
      scope: 'external_write:meta_ad:ad_123'
    });

    expect(validation.valid).toBe(false);
    expect(validation.code).toBe('GENERIC_SCOPE_REJECTED');
  });

  it('rejeita aprovações expiradas ou com mismatch de task', () => {
    const manager = new ApprovalManager();
    const pastDate = new Date(Date.now() - 60000).toISOString();

    const expiredApproval = {
      schemaVersion: '1.0.0' as const,
      approvalId: 'appr_expired012',
      taskId,
      runId,
      scope: 'external_write:meta_ad:ad_123',
      actor: 'human_operator',
      decision: 'APPROVED' as const,
      requestedAt: new Date(Date.now() - 120000).toISOString(),
      expiresAt: pastDate
    };

    const valExpired = manager.validateApproval(expiredApproval, {
      taskId,
      scope: 'external_write:meta_ad:ad_123'
    });
    expect(valExpired.valid).toBe(false);
    expect(valExpired.code).toBe('EXPIRED');

    // Mismatch de task
    const validTimeApproval = {
      ...expiredApproval,
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    };
    const valTaskMismatch = manager.validateApproval(validTimeApproval, {
      taskId: 'task_other_002', // Outra tarefa
      scope: 'external_write:meta_ad:ad_123'
    });
    expect(valTaskMismatch.valid).toBe(false);
    expect(valTaskMismatch.code).toBe('TASK_MISMATCH');
  });

  it('impede estritamente auto-aprovação presumida pelo modelo/agente', () => {
    const manager = new ApprovalManager();
    const requested = manager.requestApproval({
      taskId,
      runId,
      scope: 'external_write:meta_ad:ad_123',
      requestedBy: 'operator_01'
    });

    // Tentativa do modelo/agente conceder aprovação
    expect(() => {
      manager.resolveApproval({
        approvalId: requested.approvalId,
        decision: 'APPROVED',
        actor: 'agent_react_executor'
      });
    }).toThrow("Modelos ou agentes ('agent_react_executor') não possuem autoridade");

    expect(() => {
      manager.resolveApproval({
        approvalId: requested.approvalId,
        decision: 'APPROVED',
        actor: 'llm_gpt4'
      });
    }).toThrow("Modelos ou agentes ('llm_gpt4') não possuem autoridade");
  });

  it('mantém external write desabilitado no ambiente demo mesmo com aprovação', () => {
    const manager = new ApprovalManager();
    const validApproval = {
      schemaVersion: '1.0.0' as const,
      approvalId: 'appr_valid00123',
      taskId,
      runId,
      scope: 'external_write:meta_ad:ad_123',
      actor: 'human_supervisor',
      decision: 'APPROVED' as const,
      requestedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    };

    const evalDemo = manager.evaluateActionExecution({
      action: 'external_write',
      resource: 'meta_ad:ad_123',
      task: { taskId, clientId: 'cli_housewhey', allowedEffects: ['external_write'] },
      environment: { mode: 'Governed', env: 'demo', externalWritesEnabled: false },
      approval: validApproval
    });

    expect(evalDemo.allowed).toBe(false);
    expect(evalDemo.decision).toBe('DENY');
    expect(evalDemo.code).toBe('EXTERNAL_WRITE_DISABLED_IN_DEMO');
  });

  it('garante que Cenário S5 termina BLOCKED / APPROVAL_REQUIRED na ausência de aprovação', () => {
    const manager = new ApprovalManager();
    const evalS5 = manager.evaluateActionExecution({
      action: 'external_write',
      resource: 'meta_ad:ad_123',
      task: {
        taskId: 'task_s5_pause_ad',
        clientId: 'cli_housewhey',
        allowedEffects: ['external_write'],
        approvalPolicy: { externalWritesRequireApproval: true }
      },
      environment: { mode: 'Governed', env: 'production', externalWritesEnabled: true },
      approval: null // Sem aprovação
    });

    expect(evalS5.allowed).toBe(false);
    expect(evalS5.decision).toBe('REQUIRES_APPROVAL');
    expect(evalS5.code).toBe('APPROVAL_REQUIRED');
  });
});

describe('ÉPICO 4: Governança, Autoridade JIT & Hash-Binding (@adzhub/policy)', () => {
  const taskId = 'task_housewhey_ops_001';
  const runId = 'run_pevc_m4_001';

  const taskContext: PolicyEvaluationRequest['task'] = {
    taskId,
    clientId: 'cli_housewhey',
    allowedEffects: ['read:meta', 'write:staging', 'external_write'],
    approvalPolicy: { externalWritesRequireApproval: true }
  };

  const environment: PolicyEvaluationRequest['environment'] = {
    mode: 'Governed',
    env: 'production',
    externalWritesEnabled: true
  };

  describe('Task 4.1 — Validação JIT no CapabilityBroker', () => {
    it('executa validação JIT completa com todas as dimensões autorizadas e recurso fresco', () => {
      const broker = new CapabilityBroker();
      const jitResult = broker.evaluateJustInTime({
        subject: { id: 'agent_executor_01', role: 'executor' },
        task: taskContext,
        action: 'read:meta',
        resource: 'meta_ads:ad:ad_namorados_casal_03',
        environment,
        resourceFreshnessSeconds: 15,
        maxFreshnessSeconds: 300
      });

      expect(jitResult.decision).toBe('ALLOW');
      expect(jitResult.code).toBe('POLICY_ALLOWED');
      expect(jitResult.isFresh).toBe(true);
      expect(jitResult.hashMatch).toBe(true);
      expect(jitResult.jitValidatedAt).toBeDefined();
    });

    it('rejeita ação via JIT quando recurso está obsoleto (Invariante 10: Freshness Pré-Write)', () => {
      const broker = new CapabilityBroker();
      const jitResult = broker.evaluateJustInTime({
        subject: { id: 'agent_executor_01', role: 'executor' },
        task: taskContext,
        action: 'read:meta',
        resource: 'meta_ads:ad:ad_namorados_casal_03',
        environment,
        resourceFreshnessSeconds: 450, // Lido há 450s
        maxFreshnessSeconds: 300 // Limite de 300s
      });

      expect(jitResult.decision).toBe('DENY');
      expect(jitResult.code).toBe('RESOURCE_STALE');
      expect(jitResult.isFresh).toBe(false);
      expect(jitResult.reason).toContain('Invariante 10 violada');
      expect(jitResult.reason).toContain('obsoleto');
    });

    it('bloqueia JIT e exige aprovação quando ação é external_write sem aprovação', () => {
      const broker = new CapabilityBroker();
      const jitResult = broker.evaluateJustInTime({
        subject: { id: 'agent_executor_01', role: 'executor' },
        task: taskContext,
        action: 'external_write',
        resource: 'meta_ads:ad:ad_namorados_casal_03',
        environment
      });

      expect(jitResult.decision).toBe('REQUIRES_APPROVAL');
      expect(jitResult.code).toBe('APPROVAL_REQUIRED');
    });
  });

  describe('Task 4.2 — Gestor de Aprovação com Hash-Binding e Segregação de Funções', () => {
    const proposalPayload = {
      target_status: 'PAUSED',
      daily_budget_brl: 0,
      reason: 'Fadiga criativa comprovada'
    };

    const previousState = {
      ad_id: 'ad_namorados_casal_03',
      status: 'ACTIVE',
      spend_brl: 3450.0
    };

    it('vincula criptograficamente a aprovação ao hash SHA-256 da proposta', () => {
      const manager = new ApprovalManager();
      const requested = manager.requestApproval({
        taskId,
        runId,
        scope: 'external_write:meta_ads:ad:ad_namorados_casal_03',
        requestedBy: 'agent_recommender',
        proposerId: 'agent_recommender',
        proposal: {
          resource: 'meta_ads:ad:ad_namorados_casal_03',
          operation: 'PAUSE',
          payload: proposalPayload,
          previousStateSnapshot: previousState
        }
      });

      expect(requested.proposalHash).toBeDefined();
      expect(requested.proposalHash).toHaveLength(64);
      expect(requested.proposerId).toBe('agent_recommender');

      // Resolução por operador humano com o hash correto
      const resolved = manager.resolveApproval({
        approvalId: requested.approvalId,
        decision: 'APPROVED',
        actor: 'human_operator_barbieri',
        signedProposalHash: requested.proposalHash
      });

      expect(resolved.decision).toBe('APPROVED');
      expect(resolved.proposalHash).toBe(requested.proposalHash);

      // Validação com hash idêntico -> SUCESSO
      const validation = manager.validateApproval(resolved, {
        taskId,
        scope: 'external_write:meta_ads:ad:ad_namorados_casal_03',
        proposalHash: requested.proposalHash,
        proposerId: 'agent_recommender'
      });

      expect(validation.valid).toBe(true);
      expect(validation.code).toBe('VALID');
    });

    it('invalida a aprovação se o payload for alterado pelo agente (Hash Mismatch / Invariante 6)', () => {
      const manager = new ApprovalManager();
      const requested = manager.requestApproval({
        taskId,
        runId,
        scope: 'external_write:meta_ads:ad:ad_namorados_casal_03',
        requestedBy: 'agent_recommender',
        proposal: {
          resource: 'meta_ads:ad:ad_namorados_casal_03',
          operation: 'PAUSE',
          payload: proposalPayload,
          previousStateSnapshot: previousState
        }
      });

      const originalHash = requested.proposalHash!;

      const resolved = manager.resolveApproval({
        approvalId: requested.approvalId,
        decision: 'APPROVED',
        actor: 'human_operator_barbieri',
        signedProposalHash: originalHash
      });

      // Tentativa do agente de alterar 1 centavo ou campo no payload antes de executar
      const tamperedHash = 'f'.repeat(64); // Hash adulterado

      const validation = manager.validateApproval(resolved, {
        taskId,
        scope: 'external_write:meta_ads:ad:ad_namorados_casal_03',
        proposalHash: tamperedHash, // Diverge do hash assinado pelo humano
        proposerId: 'agent_recommender'
      });

      expect(validation.valid).toBe(false);
      expect(validation.code).toBe('PROPOSAL_HASH_MISMATCH');
      expect(validation.reason).toContain('Hash da proposta divergiu');
    });

    it('rejeita auto-aprovação pelo proponente da proposta (Segregação de Funções / Invariante 11)', () => {
      const manager = new ApprovalManager();
      const requested = manager.requestApproval({
        taskId,
        runId,
        scope: 'external_write:meta_ads:ad:ad_namorados_casal_03',
        requestedBy: 'agent_recommender',
        proposerId: 'agent_recommender',
        proposal: {
          resource: 'meta_ads:ad:ad_namorados_casal_03',
          operation: 'PAUSE',
          payload: proposalPayload,
          previousStateSnapshot: previousState
        }
      });

      // Tentativa do próprio proponente aprovar a si mesmo
      expect(() => {
        manager.resolveApproval({
          approvalId: requested.approvalId,
          decision: 'APPROVED',
          actor: 'agent_recommender', // Mesmo ID do proponente!
          signedProposalHash: requested.proposalHash
        });
      }).toThrow(/Violação de segregação de funções/);
    });

    it('integra CapabilityBroker e ApprovalManager na validação JIT com hash-binding', () => {
      const manager = new ApprovalManager();
      const broker = new CapabilityBroker([], manager);

      const requested = manager.requestApproval({
        taskId,
        runId,
        scope: 'external_write:meta_ads:ad:ad_namorados_casal_03',
        requestedBy: 'agent_recommender',
        proposerId: 'agent_recommender',
        proposal: {
          resource: 'meta_ads:ad:ad_namorados_casal_03',
          operation: 'PAUSE',
          payload: proposalPayload,
          previousStateSnapshot: previousState
        }
      });

      const resolved = manager.resolveApproval({
        approvalId: requested.approvalId,
        decision: 'APPROVED',
        actor: 'human_operator_barbieri',
        signedProposalHash: requested.proposalHash
      });

      // JIT com aprovação e hash corretos
      const jitSuccess = broker.evaluateJustInTime({
        subject: { id: 'agent_executor_01', role: 'executor' },
        task: taskContext,
        action: 'external_write',
        resource: 'meta_ads:ad:ad_namorados_casal_03',
        environment,
        approval: resolved,
        proposalHash: requested.proposalHash,
        proposerId: 'agent_recommender',
        resourceFreshnessSeconds: 20,
        maxFreshnessSeconds: 300
      });

      expect(jitSuccess.decision).toBe('ALLOW');
      expect(jitSuccess.code).toBe('POLICY_ALLOWED');
      expect(jitSuccess.hashMatch).toBe(true);

      // JIT com hash adulterado
      const jitTampered = broker.evaluateJustInTime({
        subject: { id: 'agent_executor_01', role: 'executor' },
        task: taskContext,
        action: 'external_write',
        resource: 'meta_ads:ad:ad_namorados_casal_03',
        environment,
        approval: resolved,
        proposalHash: 'e'.repeat(64), // Adulterado
        proposerId: 'agent_recommender',
        resourceFreshnessSeconds: 20,
        maxFreshnessSeconds: 300
      });

      expect(jitTampered.decision).toBe('REQUIRES_APPROVAL');
      expect(jitTampered.code).toBe('PROPOSAL_HASH_MISMATCH');
      expect(jitTampered.hashMatch).toBe(false);
    });
  });
});

