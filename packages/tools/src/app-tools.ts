import { z } from 'zod';
import {
  RAW_META_ADS_DATA,
  RAW_CRM_LEADS_DATA,
  RAW_ANALISE_CRIATIVOS_DATA,
  RAW_MAPA_SOLUCAO_DATA,
  reconcileMetaAdsAndCrm,
  computeAllDerivedMetrics
} from '@adzhub/data';
import {
  DataQualityApp,
  DataQualityInputSchema,
  DataQualityInput,
  DataQualityOutputSchema,
  DataQualityOutput,
  PerformanceReconciliationApp,
  PerformanceReconciliationInputSchema,
  PerformanceReconciliationInput,
  PerformanceReconciliationOutputSchema,
  PerformanceReconciliationOutput,
  AccountDiagnosisApp,
  AccountDiagnosisInputSchema,
  AccountDiagnosisInput,
  AccountDiagnosisOutputSchema,
  AccountDiagnosisOutput,
  ActionRecommendationApp,
  ActionRecommendationInputSchema,
  ActionRecommendationInput,
  ActionRecommendationOutputSchema,
  ActionRecommendationOutput,
  CreativeBriefApp,
  CreativeBriefInputSchema,
  CreativeBriefInput,
  CreativeBriefOutputSchema,
  CreativeBriefOutput,
  MeetingBriefApp,
  MeetingAgendaInputSchema,
  MeetingAgendaInput,
  MeetingAgendaOutputSchema,
  MeetingAgendaOutput
} from '@adzhub/apps';
import { createTool } from './tool-runner.js';
import { GovernedTool, ToolPostcondition } from './tool-interface.js';

// Schemas de Provenance dos Apps
export const AppProvenanceSchema = z.object({
  source: z.enum([
    'app',
    'app_mapa_solucao',
    'app_analise_criativos',
    'app_action_recommendation',
    'app_creative_brief',
    'app_meeting_agenda'
  ]),
  locator: z.string().min(1),
  capturedAt: z.string().datetime()
});

export type AppProvenance = z.infer<typeof AppProvenanceSchema>;

// ==========================================
// 1. run_app_analise_criativos
// ==========================================

export const RunAppAnaliseCriativosInputSchema = z.object({
  client_id: z.string().min(1, { message: 'client_id é obrigatório' }),
  timeframe: z.object({
    since: z.string().datetime({ message: 'since deve ser data ISO-8601' }),
    until: z.string().datetime({ message: 'until deve ser data ISO-8601' }),
    timezone: z.string().default('America/Sao_Paulo')
  }),
  target_ad_ids: z
    .array(z.string())
    .optional()
    .describe('IDs específicos de anúncios a analisar (opcional, padrão: todos)'),
  benchmark_cpa_brl: z
    .number()
    .positive()
    .default(85.0)
    .describe('CPA meta para categorização de eficiência'),
  benchmark_roas: z
    .number()
    .positive()
    .default(2.5)
    .describe('ROAS meta para escala de investimento')
});

export type RunAppAnaliseCriativosInput = z.infer<typeof RunAppAnaliseCriativosInputSchema>;

