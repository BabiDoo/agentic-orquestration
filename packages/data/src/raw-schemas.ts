/**
 * @adzhub/data - Raw Dataset Schemas
 * Schemas Zod formais para validação estrutural dos 7 arquivos brutos de dados.
 */

import { z } from 'zod';
import { TimeframeSchema } from '@adzhub/contracts';

/**
 * 1. Schema do Grafo do Supercérebro (supercerebro_graph.json)
 */
export const RawGraphNodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['hub', 'person', 'campaign', 'channel', 'meeting', 'task', 'asset', 'brand']),
  label: z.string().min(1),
  props: z.record(z.unknown()).optional()
});

export const RawGraphEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  rel: z.enum([
    'MEMBER_OF',
    'OPERATES',
    'MANAGES',
    'APPROVES',
    'EXECUTES',
    'PUBLISHED_ON',
    'PART_OF',
    'TRACKS',
    'MENTIONS',
    'CREATES'
  ]),
  props: z.record(z.unknown()).optional()
});

export const RawGraphDataSchema = z.object({
  client_id: z.string().min(1),
  tenant_id: z.string().min(1),
  version: z.string().min(1),
  generated_at: z.string().datetime(),
  nodes: z.array(RawGraphNodeSchema).min(1),
  edges: z.array(RawGraphEdgeSchema)
});

export type RawGraphData = z.infer<typeof RawGraphDataSchema>;

/**
 * 2. Schema da Linha do Tempo (supercerebro_timeline.json)
 */
export const RawTimelineEventSchema = z.object({
  event_id: z.string().min(1),
  occurred_at: z.string().datetime(),
  title: z.string().min(1),
  summary: z.string().min(1),
  actor_ids: z.array(z.string().min(1)),
  related_node_ids: z.array(z.string().min(1))
});

export const RawTimelineDataSchema = z.object({
  client_id: z.string().min(1),
  tenant_id: z.string().min(1),
  version: z.string().min(1),
  generated_at: z.string().datetime(),
  events: z.array(RawTimelineEventSchema).min(1)
});

export type RawTimelineData = z.infer<typeof RawTimelineDataSchema>;

/**
 * 3. Schema da API Meta Ads (api_meta_ads.json)
 */
export const RawMetaAdSchema = z.object({
  ad_id: z.string().min(1),
  ad_name: z.string().min(1),
  adset_name: z.string().optional(),
  spend_brl: z.number().nonnegative(),
  impressions: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  ctr: z.number().nonnegative(),
  cpc_brl: z.number().nonnegative(),
  cpm_brl: z.number().nonnegative(),
  frequency: z.number().positive(),
  hook_rate_3s: z.number().min(0).max(1).optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  status: z.string().min(1)
});

export const RawMetaCampaignSchema = z.object({
  campaign_id: z.string().min(1),
  campaign_name: z.string().min(1),
  objective: z.string().min(1),
  status: z.string().min(1),
  budget_daily_brl: z.number().nonnegative(),
  ads: z.array(RawMetaAdSchema).min(1)
});

export const RawMetaAdsDataSchema = z.object({
  client_id: z.string().min(1),
  tenant_id: z.string().min(1),
  version: z.string().min(1),
  generated_at: z.string().datetime(),
  account_id: z.string().min(1),
  currency: z.string(),
  timeframe: TimeframeSchema,
  summary: z.object({
    total_spend_brl: z.number().nonnegative(),
    total_impressions: z.number().int().nonnegative(),
    total_clicks: z.number().int().nonnegative(),
    average_ctr: z.number().nonnegative(),
    average_cpc_brl: z.number().nonnegative()
  }),
  campaigns: z.array(RawMetaCampaignSchema).min(1)
});

export type RawMetaAdsData = z.infer<typeof RawMetaAdsDataSchema>;

/**
 * 4. Schema da API CRM Leads & Deals (api_crm_leads.json)
 */
