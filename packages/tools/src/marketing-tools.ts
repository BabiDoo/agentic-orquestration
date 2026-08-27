import { z } from 'zod';
import { RAW_META_ADS_DATA, RAW_CRM_LEADS_DATA } from '@adzhub/data';
import { createTool } from './tool-runner.js';
import { GovernedTool, ToolPostcondition } from './tool-interface.js';

// Schemas de Provenance
export const MarketingProvenanceSchema = z.object({
  source: z.enum(['meta_ads', 'crm']),
  locator: z.string().min(1),
  capturedAt: z.string().datetime()
});

export type MarketingProvenance = z.infer<typeof MarketingProvenanceSchema>;

// ==========================================
// 1. list_ads
// ==========================================

export const ListAdsInputSchema = z.object({
  client_id: z.string().min(1, { message: 'client_id é obrigatório' }),
  since: z.string().datetime({ message: 'since é obrigatório e deve ser ISO-8601' }),
  until: z.string().datetime({ message: 'until é obrigatório e deve ser ISO-8601' }),
  campaign_id: z.string().optional().describe('Filtrar anúncios por ID da campanha'),
  status: z
    .enum(['ALL', 'ACTIVE', 'PAUSED'])
    .default('ALL')
    .describe('Status dos anúncios a listar'),
  limit: z.number().int().min(1).max(50).default(20).describe('Limite máximo de anúncios (máx: 50)')
});

export type ListAdsInput = z.infer<typeof ListAdsInputSchema>;

export const AdItemOutputSchema = z.object({
  ad_id: z.string(),
  ad_name: z.string(),
  campaign_id: z.string(),
  campaign_name: z.string(),
  adset_name: z.string().optional(),
  status: z.string(),
  utm_source: z.string(),
  utm_medium: z.string(),
  utm_campaign: z.string(),
  utm_content: z.string(),
  provenance: MarketingProvenanceSchema
});

export const ListAdsOutputSchema = z.object({
  client_id: z.string(),
  account_id: z.string(),
  timeframe: z.object({
    since: z.string(),
    until: z.string()
  }),
  total_ads: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  ads: z.array(AdItemOutputSchema)
});

export type ListAdsOutput = z.infer<typeof ListAdsOutputSchema>;

// ==========================================
// 2. get_ad_insights
// ==========================================

export const GetAdInsightsInputSchema = z.object({
  client_id: z.string().min(1, { message: 'client_id é obrigatório' }),
  since: z.string().datetime({ message: 'since é obrigatório e deve ser ISO-8601' }),
  until: z.string().datetime({ message: 'until é obrigatório e deve ser ISO-8601' }),
  ad_id: z.string().min(1, { message: 'ad_id é obrigatório' })
});

export type GetAdInsightsInput = z.infer<typeof GetAdInsightsInputSchema>;

export const AdMetricsSchema = z.object({
  spend_brl: z.number().nonnegative(),
  impressions: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  ctr: z.number().nonnegative(),
  cpc_brl: z.number().nonnegative(),
  cpm_brl: z.number().nonnegative(),
  frequency: z.number().nonnegative(),
  hook_rate_3s: z.number().nonnegative().optional()
});

export const GetAdInsightsOutputSchema = z.object({
  client_id: z.string(),
  account_id: z.string(),
  ad_id: z.string(),
  ad_name: z.string(),
  campaign_id: z.string(),
  campaign_name: z.string(),
  timeframe: z.object({
    since: z.string(),
    until: z.string()
  }),
  utm_content: z.string(),
  status: z.string(),
  metrics: AdMetricsSchema,
  provenance: MarketingProvenanceSchema
});

export type GetAdInsightsOutput = z.infer<typeof GetAdInsightsOutputSchema>;

// ==========================================
// 3. get_leads
// ==========================================

export const GetLeadsInputSchema = z.object({
  client_id: z.string().min(1, { message: 'client_id é obrigatório' }),
  since: z.string().datetime({ message: 'since é obrigatório e deve ser ISO-8601' }),
  until: z.string().datetime({ message: 'until é obrigatório e deve ser ISO-8601' }),
  utm_content: z
    .string()
    .optional()
    .describe('Filtrar leads atribuídos a um utm_content específico'),
  status: z
    .enum(['ALL', 'venda', 'carrinho_abandonado', 'perdido', 'lead'])
    .default('ALL')
    .describe('Status do deal'),
  limit: z.number().int().min(1).max(200).default(50).describe('Limite máximo de leads (máx: 200)')
});

