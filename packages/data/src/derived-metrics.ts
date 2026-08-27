/**
 * @adzhub/data - Derived Metrics Engine
 * Cálculo determinístico e seguro de métricas derivadas (CPA, ROAS, Join Coverage, Evidence Coverage)
 * com tratamento estrito de divisão por zero (NOT_COMPUTABLE), aritmética monetária em centavos e preservação de timezone.
 */

import { Timeframe } from '@adzhub/contracts';
import { JoinedAdPerformance, CanonicalJoinSummary, NormalizedDataset } from './canonical-model.js';

export const NOT_COMPUTABLE_SENTINEL = 'NOT_COMPUTABLE' as const;

export type ComputableStatus = 'COMPUTED' | 'NOT_COMPUTABLE';

export type ComputableReason =
  'DIVISION_BY_ZERO' | 'MISSING_DATA' | 'NEGATIVE_DENOMINATOR' | 'INVALID_INPUT';

export type ComputableValue<T = number> =
  | {
      status: 'COMPUTED';
      value: T;
      isComputable: true;
      formatted: string;
    }
  | {
      status: 'NOT_COMPUTABLE';
      value: null;
      isComputable: false;
      reason: ComputableReason;
      formatted: typeof NOT_COMPUTABLE_SENTINEL;
    };

export type CoverageLevel = 'SUFFICIENT' | 'PROVISIONAL' | 'INSUFFICIENT';

export interface CoverageMetricResult {
  coverage: ComputableValue<number>;
  level: CoverageLevel;
  numerator: number;
  denominator: number;
  percentageString: string;
}

export interface DerivedAdMetrics {
  ad_id: string;
  ad_name: string;
  campaign_id: string;
  campaign_name: string;
  spend_brl: number;
  impressions: number;
  clicks: number;
  sales_count: number;
  leads_count: number;
  revenue_brl: number;
  cpa_sale_brl: ComputableValue<number>;
  cpa_lead_brl: ComputableValue<number>;
  roas: ComputableValue<number>;
  ctr: ComputableValue<number>;
  cpc_brl: ComputableValue<number>;
  cpm_brl: ComputableValue<number>;
  sample_size_sales: number;
  /**
   * Garantia metodológica: se a amostra for inferior a 3 vendas,
   * a métrica de CPA/ROAS é explicitamente marcada como exploratória.
   */
  is_exploratory: boolean;
}

export interface DerivedDatasetMetrics {
  tenant_id: string;
  client_id: string;
  timeframe: Timeframe;
  total_spend_brl: number;
  total_sales: number;
  total_leads: number;
  total_revenue_brl: number;
  global_cpa_sale_brl: ComputableValue<number>;
  global_cpa_lead_brl: ComputableValue<number>;
  global_roas: ComputableValue<number>;
  join_coverage: CoverageMetricResult;
  evidence_coverage: CoverageMetricResult;
  ads_metrics: DerivedAdMetrics[];
  calculated_at: string;
}

// ---------------------------------------------------------------------------
// 1. Aritmética Monetária Segura (Centavos Inteiros)
// ---------------------------------------------------------------------------

/**
 * Converte valor em reais para centavos inteiros com arredondamento seguro.
 */
export function toCents(amountBrl: number): number {
  if (!Number.isFinite(amountBrl)) return 0;
  return Math.round(amountBrl * 100);
}

/**
 * Converte centavos inteiros para valor em reais com 2 casas decimais.
 */
export function fromCents(cents: number): number {
  return cents / 100;
}

/**
 * Soma valores monetários em reais sem imprecisão de ponto flutuante binário.
 */
export function addMoneyBrl(a: number, b: number): number {
  return fromCents(toCents(a) + toCents(b));
}

/**
 * Subtrai valores monetários em reais sem imprecisão de ponto flutuante binário.
 */
export function subtractMoneyBrl(a: number, b: number): number {
  return fromCents(toCents(a) - toCents(b));
}

/**
 * Multiplica valor monetário por um fator com arredondamento seguro em centavos.
 */
export function multiplyMoneyBrl(amountBrl: number, factor: number): number {
  if (!Number.isFinite(amountBrl) || !Number.isFinite(factor)) return 0;
  return fromCents(Math.round(toCents(amountBrl) * factor));
}

/**
 * Formata um valor monetário no padrão BRL (R$ 1.234,56).
 */
