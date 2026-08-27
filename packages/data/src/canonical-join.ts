/**
 * @adzhub/data - Canonical Join & Reconciliation Engine
 * Motor determinístico para join entre Meta Ads, CRM Deals e Análise de Criativos,
 * com validação de tenant/client, conformidade temporal e normalização de UTMs.
 */

import { UtmNormalizer } from './utm-normalizer.js';
import { RawMetaAdsData, RawCrmLeadsData, RawAnaliseCriativosData } from './raw-schemas.js';
import {
  NormalizedMetaAd,
  NormalizedCrmDeal,
  AttributionDivergence,
  JoinedAdPerformance,
  CanonicalJoinSummary
} from './canonical-model.js';

export interface ReconcileOptions {
  normalizer?: UtmNormalizer;
  strictTenantCheck?: boolean;
}

export interface ReconcileResult {
  normalizedAds: NormalizedMetaAd[];
  normalizedDeals: NormalizedCrmDeal[];
  joinedPerformance: JoinedAdPerformance[];
  summary: CanonicalJoinSummary;
  divergences: AttributionDivergence[];
}

/**
 * Reconcilia e realiza o join determinístico entre campanhas de Meta Ads,
 * transações de CRM e recomendações do App de Análise de Criativos.
 */
export function reconcileMetaAdsAndCrm(
  metaAds: RawMetaAdsData,
  crmLeads: RawCrmLeadsData,
  analiseCriativos?: RawAnaliseCriativosData,
  options?: ReconcileOptions
): ReconcileResult {
  const normalizer = options?.normalizer ?? new UtmNormalizer();
  const strictTenant = options?.strictTenantCheck ?? true;

  // 1. Verificação rigorosa de isolamento por Tenant e Client
  if (strictTenant) {
    if (metaAds.tenant_id !== crmLeads.tenant_id) {
      throw new Error(
        `Violação de isolamento multi-tenant: Meta Ads (${metaAds.tenant_id}) != CRM (${crmLeads.tenant_id})`
      );
    }
    if (metaAds.client_id !== crmLeads.client_id) {
      throw new Error(
        `Violação de isolamento de cliente: Meta Ads (${metaAds.client_id}) != CRM (${crmLeads.client_id})`
      );
    }
    if (analiseCriativos && analiseCriativos.client_id !== metaAds.client_id) {
      throw new Error(
        `Violação de isolamento de cliente: Análise de Criativos (${analiseCriativos.client_id}) != Meta Ads (${metaAds.client_id})`
      );
    }
  }

  const sinceDate = new Date(metaAds.timeframe.since).getTime();
  const untilDate = new Date(metaAds.timeframe.until).getTime();

  // 2. Normalização e análise de divergência de CRM Deals
  const allDivergences: AttributionDivergence[] = [];
  const normalizedDeals: NormalizedCrmDeal[] = crmLeads.deals.map((deal) => {
    const utm_source = normalizer.normalize(deal.utm_source);
    const utm_medium = normalizer.normalize(deal.utm_medium);
    const utm_campaign = normalizer.normalize(deal.utm_campaign);
    const utm_content = normalizer.normalize(deal.utm_content);

    let has_origin_divergence = false;
    let origin_divergence_details: string | undefined;

    // Detecção de divergência entre UTM técnica e origem declarada pelo cliente
    if (deal.origem_declarada && utm_source.normalizedValue === 'meta_ads') {
      const declared = deal.origem_declarada.toLowerCase();

      if (
        declared.includes('google') ||
        declared.includes('pesquisa') ||
        declared.includes('busca')
      ) {
        has_origin_divergence = true;
        origin_divergence_details = `Cliente declarou busca no Google, mas o clique com conversão foi rastreado via Meta Ads (${deal.deal_id})`;
        allDivergences.push({
          deal_id: deal.deal_id,
          utm_source_normalized: utm_source.normalizedValue,
          origem_declarada: deal.origem_declarada,
          divergence_type: 'SEARCH_VS_PAID',
          description: origin_divergence_details
        });
      } else if (
        declared.includes('indicação') ||
        declared.includes('amigo') ||
        declared.includes('boca')
      ) {
        has_origin_divergence = true;
        origin_divergence_details = `Cliente declarou indicação de amigo, mas o clique com conversão foi rastreado via Meta Ads (${deal.deal_id})`;
        allDivergences.push({
          deal_id: deal.deal_id,
          utm_source_normalized: utm_source.normalizedValue,
          origem_declarada: deal.origem_declarada,
          divergence_type: 'REFERRAL_VS_PAID',
          description: origin_divergence_details
        });
      }
    }

    return {
      deal_id: deal.deal_id,
      created_at: deal.created_at,
      customer_name: deal.customer_name,
      customer_email: deal.customer_email,
      status: deal.status as 'lead' | 'agendamento' | 'venda' | 'perdido',
      value_brl: deal.value_brl,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      origem_declarada: deal.origem_declarada,
      has_origin_divergence,
      origin_divergence_details
    };
  });

  // Filtragem temporal: deals dentro da janela de análise
  const dealsInTimeframe = normalizedDeals.filter((deal) => {
    const dealTime = new Date(deal.created_at).getTime();
    return dealTime >= sinceDate && dealTime <= untilDate;
  });

  // 3. Normalização dos Anúncios de Meta Ads
  const normalizedAds: NormalizedMetaAd[] = [];
  for (const campaign of metaAds.campaigns) {
    for (const ad of campaign.ads) {
      normalizedAds.push({
        ad_id: ad.ad_id,
        ad_name: ad.ad_name,
        adset_name: ad.adset_name,
        campaign_id: campaign.campaign_id,
        campaign_name: campaign.campaign_name,
        spend_brl: ad.spend_brl,
        impressions: ad.impressions,
        clicks: ad.clicks,
        ctr: ad.ctr,
        cpc_brl: ad.cpc_brl,
        cpm_brl: ad.cpm_brl,
        frequency: ad.frequency,
        hook_rate_3s: ad.hook_rate_3s,
        utm_source: normalizer.normalize(ad.utm_source),
        utm_medium: normalizer.normalize(ad.utm_medium),
        utm_campaign: normalizer.normalize(ad.utm_campaign ?? campaign.campaign_name),
        utm_content: normalizer.normalize(ad.utm_content ?? ad.ad_id),
        status: ad.status as 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED'
      });
    }
  }

  // Mapa de avaliações de criativos por ad_id ou utm_content normalizado
  const creativeEvalMap = new Map<string, RawAnaliseCriativosData['creatives'][0]>();
  if (analiseCriativos) {
    for (const c of analiseCriativos.creatives) {
      creativeEvalMap.set(c.ad_id, c);
      if (c.utm_content) {
        const normContent = normalizer.normalize(c.utm_content).normalizedValue;
        creativeEvalMap.set(normContent, c);
      }
    }
  }

  // 4. Execução do Join Canônico
  const matchedDealIds = new Set<string>();
  const joinedPerformance: JoinedAdPerformance[] = [];

  for (const ad of normalizedAds) {
    const adUtmKey = ad.utm_content.normalizedValue;
    const adIdKey = ad.ad_id;

    // Encontra deals correspondentes pelo utm_content normalizado ou ad_id
    const matchingDeals = dealsInTimeframe.filter((deal) => {
      const dealUtmKey = deal.utm_content.normalizedValue;
      const isMatch =
        (dealUtmKey !== 'MISSING_UTM' && dealUtmKey === adUtmKey) || dealUtmKey === adIdKey;

      if (isMatch) {
        matchedDealIds.add(deal.deal_id);
      }
      return isMatch;
    });

    const leads_count = matchingDeals.filter((d) => d.status === 'lead').length;
    const salesDeals = matchingDeals.filter((d) => d.status === 'venda');
    const sales_count = salesDeals.length;
    const revenue_brl = salesDeals.reduce((sum, d) => sum + d.value_brl, 0);
    const divergences = matchingDeals
      .filter((d) => d.has_origin_divergence)
      .flatMap((d) => allDivergences.filter((div) => div.deal_id === d.deal_id));

    const creativeEval = creativeEvalMap.get(ad.ad_id) ?? creativeEvalMap.get(adUtmKey);

    joinedPerformance.push({
      ad_id: ad.ad_id,
      ad_name: ad.ad_name,
      campaign_id: ad.campaign_id,
      campaign_name: ad.campaign_name,
      utm_content: adUtmKey,
      spend_brl: ad.spend_brl,
      impressions: ad.impressions,
      clicks: ad.clicks,
      ctr: ad.ctr,
      cpc_brl: ad.cpc_brl,
      cpm_brl: ad.cpm_brl,
      frequency: ad.frequency,
      hook_rate_3s: ad.hook_rate_3s,
      status: ad.status,
      leads_count,
      sales_count,
      revenue_brl,
      deals: matchingDeals,
      divergences,
      creative_evaluation: creativeEval
        ? {
            hook_score: creativeEval.hook_score,
            retention_score: creativeEval.retention_score,
            cta_score: creativeEval.cta_score,
            overall_score: creativeEval.overall_score,
            recommendation: creativeEval.recommendation as 'SEGUIR' | 'VARIAR' | 'PAUSAR',
            brief_sugerido: creativeEval.brief_sugerido
          }
        : undefined
    });
  }

  // 5. Estatísticas Consolidadas do Join
  const totalSpend = normalizedAds.reduce((sum, a) => sum + a.spend_brl, 0);
  const totalDeals = dealsInTimeframe.length;
  const totalSales = dealsInTimeframe.filter((d) => d.status === 'venda').length;
  const totalRevenue = dealsInTimeframe
    .filter((d) => d.status === 'venda')
    .reduce((sum, d) => sum + d.value_brl, 0);

  const matchedDealsCount = matchedDealIds.size;
  const orphanDealsCount = totalDeals - matchedDealsCount;
  const orphanAdsCount = joinedPerformance.filter((j) => j.deals.length === 0).length;
  const divergentDealsCount = allDivergences.length;

  const joinCoverage = totalDeals > 0 ? matchedDealsCount / totalDeals : 1.0;

  const summary: CanonicalJoinSummary = {
    tenant_id: metaAds.tenant_id,
    client_id: metaAds.client_id,
    timeframe: metaAds.timeframe,
    total_ads: normalizedAds.length,
    total_spend_brl: totalSpend,
    total_deals: totalDeals,
    total_sales: totalSales,
    total_revenue_brl: totalRevenue,
    matched_deals_count: matchedDealsCount,
    orphan_deals_count: orphanDealsCount,
    orphan_ads_count: orphanAdsCount,
    divergent_deals_count: divergentDealsCount,
    join_coverage: joinCoverage
  };

  return {
    normalizedAds,
    normalizedDeals,
    joinedPerformance,
    summary,
    divergences: allDivergences
  };
}