export type GetLeadsInput = z.infer<typeof GetLeadsInputSchema>;

export const LeadItemOutputSchema = z.object({
  deal_id: z.string(),
  created_at: z.string().datetime(),
  customer_name: z.string(),
  customer_email: z.string(),
  status: z.string(),
  value_brl: z.number().nonnegative(),
  origem_declarada: z.string().optional(),
  utm_source: z.string(),
  utm_medium: z.string(),
  utm_campaign: z.string(),
  utm_content: z.string(),
  provenance: MarketingProvenanceSchema
});

export const GetLeadsOutputSchema = z.object({
  client_id: z.string(),
  timeframe: z.object({
    since: z.string(),
    until: z.string()
  }),
  total_leads: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  summary: z.object({
    matched_deals_count: z.number().int().nonnegative(),
    matched_sales_count: z.number().int().nonnegative(),
    matched_revenue_brl: z.number().nonnegative()
  }),
  leads: z.array(LeadItemOutputSchema)
});

export type GetLeadsOutput = z.infer<typeof GetLeadsOutputSchema>;

// ==========================================
// Opções de Dados e Injeção de Falhas
// ==========================================

export interface MarketingDataOptions {
  metaAdsData?: typeof RAW_META_ADS_DATA;
  crmLeadsData?: typeof RAW_CRM_LEADS_DATA;
  crmUnavailable?: boolean;
  scenario?: 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5';
}

/**
 * Cria a ferramenta `list_ads` vinculada à conta Meta Ads.
 */
export function createListAdsTool(
  options: MarketingDataOptions = {}
): GovernedTool<ListAdsInput, ListAdsOutput> {
  const metaAds = options.metaAdsData ?? RAW_META_ADS_DATA;

  const postconditions: ToolPostcondition<ListAdsInput, ListAdsOutput>[] = [
    {
      name: 'client_isolation',
      description: 'Garante que os anúncios retornados pertencem ao client_id solicitado',
      check: (input, output) => output.client_id === input.client_id
    },
    {
      name: 'limit_enforced',
      description: 'Garante que o número de anúncios não excede o limite',
      check: (input, output) => output.ads.length <= input.limit
    },
    {
      name: 'utm_content_preserved',
      description: 'Garante que todos os anúncios preservam o identificador utm_content',
      check: (_input, output) =>
        output.ads.every((ad) => typeof ad.utm_content === 'string' && ad.utm_content.length > 0)
    }
  ];

  return createTool<ListAdsInput, ListAdsOutput>({
    name: 'list_ads',
    description:
      'Lista os anúncios veiculados na conta de Meta Ads do cliente, com respectivos IDs, nomes de campanha, status e parâmetros de UTM.',
    effect: 'read:meta',
    inputSchema: ListAdsInputSchema,
    outputSchema: ListAdsOutputSchema,
    postconditions,
    handler: async (params) => {
      if (metaAds.client_id !== params.client_id) {
        throw new Error(
          `Cliente '${params.client_id}' não encontrado na conta Meta Ads. Acesso negado para cross-client.`
        );
      }

      const sinceMs = new Date(params.since).getTime();
      const untilMs = new Date(params.until).getTime();
      if (sinceMs > untilMs) {
        throw new Error(
          `Período inválido: 'since' (${params.since}) é posterior a 'until' (${params.until}).`
        );
      }

      const allAds: ListAdsOutput['ads'] = [];

      for (const campaign of metaAds.campaigns) {
        if (params.campaign_id && campaign.campaign_id !== params.campaign_id) {
          continue;
        }

        for (const ad of campaign.ads) {
          if (params.status !== 'ALL' && ad.status !== params.status) {
            continue;
          }

          allAds.push({
            ad_id: ad.ad_id,
            ad_name: ad.ad_name,
            campaign_id: campaign.campaign_id,
            campaign_name: campaign.campaign_name,
            adset_name: ad.adset_name,
            status: ad.status,
            utm_source: ad.utm_source,
            utm_medium: ad.utm_medium,
            utm_campaign: ad.utm_campaign,
            utm_content: ad.utm_content,
            provenance: {
              source: 'meta_ads',
              locator: `meta:ad:${ad.ad_id}`,
              capturedAt: metaAds.generated_at
            }
          });
        }
      }

      const selectedAds = allAds.slice(0, params.limit);

      return {
        client_id: params.client_id,
        account_id: metaAds.account_id,
        timeframe: {
          since: params.since,
          until: params.until
        },
        total_ads: allAds.length,
        limit: params.limit,
        ads: selectedAds
      };
    }
  });
}