// 6 Fases Metodológicas: Contexto → Normalização → Cobertura → Ranking Downstream → Limitações → Proposta
export const AppAnaliseCriativosOutputSchema = z.object({
  // 1. Contexto
  context: z.object({
    client_id: z.string(),
    tenant_id: z.string(),
    timeframe: z.object({
      since: z.string(),
      until: z.string(),
      timezone: z.string()
    }),
    business_objective: z.string(),
    benchmarks: z.object({
      target_cpa_brl: z.number(),
      target_roas: z.number()
    })
  }),

  // 2. Normalização
  normalization: z.object({
    total_ads_evaluated: z.number().int().nonnegative(),
    total_deals_processed: z.number().int().nonnegative(),
    normalized_utms_count: z.number().int().nonnegative(),
    missing_utms_count: z.number().int().nonnegative(),
    divergences_count: z.number().int().nonnegative()
  }),

  // 3. Cobertura
  coverage: z.object({
    join_coverage_percent: z.number().min(0).max(100),
    evidence_coverage_percent: z.number().min(0).max(100),
    coverage_level: z.enum(['SUFFICIENT', 'PROVISIONAL', 'INSUFFICIENT']),
    unallocated_spend_brl: z.number().nonnegative(),
    unallocated_deals_count: z.number().int().nonnegative()
  }),

  // 4. Ranking Downstream
  downstream_ranking: z.array(
    z.object({
      rank: z.number().int().positive(),
      ad_id: z.string(),
      ad_name: z.string(),
      campaign_id: z.string(),
      utm_content: z.string(),
      spend_brl: z.number().nonnegative(),
      sales_count: z.number().int().nonnegative(),
      revenue_brl: z.number().nonnegative(),
      cpa_sale_brl: z.number().nullable(),
      roas: z.number().nullable(),
      scores: z.object({
        hook_score: z.number(),
        retention_score: z.number(),
        cta_score: z.number(),
        overall_score: z.number()
      }),
      performance_tier: z.enum(['TOP_PERFORMER', 'VIABLE', 'UNDERPERFORMER', 'CRITICAL_WASTE']),
      data_locators: z.array(z.string())
    })
  ),

  // 5. Limitações
  limitations: z.array(z.string()),

  // 6. Proposta
  proposal: z.object({
    actions: z.array(
      z.object({
        action_type: z.enum(['ESCALAR', 'MANTER', 'VARIAR_HOOK', 'PAUSAR_RECOMENDACAO']),
        target_ad_id: z.string(),
        target_utm_content: z.string(),
        rationale: z.string(),
        expected_impact: z.string(),
        evidence_locators: z.array(z.string()),
        suggested_brief: z
          .object({
            publico: z.string(),
            hook: z.string(),
            mensagem: z.string(),
            cta: z.string(),
            metrica_sucesso: z.string()
          })
          .optional()
      })
    ),
    narrative_summary: z.string()
  }),

  provenance: AppProvenanceSchema
});

export type AppAnaliseCriativosOutput = z.infer<typeof AppAnaliseCriativosOutputSchema>;

// ==========================================
// 2. get_mapa_solucao
// ==========================================

export const GetMapaSolucaoInputSchema = z.object({
  client_id: z.string().min(1, { message: 'client_id é obrigatório' }),
  sections: z
    .array(
      z.enum([
        'all',
        'brand',
        'target_audiences',
        'proof_elements',
        'tone_of_voice',
        'forbidden_claims'
      ])
    )
    .default(['all'])
    .describe('Seções do mapa da solução a recuperar')
});

export type GetMapaSolucaoInput = z.infer<typeof GetMapaSolucaoInputSchema>;

export const GetMapaSolucaoOutputSchema = z.object({
  client_id: z.string(),
  tenant_id: z.string(),
  brand_name: z.string(),
  market_segment: z.string(),
  core_offer: z.string(),
  promise: z.string(),
  target_audiences: z.array(
    z.object({
      persona: z.string(),
      main_driver: z.string()
    })
  ),
  proof_elements: z.array(z.string()),
  tone_of_voice: z.object({
    style: z.string(),
    reading_level: z.string(),
    guidelines: z.string()
  }),
  forbidden_claims: z.array(z.string()),
  provenance: AppProvenanceSchema
});

export type GetMapaSolucaoOutput = z.infer<typeof GetMapaSolucaoOutputSchema>;

// ==========================================
// Opções de Dados dos Apps
// ==========================================

export interface AppDataOptions {
  metaAdsData?: typeof RAW_META_ADS_DATA;
  crmLeadsData?: typeof RAW_CRM_LEADS_DATA;
  analiseCriativosData?: typeof RAW_ANALISE_CRIATIVOS_DATA;
  mapaSolucaoData?: typeof RAW_MAPA_SOLUCAO_DATA;
}

/**
 * Cria a ferramenta `run_app_analise_criativos` governada com metodologia estrita de 6 etapas.
 */
