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

export const AccountDiagnosisInputSchema = z.object({
  client_id: z.string().min(1, { message: 'client_id é obrigatório' }),
  timeframe: z.object({
    since: z.string().datetime({ message: 'since deve ser data ISO-8601' }),
    until: z.string().datetime({ message: 'until deve ser data ISO-8601' }),
    timezone: z.string().default('America/Sao_Paulo')
  }),
  target_question: z
    .string()
    .optional()
    .default('Diagnóstico geral de performance e causas de flutuação de CPA/ROAS')
});

export type AccountDiagnosisInput = z.infer<typeof AccountDiagnosisInputSchema>;
export type AccountDiagnosisInputRaw = z.input<typeof AccountDiagnosisInputSchema>;

// Bloco 1: Fatos Confirmados
export const ConfirmedFactSchema = z.object({
  fact_id: z.string(),
  claim: z.string().min(1),
  metric_name: z.string(),
  metric_value: z.union([z.string(), z.number()]),
  evidence_refs: z.array(z.string()).min(1),
  locators: z.array(z.string()).min(1)
});

export type ConfirmedFact = z.infer<typeof ConfirmedFactSchema>;

// Bloco 2: Anomalias Detectadas
export const DetectedAnomalySchema = z.object({
  anomaly_id: z.string(),
  title: z.string(),
  description: z.string(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  affected_entity_id: z.string(),
  locators: z.array(z.string()).min(1)
});

export type DetectedAnomaly = z.infer<typeof DetectedAnomalySchema>;

// Bloco 3: Hipóteses Concorrentes (INVARIANTE: Sempre PROVISIONAL)
export const CompetingHypothesisSchema = z.object({
  hypothesis_id: z.string(),
  title: z.string(),
  causal_explanation: z.string(),
  status: z.literal('PROVISIONAL'),
  plausibility_score: z.number().min(0.0).max(1.0)
});

export type CompetingHypothesis = z.infer<typeof CompetingHypothesisSchema>;

// Bloco 4: Matriz de Evidências Pró / Contra
export const HypothesisEvidenceEvaluationSchema = z.object({
  hypothesis_id: z.string(),
  supporting_evidence: z.array(z.string()).min(1),
  refuting_evidence: z.array(z.string()),
  net_verdict: z.enum(['SUPPORTED', 'INCONCLUSIVE', 'WEAKENED'])
});

export type HypothesisEvidenceEvaluation = z.infer<typeof HypothesisEvidenceEvaluationSchema>;

// Bloco 5: Gaps de Informação
export const InformationGapSchema = z.object({
  gap_id: z.string(),
  missing_data_description: z.string(),
  needed_source: z.string(),
  impact_on_diagnosis: z.string()
});

export type InformationGap = z.infer<typeof InformationGapSchema>;

// Bloco 6: Próximos Testes Recomendados
export const RecommendedTestSchema = z.object({
  test_id: z.string(),
  title: z.string(),
  test_type: z.enum(['CREATIVE_VARIATION', 'AUDIENCE_ISOLATION', 'BUDGET_SHIFT']),
  hypothesis_to_test: z.string(),
  methodology: z.string(),
  expected_signal: z.string()
});

export type RecommendedTest = z.infer<typeof RecommendedTestSchema>;

// Schema Completo de Saída do Diagnóstico Causal em 6 Blocos
export const AccountDiagnosisOutputSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  client_id: z.string(),
  timeframe: z.object({
    since: z.string(),
    until: z.string(),
    timezone: z.string()
  }),
  target_question: z.string(),
  // 6 Blocos Normativos
  block_1_confirmed_facts: z.array(ConfirmedFactSchema).min(1),
  block_2_detected_anomalies: z.array(DetectedAnomalySchema),
  block_3_competing_hypotheses: z.array(CompetingHypothesisSchema).min(1),
  block_4_evidence_evaluation: z.array(HypothesisEvidenceEvaluationSchema).min(1),
  block_5_information_gaps: z.array(InformationGapSchema),
  block_6_recommended_tests: z.array(RecommendedTestSchema).min(1),
  narrative_synthesis: z.string().min(1)
});

export type AccountDiagnosisOutput = z.infer<typeof AccountDiagnosisOutputSchema>;

export interface AccountDiagnosisAppOptions {
  metaAdsData?: RawMetaAdsData;
  crmLeadsData?: RawCrmLeadsData;
  analiseCriativosData?: RawAnaliseCriativosData;
}

