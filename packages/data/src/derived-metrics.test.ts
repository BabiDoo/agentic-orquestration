import { describe, it, expect } from 'vitest';
import {
  safeDivide,
  calculateCpaPerSale,
  calculateCpaPerLead,
  calculateRoas,
  calculateJoinCoverage,
  calculateEvidenceCoverage,
  classifyCoverageLevel,
  calculateDerivedAdMetrics,
  computeAllDerivedMetrics,
  toCents,
  fromCents,
  addMoneyBrl,
  subtractMoneyBrl,
  multiplyMoneyBrl,
  formatMoneyBrl,
  NOT_COMPUTABLE_SENTINEL,
  getCanonicalNormalizedDataset
} from './index.js';

describe('@adzhub/data - M1-06: Calcular Métricas Derivadas com Segurança', () => {
  const canonicalDataset = getCanonicalNormalizedDataset();

  describe('1. Aritmética Monetária Segura (Centavos Inteiros sem Ponto Flutuante Binário)', () => {
    it('deve eliminar imprecisões binárias clássicas do IEEE-754 (0.1 + 0.2)', () => {
      // No JS puro: 0.1 + 0.2 === 0.30000000000000004
      expect(0.1 + 0.2).not.toBe(0.3);

      // Com nossa função monetária:
      const safeSum = addMoneyBrl(0.1, 0.2);
      expect(safeSum).toBe(0.3);
    });

    it('deve converter com exatidão entre reais e centavos inteiros', () => {
      expect(toCents(220.5)).toBe(22050);
      expect(toCents(19.99)).toBe(1999);
      expect(toCents(0)).toBe(0);

      expect(fromCents(22050)).toBe(220.5);
      expect(fromCents(1999)).toBe(19.99);
    });

    it('deve realizar somas, subtrações e multiplicações monetárias exatas', () => {
      expect(addMoneyBrl(19.99, 0.01)).toBe(20.0);
      expect(subtractMoneyBrl(220.0, 19.99)).toBe(200.01);
      expect(multiplyMoneyBrl(19.99, 3)).toBe(59.97);
    });

    it('deve formatar valores monetários no padrão pt-BR', () => {
      const formatted = formatMoneyBrl(4850.5);
      // Contém dígitos 4.850 e 50 centavos
      expect(formatted).toContain('4.850,50');
    });
  });

  describe('2. Divisão por Zero e Sentinela NOT_COMPUTABLE', () => {
    it('deve retornar NOT_COMPUTABLE ao dividir por zero sem lançar exceção nem gerar Infinity', () => {
      const result = safeDivide(100, 0);

      expect(result.status).toBe('NOT_COMPUTABLE');
      expect(result.value).toBeNull();
      expect(result.isComputable).toBe(false);
      if (result.status === 'NOT_COMPUTABLE') {
        expect(result.reason).toBe('DIVISION_BY_ZERO');
      }
      expect(result.formatted).toBe(NOT_COMPUTABLE_SENTINEL);
    });

    it('deve retornar NOT_COMPUTABLE para denominador negativo ou entradas não finitas', () => {
      expect(safeDivide(100, -5).status).toBe('NOT_COMPUTABLE');
      expect(safeDivide(NaN, 10).status).toBe('NOT_COMPUTABLE');
      expect(safeDivide(100, Infinity).status).toBe('NOT_COMPUTABLE');
    });

    it('CPA por venda e CPA por lead devem retornar NOT_COMPUTABLE quando o denominador for zero', () => {
      const cpaSaleResult = calculateCpaPerSale(1500.0, 0);
      expect(cpaSaleResult.status).toBe('NOT_COMPUTABLE');
      expect(cpaSaleResult.value).toBeNull();
      expect(cpaSaleResult.formatted).toBe('NOT_COMPUTABLE');

      const cpaLeadResult = calculateCpaPerLead(1500.0, 0);
      expect(cpaLeadResult.status).toBe('NOT_COMPUTABLE');
      expect(cpaLeadResult.value).toBeNull();

      const validLeadCpa = calculateCpaPerLead(1000.0, 20);
      expect(validLeadCpa.value).toBe(50.0);
    });

    it('ROAS deve retornar NOT_COMPUTABLE quando o spend for zero', () => {
      const roasResult = calculateRoas(2000.0, 0);

      expect(roasResult.status).toBe('NOT_COMPUTABLE');
      expect(roasResult.value).toBeNull();
      expect(roasResult.formatted).toBe('NOT_COMPUTABLE');
    });
  });

  describe('3. Cálculos de CPA por Venda e ROAS em Criativos', () => {
    it('deve calcular CPA e ROAS do criativo saturado Namorados (ad_namorados_casal_03)', () => {
      const namoradosAd = canonicalDataset.joinedPerformance.find(
        (j) => j.ad_id === 'ad_namorados_casal_03'
      )!;

      const metrics = calculateDerivedAdMetrics(namoradosAd);

      expect(metrics.spend_brl).toBe(4850.0);
      expect(metrics.sales_count).toBe(3);
      expect(metrics.revenue_brl).toBe(720.0);

      // CPA real: 4850 / 3 = 1616.67
      expect(metrics.cpa_sale_brl.status).toBe('COMPUTED');
      expect(metrics.cpa_sale_brl.value).toBeCloseTo(1616.67, 2);

      // ROAS real: 720 / 4850 = 0.15
      expect(metrics.roas.status).toBe('COMPUTED');
      expect(metrics.roas.value).toBeCloseTo(0.15, 2);

      // Amostra com 3 vendas não é mais puramente exploratória
      expect(metrics.is_exploratory).toBe(false);
      expect(metrics.sample_size_sales).toBe(3);
    });

    it('deve marcar métrica como is_exploratory quando vendas < 3', () => {
      const mockAd = {
        ...canonicalDataset.joinedPerformance[0]!,
        sales_count: 2,
        spend_brl: 500.0,
        revenue_brl: 440.0
      };

      const metrics = calculateDerivedAdMetrics(mockAd);
      expect(metrics.is_exploratory).toBe(true);
      expect(metrics.sample_size_sales).toBe(2);
      expect(metrics.cpa_sale_brl.value).toBe(250.0);
    });
  });

  describe('4. Coberturas (Join Coverage e Evidence Coverage) e Thresholds', () => {
    it('deve classificar níveis de governança por thresholds com classifyCoverageLevel', () => {
      expect(classifyCoverageLevel(0.95)).toBe('SUFFICIENT');
      expect(classifyCoverageLevel(0.8)).toBe('SUFFICIENT');
      expect(classifyCoverageLevel(0.79)).toBe('PROVISIONAL');
      expect(classifyCoverageLevel(0.5)).toBe('PROVISIONAL');
      expect(classifyCoverageLevel(0.49)).toBe('INSUFFICIENT');
      expect(classifyCoverageLevel(0.0)).toBe('INSUFFICIENT');
    });

    it('deve calcular Join Coverage e classificar níveis de governança', () => {
      // Caso 1: 100% de cobertura (>= 0.80 -> SUFFICIENT)
      const cov100 = calculateJoinCoverage(20, 20);
      expect(cov100.level).toBe('SUFFICIENT');
      expect(cov100.coverage.value).toBe(1.0);
      expect(cov100.percentageString).toBe('100.0%');

      // Caso 2: 70% de cobertura (0.50 - 0.79 -> PROVISIONAL)
      const cov70 = calculateJoinCoverage(14, 20);
      expect(cov70.level).toBe('PROVISIONAL');
      expect(cov70.coverage.value).toBe(0.7);
      expect(cov70.percentageString).toBe('70.0%');

      // Caso 3: 40% de cobertura (< 0.50 -> INSUFFICIENT)
      const cov40 = calculateJoinCoverage(8, 20);
      expect(cov40.level).toBe('INSUFFICIENT');
      expect(cov40.coverage.value).toBe(0.4);
      expect(cov40.percentageString).toBe('40.0%');
    });

    it('deve calcular Evidence Coverage sobre afirmações e criativos', () => {
      const eviCov = calculateEvidenceCoverage(4, 4);
      expect(eviCov.level).toBe('SUFFICIENT');
      expect(eviCov.coverage.value).toBe(1.0);

      const partialEvi = calculateEvidenceCoverage(2, 4);
      expect(partialEvi.level).toBe('PROVISIONAL');
      expect(partialEvi.coverage.value).toBe(0.5);
    });

    it('deve lidar com denominador 0 em coberturas retornando SUFFICIENT neutro', () => {
      const zeroCov = calculateJoinCoverage(0, 0);
      expect(zeroCov.level).toBe('SUFFICIENT');
      expect(zeroCov.coverage.value).toBe(1.0);
    });
  });

  describe('5. Preservação Estrita de Timeframe e Timezone', () => {
    it('deve preservar período e timezone canônico em todas as métricas consolidadas', () => {
      const datasetMetrics = computeAllDerivedMetrics(canonicalDataset);

      expect(datasetMetrics.tenant_id).toBe('tenant_spot');
      expect(datasetMetrics.client_id).toBe('cli_housewhey');

      // Período e timezone preservados
      expect(datasetMetrics.timeframe.since).toBe('2026-08-01T00:00:00.000Z');
      expect(datasetMetrics.timeframe.until).toBe('2026-08-20T23:59:59.000Z');
      expect(datasetMetrics.timeframe.timezone).toBe('America/Sao_Paulo');

      // Totais consolidados
      expect(datasetMetrics.total_spend_brl).toBe(16000.0);
      expect(datasetMetrics.total_sales).toBe(19);
      expect(datasetMetrics.total_revenue_brl).toBe(4040.0);

      // Cobertura do dataset Housewhey S0 é 100%
      expect(datasetMetrics.join_coverage.level).toBe('SUFFICIENT');
      expect(datasetMetrics.join_coverage.percentageString).toBe('100.0%');
      expect(datasetMetrics.evidence_coverage.level).toBe('SUFFICIENT');

      // 4 anúncios avaliados
      expect(datasetMetrics.ads_metrics.length).toBe(4);
    });
  });
});