/**
 * Cria a ferramenta `get_ad_insights` vinculada às métricas de veiculação do Meta Ads.
 */
export function createGetAdInsightsTool(
  options: MarketingDataOptions = {}
): GovernedTool<GetAdInsightsInput, GetAdInsightsOutput> {
  const metaAds = options.metaAdsData ?? RAW_META_ADS_DATA;

  const postconditions: ToolPostcondition<GetAdInsightsInput, GetAdInsightsOutput>[] = [
    {
      name: 'ad_id_matches',
      description: 'Garante que o insight retornado corresponde exatamente ao ad_id consultado',
      check: (input, output) => output.ad_id === input.ad_id
    },
    {
      name: 'utm_content_preserved',
      description: 'Garante que utm_content está presente no insight retornado',
      check: (_input, output) =>
        typeof output.utm_content === 'string' && output.utm_content.length > 0
    }
  ];

  return createTool<GetAdInsightsInput, GetAdInsightsOutput>({
    name: 'get_ad_insights',
    description:
      'Recupera métricas de performance (spend, impressões, cliques, CTR, CPC, CPM, frequência, hook rate) de um anúncio específico no Meta Ads.',
    effect: 'read:meta',
    inputSchema: GetAdInsightsInputSchema,
    outputSchema: GetAdInsightsOutputSchema,
    postconditions,
    handler: async (params) => {
      if (metaAds.client_id !== params.client_id) {
        throw new Error(
          `Cliente '${params.client_id}' não encontrado na conta Meta Ads. Acesso negado para cross-client.`
        );
      }

      const sinceMs = new Date(params.since).getTime();
      const untilMs = new Date(params.until).getTime();
      if (sinceMs > untilMs) {
        throw new Error(
          `Período inválido: 'since' (${params.since}) é posterior a 'until' (${params.until}).`
        );
      }

      for (const campaign of metaAds.campaigns) {
        for (const ad of campaign.ads) {
          if (ad.ad_id === params.ad_id) {
            return {
              client_id: params.client_id,
              account_id: metaAds.account_id,
              ad_id: ad.ad_id,
              ad_name: ad.ad_name,
              campaign_id: campaign.campaign_id,
              campaign_name: campaign.campaign_name,
              timeframe: {
                since: params.since,
                until: params.until
              },
              utm_content: ad.utm_content,
              status: ad.status,
              metrics: {
                spend_brl: ad.spend_brl,
                impressions: ad.impressions,
                clicks: ad.clicks,
                ctr: ad.ctr,
                cpc_brl: ad.cpc_brl,
                cpm_brl: ad.cpm_brl,
                frequency: ad.frequency,
                hook_rate_3s: ad.hook_rate_3s
              },
              provenance: {
                source: 'meta_ads',
                locator: `meta:insights:${ad.ad_id}`,
                capturedAt: metaAds.generated_at
              }
            };
          }
        }
      }

      throw new Error(
        `Anúncio com ad_id '${params.ad_id}' não foi encontrado na conta do cliente '${params.client_id}'.`
      );
    }
  });
}

/**
 * Cria a ferramenta `get_leads` vinculada ao CRM, com suporte à injeção de falha do cenário S1.
 */