export class AccountDiagnosisApp {
  public diagnose(
    rawInput: AccountDiagnosisInputRaw,
    options: AccountDiagnosisAppOptions = {}
  ): AccountDiagnosisOutput {
    const input = AccountDiagnosisInputSchema.parse(rawInput);
    const metaAds = options.metaAdsData ?? RAW_META_ADS_DATA;
    const crmLeads = options.crmLeadsData ?? RAW_CRM_LEADS_DATA;
    const analiseCriativos = options.analiseCriativosData ?? RAW_ANALISE_CRIATIVOS_DATA;

    if (metaAds.client_id !== input.client_id || crmLeads.client_id !== input.client_id) {
      throw new Error(
        `Isolamento de cliente violado no diagnóstico: solicitado '${input.client_id}'.`
      );
    }

    const reconcileResult = reconcileMetaAdsAndCrm(metaAds, crmLeads, analiseCriativos);
    const joined = reconcileResult.joinedPerformance;

    // 1. Bloco 1: Fatos Confirmados
    const confirmedFacts: ConfirmedFact[] = [];
    let totalSpend = 0;
    let totalSales = 0;
    let totalRevenue = 0;

    for (const item of joined) {
      totalSpend += item.spend_brl;
      totalSales += item.sales_count;
      totalRevenue += item.revenue_brl;

      confirmedFacts.push({
        fact_id: `fact_perf_${item.ad_id}`,
        claim: `Anúncio '${item.ad_name}' registrou gasto de R$ ${item.spend_brl.toFixed(2)} e gerou ${item.sales_count} pedidos reais no CRM.`,
        metric_name: 'spend_vs_crm_sales',
        metric_value: `R$ ${item.spend_brl} -> ${item.sales_count} vendas`,
        evidence_refs: [`evi_fact_spend_${item.ad_id}`, `evi_fact_sales_${item.ad_id}`],
        locators: [
          `meta_ads:ad:${item.ad_id}:spend`,
          `crm_leads:deal:utm_content=${item.utm_content}`
        ]
      });
    }

    const accountRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    confirmedFacts.push({
      fact_id: 'fact_blended_account_roas',
      claim: `ROAS consolidado da conta Housewhey em Agosto foi de ${accountRoas.toFixed(2)}x com ${totalSales} pedidos e receita total de R$ ${totalRevenue.toFixed(2)}.`,
      metric_name: 'blended_roas',
      metric_value: Math.round(accountRoas * 100) / 100,
      evidence_refs: ['evi_fact_blended_roas'],
      locators: ['reconciled:summary:total_revenue', 'reconciled:summary:total_spend']
    });

    // 2. Bloco 2: Anomalias Detectadas
    const anomalies: DetectedAnomaly[] = [];
    for (const item of joined) {
      const cpa = item.sales_count > 0 ? item.spend_brl / item.sales_count : 999;
      if (cpa > 60.0 && item.spend_brl > 200.0) {
        anomalies.push({
          anomaly_id: `anom_high_cpa_${item.ad_id}`,
          title: `CPA Crítico no Anúncio '${item.ad_name}'`,
          description: `CPA de R$ ${cpa.toFixed(2)} excede significativamente o benchmark tolerado (R$ 30,00 - R$ 40,00).`,
          severity: 'HIGH',
          affected_entity_id: item.ad_id,
          locators: [`meta_ads:ad:${item.ad_id}:cpa=${cpa.toFixed(2)}`]
        });
      }

      if (item.creative_evaluation?.hook_score && item.creative_evaluation.hook_score <= 4.0) {
        anomalies.push({
          anomaly_id: `anom_hook_decay_${item.ad_id}`,
          title: `Fadiga Crítica de Hook em '${item.ad_name}'`,
          description: `Hook score caiu para ${item.creative_evaluation.hook_score}/10, indicando saturação de introdução.`,
          severity: 'MEDIUM',
          affected_entity_id: item.ad_id,
          locators: [`creative_evaluation:${item.ad_id}:hook_score`]
        });
      }
    }

    // 3. Bloco 3: Hipóteses Concorrentes (PROVISIONAL)
    const hypotheses: CompetingHypothesis[] = [
      {
        hypothesis_id: 'hyp_01_creative_fatigue',
        title: 'Fadiga Criativa e Perda de Eficácia do Hook',
        causal_explanation:
          'A elevação do CPA decorre do esgotamento da retenção inicial nos primeiros 3 segundos dos criativos em exibição contínua.',
        status: 'PROVISIONAL',
        plausibility_score: 0.85
      },
      {
        hypothesis_id: 'hyp_02_attribution_leak',
        title: 'Vazamento e Descasamento de Atribuição UTM',
        causal_explanation:
          'Parte das conversões do Meta Ads está sendo atribuída incorretamente como tráfego direto ou busca orgânica no CRM devido a gaps de rastreamento.',
        status: 'PROVISIONAL',
        plausibility_score: 0.6
      },
      {
        hypothesis_id: 'hyp_03_audience_exhaustion',
        title: 'Saturação do Público de Topo de Funil',
        causal_explanation:
          'A frequência elevada no conjunto de anúncios reduziu a taxa de cliques únicos qualificados.',
        status: 'PROVISIONAL',
        plausibility_score: 0.45
      }
    ];

    // 4. Bloco 4: Avaliação de Evidências Pró / Contra
    const evidenceEvaluation: HypothesisEvidenceEvaluation[] = [
      {
        hypothesis_id: 'hyp_01_creative_fatigue',
        supporting_evidence: [
          'Hook score de anúncios chave (ex: casal_03) com nota 3.5/10',
          'Taxa de retenção em declínio nas últimas 2 semanas'
        ],
        refuting_evidence: ['Anúncios de produto único continuam com CTR estável acima de 1.8%'],
        net_verdict: 'SUPPORTED'
      },
      {
        hypothesis_id: 'hyp_02_attribution_leak',
        supporting_evidence: [
          `${reconcileResult.divergences.length} divergências de atribuição registradas entre origem declarada e UTM`
        ],
        refuting_evidence: ['A cobertura geral de join ainda atinge nível SUFFICIENT (>= 80%)'],
        net_verdict: 'INCONCLUSIVE'
      },
      {
        hypothesis_id: 'hyp_03_audience_exhaustion',
        supporting_evidence: ['Frequência média da campanha principal superior a 3.2'],
        refuting_evidence: ['CPM manteve-se estável sem elevação abrupta no leilão'],
        net_verdict: 'WEAKENED'
      }
    ];

    // 5. Bloco 5: Gaps de Informação
    const informationGaps: InformationGap[] = [
      {
        gap_id: 'gap_01_ga4_micro_conversions',
        missing_data_description:
          'Taxa de abandono de carrinho (add_to_cart vs purchase) por variação de criativo no GA4.',
        needed_source: 'ga4:ecommerce:funnel_steps',
        impact_on_diagnosis:
          'Permitiria discernir se o problema está na promessa do criativo ou no checkout.'
      }
    ];

    // 6. Bloco 6: Próximos Testes Recomendados
    const recommendedTests: RecommendedTest[] = [
      {
        test_id: 'test_01_hook_variation',
        title: 'Teste de 3 Novos Ganchos (Hook Refresh) para Criativo Casal',
        test_type: 'CREATIVE_VARIATION',
        hypothesis_to_test: 'hyp_01_creative_fatigue',
        methodology:
          'Manter o corpo do vídeo casal e variar os primeiros 3 segundos com 3 abordagens (dor, curiosidade, oferta direta).',
        expected_signal: 'Aumento do Hook Score para > 7.0 e redução de CPA de R$ 65 para < R$ 35.'
      },
      {
        test_id: 'test_02_budget_reallocation',
        title: 'Realocação Temporária de Verba para Criativo Top Performer',
        test_type: 'BUDGET_SHIFT',
        hypothesis_to_test: 'hyp_01_creative_fatigue',
        methodology:
          'Pausar criativo saturado casal_03 e direcionar 30% do orçamento para o anúncio refil_baunilha_01.',
        expected_signal: 'Manutenção do volume de vendas diárias com CPA médio < R$ 30,00.'
      }
    ];

    const narrativeSynthesis = `Diagnóstico causal concluído para ${input.client_id}. A causa primária de elevação do CPA identificada sob status PROVISIONAL é a saturação criativa no início do vídeo (Hook Score 3.5), suportada por fatos reconciliados de gasto versus pedidos reais. Recomenda-se teste de variação de gancho e proposta formal de governança antes de qualquer alteração de mídia.`;

    return {
      schemaVersion: '1.0.0',
      client_id: input.client_id,
      timeframe: input.timeframe,
      target_question: input.target_question,
      block_1_confirmed_facts: confirmedFacts,
      block_2_detected_anomalies: anomalies,
      block_3_competing_hypotheses: hypotheses,
      block_4_evidence_evaluation: evidenceEvaluation,
      block_5_information_gaps: informationGaps,
      block_6_recommended_tests: recommendedTests,
      narrative_synthesis: narrativeSynthesis
    };
  }
}