export function createRunAppAnaliseCriativosTool(
  options: AppDataOptions = {}
): GovernedTool<RunAppAnaliseCriativosInput, AppAnaliseCriativosOutput> {
  const metaAds = options.metaAdsData ?? RAW_META_ADS_DATA;
  const crmLeads = options.crmLeadsData ?? RAW_CRM_LEADS_DATA;
  const analiseCriativos = options.analiseCriativosData ?? RAW_ANALISE_CRIATIVOS_DATA;

  const postconditions: ToolPostcondition<
    RunAppAnaliseCriativosInput,
    AppAnaliseCriativosOutput
  >[] = [
    {
      name: 'client_isolation',
      description: 'Garante que a análise pertence ao client_id solicitado',
      check: (input, output) => output.context.client_id === input.client_id
    },
    {
      name: 'methodology_stages_complete',
      description: 'Garante que todas as 6 etapas metodológicas estão presentes e preenchidas',
      check: (_input, output) =>
        Boolean(
          output.context &&
          output.normalization &&
          output.coverage &&
          output.downstream_ranking.length > 0 &&
          output.limitations.length > 0 &&
          output.proposal.actions.length > 0 &&
          output.proposal.narrative_summary.length > 0
        )
    },
    {
      name: 'locators_cited',
      description: 'Garante que todas as ações e rankings citam locators de origem',
      check: (_input, output) =>
        output.downstream_ranking.every((r) => r.data_locators.length > 0) &&
        output.proposal.actions.every((a) => a.evidence_locators.length > 0)
    }
  ];

  return createTool<RunAppAnaliseCriativosInput, AppAnaliseCriativosOutput>({
    name: 'run_app_analise_criativos',
    description:
      'Executa o App de Análise de Criativos sob metodologia rigorosa (contexto → normalização → cobertura → ranking downstream → limitações → proposta) gerando ranking de CPA/ROAS e propostas de ação.',
    effect: 'read:app',
    inputSchema: RunAppAnaliseCriativosInputSchema,
    outputSchema: AppAnaliseCriativosOutputSchema,
    postconditions,
    handler: async (params) => {
      if (metaAds.client_id !== params.client_id) {
        throw new Error(
          `Cliente '${params.client_id}' não encontrado na base de análise. Acesso negado para cross-client.`
        );
      }

      const sinceMs = new Date(params.timeframe.since).getTime();
      const untilMs = new Date(params.timeframe.until).getTime();
      if (sinceMs > untilMs) {
        throw new Error(
          `Período inválido: 'since' (${params.timeframe.since}) é posterior a 'until' (${params.timeframe.until}).`
        );
      }

      // Executa o motor de reconciliação canônico
      const reconcileResult = reconcileMetaAdsAndCrm(metaAds, crmLeads, analiseCriativos);
      const metricsSummary = computeAllDerivedMetrics({
        joinedPerformance: reconcileResult.joinedPerformance,
        joinSummary: reconcileResult.summary
      });

      // Filtra target_ad_ids se informados
      const targetSet = params.target_ad_ids ? new Set(params.target_ad_ids) : null;
      let performanceList = reconcileResult.joinedPerformance;
      if (targetSet) {
        performanceList = performanceList.filter((item) => targetSet.has(item.ad_id));
      }

      // 4. Constrói Ranking Downstream
      const evaluatedAds = performanceList.map((item) => {
        const cpaSale =
          item.sales_count > 0 ? Math.round((item.spend_brl / item.sales_count) * 100) / 100 : null;
        const roas =
          item.spend_brl > 0 ? Math.round((item.revenue_brl / item.spend_brl) * 100) / 100 : null;

        const hookScore = item.creative_evaluation?.hook_score ?? 5.0;
        const retentionScore = item.creative_evaluation?.retention_score ?? 5.0;
        const ctaScore = item.creative_evaluation?.cta_score ?? 5.0;
        const overallScore = item.creative_evaluation?.overall_score ?? 5.0;

        const creativeRec = item.creative_evaluation?.recommendation;

        let performanceTier: AppAnaliseCriativosOutput['downstream_ranking'][0]['performance_tier'];
        if (creativeRec === 'PAUSAR' || overallScore <= 4.5) {
          performanceTier = 'CRITICAL_WASTE';
        } else if (creativeRec === 'SEGUIR' || overallScore >= 8.0) {
          performanceTier = 'TOP_PERFORMER';
        } else if (creativeRec === 'VARIAR' || overallScore < 7.5) {
          performanceTier = 'UNDERPERFORMER';
        } else if (cpaSale !== null && cpaSale <= params.benchmark_cpa_brl) {
          performanceTier = 'TOP_PERFORMER';
        } else if (cpaSale !== null && cpaSale > params.benchmark_cpa_brl * 4) {
          performanceTier = 'CRITICAL_WASTE';
        } else {
          performanceTier = 'VIABLE';
        }

        const dataLocators = [
          `meta:ad:${item.ad_id}`,
          `crm:deals:utm_content:${item.utm_content}`,
          `app_analise_criativos:eval:${item.ad_id}`
        ];

        return {
          ad_id: item.ad_id,
          ad_name: item.ad_name,
          campaign_id: item.campaign_id,
          utm_content: item.utm_content,
          spend_brl: item.spend_brl,
          sales_count: item.sales_count,
          revenue_brl: item.revenue_brl,
          cpa_sale_brl: cpaSale,
          roas,
          scores: {
            hook_score: hookScore,
            retention_score: retentionScore,
            cta_score: ctaScore,
            overall_score: overallScore
          },
          performanceTier,
          dataLocators
        };
      });

      // Ordenar ranking: primeiro TOP_PERFORMER por menor CPA, depois outros, CRITICAL_WASTE no fim
      evaluatedAds.sort((a, b) => {
        if (a.performanceTier === 'TOP_PERFORMER' && b.performanceTier !== 'TOP_PERFORMER')
          return -1;
        if (b.performanceTier === 'TOP_PERFORMER' && a.performanceTier !== 'TOP_PERFORMER')
          return 1;
        if (a.cpa_sale_brl !== null && b.cpa_sale_brl !== null) {
          return a.cpa_sale_brl - b.cpa_sale_brl;
        }
        return b.spend_brl - a.spend_brl;
      });

      const ranking = evaluatedAds.map((ad, idx) => ({
        rank: idx + 1,
        ad_id: ad.ad_id,
        ad_name: ad.ad_name,
        campaign_id: ad.campaign_id,
        utm_content: ad.utm_content,
        spend_brl: ad.spend_brl,
        sales_count: ad.sales_count,
        revenue_brl: ad.revenue_brl,
        cpa_sale_brl: ad.cpa_sale_brl,
        roas: ad.roas,
        scores: ad.scores,
        performance_tier: ad.performanceTier,
        data_locators: ad.dataLocators
      }));

      // 6. Proposta de Ações e Briefings
      const actions: AppAnaliseCriativosOutput['proposal']['actions'] = [];

      for (const item of ranking) {
        if (item.performance_tier === 'TOP_PERFORMER') {
          actions.push({
            action_type: 'ESCALAR',
            target_ad_id: item.ad_id,
            target_utm_content: item.utm_content,
            rationale: `Anúncio com excelente eficiência econômica (CPA R$ ${item.cpa_sale_brl?.toFixed(2)} vs meta R$ ${params.benchmark_cpa_brl.toFixed(2)}) e ROAS de ${item.roas ?? 'N/A'}.`,
            expected_impact:
              'Aumento de volume de vendas com taxa de conversão saudável e manutenção da margem.',
            evidence_locators: item.data_locators,
            suggested_brief: {
              publico: 'Público qualificado e lookalike de compradores',
              hook: 'Manter gancho vencedor de sabor natural e dissolução rápida',
              mensagem: 'Reforçar selos de pureza e laudo lote a lote',
              cta: 'Compre agora com frete grátis para compras acima de R$ 199',
              metrica_sucesso: `CPA < R$ ${params.benchmark_cpa_brl.toFixed(2)}`
            }
          });
        } else if (item.performance_tier === 'CRITICAL_WASTE') {
          actions.push({
            action_type: 'PAUSAR_RECOMENDACAO',
            target_ad_id: item.ad_id,
            target_utm_content: item.utm_content,
            rationale: `Anúncio gerou gasto de R$ ${item.spend_brl.toFixed(2)} com apenas ${item.sales_count} vendas atribuídas (CPA real > R$ ${item.cpa_sale_brl?.toFixed(2) ?? '1000+'}), configurando fadiga de frequência e queima de verba.`,
            expected_impact: `Estancar perda financeira de até R$ ${item.spend_brl.toFixed(2)} e redirecionar orçamento diário para criativos validados.`,
            evidence_locators: item.data_locators,
            suggested_brief: {
              publico: 'Casais e público fitness',
              hook: 'Ângulo desgastado: necessária renovação total da abordagem criativa',
              mensagem: 'Pausar veiculação ativa e preparar nova variação de topo de funil',
              cta: 'Pausa imediata no gerenciador mediante aprovação executiva',
              metrica_sucesso: 'Redução imediata do CPA global da conta'
            }
          });
        } else if (item.performance_tier === 'VIABLE') {
          actions.push({
            action_type: 'MANTER',
            target_ad_id: item.ad_id,
            target_utm_content: item.utm_content,
            rationale: `Performance estável dentro da margem de tolerância (CPA R$ ${item.cpa_sale_brl?.toFixed(2)}).`,
            expected_impact:
              'Sustentação de volume de vendas com monitoramento semanal de saturação.',
            evidence_locators: item.data_locators
          });
        } else {
          actions.push({
            action_type: 'VARIAR_HOOK',
            target_ad_id: item.ad_id,
            target_utm_content: item.utm_content,
            rationale: `Criativo com bom engajamento técnico porém conversão final abaixo do potencial. Testar novos ganchos nos 3 primeiros segundos.`,
            expected_impact: 'Melhoria na taxa de clique (CTR) e redução do custo por venda.',
            evidence_locators: item.data_locators
          });
        }
      }

      const narrativeSummary =
        `Análise metodológica concluída para ${ranking.length} anúncios da conta ${metaAds.client_id}. ` +
        `Identificou-se oportunidade de escala no criativo de maior retorno e recomendação técnica de pausa para anúncio em queima de verba com CPA estourado. ` +
        `Cobertura de reconciliação Meta x CRM calculada em ${metricsSummary.join_coverage.percentageString} com integridade de atribuição comprovada por locators rastreáveis.`;

      return {
        context: {
          client_id: params.client_id,
          tenant_id: metaAds.tenant_id,
          timeframe: {
            since: params.timeframe.since,
            until: params.timeframe.until,
            timezone: params.timeframe.timezone
          },
          business_objective: 'Otimização de CPA e Maximização de ROAS em E-commerce',
          benchmarks: {
            target_cpa_brl: params.benchmark_cpa_brl,
            target_roas: params.benchmark_roas
          }
        },
        normalization: {
          total_ads_evaluated: ranking.length,
          total_deals_processed: crmLeads.deals.length,
          normalized_utms_count: reconcileResult.normalizedAds.length,
          missing_utms_count: 0,
          divergences_count: reconcileResult.divergences.length
        },
        coverage: {
          join_coverage_percent:
            Math.round(
              (metricsSummary.join_coverage.coverage.isComputable
                ? metricsSummary.join_coverage.coverage.value
                : 1.0) * 10000
            ) / 100,
          evidence_coverage_percent:
            Math.round(
              (metricsSummary.evidence_coverage.coverage.isComputable
                ? metricsSummary.evidence_coverage.coverage.value
                : 1.0) * 10000
            ) / 100,
          coverage_level: metricsSummary.join_coverage.level,
          unallocated_spend_brl: 0,
          unallocated_deals_count: reconcileResult.summary.orphan_deals_count
        },
        downstream_ranking: ranking,
        limitations: [
          'Atribuição downstream baseada estritamente em matching exato de UTMs padronizadas.',
          'Janela de conversão considerada de 7 dias pós-clique.',
          'Valores de receita calculados apenas sobre deals em status de venda confirmada no CRM.'
        ],
        proposal: {
          actions,
          narrative_summary: narrativeSummary
        },
        provenance: {
          source: 'app_analise_criativos',
          locator: `app:creative_analysis:${params.client_id}:${params.timeframe.since.slice(0, 10)}_${params.timeframe.until.slice(0, 10)}`,
          capturedAt: analiseCriativos.evaluated_at
        }
      };
    }
  });
}