export function formatMoneyBrl(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// ---------------------------------------------------------------------------
// 2. Divisão Segura e Cálculos Fundamentais
// ---------------------------------------------------------------------------

/**
 * Executa divisão segura retornando NOT_COMPUTABLE para denominador zero ou inválido.
 */
export function safeDivide(
  numerator: number,
  denominator: number,
  formatDecimals: number = 2
): ComputableValue<number> {
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    Number.isNaN(numerator) ||
    Number.isNaN(denominator)
  ) {
    return {
      status: 'NOT_COMPUTABLE',
      value: null,
      isComputable: false,
      reason: 'INVALID_INPUT',
      formatted: NOT_COMPUTABLE_SENTINEL
    };
  }

  if (denominator === 0) {
    return {
      status: 'NOT_COMPUTABLE',
      value: null,
      isComputable: false,
      reason: 'DIVISION_BY_ZERO',
      formatted: NOT_COMPUTABLE_SENTINEL
    };
  }

  if (denominator < 0) {
    return {
      status: 'NOT_COMPUTABLE',
      value: null,
      isComputable: false,
      reason: 'NEGATIVE_DENOMINATOR',
      formatted: NOT_COMPUTABLE_SENTINEL
    };
  }

  const rawValue = numerator / denominator;
  const rounded = Number(rawValue.toFixed(formatDecimals));

  return {
    status: 'COMPUTED',
    value: rounded,
    isComputable: true,
    formatted: rounded.toFixed(formatDecimals)
  };
}

/**
 * Calcula o CPA por Venda (Custo por Aquisição de Venda).
 * CPA = Spend / Vendas. Se Vendas == 0, retorna NOT_COMPUTABLE.
 */
export function calculateCpaPerSale(spendBrl: number, salesCount: number): ComputableValue<number> {
  return safeDivide(spendBrl, salesCount, 2);
}

/**
 * Calcula o CPA por Lead (Custo por Lead).
 * CPA = Spend / Leads. Se Leads == 0, retorna NOT_COMPUTABLE.
 */
export function calculateCpaPerLead(spendBrl: number, leadsCount: number): ComputableValue<number> {
  return safeDivide(spendBrl, leadsCount, 2);
}

/**
 * Calcula o ROAS (Return On Ad Spend).
 * ROAS = Receita / Spend. Se Spend == 0, retorna NOT_COMPUTABLE.
 */
export function calculateRoas(revenueBrl: number, spendBrl: number): ComputableValue<number> {
  return safeDivide(revenueBrl, spendBrl, 2);
}

// ---------------------------------------------------------------------------
// 3. Métricas de Cobertura e Thresholds de Governança
// ---------------------------------------------------------------------------

/**
 * Classifica o nível de governança com base na taxa de cobertura:
 * - >= 0.80: SUFFICIENT (alta confiança, permite recomendação conclusiva)
 * - 0.50 - 0.79: PROVISIONAL (confiança média, recomendação provisória)
 * - < 0.50: INSUFFICIENT (baixa confiança, exige abstenção ou quarentena)
 */
export function classifyCoverageLevel(coverageRatio: number): CoverageLevel {
  if (coverageRatio >= 0.8) return 'SUFFICIENT';
  if (coverageRatio >= 0.5) return 'PROVISIONAL';
  return 'INSUFFICIENT';
}

/**
 * Calcula a Cobertura de Join (Join Coverage).
 * Proporção de transações reconciliadas com sucesso sobre o total de transações no período.
 * Entradas vazias (MISSING_UTM) permanecem no denominador e penalizam o resultado.
 */
export function calculateJoinCoverage(
  matchedDealsCount: number,
  totalDealsInDenominator: number
): CoverageMetricResult {
  if (totalDealsInDenominator === 0) {
    return {
      coverage: {
        status: 'COMPUTED',
        value: 1.0,
        isComputable: true,
        formatted: '1.00'
      },
      level: 'SUFFICIENT',
      numerator: 0,
      denominator: 0,
      percentageString: '100.0%'
    };
  }

  const result = safeDivide(matchedDealsCount, totalDealsInDenominator, 4);

  if (result.status === 'NOT_COMPUTABLE') {
    return {
      coverage: result,
      level: 'INSUFFICIENT',
      numerator: matchedDealsCount,
      denominator: totalDealsInDenominator,
      percentageString: NOT_COMPUTABLE_SENTINEL
    };
  }

  const level = classifyCoverageLevel(result.value);
  const percentageString = `${(result.value * 100).toFixed(1)}%`;

  return {
    coverage: result,
    level,
    numerator: matchedDealsCount,
    denominator: totalDealsInDenominator,
    percentageString
  };
}

/**
 * Calcula a Cobertura de Evidências (Evidence Coverage).
 * Proporção de afirmações/fatos com evidências formais verificadas sobre o total de claims.
 */