export function createGetLeadsTool(
  options: MarketingDataOptions = {}
): GovernedTool<GetLeadsInput, GetLeadsOutput> {
  const crmData = options.crmLeadsData ?? RAW_CRM_LEADS_DATA;
  const isUnavailable = options.crmUnavailable === true || options.scenario === 'S1';

  const postconditions: ToolPostcondition<GetLeadsInput, GetLeadsOutput>[] = [
    {
      name: 'client_isolation',
      description: 'Garante que os leads retornados pertencem ao client_id solicitado',
      check: (input, output) => output.client_id === input.client_id
    },
    {
      name: 'limit_enforced',
      description: 'Garante que a quantidade de leads não ultrapassa o limite solicitado',
      check: (input, output) => output.leads.length <= input.limit
    },
    {
      name: 'utm_and_origin_preserved',
      description: 'Garante que utm_content está preservado em todos os deals',
      check: (_input, output) =>
        output.leads.every(
          (deal) => typeof deal.utm_content === 'string' && deal.utm_content.length > 0
        )
    }
  ];

  return createTool<GetLeadsInput, GetLeadsOutput>({
    name: 'get_leads',
    description:
      'Recupera a lista de leads, vendas e carrinhos registrados no CRM com valores financeiros, UTMs e origem declarada.',
    effect: 'read:crm',
    inputSchema: GetLeadsInputSchema,
    outputSchema: GetLeadsOutputSchema,
    postconditions,
    handler: async (params) => {
      // Simulação do Cenário S1: Indisponibilidade temporária do CRM
      if (isUnavailable) {
        throw new Error(
          'Integração CRM indisponível: conexão com a API do CRM falhou com código 503 (Service Unavailable) [S1: CRM_UNAVAILABLE].'
        );
      }

      if (crmData.client_id !== params.client_id) {
        throw new Error(
          `Cliente '${params.client_id}' não encontrado na base do CRM. Acesso negado para cross-client.`
        );
      }

      const sinceMs = new Date(params.since).getTime();
      const untilMs = new Date(params.until).getTime();
      if (sinceMs > untilMs) {
        throw new Error(
          `Período inválido: 'since' (${params.since}) é posterior a 'until' (${params.until}).`
        );
      }

      const filteredDeals = crmData.deals.filter((deal) => {
        const dealMs = new Date(deal.created_at).getTime();
        if (dealMs < sinceMs || dealMs > untilMs) {
          return false;
        }

        if (params.status !== 'ALL' && deal.status !== params.status) {
          return false;
        }

        if (params.utm_content && deal.utm_content !== params.utm_content) {
          return false;
        }

        return true;
      });

      // Cálculo de sumário
      let totalSales = 0;
      let totalRevenue = 0;
      for (const d of filteredDeals) {
        if (d.status === 'venda') {
          totalSales += 1;
          totalRevenue += d.value_brl;
        }
      }

      // Ordenar decrescente por data de criação
      filteredDeals.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const selected = filteredDeals.slice(0, params.limit);

      const formattedLeads = selected.map((deal) => ({
        deal_id: deal.deal_id,
        created_at: deal.created_at,
        customer_name: deal.customer_name,
        customer_email: deal.customer_email,
        status: deal.status,
        value_brl: deal.value_brl,
        origem_declarada: deal.origem_declarada,
        utm_source: deal.utm_source,
        utm_medium: deal.utm_medium,
        utm_campaign: deal.utm_campaign,
        utm_content: deal.utm_content,
        provenance: {
          source: 'crm' as const,
          locator: `crm:deal:${deal.deal_id}`,
          capturedAt: crmData.generated_at
        }
      }));

      return {
        client_id: params.client_id,
        timeframe: {
          since: params.since,
          until: params.until
        },
        total_leads: filteredDeals.length,
        limit: params.limit,
        summary: {
          matched_deals_count: filteredDeals.length,
          matched_sales_count: totalSales,
          matched_revenue_brl: Math.round(totalRevenue * 100) / 100
        },
        leads: formattedLeads
      };
    }
  });
}

// ==========================================
// 4. meta.update_budget (Task 5.1 — external_write)
// ==========================================

export const MetaUpdateBudgetInputSchema = z.object({
  client_id: z.string().min(1, { message: 'client_id é obrigatório' }),
  ad_id: z.string().min(1, { message: 'ad_id é obrigatório' }),
  daily_budget_brl: z.number().positive({ message: 'daily_budget_brl deve ser positivo' }),
  idempotency_key: z.string().min(1, { message: 'idempotency_key é obrigatório para mutações externas' }),
  expected_previous_state: z.record(z.unknown()).optional()
});