export const RawCrmDealSchema = z.object({
  deal_id: z.string().min(1),
  created_at: z.string().datetime(),
  customer_name: z.string().min(1),
  customer_email: z.string().email(),
  status: z.string().min(1),
  value_brl: z.number().nonnegative(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  origem_declarada: z.string().optional()
});

export const RawCrmLeadsDataSchema = z.object({
  client_id: z.string().min(1),
  tenant_id: z.string().min(1),
  version: z.string().min(1),
  generated_at: z.string().datetime(),
  currency: z.string(),
  timeframe: TimeframeSchema,
  summary: z.object({
    total_leads: z.number().int().nonnegative(),
    total_sales: z.number().int().nonnegative(),
    total_revenue_brl: z.number().nonnegative()
  }),
  deals: z.array(RawCrmDealSchema).min(1)
});

export type RawCrmLeadsData = z.infer<typeof RawCrmLeadsDataSchema>;

/**
 * 5. Schema do App de Análise de Criativos (app_analise_criativos.json)
 */
export const RawCreativeEvaluationSchema = z.object({
  ad_id: z.string().min(1),
  utm_content: z.string().optional(),
  ad_name: z.string().min(1),
  campaign_id: z.string().min(1),
  stage: z.string().optional(),
  hook_score: z.number().min(0).max(10),
  retention_score: z.number().min(0).max(10),
  cta_score: z.number().min(0).max(10),
  overall_score: z.number().min(0).max(10),
  recommendation: z.string().min(1),
  brief_sugerido: z.object({
    publico: z.string().min(1),
    hook: z.string().min(1),
    mensagem: z.string().min(1),
    cta: z.string().min(1),
    metrica_sucesso: z.string().min(1)
  })
});

export const RawAnaliseCriativosDataSchema = z.object({
  client_id: z.string().min(1),
  tenant_id: z.string().min(1),
  version: z.string().min(1),
  evaluated_at: z.string().datetime(),
  methodology: z.string().min(1),
  summary: z.object({
    total_creatives_analyzed: z.number().int().nonnegative(),
    recommendations_breakdown: z.object({
      SEGUIR: z.number().int().nonnegative().optional(),
      VARIAR: z.number().int().nonnegative().optional(),
      PAUSAR: z.number().int().nonnegative().optional()
    })
  }),
  creatives: z.array(RawCreativeEvaluationSchema).min(1)
});

export type RawAnaliseCriativosData = z.infer<typeof RawAnaliseCriativosDataSchema>;

/**
 * 6. Schema do App Mapa da Solução (app_mapa_solucao.json)
 */
export const RawMapaSolucaoDataSchema = z.object({
  client_id: z.string().min(1),
  tenant_id: z.string().min(1),
  version: z.string().min(1),
  generated_at: z.string().datetime(),
  brand_name: z.string().min(1),
  market_segment: z.string().min(1),
  core_offer: z.string().min(1),
  promise: z.string().min(1),
  proof_elements: z.array(z.string().min(1)).min(1),
  target_audiences: z
    .array(
      z.object({
        persona: z.string().min(1),
        main_driver: z.string().min(1)
      })
    )
    .min(1),
  tone_of_voice: z.object({
    style: z.string().min(1),
    reading_level: z.string().min(1),
    guidelines: z.string().min(1)
  }),
  forbidden_claims: z.array(z.string().min(1)).min(1)
});

export type RawMapaSolucaoData = z.infer<typeof RawMapaSolucaoDataSchema>;

/**
 * 7. Schema de Conversas e Reuniões (conversas.json)
 */
export const RawWhatsAppMessageSchema = z.object({
  message_id: z.string().min(1),
  timestamp: z.string().datetime(),
  sender_id: z.string().min(1),
  content: z.string().min(1)
});

export const RawWhatsAppThreadSchema = z.object({
  thread_id: z.string().min(1),
  title: z.string().min(1),
  participants: z
    .array(
      z.object({
        person_id: z.string().min(1),
        name: z.string().min(1),
        role: z.string().optional()
      })
    )
    .min(1),
  messages: z.array(RawWhatsAppMessageSchema).min(1)
});

export const RawMeetingTranscriptSchema = z.object({
  meeting_id: z.string().min(1),
  date: z.string().datetime(),
  title: z.string().min(1),
  participants: z
    .array(
      z.object({
        person_id: z.string().min(1),
        name: z.string().min(1)
      })
    )
    .min(1),
  key_points: z.array(z.string().min(1)).min(1)
});

export const RawConversasDataSchema = z.object({
  client_id: z.string().min(1),
  tenant_id: z.string().min(1),
  version: z.string().min(1),
  generated_at: z.string().datetime().optional(),
  whatsapp_threads: z.array(RawWhatsAppThreadSchema),
  meeting_transcripts: z.array(RawMeetingTranscriptSchema)
});

export type RawConversasData = z.infer<typeof RawConversasDataSchema>;

/**
 * Bundle unificado dos 7 arquivos brutos validados
 */
export interface ValidatedRawDataset {
  graph: RawGraphData;
  timeline: RawTimelineData;
  metaAds: RawMetaAdsData;
  crmLeads: RawCrmLeadsData;
  analiseCriativos: RawAnaliseCriativosData;
  mapaSolucao: RawMapaSolucaoData;
  conversas: RawConversasData;
}

export interface RawDatasetValidationResult {
  valid: boolean;
  dataset?: ValidatedRawDataset;
  errors: Record<string, string[]>;
}

/**
 * Valida o mapa com os 7 arquivos brutos contra seus respectivos schemas Zod.
 */
export function validateRawDatasetFiles(
  files: Record<string, unknown>
): RawDatasetValidationResult {
  const errors: Record<string, string[]> = {};

  const parseFile = <T>(filename: string, schema: z.ZodSchema<T>): T | null => {
    const rawContent = files[filename];
    if (rawContent === undefined || rawContent === null) {
      errors[filename] = [`Arquivo obrigatório não encontrado: ${filename}`];
      return null;
    }

    let parsedJson: unknown = rawContent;
    if (typeof rawContent === 'string') {
      try {
        parsedJson = JSON.parse(rawContent);
      } catch (err: unknown) {
        errors[filename] = [`Erro de sintaxe JSON: ${(err as Error).message}`];
        return null;
      }
    }

    const result = schema.safeParse(parsedJson);
    if (!result.success) {
      errors[filename] = result.error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`
      );
      return null;
    }

    return result.data;
  };

  const graph = parseFile('supercerebro_graph.json', RawGraphDataSchema);
  const timeline = parseFile('supercerebro_timeline.json', RawTimelineDataSchema);
  const metaAds = parseFile('api_meta_ads.json', RawMetaAdsDataSchema);
  const crmLeads = parseFile('api_crm_leads.json', RawCrmLeadsDataSchema);
  const analiseCriativos = parseFile('app_analise_criativos.json', RawAnaliseCriativosDataSchema);
  const mapaSolucao = parseFile('app_mapa_solucao.json', RawMapaSolucaoDataSchema);
  const conversas = parseFile('conversas.json', RawConversasDataSchema);

  const hasErrors = Object.keys(errors).length > 0;

  if (
    hasErrors ||
    !graph ||
    !timeline ||
    !metaAds ||
    !crmLeads ||
    !analiseCriativos ||
    !mapaSolucao ||
    !conversas
  ) {
    return {
      valid: false,
      errors
    };
  }

  return {
    valid: true,
    dataset: {
      graph,
      timeline,
      metaAds,
      crmLeads,
      analiseCriativos,
      mapaSolucao,
      conversas
    },
    errors: {}
  };
}