export function calculateEvidenceCoverage(
  verifiedClaimsCount: number,
  totalRequiredClaimsCount: number
): CoverageMetricResult {
  if (totalRequiredClaimsCount === 0) {
    return {
      coverage: {
        status: 'COMPUTED',
        value: 1.0,
        isComputable: true,
        formatted: '1.00'
      },
      level: 'SUFFICIENT',
      numerator: 0,
      denominator: 0,
      percentageString: '100.0%'
    };
  }

  const result = safeDivide(verifiedClaimsCount, totalRequiredClaimsCount, 4);

  if (result.status === 'NOT_COMPUTABLE') {
    return {
      coverage: result,
      level: 'INSUFFICIENT',
      numerator: verifiedClaimsCount,
      denominator: totalRequiredClaimsCount,
      percentageString: NOT_COMPUTABLE_SENTINEL
    };
  }

  const level = classifyCoverageLevel(result.value);
  const percentageString = `${(result.value * 100).toFixed(1)}%`;

  return {
    coverage: result,
    level,
    numerator: verifiedClaimsCount,
    denominator: totalRequiredClaimsCount,
    percentageString
  };
}

// ---------------------------------------------------------------------------
// 4. Consolidação de Métricas Derivadas
// ---------------------------------------------------------------------------

/**
 * Calcula as métricas derivadas completas para um anúncio reconciliado.
 */
export function calculateDerivedAdMetrics(ad: JoinedAdPerformance): DerivedAdMetrics {
  const cpa_sale_brl = calculateCpaPerSale(ad.spend_brl, ad.sales_count);
  const cpa_lead_brl = calculateCpaPerLead(ad.spend_brl, ad.leads_count);
  const roas = calculateRoas(ad.revenue_brl, ad.spend_brl);
  const ctr = safeDivide(ad.clicks, ad.impressions, 6);
  const cpc_brl = safeDivide(ad.spend_brl, ad.clicks, 4);
  const cpm_brl = safeDivide(ad.spend_brl * 1000, ad.impressions, 2);

  // Amostra menor que 3 vendas é marcada como exploratória
  const is_exploratory = ad.sales_count < 3;

  return {
    ad_id: ad.ad_id,
    ad_name: ad.ad_name,
    campaign_id: ad.campaign_id,
    campaign_name: ad.campaign_name,
    spend_brl: ad.spend_brl,
    impressions: ad.impressions,
    clicks: ad.clicks,
    sales_count: ad.sales_count,
    leads_count: ad.leads_count,
    revenue_brl: ad.revenue_brl,
    cpa_sale_brl,
    cpa_lead_brl,
    roas,
    ctr,
    cpc_brl,
    cpm_brl,
    sample_size_sales: ad.sales_count,
    is_exploratory
  };
}

/**
 * Computa o conjunto consolidado de métricas derivadas para o dataset normalizado completo.
 * Preserva o timeframe e o timezone de origem em todas as agregações.
 */
export function computeAllDerivedMetrics(
  dataset:
    | NormalizedDataset
    | {
        joinedPerformance: JoinedAdPerformance[];
        joinSummary: CanonicalJoinSummary;
        timeframe?: Timeframe;
        tenantId?: string;
        clientId?: string;
      }
): DerivedDatasetMetrics {
  const joinedList = dataset.joinedPerformance;
  const summary = dataset.joinSummary;

  const ads_metrics = joinedList.map(calculateDerivedAdMetrics);

  const totalSpend = summary.total_spend_brl;
  const totalSales = summary.total_sales;
  const totalLeads = summary.total_deals - summary.total_sales;
  const totalRevenue = summary.total_revenue_brl;

  const global_cpa_sale_brl = calculateCpaPerSale(totalSpend, totalSales);
  const global_cpa_lead_brl = calculateCpaPerLead(totalSpend, totalLeads > 0 ? totalLeads : 0);
  const global_roas = calculateRoas(totalRevenue, totalSpend);

  const join_coverage = calculateJoinCoverage(summary.matched_deals_count, summary.total_deals);

  // Evidence coverage nos anúncios: proporção de ads com pelo menos 1 venda rastreada
  const adsWithEvidence = joinedList.filter((a) => a.sales_count > 0).length;
  const evidence_coverage = calculateEvidenceCoverage(adsWithEvidence, joinedList.length);

  const timeframe: Timeframe = summary.timeframe;

  return {
    tenant_id: summary.tenant_id,
    client_id: summary.client_id,
    timeframe: {
      since: timeframe.since,
      until: timeframe.until,
      timezone: timeframe.timezone
    },
    total_spend_brl: totalSpend,
    total_sales: totalSales,
    total_leads: summary.total_deals,
    total_revenue_brl: totalRevenue,
    global_cpa_sale_brl,
    global_cpa_lead_brl,
    global_roas,
    join_coverage,
    evidence_coverage,
    ads_metrics,
    calculated_at: new Date().toISOString()
  };
}