export type MetaUpdateBudgetInput = z.infer<typeof MetaUpdateBudgetInputSchema>;

export const MetaUpdateBudgetOutputSchema = z.object({
  success: z.boolean(),
  operation: z.literal('UPDATE_BUDGET'),
  client_id: z.string(),
  ad_id: z.string(),
  previous_state_snapshot: z.object({
    ad_id: z.string(),
    daily_budget_brl: z.number(),
    status: z.string()
  }),
  current_state: z.object({
    ad_id: z.string(),
    daily_budget_brl: z.number(),
    status: z.string()
  }),
  idempotency_key: z.string(),
  executed_at: z.string().datetime(),
  provenance: MarketingProvenanceSchema
});

export type MetaUpdateBudgetOutput = z.infer<typeof MetaUpdateBudgetOutputSchema>;

// ==========================================
// 5. meta.pause_ad (Task 5.1 — external_write)
// ==========================================

export const MetaPauseAdInputSchema = z.object({
  client_id: z.string().min(1, { message: 'client_id é obrigatório' }),
  ad_id: z.string().min(1, { message: 'ad_id é obrigatório' }),
  reason: z.string().min(1, { message: 'reason é obrigatório para justificar a pausa' }),
  idempotency_key: z.string().min(1, { message: 'idempotency_key é obrigatório para mutações externas' }),
  expected_previous_state: z.record(z.unknown()).optional()
});

export type MetaPauseAdInput = z.infer<typeof MetaPauseAdInputSchema>;

export const MetaPauseAdOutputSchema = z.object({
  success: z.boolean(),
  operation: z.literal('PAUSE'),
  client_id: z.string(),
  ad_id: z.string(),
  previous_state_snapshot: z.object({
    ad_id: z.string(),
    status: z.string()
  }),
  current_state: z.object({
    ad_id: z.string(),
    status: z.literal('PAUSED')
  }),
  idempotency_key: z.string(),
  executed_at: z.string().datetime(),
  provenance: MarketingProvenanceSchema
});

export type MetaPauseAdOutput = z.infer<typeof MetaPauseAdOutputSchema>;

// ==========================================
// 6. meta.reactivate_ad (Task 5.1 — external_write)
// ==========================================

export const MetaReactivateAdInputSchema = z.object({
  client_id: z.string().min(1, { message: 'client_id é obrigatório' }),
  ad_id: z.string().min(1, { message: 'ad_id é obrigatório' }),
  idempotency_key: z.string().min(1, { message: 'idempotency_key é obrigatório para mutações externas' })
});

export type MetaReactivateAdInput = z.infer<typeof MetaReactivateAdInputSchema>;

export const MetaReactivateAdOutputSchema = z.object({
  success: z.boolean(),
  operation: z.literal('REACTIVATE'),
  client_id: z.string(),
  ad_id: z.string(),
  previous_state_snapshot: z.object({
    ad_id: z.string(),
    status: z.string()
  }),
  current_state: z.object({
    ad_id: z.string(),
    status: z.literal('ACTIVE')
  }),
  idempotency_key: z.string(),
  executed_at: z.string().datetime(),
  provenance: MarketingProvenanceSchema
});

export type MetaReactivateAdOutput = z.infer<typeof MetaReactivateAdOutputSchema>;

// ==========================================
// 7. meta.get_ad (Task 5.1 — read:meta para pós-condição)
// ==========================================

export const MetaGetAdInputSchema = z.object({
  client_id: z.string().min(1, { message: 'client_id é obrigatório' }),
  ad_id: z.string().min(1, { message: 'ad_id é obrigatório' })
});

export type MetaGetAdInput = z.infer<typeof MetaGetAdInputSchema>;

export const MetaGetAdOutputSchema = z.object({
  client_id: z.string(),
  account_id: z.string(),
  ad_id: z.string(),
  ad_name: z.string(),
  campaign_id: z.string(),
  status: z.string(),
  daily_budget_brl: z.number(),
  utm_content: z.string(),
  last_modified: z.string().datetime(),
  provenance: MarketingProvenanceSchema
});