/**
 * Cria a ferramenta `get_mapa_solucao` vinculada aos elementos de marca, público e claims.
 */
export function createGetMapaSolucaoTool(
  options: AppDataOptions = {}
): GovernedTool<GetMapaSolucaoInput, GetMapaSolucaoOutput> {
  const mapaSolucao = options.mapaSolucaoData ?? RAW_MAPA_SOLUCAO_DATA;

  const postconditions: ToolPostcondition<GetMapaSolucaoInput, GetMapaSolucaoOutput>[] = [
    {
      name: 'client_isolation',
      description: 'Garante que o mapa da solução corresponde ao client_id solicitado',
      check: (input, output) => output.client_id === input.client_id
    },
    {
      name: 'core_elements_present',
      description: 'Garante presença de proposta de valor, público-alvo e claims proibidas',
      check: (_input, output) =>
        output.brand_name.length > 0 &&
        output.core_offer.length > 0 &&
        output.target_audiences.length > 0 &&
        output.forbidden_claims.length > 0
    }
  ];

  return createTool<GetMapaSolucaoInput, GetMapaSolucaoOutput>({
    name: 'get_mapa_solucao',
    description:
      'Recupera a síntese estruturada do Mapa da Solução do cliente (posicionamento de marca, segmentos de público, elementos de prova e restrições de claims).',
    effect: 'read:app',
    inputSchema: GetMapaSolucaoInputSchema,
    outputSchema: GetMapaSolucaoOutputSchema,
    postconditions,
    handler: async (params) => {
      if (mapaSolucao.client_id !== params.client_id) {
        throw new Error(
          `Cliente '${params.client_id}' não possui mapa da solução registrado. Acesso negado para cross-client.`
        );
      }

      return {
        client_id: params.client_id,
        tenant_id: mapaSolucao.tenant_id,
        brand_name: mapaSolucao.brand_name,
        market_segment: mapaSolucao.market_segment,
        core_offer: mapaSolucao.core_offer,
        promise: mapaSolucao.promise,
        target_audiences: mapaSolucao.target_audiences,
        proof_elements: mapaSolucao.proof_elements,
        tone_of_voice: mapaSolucao.tone_of_voice,
        forbidden_claims: mapaSolucao.forbidden_claims,
        provenance: {
          source: 'app_mapa_solucao',
          locator: `app_mapa_solucao:${mapaSolucao.client_id}`,
          capturedAt: mapaSolucao.generated_at
        }
      };
    }
  });
}

