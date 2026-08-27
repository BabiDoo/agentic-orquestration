/**
 * @adzhub/data - Canonical Normalized Model
 * Interfaces e modelos canônicos para representação determinística dos dados normalizados e reconciliados.
 */

import { Timeframe, DatasetManifest } from '@adzhub/contracts';
import { UtmNormalizationResult } from './utm-normalizer.js';
import {
  RawGraphData,
  RawTimelineData,
  RawAnaliseCriativosData,
  RawMapaSolucaoData,
  RawConversasData
} from './raw-schemas.js';

export interface NormalizedMetaAd {
  ad_id: string;
  ad_name: string;
  adset_name?: string;
  campaign_id: string;
  campaign_name: string;
  spend_brl: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc_brl: number;
  cpm_brl: number;
  frequency: number;
  hook_rate_3s?: number;
  utm_source: UtmNormalizationResult;
  utm_medium: UtmNormalizationResult;
  utm_campaign: UtmNormalizationResult;
  utm_content: UtmNormalizationResult;
  status: string;
}

export interface NormalizedCrmDeal {
  deal_id: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  status: string;
  value_brl: number;
  utm_source: UtmNormalizationResult;
  utm_medium: UtmNormalizationResult;
  utm_campaign: UtmNormalizationResult;
  utm_content: UtmNormalizationResult;
  origem_declarada?: string;
  has_origin_divergence: boolean;
  origin_divergence_details?: string;
}

export interface AttributionDivergence {
  deal_id: string;
  utm_source_normalized: string;
  origem_declarada: string;
  divergence_type: 'SEARCH_VS_PAID' | 'ORGANIC_VS_PAID' | 'REFERRAL_VS_PAID' | 'OTHER';
  description: string;
}

export interface JoinedAdPerformance {
  ad_id: string;
  ad_name: string;
  campaign_id: string;
  campaign_name: string;
  utm_content: string;
  spend_brl: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc_brl: number;
  cpm_brl: number;
  frequency: number;
  hook_rate_3s?: number;
  status: string;
  leads_count: number;
  sales_count: number;
  revenue_brl: number;
  deals: NormalizedCrmDeal[];
  divergences: AttributionDivergence[];
  creative_evaluation?: {
    hook_score: number;
    retention_score: number;
    cta_score: number;
    overall_score: number;
    recommendation: 'SEGUIR' | 'VARIAR' | 'PAUSAR';
    brief_sugerido: {
      publico: string;
      hook: string;
      mensagem: string;
      cta: string;
      metrica_sucesso: string;
    };
  };
}

export interface CanonicalJoinSummary {
  tenant_id: string;
  client_id: string;
  timeframe: Timeframe;
  total_ads: number;
  total_spend_brl: number;
  total_deals: number;
  total_sales: number;
  total_revenue_brl: number;
  matched_deals_count: number;
  orphan_deals_count: number;
  orphan_ads_count: number;
  divergent_deals_count: number;
  join_coverage: number;
}

export interface NormalizedDataset {
  schemaVersion: '1.0.0';
  tenantId: string;
  clientId: string;
  datasetVersion: string;
  generatedAt: string;
  globalHash: string;
  manifest: DatasetManifest;
  graph: RawGraphData;
  timeline: RawTimelineData;
  metaAds: {
    account_id: string;
    currency: string;
    timeframe: Timeframe;
    summary: {
      total_spend_brl: number;
      total_impressions: number;
      total_clicks: number;
      average_ctr: number;
      average_cpc_brl: number;
    };
    ads: NormalizedMetaAd[];
  };
  crmLeads: {
    currency: string;
    timeframe: Timeframe;
    summary: {
      total_leads: number;
      total_sales: number;
      total_revenue_brl: number;
    };
    deals: NormalizedCrmDeal[];
  };
  analiseCriativos: RawAnaliseCriativosData;
  mapaSolucao: RawMapaSolucaoData;
  conversas: RawConversasData;
  joinedPerformance: JoinedAdPerformance[];
  joinSummary: CanonicalJoinSummary;
}