export type MetaGetAdOutput = z.infer<typeof MetaGetAdOutputSchema>;

// ==========================================
// In-Memory Simulation Store com Idempotência
// ==========================================

interface IdempotencyRecord {
  inputHash: string;
  output: unknown;
  timestamp: string;
}

export class MetaAdsSimulationStore {
  private adStates: Map<string, { status: string; daily_budget_brl: number; lastModified: string }> =
    new Map();
  private idempotencyMap: Map<string, IdempotencyRecord> = new Map();

  constructor(initialData: typeof RAW_META_ADS_DATA = RAW_META_ADS_DATA) {
    for (const camp of initialData.campaigns) {
      for (const ad of camp.ads) {
        this.adStates.set(ad.ad_id, {
          status: ad.status,
          daily_budget_brl: ad.spend_brl > 0 ? 100.0 : 50.0,
          lastModified: initialData.generated_at
        });
      }
    }
  }

  public getAdState(adId: string) {
    return (
      this.adStates.get(adId) ?? {
        status: 'ACTIVE',
        daily_budget_brl: 100.0,
        lastModified: new Date().toISOString()
      }
    );
  }

  public setAdState(adId: string, state: { status?: string; daily_budget_brl?: number }) {
    const prev = this.getAdState(adId);
    const now = new Date().toISOString();
    const updated = {
      status: state.status ?? prev.status,
      daily_budget_brl: state.daily_budget_brl ?? prev.daily_budget_brl,
      lastModified: now
    };
    this.adStates.set(adId, updated);
    return { prev, updated };
  }

  public checkIdempotency(key: string, inputPayload: unknown): unknown | null {
    const serialized = JSON.stringify(inputPayload);
    const existing = this.idempotencyMap.get(key);
    if (!existing) return null;

    if (existing.inputHash !== serialized) {
      throw new Error(
        `Conflito de Idempotência: A chave '${key}' já foi utilizada com parâmetros divergentes [IDEMPOTENCY_CONFLICT].`
      );
    }

    return existing.output;
  }

  public recordIdempotency(key: string, inputPayload: unknown, output: unknown) {
    this.idempotencyMap.set(key, {
      inputHash: JSON.stringify(inputPayload),
      output,
      timestamp: new Date().toISOString()
    });
  }

  public reset() {
    this.adStates.clear();
    this.idempotencyMap.clear();
  }
}

// Store singleton padrão para simulação consistente
export const DEFAULT_META_SIMULATION_STORE = new MetaAdsSimulationStore();

/**
 * Cria a ferramenta `meta.update_budget` (external_write).
 */
export function createMetaUpdateBudgetTool(
  options: MarketingDataOptions & { simulationStore?: MetaAdsSimulationStore } = {}
): GovernedTool<MetaUpdateBudgetInput, MetaUpdateBudgetOutput> {
  const metaAds = options.metaAdsData ?? RAW_META_ADS_DATA;
  const store = options.simulationStore ?? DEFAULT_META_SIMULATION_STORE;

  return createTool<MetaUpdateBudgetInput, MetaUpdateBudgetOutput>({
    name: 'meta.update_budget',
    description:
      'Atualiza o orçamento diário de um anúncio ou conjunto no Meta Ads com garantia de idempotência e snapshot anterior.',
    effect: 'external_write',
    inputSchema: MetaUpdateBudgetInputSchema,
    outputSchema: MetaUpdateBudgetOutputSchema,
    postconditions: [
      {
        name: 'budget_updated',
        description: 'Garante que o novo orçamento diário foi aplicado',
        check: (input, output) => output.current_state.daily_budget_brl === input.daily_budget_brl
      },
      {
        name: 'snapshot_captured',
        description: 'Garante que o snapshot anterior para rollback foi registrado',
        check: (_input, output) => output.previous_state_snapshot.daily_budget_brl > 0
      }
    ],
    handler: async (params) => {
      if (metaAds.client_id !== params.client_id) {
        throw new Error(
          `Cliente '${params.client_id}' não confere com a conta Meta Ads configurada.`
        );
      }

      // 1. Verificação de Idempotência (Invariante 2)
      const cached = store.checkIdempotency(params.idempotency_key, params);
      if (cached) {
        return cached as MetaUpdateBudgetOutput;
      }

      const { prev, updated } = store.setAdState(params.ad_id, {
        daily_budget_brl: params.daily_budget_brl
      });

      const now = new Date().toISOString();
      const output: MetaUpdateBudgetOutput = {
        success: true,
        operation: 'UPDATE_BUDGET',
        client_id: params.client_id,
        ad_id: params.ad_id,
        previous_state_snapshot: {
          ad_id: params.ad_id,
          daily_budget_brl: prev.daily_budget_brl,
          status: prev.status
        },
        current_state: {
          ad_id: params.ad_id,
          daily_budget_brl: updated.daily_budget_brl,
          status: updated.status
        },
        idempotency_key: params.idempotency_key,
        executed_at: now,
        provenance: {
          source: 'meta_ads',
          locator: `meta:ad:${params.ad_id}:budget`,
          capturedAt: now
        }
      };

      store.recordIdempotency(params.idempotency_key, params, output);
      return output;
    }
  });
}