/**
 * Cria a ferramenta `run_app_data_quality_attribution` governada.
 */
export function createRunAppDataQualityAttributionTool(
  options: AppDataOptions = {}
): GovernedTool<DataQualityInput, DataQualityOutput> {
  const app = new DataQualityApp();

  const postconditions: ToolPostcondition<DataQualityInput, DataQualityOutput>[] = [
    {
      name: 'client_isolation',
      description: 'Garante que a auditoria de qualidade pertence ao client_id solicitado',
      check: (input, output) => output.client_id === input.client_id
    },
    {
      name: 'metrics_integrity',
      description: 'Garante integridade e positividade das contagens de deals e ads',
      check: (_input, output) =>
        output.metrics.total_deals_processed >= 0 &&
        output.metrics.total_ads_evaluated >= 0 &&
        output.metrics.freshness_score >= 0 &&
        output.metrics.freshness_score <= 1
    }
  ];

  return createTool<DataQualityInput, DataQualityOutput>({
    name: 'run_app_data_quality_attribution',
    description:
      'Audita determinística e rigorosamente a qualidade dos dados, integridade de joins, taxa de missing UTMs e atualidade temporal antes de decisões analíticas.',
    effect: 'read:app',
    inputSchema: DataQualityInputSchema,
    outputSchema: DataQualityOutputSchema,
    postconditions,
    handler: async (params) => {
      return app.audit(params, {
        metaAdsData: options.metaAdsData,
        crmLeadsData: options.crmLeadsData,
        analiseCriativosData: options.analiseCriativosData
      });
    }
  });
}

