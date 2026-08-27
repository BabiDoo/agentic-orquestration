import { describe, it, expect } from 'vitest';
import {
  TaskIntentionSchema,
  TaskIntention,
  CampaignOperationTypeSchema,
  CampaignOperationType,
  CampaignOperationSpecSchema,
  CampaignOperationSpec,
  PostconditionSpecSchema,
  PostconditionSpec,
  PostconditionSpecInput,
  RollbackSpecSchema,
  RollbackSpec,
  calculateProposalHash,
  generateDeterministicIdempotencyKey,
  validateTaskContract,
  calculateContractHash,
  freezeTaskContract,
  OperationalValidators,
  TaskContract
} from './index.js';

describe('ÉPICO 1: Contratos & Unificação de Operações (packages/contracts)', () => {
  describe('Task 1.1 — Schema de Intenções Prioritárias & Operações Genéricas', () => {
    it('deve validar todas as 8 intenções prioritárias do ciclo PEV-C', () => {
      const canonicalIntentions: TaskIntention[] = [
        'PERFORMANCE_RECONCILIATION',
        'ACCOUNT_DIAGNOSIS',
        'DATA_QUALITY_AUDIT',
        'MEETING_AGENDA_GENERATION',
        'CREATIVE_BRIEF_GENERATION',
        'ACTION_RECOMMENDATION',
        'CAMPAIGN_OPERATION',
        'EXECUTION_TRACE_QUERY'
      ];

      for (const intention of canonicalIntentions) {
        expect(TaskIntentionSchema.parse(intention)).toBe(intention);
        expect(OperationalValidators.validateTaskIntention(intention)).toBe(intention);
      }
    });

    it('deve validar intenções complementares/delegativas suportadas', () => {
      const complementaryIntentions: TaskIntention[] = [
        'PROPOSAL_DELEGATION',
        'EXTERNAL_WRITE_PAUSE',
        'EXTERNAL_WRITE_REACTIVATE',
        'ANALYTICAL_AUDIT',
        'COPY_GENERATION',
        'GOVERNANCE_TEAM_QUERY'
      ];

      for (const intention of complementaryIntentions) {
        expect(TaskIntentionSchema.parse(intention)).toBe(intention);
      }
    });

    it('deve rejeitar intenções inválidas ou desconhecidas', () => {
      expect(() => TaskIntentionSchema.parse('INVALID_INTENTION')).toThrow();
      expect(() => OperationalValidators.validateTaskIntention('')).toThrow();
    });

    it('deve validar todos os 6 tipos de operações de campanha (CampaignOperationType)', () => {
      const operations: CampaignOperationType[] = [
        'PAUSE',
        'REACTIVATE',
        'UPDATE_BUDGET',
        'UPDATE_SCHEDULE',
        'CREATE_EXPERIMENT',
        'PUBLISH_CREATIVE'
      ];

      for (const op of operations) {
        expect(CampaignOperationTypeSchema.parse(op)).toBe(op);
      }
    });

    it('deve validar especificação estruturada de operação de campanha (CampaignOperationSpec)', () => {
      const pauseSpec: CampaignOperationSpec = {
        operation: 'PAUSE',
        targetType: 'AD',
        targetId: 'ad_housewhey_casal_03',
        parameters: { reason: 'CPA acima do dobro da meta histórica', currentCpa: 65.4 }
      };

      const budgetSpec: CampaignOperationSpec = {
        operation: 'UPDATE_BUDGET',
        targetType: 'CAMPAIGN',
        targetId: 'camp_whey_isolado_top_funnel',
        parameters: { dailyBudgetBrl: 350.0, previousBudgetBrl: 250.0 }
      };

      const validatedPause = OperationalValidators.validateCampaignOperationSpec(pauseSpec);
      expect(validatedPause.operation).toBe('PAUSE');
      expect(validatedPause.targetType).toBe('AD');

      const validatedBudget = CampaignOperationSpecSchema.parse(budgetSpec);
      expect(validatedBudget.operation).toBe('UPDATE_BUDGET');
      expect(validatedBudget.parameters?.dailyBudgetBrl).toBe(350.0);
    });

    it('deve rejeitar CampaignOperationSpec sem targetId ou com targetType inválido', () => {
      expect(() =>
        OperationalValidators.validateCampaignOperationSpec({
          operation: 'PAUSE',
          targetType: 'UNKNOWN_TARGET',
          targetId: 'ad_123'
        })
      ).toThrow();

      expect(() =>
        OperationalValidators.validateCampaignOperationSpec({
          operation: 'PAUSE',
          targetType: 'AD',
          targetId: ''
        })
      ).toThrow();
    });
  });

  describe('Task 1.2 — Tipagem de Pós-Condição, Idempotência, Reversibilidade e Hash-Binding', () => {
    it('deve validar PostconditionSpec com operador padrão EQUALS e customizados', () => {
      const defaultPostcondition: PostconditionSpecInput = {
        checkTool: 'meta.get_ad',
        targetField: 'status',
        expectedValue: 'PAUSED'
      };

      const validatedDefault =
        OperationalValidators.validatePostconditionSpec(defaultPostcondition);
      expect(validatedDefault.comparisonOperator).toBe('EQUALS');
      expect(validatedDefault.checkTool).toBe('meta.get_ad');

      const complexPostcondition: PostconditionSpec = {
        checkTool: 'meta.get_campaign',
        targetField: 'daily_budget',
        expectedValue: 350.0,
        comparisonOperator: 'GREATER_OR_EQUAL',
        timeoutSeconds: 30,
        maxRetries: 3
      };

      const validatedComplex = PostconditionSpecSchema.parse(complexPostcondition);
      expect(validatedComplex.comparisonOperator).toBe('GREATER_OR_EQUAL');
      expect(validatedComplex.timeoutSeconds).toBe(30);
      expect(validatedComplex.maxRetries).toBe(3);
    });

    it('deve validar RollbackSpec para operações reversíveis e irreversíveis', () => {
      const reversibleRollback: RollbackSpec = {
        isReversible: true,
        rollbackOp: 'meta.reactivate_ad',
        previousStateSnapshot: { status: 'ACTIVE', dailyBudget: 250.0 },
        rollbackWindowSeconds: 86400
      };

      const validatedReversible = OperationalValidators.validateRollbackSpec(reversibleRollback);
      expect(validatedReversible.isReversible).toBe(true);
      expect(validatedReversible.rollbackOp).toBe('meta.reactivate_ad');
      expect(validatedReversible.previousStateSnapshot?.status).toBe('ACTIVE');

      const nonReversibleRollback: RollbackSpec = {
        isReversible: false
      };

      const validatedNonReversible = RollbackSpecSchema.parse(nonReversibleRollback);
      expect(validatedNonReversible.isReversible).toBe(false);
      expect(validatedNonReversible.rollbackOp).toBeUndefined();
    });

    it('deve gerar hash SHA-256 determinístico de proposta operacional (proposalHash)', () => {
      const proposalA = {
        resource: 'meta_ads:ad:ad_housewhey_03',
        operation: 'UPDATE_BUDGET',
        payload: { newBudgetBrl: 400.0, currency: 'BRL' },
        previousStateSnapshot: { currentBudgetBrl: 250.0 }
      };

      // Proposta com chaves em ordem diferente no payload
      const proposalAPermuted = {
        operation: 'UPDATE_BUDGET',
        resource: 'meta_ads:ad:ad_housewhey_03',
        previousStateSnapshot: { currentBudgetBrl: 250.0 },
        payload: { currency: 'BRL', newBudgetBrl: 400.0 }
      };

      const hash1 = calculateProposalHash(proposalA);
      const hash2 = calculateProposalHash(proposalAPermuted);

      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);

      // Mutação deve gerar hash diferente (Invariante 6: Aprovação Vinculada ao Hash)
      const mutatedProposal = {
        ...proposalA,
        payload: { newBudgetBrl: 400.01, currency: 'BRL' }
      };
      const mutatedHash = calculateProposalHash(mutatedProposal);
      expect(mutatedHash).not.toBe(hash1);
    });

    it('deve gerar chave de idempotência determinística vinculada a taskId, operação e proposalHash', () => {
      const taskId = 'task_s5_budget_update';
      const operation = 'UPDATE_BUDGET';
      const proposalHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

      const key1 = generateDeterministicIdempotencyKey(taskId, operation, proposalHash);
      const key2 = generateDeterministicIdempotencyKey(taskId, operation, proposalHash);

      expect(key1).toHaveLength(64);
      expect(key1).toBe(key2);

      // Chave diferente para task diferente
      const keyOtherTask = generateDeterministicIdempotencyKey(
        'task_other',
        operation,
        proposalHash
      );
      expect(keyOtherTask).not.toBe(key1);
    });

    it('deve validar e congelar TaskContract completo com os novos campos operacionais', () => {
      const proposal = {
        resource: 'meta_ads:ad:ad_casal_03',
        operation: 'PAUSE',
        payload: { targetStatus: 'PAUSED' },
        previousStateSnapshot: { targetStatus: 'ACTIVE' }
      };
      const proposalHash = calculateProposalHash(proposal);
      const idempotencyKey = generateDeterministicIdempotencyKey(
        'task_op_housewhey_01',
        'PAUSE',
        proposalHash
      );

      const contractData: TaskContract = {
        schemaVersion: '1.0.0',
        taskId: 'task_op_housewhey_01',
        clientId: 'cli_housewhey',
        tenantId: 'meta_business',
        goal: 'Pausar anúncio casal_03 por fadiga criativa e CPA acima da tolerância',
        intention: 'CAMPAIGN_OPERATION',
        campaignOperation: {
          operation: 'PAUSE',
          targetType: 'AD',
          targetId: 'ad_casal_03',
          parameters: { reason: 'CPA R$ 65,40 > R$ 30,00' }
        },
        timeframe: {
          since: '2026-08-01T00:00:00.000Z',
          until: '2026-08-20T23:59:59.000Z',
          timezone: 'America/Sao_Paulo'
        },
        effects: {
          allowed: ['read:meta', 'external_write']
        },
        budgets: {
          maxSteps: 5,
          maxToolCalls: 4,
          maxTokens: 4000,
          maxCostBrl: 1.0,
          timeoutMs: 15000
        },
        successCriteria: {
          minEvidenceCoverage: 0.9,
          requireVerifiedClaims: true
        },
        approvalPolicy: {
          externalWritesRequireApproval: true,
          autoApproveReadOnly: true
        },
        expectedPostcondition: {
          checkTool: 'meta.get_ad',
          targetField: 'status',
          expectedValue: 'PAUSED',
          comparisonOperator: 'EQUALS'
        },
        idempotencyKey,
        rollbackSpec: {
          isReversible: true,
          rollbackOp: 'meta.reactivate_ad',
          previousStateSnapshot: { status: 'ACTIVE' },
          rollbackWindowSeconds: 86400
        },
        proposalHash,
        metadata: {
          operator: 'Aline Rocha',
          authorizedBy: 'Marcos Silva'
        }
      };

      const validated = validateTaskContract(contractData);
      expect(validated.intention).toBe('CAMPAIGN_OPERATION');
      expect(validated.campaignOperation?.operation).toBe('PAUSE');
      expect(validated.expectedPostcondition?.checkTool).toBe('meta.get_ad');
      expect(validated.rollbackSpec?.isReversible).toBe(true);
      expect(validated.proposalHash).toBe(proposalHash);

      const contractHash = calculateContractHash(validated);
      expect(contractHash).toHaveLength(64);

      const frozen = freezeTaskContract(validated);
      expect(Object.isFrozen(frozen)).toBe(true);
      expect(Object.isFrozen(frozen.campaignOperation)).toBe(true);
      expect(Object.isFrozen(frozen.expectedPostcondition)).toBe(true);
      expect(Object.isFrozen(frozen.rollbackSpec)).toBe(true);

      expect(() => {
        (frozen as unknown as { goal: string }).goal = 'Tentativa de alteração pós-aceite';
      }).toThrow();
    });
  });
});