/**
 * Cria a ferramenta `meta.pause_ad` (external_write).
 */
export function createMetaPauseAdTool(
  options: MarketingDataOptions & { simulationStore?: MetaAdsSimulationStore } = {}
): GovernedTool<MetaPauseAdInput, MetaPauseAdOutput> {
  const metaAds = options.metaAdsData ?? RAW_META_ADS_DATA;
  const store = options.simulationStore ?? DEFAULT_META_SIMULATION_STORE;

  return createTool<MetaPauseAdInput, MetaPauseAdOutput>({
    name: 'meta.pause_ad',
    description:
      'Pausa a veiculação de um anúncio no Meta Ads com garantia de idempotência, motivo auditável e snapshot anterior.',
    effect: 'external_write',
    inputSchema: MetaPauseAdInputSchema,
    outputSchema: MetaPauseAdOutputSchema,
    postconditions: [
      {
        name: 'status_paused',
        description: 'Garante que o status atual foi alterado para PAUSED',
        check: (_input, output) => output.current_state.status === 'PAUSED'
      }
    ],
    handler: async (params) => {
      if (metaAds.client_id !== params.client_id) {
        throw new Error(
          `Cliente '${params.client_id}' não confere com a conta Meta Ads configurada.`
        );
      }

      // 1. Verificação de Idempotência (Invariante 2)
      const cached = store.checkIdempotency(params.idempotency_key, params);
      if (cached) {
        return cached as MetaPauseAdOutput;
      }

      const { prev } = store.setAdState(params.ad_id, { status: 'PAUSED' });

      const now = new Date().toISOString();
      const output: MetaPauseAdOutput = {
        success: true,
        operation: 'PAUSE',
        client_id: params.client_id,
        ad_id: params.ad_id,
        previous_state_snapshot: {
          ad_id: params.ad_id,
          status: prev.status
        },
        current_state: {
          ad_id: params.ad_id,
          status: 'PAUSED'
        },
        idempotency_key: params.idempotency_key,
        executed_at: now,
        provenance: {
          source: 'meta_ads',
          locator: `meta:ad:${params.ad_id}:status`,
          capturedAt: now
        }
      };

      store.recordIdempotency(params.idempotency_key, params, output);
      return output;
    }
  });
}

/**
 * Cria a ferramenta `meta.reactivate_ad` (external_write / rollback).
 */