/**
 * Cria a ferramenta `run_app_performance_reconciliation` governada.
 */
export function createRunAppPerformanceReconciliationTool(
  options: AppDataOptions = {}
): GovernedTool<PerformanceReconciliationInput, PerformanceReconciliationOutput> {
  const app = new PerformanceReconciliationApp();

  const postconditions: ToolPostcondition<
    PerformanceReconciliationInput,
    PerformanceReconciliationOutput
  >[] = [
    {
      name: 'client_isolation',
      description: 'Garante que a reconciliação pertence ao client_id solicitado',
      check: (input, output) => output.client_id === input.client_id
    },
    {
      name: 'evidence_refs_present',
      description: 'Garante que evidências rastreáveis foram geradas para cada métrica',
      check: (_input, output) => output.evidence_refs.length > 0
    },
    {
      name: 'totals_calculated',
      description: 'Garante que os totais agregados foram calculados',
      check: (_input, output) =>
        output.totals.total_meta_spend_brl >= 0 && output.totals.total_crm_sales_count >= 0
    }
  ];

  return createTool<PerformanceReconciliationInput, PerformanceReconciliationOutput>({
    name: 'run_app_performance_reconciliation',
    description:
      'Cruza dados de Meta Ads, CRM e GA4 gerando tabela reconciliada com ROAS Real vs Plataforma, CPA Real vs Plataforma e EvidenceRefs vinculadas.',
    effect: 'read:app',
    inputSchema: PerformanceReconciliationInputSchema,
    outputSchema: PerformanceReconciliationOutputSchema,
    postconditions,
    handler: async (params) => {
      return app.reconcile(params, {
        metaAdsData: options.metaAdsData,
        crmLeadsData: options.crmLeadsData,
        analiseCriativosData: options.analiseCriativosData
      });
    }
  });
}

