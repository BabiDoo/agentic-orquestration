import { describe, it, expect } from 'vitest';
import {
  UtmNormalizer,
  calculateRoas,
  calculateCpaPerSale,
  calculateCpaPerLead,
  safeDivide,
  toCents,
  fromCents,
  NOT_COMPUTABLE_SENTINEL
} from '@adzhub/data';
import { EvidenceScorer, DEFAULT_SCORING_THRESHOLDS } from '@adzhub/verify';
import { CapabilityBroker } from '@adzhub/policy';
import {
  BudgetLedger,
  BudgetExceededError,
  createInitialPevcState,
  pevcReducer,
  InvalidStateTransitionError
} from '@adzhub/runtime';
import { RuntimeErrorCodeSchema, RuntimeErrorCode, TaskBudgets } from '@adzhub/contracts';

describe('M7-01 — Testes Unitários de Regras Críticas', () => {
  describe('1. Normalização de UTM e Extração Determinística', () => {
    const normalizer = new UtmNormalizer();

    it('deve normalizar parâmetros UTM em maiúsculas, espaços e caracteres mistos', () => {
      const result = normalizer.normalize('  Housewhey Promo 2026 ');
      expect(result.normalizedValue).toBe('housewhey_promo_2026');
      expect(result.isValid).toBe(true);
      expect(result.isMissing).toBe(false);
    });

    it('deve colapsar múltiplos espaços e converter para underscore', () => {
      const result = normalizer.normalize('whey   isolado \t\n baunilha');
      expect(result.normalizedValue).toBe('whey_isolado_baunilha');
    });

    it('deve decodificar strings com URL percent-encoding', () => {
      const encodedResult = normalizer.normalize('ad%20whey%20baunilha%2001');
      expect(encodedResult.normalizedValue).toBe('ad_whey_baunilha_01');
    });
  });

  describe('2. Proteção contra Divisão por Zero em Métricas Financeiras e de Performance', () => {
    it('ROAS deve retornar NOT_COMPUTABLE quando spend é 0, sem NaN ou Infinity', () => {
      const roas = calculateRoas(1500, 0);
      expect(roas.status).toBe('NOT_COMPUTABLE');
      expect(roas.value).toBeNull();
      expect(roas.formatted).toBe(NOT_COMPUTABLE_SENTINEL);
      expect(roas.reason).toBe('DIVISION_BY_ZERO');
    });

    it('CPA deve retornar NOT_COMPUTABLE quando sales/leads é 0, sem NaN ou Infinity', () => {
      const cpaSale = calculateCpaPerSale(1000, 0);
      expect(cpaSale.status).toBe('NOT_COMPUTABLE');
      expect(cpaSale.value).toBeNull();
      expect(cpaSale.reason).toBe('DIVISION_BY_ZERO');

      const cpaLead = calculateCpaPerLead(500, 0);
      expect(cpaLead.status).toBe('NOT_COMPUTABLE');
      expect(cpaLead.value).toBeNull();
      expect(cpaLead.reason).toBe('DIVISION_BY_ZERO');
    });

    it('safeDivide deve retornar NOT_COMPUTABLE para denominador zero e calcular com segurança para valores válidos', () => {
      const zeroDiv = safeDivide(100, 0);
      expect(zeroDiv.status).toBe('NOT_COMPUTABLE');
      expect(zeroDiv.isComputable).toBe(false);

      const validDiv = safeDivide(100, 4);
      expect(validDiv.status).toBe('COMPUTED');
      expect(validDiv.isComputable).toBe(true);
      expect(validDiv.value).toBe(25);
    });

    it('conversão segura para centavos toCents / fromCents impede dízimas e imprecisões binárias', () => {
      const cents = toCents(19.99);
      expect(cents).toBe(1999);
      expect(fromCents(cents)).toBe(19.99);
      expect(toCents(0.1) + toCents(0.2)).toBe(30);
      expect(fromCents(30)).toBe(0.3);
    });
  });

  describe('3. Evidence Scoring e Thresholds de Governança', () => {
    const scorer = new EvidenceScorer(DEFAULT_SCORING_THRESHOLDS);

    it('composite score >= 0.80 deve classificar com RECOMMENDATION_ALLOWED e robusto', () => {
      const score = scorer.evaluate({
        freshnessScore: 0.95,
        consistencyScore: 0.9,
        coverageScore: 0.85,
        salesCount: 20
      });
      expect(score.compositeScore).toBeGreaterThanOrEqual(0.8);
      expect(score.decision).toBe('RECOMMENDATION_ALLOWED');
      expect(score.sampleMaturity).toBe('ROBUST');
      expect(score.isExploratory).toBe(false);
    });

    it('composite score 0.50–0.79 deve manter status PROVISIONAL_ONLY', () => {
      const score = scorer.evaluate({
        freshnessScore: 0.65,
        consistencyScore: 0.7,
        coverageScore: 0.6,
        salesCount: 10
      });
      expect(score.compositeScore).toBeGreaterThanOrEqual(0.5);
      expect(score.compositeScore).toBeLessThan(0.8);
      expect(score.decision).toBe('PROVISIONAL_ONLY');
    });

    it('composite score < 0.50 deve exigir ABSTENTION_REQUIRED', () => {
      const score = scorer.evaluate({
        freshnessScore: 0.3,
        consistencyScore: 0.4,
        coverageScore: 0.35,
        salesCount: 15
      });
      expect(score.compositeScore).toBeLessThan(0.5);
      expect(score.decision).toBe('ABSTENTION_REQUIRED');
    });

    it('amostra < 3 vendas/conversões deve marcar como exploratório', () => {
      const score = scorer.evaluate({
        freshnessScore: 1.0,
        consistencyScore: 1.0,
        coverageScore: 1.0,
        salesCount: 2
      });
      expect(score.isExploratory).toBe(true);
      expect(score.sampleMaturity).toBe('EXPLORATORY');
    });
  });

  describe('4. Budget Ledger e Limites de Custo/Tokens', () => {
    const defaultBudgets: TaskBudgets = {
      maxSteps: 10,
      maxToolCalls: 10,
      maxTokens: 5000,
      maxCostBrl: 1.0,
      timeoutMs: 10000
    };

    it('deve debitar tokens e custo corretamente através do fluxo de 2 fases', () => {
      const ledger = new BudgetLedger(defaultBudgets);
      ledger.reserve('res_1', { tokens: 1000, costBrl: 0.05 });
      ledger.reconcile('res_1', { tokens: 800, costBrl: 0.04 });

      const metrics = ledger.getMetrics();
      expect(metrics.used.tokens).toBe(800);
      expect(metrics.used.costBrl).toBeCloseTo(0.04, 4);
      expect(metrics.available.tokens).toBe(4200);
      expect(metrics.available.costBrl).toBeCloseTo(0.96, 4);
    });

    it('deve lançar BudgetExceededError ao ultrapassar qualquer dimensão de limite', () => {
      const ledger = new BudgetLedger(defaultBudgets);
      expect(() => {
        ledger.reserve('res_excess', { tokens: 10000 });
      }).toThrow(BudgetExceededError);
    });

    it('orçamento disponível nunca pode ser negativo', () => {
      const ledger = new BudgetLedger(defaultBudgets);
      ledger.reserve('res_full', { tokens: 5000 });
      ledger.reconcile('res_full', { tokens: 5000 });

      const metrics = ledger.getMetrics();
      expect(metrics.available.tokens).toBe(0);
      expect(metrics.available.tokens).toBeGreaterThanOrEqual(0);
      expect(metrics.available.costBrl).toBeGreaterThanOrEqual(0);
    });
  });

  describe('5. Capability Broker e Avaliação de Policy (Deny-by-default)', () => {
    it('deve permitir efeito autorizado dentro do escopo correto', () => {
      const broker = new CapabilityBroker();
      const evalResult = broker.evaluate({
        subject: { id: 'agent_01', role: 'agent', type: 'agent' },
        task: {
          taskId: 'task_01',
          clientId: 'client_alpha',
          allowedEffects: ['read:meta', 'read:crm', 'write:staging']
        },
        action: 'read:meta',
        resource: { type: 'marketing_data', clientId: 'client_alpha' },
        environment: { mode: 'Governed', env: 'demo' }
      });

      expect(evalResult.decision).toBe('ALLOW');
      expect(evalResult.code).toBe('POLICY_ALLOWED');
    });

    it('deve negar com POLICY_DENIED quando houver discrepância de tenant (cross-client)', () => {
      const broker = new CapabilityBroker();
      const evalResult = broker.evaluate({
        subject: { id: 'agent_01', role: 'agent' },
        task: {
          taskId: 'task_01',
          clientId: 'client_alpha',
          allowedEffects: ['read:meta']
        },
        action: 'read:meta',
        resource: { type: 'marketing_data', clientId: 'client_beta' }, // Cross-tenant
        environment: { mode: 'Governed' }
      });

      expect(evalResult.decision).toBe('DENY');
      expect(evalResult.code).toBe('POLICY_DENIED');
    });

    it('efeito external_write deve exigir APPROVAL_REQUIRED no Governed', () => {
      const broker = new CapabilityBroker();
      const evalResult = broker.evaluate({
        subject: { id: 'agent_01', role: 'agent' },
        task: {
          taskId: 'task_01',
          clientId: 'client_alpha',
          allowedEffects: ['read:meta', 'external_write'],
          approvalPolicy: { externalWritesRequireApproval: true }
        },
        action: 'external_write',
        resource: { type: 'meta_campaign', id: 'camp_101', clientId: 'client_alpha' },
        environment: { mode: 'Governed', env: 'demo', externalWritesEnabled: false }
      });

      expect(evalResult.decision).toBe('REQUIRES_APPROVAL');
      expect(evalResult.code).toBe('APPROVAL_REQUIRED');
    });
  });

  describe('6. Máquina de Estados PEV-C e Transições Válidas', () => {
    const taskId = 'task_crit_01';
    const runId = 'run_crit_01';

    it('deve executar o ciclo canônico PLAN -> EXECUTE -> VERIFY -> COMMIT -> COMPLETED com sucesso', () => {
      let state = createInitialPevcState({ taskId, runId });
      expect(state.currentPhase).toBe('PLAN');

      state = pevcReducer(state, {
        type: 'INITIALIZE',
        timestamp: new Date().toISOString()
      }).nextState;
      expect(state.currentPhase).toBe('PLAN');

      state = pevcReducer(state, {
        type: 'PLAN_SUBMITTED',
        plan: { steps: [] },
        timestamp: new Date().toISOString()
      }).nextState;
      expect(state.currentPhase).toBe('EXECUTE');

      state = pevcReducer(state, {
        type: 'EXECUTION_COMPLETED',
        observations: [],
        timestamp: new Date().toISOString()
      }).nextState;
      expect(state.currentPhase).toBe('VERIFY');

      state = pevcReducer(state, {
        type: 'VERIFICATION_PASSED',
        evidences: [],
        timestamp: new Date().toISOString()
      }).nextState;
      expect(state.currentPhase).toBe('COMMIT');

      state = pevcReducer(state, {
        type: 'COMMIT_COMPLETED',
        commitResult: { commitId: 'c1' },
        timestamp: new Date().toISOString()
      }).nextState;
      expect(state.currentPhase).toBe('COMPLETED');
    });

    it('deve proibir transições inválidas levantando InvalidStateTransitionError', () => {
      const state = createInitialPevcState({ taskId, runId });
      expect(() => {
        pevcReducer(state, {
          type: 'COMMIT_COMPLETED',
          commitResult: {},
          timestamp: new Date().toISOString()
        });
      }).toThrow(InvalidStateTransitionError);
    });

    it('falha recuperável deve transitar para ATTRIBUTE e permitir REPLAN', () => {
      let state = createInitialPevcState({ taskId, runId, maxReplans: 2 });
      state = pevcReducer(state, {
        type: 'INITIALIZE',
        timestamp: new Date().toISOString()
      }).nextState;
      state = pevcReducer(state, {
        type: 'PLAN_SUBMITTED',
        plan: {},
        timestamp: new Date().toISOString()
      }).nextState;

      const failRes = pevcReducer(state, {
        type: 'FAIL_STEP',
        error: {
          code: 'TOOL_ERROR',
          category: 'integration',
          recoverability: 'RECOVERABLE',
          safeMessage: 'CRM indisponível temporariamente'
        },
        timestamp: new Date().toISOString()
      });
      state = failRes.nextState;
      expect(state.currentPhase).toBe('ATTRIBUTE');

      const replanRes = pevcReducer(state, {
        type: 'ATTRIBUTE_RESOLVED',
        diagnostic: state.lastError!,
        timestamp: new Date().toISOString()
      });
      state = replanRes.nextState;
      expect(state.currentPhase).toBe('REPLAN');
    });
  });

  describe('7. Cobertura Representativa de Todos os Códigos Canônicos de Falha', () => {
    const errorCodes: RuntimeErrorCode[] = [
      'INVALID_TASK',
      'BUDGET_EXCEEDED',
      'POLICY_DENIED',
      'APPROVAL_REQUIRED',
      'INVALID_SCHEMA',
      'POSTCONDITION_FAILED',
      'PERIOD_MISMATCH',
      'SEMANTIC_CONFLICT',
      'LOW_COVERAGE',
      'CIRCUIT_OPEN',
      'TOOL_TIMEOUT',
      'TOOL_ERROR',
      'PROMPT_INJECTION_DETECTED',
      'COMMIT_REJECTED',
      'INTERNAL_ERROR'
    ];

    it.each(errorCodes)(
      'o código de erro %s deve ser validado pelo RuntimeErrorCodeSchema',
      (code) => {
        const parseResult = RuntimeErrorCodeSchema.safeParse(code);
        expect(parseResult.success).toBe(true);
        expect(parseResult.data).toBe(code);
      }
    );
  });
});
