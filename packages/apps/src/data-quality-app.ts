import { z } from 'zod';
import {
  RawMetaAdsData,
  RawCrmLeadsData,
  RawAnaliseCriativosData,
  RAW_META_ADS_DATA,
  RAW_CRM_LEADS_DATA,
  RAW_ANALISE_CRIATIVOS_DATA,
  reconcileMetaAdsAndCrm
} from '@adzhub/data';

export const DataQualityInputSchema = z.object({
  client_id: z.string().min(1, { message: 'client_id é obrigatório' }),
  timeframe: z.object({
    since: z.string().datetime({ message: 'since deve ser data ISO-8601' }),
    until: z.string().datetime({ message: 'until deve ser data ISO-8601' }),
    timezone: z.string().default('America/Sao_Paulo')
  }),
  thresholds: z
    .object({
      minUtmCoveragePercent: z.number().min(0).max(100).default(70.0),
      maxDataAgeHours: z.number().positive().default(48.0)
    })
    .optional()
    .default({})
});

export type DataQualityInput = z.infer<typeof DataQualityInputSchema>;
export type DataQualityInputRaw = z.input<typeof DataQualityInputSchema>;

export const DataQualityOutputSchema = z.object({
  status: z.enum(['VERIFIED', 'INSUFFICIENT_EVIDENCE']),
  client_id: z.string(),
  timeframe: z.object({
    since: z.string(),
    until: z.string(),
    timezone: z.string()
  }),
  metrics: z.object({
    total_deals_processed: z.number().int().nonnegative(),
    total_ads_evaluated: z.number().int().nonnegative(),
    deals_with_valid_utm: z.number().int().nonnegative(),
    deals_with_missing_utm: z.number().int().nonnegative(),
    missing_utm_rate_percent: z.number().min(0).max(100),
    join_coverage_percent: z.number().min(0).max(100),
    freshness_score: z.number().min(0).max(1),
    data_age_hours: z.number().nonnegative(),
    timezone_aligned: z.boolean(),
    currency_aligned: z.boolean()
  }),
  passed_checks: z.array(z.string()),
  failed_checks: z.array(z.string()),
  quarantine_recommendation: z
    .object({
      reasonCode: z.enum(['LOW_COVERAGE', 'PERIOD_MISMATCH', 'STALE_DATA']),
      reasonDetails: z.string(),
      requiredResolution: z.string()
    })
    .optional(),
  evidence_locators: z.array(z.string())
});

export type DataQualityOutput = z.infer<typeof DataQualityOutputSchema>;

export interface DataQualityAppOptions {
  metaAdsData?: RawMetaAdsData;
  crmLeadsData?: RawCrmLeadsData;
  analiseCriativosData?: RawAnaliseCriativosData;
}