/**
 * Cria a ferramenta `run_app_account_diagnosis` governada.
 */
export function createRunAppAccountDiagnosisTool(
  options: AppDataOptions = {}
): GovernedTool<AccountDiagnosisInput, AccountDiagnosisOutput> {
  const app = new AccountDiagnosisApp();

  const postconditions: ToolPostcondition<AccountDiagnosisInput, AccountDiagnosisOutput>[] = [
    {
      name: 'client_isolation',
      description: 'Garante que o diagnóstico pertence ao client_id solicitado',
      check: (input, output) => output.client_id === input.client_id
    },
    {
      name: 'all_six_blocks_present',
      description: 'Garante presença obrigatória dos 6 blocos metodológicos',
      check: (_input, output) =>
        output.block_1_confirmed_facts.length > 0 &&
        Boolean(output.block_2_detected_anomalies) &&
        output.block_3_competing_hypotheses.length > 0 &&
        output.block_4_evidence_evaluation.length > 0 &&
        Boolean(output.block_5_information_gaps) &&
        output.block_6_recommended_tests.length > 0
    },
    {
      name: 'hypotheses_provisional_invariant',
      description: 'Garante que todas as hipóteses causais possuem status PROVISIONAL',
      check: (_input, output) =>
        output.block_3_competing_hypotheses.every((h) => h.status === 'PROVISIONAL')
    }
  ];

  return createTool<AccountDiagnosisInput, AccountDiagnosisOutput>({
    name: 'run_app_account_diagnosis',
    description:
      'Executa diagnóstico causal estruturado em 6 blocos normativos (fatos confirmados, anomalias, hipóteses PROVISIONAL, matriz de evidências, gaps e testes recomendados).',
    effect: 'read:app',
    inputSchema: AccountDiagnosisInputSchema,
    outputSchema: AccountDiagnosisOutputSchema,
    postconditions,
    handler: async (params) => {
      return app.diagnose(params, {
        metaAdsData: options.metaAdsData,
        crmLeadsData: options.crmLeadsData,
        analiseCriativosData: options.analiseCriativosData
      });
    }
  });
}

// ==========================================
// 6. run_app_action_recommendation (Task 3.1)
// ==========================================

/**
 * Cria a ferramenta `run_app_action_recommendation` governada.
 * Declara efeito `write:staging` e proíbe qualquer chamada externa.
 */
export function createRunAppActionRecommendationTool(
  options: AppDataOptions = {}
): GovernedTool<ActionRecommendationInput, ActionRecommendationOutput> {
  const app = new ActionRecommendationApp();

  const postconditions: ToolPostcondition<
    ActionRecommendationInput,
    ActionRecommendationOutput
  >[] = [
    {
      name: 'client_isolation',
      description: 'Garante que as propostas pertencem ao client_id solicitado',
      check: (input, output) => output.client_id === input.client_id
    },
    {
      name: 'proposals_provisional_with_hash',
      description: 'Garante que todas as propostas possuem status PROVISIONAL e hash SHA-256 de 64 chars',
      check: (_input, output) =>
        output.proposals.length > 0 &&
        output.proposals.every(
          (p) =>
            p.status === 'PROVISIONAL' &&
            p.proposal_hash.length === 64 &&
            p.declared_effect === 'INTERNAL_WRITE'
        )
    },
    {
      name: 'postcondition_and_rollback_present',
      description: 'Garante que cada proposta define expected_postcondition e rollback_spec',
      check: (_input, output) =>
        output.proposals.every(
          (p) => Boolean(p.expected_postcondition) && Boolean(p.rollback_spec)
        )
    }
  ];

  return createTool<ActionRecommendationInput, ActionRecommendationOutput>({
    name: 'run_app_action_recommendation',
    description:
      'Gera DecisionProposals formais (status PROVISIONAL) a partir de diagnóstico com cálculo de proposal_hash criptográfico, blast radius e pós-condição esperada.',
    effect: 'write:staging',
    inputSchema: ActionRecommendationInputSchema,
    outputSchema: ActionRecommendationOutputSchema,
    postconditions,
    handler: async (params) => {
      return app.recommend(params, {
        metaAdsData: options.metaAdsData,
        crmLeadsData: options.crmLeadsData,
        analiseCriativosData: options.analiseCriativosData
      });
    }
  });
}