export function createMetaReactivateAdTool(
  options: MarketingDataOptions & { simulationStore?: MetaAdsSimulationStore } = {}
): GovernedTool<MetaReactivateAdInput, MetaReactivateAdOutput> {
  const metaAds = options.metaAdsData ?? RAW_META_ADS_DATA;
  const store = options.simulationStore ?? DEFAULT_META_SIMULATION_STORE;

  return createTool<MetaReactivateAdInput, MetaReactivateAdOutput>({
    name: 'meta.reactivate_ad',
    description:
      'Reativa a veiculação de um anúncio previamente pausado no Meta Ads (usado para rollback determinístico).',
    effect: 'external_write',
    inputSchema: MetaReactivateAdInputSchema,
    outputSchema: MetaReactivateAdOutputSchema,
    postconditions: [
      {
        name: 'status_active',
        description: 'Garante que o status atual foi alterado para ACTIVE',
        check: (_input, output) => output.current_state.status === 'ACTIVE'
      }
    ],
    handler: async (params) => {
      if (metaAds.client_id !== params.client_id) {
        throw new Error(
          `Cliente '${params.client_id}' não confere com a conta Meta Ads configurada.`
        );
      }

      const cached = store.checkIdempotency(params.idempotency_key, params);
      if (cached) {
        return cached as MetaReactivateAdOutput;
      }

      const { prev } = store.setAdState(params.ad_id, { status: 'ACTIVE' });

      const now = new Date().toISOString();
      const output: MetaReactivateAdOutput = {
        success: true,
        operation: 'REACTIVATE',
        client_id: params.client_id,
        ad_id: params.ad_id,
        previous_state_snapshot: {
          ad_id: params.ad_id,
          status: prev.status
        },
        current_state: {
          ad_id: params.ad_id,
          status: 'ACTIVE'
        },
        idempotency_key: params.idempotency_key,
        executed_at: now,
        provenance: {
          source: 'meta_ads',
          locator: `meta:ad:${params.ad_id}:status`,
          capturedAt: now
        }
      };

      store.recordIdempotency(params.idempotency_key, params, output);
      return output;
    }
  });
}

/**
 * Cria a ferramenta `meta.get_ad` (read:meta — usada para releitura ativa de pós-condição).
 */
export function createMetaGetAdTool(
  options: MarketingDataOptions & { simulationStore?: MetaAdsSimulationStore } = {}
): GovernedTool<MetaGetAdInput, MetaGetAdOutput> {
  const metaAds = options.metaAdsData ?? RAW_META_ADS_DATA;
  const store = options.simulationStore ?? DEFAULT_META_SIMULATION_STORE;

  return createTool<MetaGetAdInput, MetaGetAdOutput>({
    name: 'meta.get_ad',
    description:
      'Recupera o estado vivo de um anúncio no Meta Ads (status, orçamento, tags) para verificação ativa de pós-condição.',
    effect: 'read:meta',
    inputSchema: MetaGetAdInputSchema,
    outputSchema: MetaGetAdOutputSchema,
    postconditions: [
      {
        name: 'ad_id_matches',
        description: 'Garante que o anúncio retornado corresponde ao consultado',
        check: (input, output) => output.ad_id === input.ad_id
      }
    ],
    handler: async (params) => {
      if (metaAds.client_id !== params.client_id) {
        throw new Error(
          `Cliente '${params.client_id}' não encontrado na conta Meta Ads.`
        );
      }

      for (const campaign of metaAds.campaigns) {
        for (const ad of campaign.ads) {
          if (ad.ad_id === params.ad_id) {
            const liveState = store.getAdState(ad.ad_id);
            return {
              client_id: params.client_id,
              account_id: metaAds.account_id,
              ad_id: ad.ad_id,
              ad_name: ad.ad_name,
              campaign_id: campaign.campaign_id,
              status: liveState.status,
              daily_budget_brl: liveState.daily_budget_brl,
              utm_content: ad.utm_content,
              last_modified: liveState.lastModified,
              provenance: {
                source: 'meta_ads',
                locator: `meta:ad:${ad.ad_id}:live`,
                capturedAt: liveState.lastModified
              }
            };
          }
        }
      }

      throw new Error(`Anúncio '${params.ad_id}' não encontrado.`);
    }
  });
}

/**
 * Factory que instancia as ferramentas de marketing, vendas e operações no Meta Ads.
 */
export function createMarketingTools(
  options: MarketingDataOptions & { simulationStore?: MetaAdsSimulationStore } = {}
) {
  return {
    listAdsTool: createListAdsTool(options),
    getAdInsightsTool: createGetAdInsightsTool(options),
    getLeadsTool: createGetLeadsTool(options),
    // Novas ferramentas operacionais do Épico 5
    updateBudgetTool: createMetaUpdateBudgetTool(options),
    pauseAdTool: createMetaPauseAdTool(options),
    reactivateAdTool: createMetaReactivateAdTool(options),
    getAdTool: createMetaGetAdTool(options)
  };
}