export class DataQualityApp {
  public audit(
    rawInput: DataQualityInputRaw,
    options: DataQualityAppOptions = {}
  ): DataQualityOutput {
    const input = DataQualityInputSchema.parse(rawInput);
    const metaAds = options.metaAdsData ?? RAW_META_ADS_DATA;
    const crmLeads = options.crmLeadsData ?? RAW_CRM_LEADS_DATA;
    const analiseCriativos = options.analiseCriativosData ?? RAW_ANALISE_CRIATIVOS_DATA;

    if (metaAds.client_id !== input.client_id || crmLeads.client_id !== input.client_id) {
      throw new Error(
        `Isolamento de cliente violado: dados solicitados para '${input.client_id}' divergem da fonte.`
      );
    }

    const minCoverage = input.thresholds?.minUtmCoveragePercent ?? 70.0;
    const maxAgeHours = input.thresholds?.maxDataAgeHours ?? 48.0;

    // Executa reconciliação determinística para inspecionar joins e normalização
    const reconcileResult = reconcileMetaAdsAndCrm(metaAds, crmLeads, analiseCriativos);

    const totalDeals = crmLeads.deals.length;
    let missingUtmCount = 0;
    let validUtmCount = 0;

    for (const deal of crmLeads.deals) {
      if (
        !deal.utm_source ||
        deal.utm_source.trim() === '' ||
        !deal.utm_content ||
        deal.utm_content.trim() === ''
      ) {
        missingUtmCount++;
      } else {
        validUtmCount++;
      }
    }

    const missingUtmRate =
      totalDeals > 0 ? Math.round((missingUtmCount / totalDeals) * 10000) / 100 : 0;
    const utmCoveragePercent = Math.round((100 - missingUtmRate) * 100) / 100;
    const joinCoveragePercent = Math.round(reconcileResult.summary.join_coverage * 10000) / 100;

    // Cálculo de Freshness: compara data mais recente dos leads com o marco 'until' do contrato
    const untilMs = new Date(input.timeframe.until).getTime();
    let mostRecentDealMs = 0;
    for (const deal of crmLeads.deals) {
      const dMs = new Date(deal.created_at).getTime();
      if (dMs > mostRecentDealMs) {
        mostRecentDealMs = dMs;
      }
    }

    const dataAgeMs = Math.max(0, untilMs - mostRecentDealMs);
    const dataAgeHours = Math.round((dataAgeMs / (1000 * 60 * 60)) * 10) / 10;

    // Score de freshness: 1.0 se < 12h, decai linearmente até 0.0 em 96h
    let freshnessScore = 1.0;
    if (dataAgeHours > 12) {
      freshnessScore = Math.max(0, Math.round((1.0 - (dataAgeHours - 12) / 84) * 100) / 100);
    }

    const timezoneAligned =
      metaAds.timeframe.timezone === input.timeframe.timezone &&
      crmLeads.timeframe.timezone === input.timeframe.timezone;
    const currencyAligned = metaAds.currency === 'BRL' && crmLeads.currency === 'BRL';

    const passedChecks: string[] = [];
    const failedChecks: string[] = [];

    if (utmCoveragePercent >= minCoverage) {
      passedChecks.push(`UTM_COVERAGE_OK (${utmCoveragePercent}% >= ${minCoverage}%)`);
    } else {
      failedChecks.push(`LOW_UTM_COVERAGE (${utmCoveragePercent}% < ${minCoverage}% threshold)`);
    }

    if (dataAgeHours <= maxAgeHours) {
      passedChecks.push(`FRESHNESS_OK (${dataAgeHours}h <= ${maxAgeHours}h)`);
    } else {
      failedChecks.push(`STALE_DATA (${dataAgeHours}h > ${maxAgeHours}h threshold)`);
    }

    if (timezoneAligned) {
      passedChecks.push('TIMEZONE_ALIGNED (America/Sao_Paulo)');
    } else {
      failedChecks.push('TIMEZONE_MISMATCH');
    }

    if (currencyAligned) {
      passedChecks.push('CURRENCY_ALIGNED (BRL)');
    } else {
      failedChecks.push('CURRENCY_MISMATCH');
    }

    const isVerified = failedChecks.length === 0;
    const status: DataQualityOutput['status'] = isVerified ? 'VERIFIED' : 'INSUFFICIENT_EVIDENCE';

    let quarantineRecommendation: DataQualityOutput['quarantine_recommendation'];
    if (!isVerified) {
      if (utmCoveragePercent < minCoverage) {
        quarantineRecommendation = {
          reasonCode: 'LOW_COVERAGE',
          reasonDetails: `Cobertura de UTM (${utmCoveragePercent}%) abaixo do mínimo aceitável de ${minCoverage}%.`,
          requiredResolution:
            'Normalizar parâmetros UTM nos criativos e campanhas do Meta Ads antes de recalcular atribuição.'
        };
      } else if (dataAgeHours > maxAgeHours) {
        quarantineRecommendation = {
          reasonCode: 'STALE_DATA',
          reasonDetails: `Defasagem dos dados (${dataAgeHours}h) excede a tolerância de ${maxAgeHours}h.`,
          requiredResolution: 'Re-executar extração de dados recentes do CRM HubSpot e Meta Ads.'
        };
      } else {
        quarantineRecommendation = {
          reasonCode: 'PERIOD_MISMATCH',
          reasonDetails: `Inconsistência de fuso horário ou moeda entre fontes (${failedChecks.join(', ')}).`,
          requiredResolution: 'Normalizar timezone e moeda para BRL / America/Sao_Paulo.'
        };
      }
    }

    const evidenceLocators = [
      `meta_ads:${metaAds.client_id}:summary`,
      `crm_leads:${crmLeads.client_id}:deals_count=${totalDeals}`,
      `join:coverage=${reconcileResult.summary.join_coverage}`
    ];

    const totalAds = metaAds.campaigns.reduce((acc, c) => acc + c.ads.length, 0);

    return {
      status,
      client_id: input.client_id,
      timeframe: input.timeframe,
      metrics: {
        total_deals_processed: totalDeals,
        total_ads_evaluated: totalAds,
        deals_with_valid_utm: validUtmCount,
        deals_with_missing_utm: missingUtmCount,
        missing_utm_rate_percent: missingUtmRate,
        join_coverage_percent: joinCoveragePercent,
        freshness_score: freshnessScore,
        data_age_hours: dataAgeHours,
        timezone_aligned: timezoneAligned,
        currency_aligned: currencyAligned
      },
      passed_checks: passedChecks,
      failed_checks: failedChecks,
      quarantine_recommendation: quarantineRecommendation,
      evidence_locators: evidenceLocators
    };
  }
}