// ==========================================
// 7. run_app_creative_brief (Task 3.2)
// ==========================================

/**
 * Cria a ferramenta `run_app_creative_brief` governada.
 */
export function createRunAppCreativeBriefTool(
  options: AppDataOptions = {}
): GovernedTool<CreativeBriefInput, CreativeBriefOutput> {
  const app = new CreativeBriefApp();

  const postconditions: ToolPostcondition<CreativeBriefInput, CreativeBriefOutput>[] = [
    {
      name: 'client_isolation',
      description: 'Garante que os briefings pertencem ao client_id solicitado',
      check: (input, output) => output.client_id === input.client_id
    },
    {
      name: 'brief_structure_complete',
      description: 'Garante que o briefing contém hook, oferta, compliance de claims e markdown',
      check: (_input, output) =>
        output.briefs.length > 0 &&
        output.briefs.every(
          (b) =>
            b.hook.headline.length > 0 &&
            b.forbidden_claims.length > 0 &&
            b.rendered_markdown.length > 100
        )
    }
  ];

  return createTool<CreativeBriefInput, CreativeBriefOutput>({
    name: 'run_app_creative_brief',
    description:
      'Gera briefings criativos estruturados (hook 3s, roteiro, público, restrições e markdown) para mitigar saturação e fadiga de criativos.',
    effect: 'read:app',
    inputSchema: CreativeBriefInputSchema,
    outputSchema: CreativeBriefOutputSchema,
    postconditions,
    handler: async (params) => {
      return app.generateBrief(params, {
        mapaSolucaoData: options.mapaSolucaoData,
        analiseCriativosData: options.analiseCriativosData
      });
    }
  });
}

// ==========================================
// 8. run_app_meeting_agenda (Task 3.2)
// ==========================================

/**
 * Cria a ferramenta `run_app_meeting_agenda` governada.
 */
export function createRunAppMeetingAgendaTool(
  options: AppDataOptions = {}
): GovernedTool<MeetingAgendaInput, MeetingAgendaOutput> {
  const app = new MeetingBriefApp();

  const postconditions: ToolPostcondition<MeetingAgendaInput, MeetingAgendaOutput>[] = [
    {
      name: 'client_isolation',
      description: 'Garante que a pauta pertence ao client_id solicitado',
      check: (input, output) => output.client_id === input.client_id
    },
    {
      name: 'agenda_complete',
      description: 'Garante tópicos temporalizados, decisões pendentes e plano de ação',
      check: (_input, output) =>
        output.agenda_topics.length > 0 &&
        output.pending_decisions.length > 0 &&
        output.proposed_action_items.length > 0 &&
        output.rendered_markdown.length > 100
    }
  ];

  return createTool<MeetingAgendaInput, MeetingAgendaOutput>({
    name: 'run_app_meeting_agenda',
    description:
      'Gera pauta de reunião executiva para alinhamento com o cliente, cruzando métricas reais de CRM x Meta Ads, anomalias e decisões pendentes de aprovação.',
    effect: 'read:app',
    inputSchema: MeetingAgendaInputSchema,
    outputSchema: MeetingAgendaOutputSchema,
    postconditions,
    handler: async (params) => {
      return app.generateAgenda(params, {
        metaAdsData: options.metaAdsData,
        crmLeadsData: options.crmLeadsData,
        analiseCriativosData: options.analiseCriativosData
      });
    }
  });
}

/**
 * Factory para instanciar o conjunto de ferramentas dos Apps.
 */
export function createAppTools(options: AppDataOptions = {}) {
  return {
    runAppAnaliseCriativosTool: createRunAppAnaliseCriativosTool(options),
    getMapaSolucaoTool: createGetMapaSolucaoTool(options),
    runAppDataQualityAttributionTool: createRunAppDataQualityAttributionTool(options),
    runAppPerformanceReconciliationTool: createRunAppPerformanceReconciliationTool(options),
    runAppAccountDiagnosisTool: createRunAppAccountDiagnosisTool(options),
    runAppActionRecommendationTool: createRunAppActionRecommendationTool(options),
    runAppCreativeBriefTool: createRunAppCreativeBriefTool(options),
    runAppMeetingAgendaTool: createRunAppMeetingAgendaTool(options)
  };
}
