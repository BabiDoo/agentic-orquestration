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
import {
  calculateProposalHash,
  CampaignOperationTypeSchema,
  CampaignTargetTypeSchema,
  PostconditionSpecSchema,
  RollbackSpecSchema
} from '@adzhub/contracts';

/**
 * Schema de entrada do App de Recomendação de Ações.
 */
export const ActionRecommendationInputSchema = z.object({
  client_id: z.string().min(1, { message: 'client_id é obrigatório' }),
  timeframe: z.object({
    since: z.string().datetime({ message: 'since deve ser data ISO-8601' }),
    until: z.string().datetime({ message: 'until deve ser data ISO-8601' }),
    timezone: z.string().default('America/Sao_Paulo')
  }),
  target_ad_ids: z
    .array(z.string())
    .optional()
    .describe('IDs específicos de anúncios a avaliar (opcional, padrão: todos)'),
  benchmark_cpa_brl: z.number().positive().default(40.0),
  benchmark_roas: z.number().positive().default(2.5)
});

export type ActionRecommendationInput = z.infer<typeof ActionRecommendationInputSchema>;
export type ActionRecommendationInputRaw = z.input<typeof ActionRecommendationInputSchema>;

/**
 * Nível de risco e blast radius da ação recomendada.
 */
export const BlastRadiusRiskLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export type BlastRadiusRiskLevel = z.infer<typeof BlastRadiusRiskLevelSchema>;

export const BlastRadiusSchema = z.object({
  risk_level: BlastRadiusRiskLevelSchema,
  daily_budget_impact_brl: z.number(),
  affected_entities_count: z.number().int().positive(),
  is_reversible: z.boolean(),
  scope_description: z.string()
});

export type BlastRadius = z.infer<typeof BlastRadiusSchema>;

/**
 * Impacto esperado da recomendação.
 */
export const ExpectedImpactSchema = z.object({
  primary_metric: z.string(),
  estimated_delta: z.string(),
  rationale: z.string()
});

export type ExpectedImpact = z.infer<typeof ExpectedImpactSchema>;

/**
 * Schema formal de DecisionProposal com Hash-Binding e Pós-Condição.
 * INVARIANTE: Status sempre PROVISIONAL, efeito declarado INTERNAL_WRITE (write:staging).
 */
export const DecisionProposalSchema = z.object({
  proposal_id: z.string().regex(/^prop_[a-zA-Z0-9_-]+$/),
  client_id: z.string(),
  timeframe: z.object({
    since: z.string(),
    until: z.string(),
    timezone: z.string()
  }),
  operation: CampaignOperationTypeSchema,
  target_type: CampaignTargetTypeSchema,
  target_id: z.string(),
  target_resource: z.string(),
  title: z.string(),
  causal_justification: z.string(),
  expected_impact: ExpectedImpactSchema,
  blast_radius: BlastRadiusSchema,
  proposed_payload: z.record(z.unknown()),
  previous_state_snapshot: z.record(z.unknown()),
  proposal_hash: z.string().length(64),
  expected_postcondition: PostconditionSpecSchema,
  rollback_spec: RollbackSpecSchema,
  evidence_refs: z.array(z.string()).min(1),
  locators: z.array(z.string()).min(1),
  status: z.literal('PROVISIONAL'),
  declared_effect: z.literal('INTERNAL_WRITE'),
  created_at: z.string().datetime()
});

export type DecisionProposal = z.infer<typeof DecisionProposalSchema>;

/**
 * Schema de saída consolidada do App de Recomendação.
 */
export const ActionRecommendationOutputSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  client_id: z.string(),
  timeframe: z.object({
    since: z.string(),
    until: z.string(),
    timezone: z.string()
  }),
  generated_at: z.string().datetime(),
  proposals: z.array(DecisionProposalSchema).min(1),
  summary_narrative: z.string().min(1),
  total_budget_impact_brl: z.number(),
  evidence_refs: z.array(z.string()).min(1)
});

export type ActionRecommendationOutput = z.infer<typeof ActionRecommendationOutputSchema>;

export interface ActionRecommendationAppOptions {
  metaAdsData?: RawMetaAdsData;
  crmLeadsData?: RawCrmLeadsData;
  analiseCriativosData?: RawAnaliseCriativosData;
}

/**
 * App de Recomendação de Ações (ACTION_RECOMMENDATION).
 * Constrói DecisionProposals formais com proposal_hash rigoroso e sem qualquer efeito de escrita externa.
 */
export class ActionRecommendationApp {
  public recommend(
    rawInput: ActionRecommendationInputRaw,
    options: ActionRecommendationAppOptions = {}
  ): ActionRecommendationOutput {
    const input = ActionRecommendationInputSchema.parse(rawInput);
    const metaAds = options.metaAdsData ?? RAW_META_ADS_DATA;
    const crmLeads = options.crmLeadsData ?? RAW_CRM_LEADS_DATA;
    const analiseCriativos = options.analiseCriativosData ?? RAW_ANALISE_CRIATIVOS_DATA;

    if (metaAds.client_id !== input.client_id || crmLeads.client_id !== input.client_id) {
      throw new Error(
        `Isolamento de cliente violado na recomendação de ações: solicitado '${input.client_id}'.`
      );
    }

    const reconcileResult = reconcileMetaAdsAndCrm(metaAds, crmLeads, analiseCriativos);
    let performanceList = reconcileResult.joinedPerformance;

    if (input.target_ad_ids && input.target_ad_ids.length > 0) {
      const targetSet = new Set(input.target_ad_ids);
      performanceList = performanceList.filter((item) => targetSet.has(item.ad_id));
    }

    const now = new Date().toISOString();
    const proposals: DecisionProposal[] = [];
    const allEvidenceRefs: string[] = [];
    let totalBudgetImpact = 0;

    for (const item of performanceList) {
      const cpa = item.sales_count > 0 ? item.spend_brl / item.sales_count : 999;
      const roas = item.spend_brl > 0 ? item.revenue_brl / item.spend_brl : 0;
      const hookScore = item.creative_evaluation?.hook_score ?? 5.0;
      const recommendation = item.creative_evaluation?.recommendation;

      const adLocator = `meta_ads:ad:${item.ad_id}`;
      const crmLocator = `crm_leads:deal:utm_content=${item.utm_content}`;
      const creativeLocator = `creative_evaluation:${item.ad_id}:hook_score`;
      const locators = [adLocator, crmLocator, creativeLocator];

      const evidenceRef = `evi_prop_${item.ad_id}`;
      allEvidenceRefs.push(evidenceRef);

      // 1. Caso de Queima Crítica de Verba / CPA Estourado / Recomendação PAUSAR -> Proposta de PAUSE
      if (recommendation === 'PAUSAR' || (!recommendation && cpa > input.benchmark_cpa_brl * 2.0 && item.spend_brl > 150)) {
        const previousState = {
          ad_id: item.ad_id,
          status: 'ACTIVE',
          spend_brl: item.spend_brl,
          cpa_brl: Math.round(cpa * 100) / 100
        };

        const proposedPayload = {
          target_status: 'PAUSED',
          reason: `CPA real de R$ ${cpa.toFixed(2)} excede benchmark (R$ ${input.benchmark_cpa_brl.toFixed(2)}) e Hook Score de ${hookScore}/10 indica fadiga crítica.`
        };

        const proposalHash = calculateProposalHash({
          resource: adLocator,
          operation: 'PAUSE',
          payload: proposedPayload,
          previousStateSnapshot: previousState
        });

        proposals.push({
          proposal_id: `prop_pause_${item.ad_id}`,
          client_id: input.client_id,
          timeframe: input.timeframe,
          operation: 'PAUSE',
          target_type: 'AD',
          target_id: item.ad_id,
          target_resource: adLocator,
          title: `Pausar Anúncio '${item.ad_name}' por Fadiga Criativa e CPA Elevado`,
          causal_justification: `O anúncio consumiu R$ ${item.spend_brl.toFixed(2)} com apenas ${item.sales_count} vendas (CPA real R$ ${cpa.toFixed(2)} vs meta R$ ${input.benchmark_cpa_brl.toFixed(2)}). A retenção inicial em declínio (Hook Score ${hookScore}/10) comprova esgotamento do gancho.`,
          expected_impact: {
            primary_metric: 'Wasted Spend (Economia)',
            estimated_delta: `-R$ ${item.spend_brl.toFixed(2)}/ciclo`,
            rationale: 'Estancar queima de verba imediata e viabilizar realocação de orçamento para criativos eficientes.'
          },
          blast_radius: {
            risk_level: 'LOW',
            daily_budget_impact_brl: -50.0,
            affected_entities_count: 1,
            is_reversible: true,
            scope_description: `Pausa do anúncio ${item.ad_id} na campanha ${item.campaign_id}. Não afeta outros anúncios do conjunto.`
          },
          proposed_payload: proposedPayload,
          previous_state_snapshot: previousState,
          proposal_hash: proposalHash,
          expected_postcondition: {
            checkTool: 'meta.get_ad',
            targetField: 'status',
            expectedValue: 'PAUSED',
            comparisonOperator: 'EQUALS',
            timeoutSeconds: 15,
            maxRetries: 3
          },
          rollback_spec: {
            isReversible: true,
            rollbackOp: 'meta.reactivate_ad',
            previousStateSnapshot: previousState,
            rollbackWindowSeconds: 86400
          },
          evidence_refs: [evidenceRef],
          locators,
          status: 'PROVISIONAL',
          declared_effect: 'INTERNAL_WRITE',
          created_at: now
        });

        totalBudgetImpact -= 50.0;
      }
      // 2. Caso de Top Performer / Alto Retorno -> Proposta de UPDATE_BUDGET (Escala)
      else if (recommendation === 'SEGUIR' || (!recommendation && cpa <= input.benchmark_cpa_brl && roas >= input.benchmark_roas)) {
        const previousState = {
          ad_id: item.ad_id,
          status: 'ACTIVE',
          daily_budget_brl: 100.0,
          current_roas: Math.round(roas * 100) / 100
        };

        const newBudgetBrl = 150.0;
        const proposedPayload = {
          daily_budget_brl: newBudgetBrl,
          currency: 'BRL',
          scaling_step_percent: 50.0
        };

        const proposalHash = calculateProposalHash({
          resource: adLocator,
          operation: 'UPDATE_BUDGET',
          payload: proposedPayload,
          previousStateSnapshot: previousState
        });

        proposals.push({
          proposal_id: `prop_scale_${item.ad_id}`,
          client_id: input.client_id,
          timeframe: input.timeframe,
          operation: 'UPDATE_BUDGET',
          target_type: 'AD',
          target_id: item.ad_id,
          target_resource: adLocator,
          title: `Escalar Orçamento do Top Performer '${item.ad_name}' (+50%)`,
          causal_justification: `O anúncio gerou ${item.sales_count} vendas no CRM com receita de R$ ${item.revenue_brl.toFixed(2)}, atingindo ROAS real de ${roas.toFixed(2)}x e CPA de R$ ${cpa.toFixed(2)} (abaixo da meta de R$ ${input.benchmark_cpa_brl.toFixed(2)}).`,
          expected_impact: {
            primary_metric: 'CRM Revenue / Volume de Vendas',
            estimated_delta: '+35% a +50% em novos pedidos',
            rationale: 'Aproveitar a tração do criativo campeão de retenção para ampliar aquisição mantendo margem operacional.'
          },
          blast_radius: {
            risk_level: 'MEDIUM',
            daily_budget_impact_brl: 50.0,
            affected_entities_count: 1,
            is_reversible: true,
            scope_description: `Aumento de R$ 100,00 para R$ 150,00 diários no anúncio ${item.ad_id}.`
          },
          proposed_payload: proposedPayload,
          previous_state_snapshot: previousState,
          proposal_hash: proposalHash,
          expected_postcondition: {
            checkTool: 'meta.get_ad',
            targetField: 'daily_budget',
            expectedValue: newBudgetBrl,
            comparisonOperator: 'EQUALS',
            timeoutSeconds: 15,
            maxRetries: 3
          },
          rollback_spec: {
            isReversible: true,
            rollbackOp: 'meta.update_budget',
            previousStateSnapshot: previousState,
            rollbackWindowSeconds: 86400
          },
          evidence_refs: [evidenceRef],
          locators,
          status: 'PROVISIONAL',
          declared_effect: 'INTERNAL_WRITE',
          created_at: now
        });

        totalBudgetImpact += 50.0;
      }
      // 3. Caso de Variação de Gancho / Teste Experimental
      else if (recommendation === 'VARIAR') {
        const previousState = { ad_id: item.ad_id, status: 'ACTIVE' };
        const proposedPayload = {
          experiment_type: 'HOOK_VARIATION',
          target_ad_id: item.ad_id,
          test_duration_days: 7
        };

        const proposalHash = calculateProposalHash({
          resource: adLocator,
          operation: 'CREATE_EXPERIMENT',
          payload: proposedPayload,
          previousStateSnapshot: previousState
        });

        proposals.push({
          proposal_id: `prop_exp_${item.ad_id}`,
          client_id: input.client_id,
          timeframe: input.timeframe,
          operation: 'CREATE_EXPERIMENT',
          target_type: 'AD',
          target_id: item.ad_id,
          target_resource: adLocator,
          title: `Criar Experimento de Gancho para '${item.ad_name}'`,
          causal_justification: 'Criativo com bom potencial porém demandando renovação do gancho inicial para alavancar conversão.',
          expected_impact: {
            primary_metric: 'CTR / Hook Score',
            estimated_delta: '+25% de retenção nos primeiros 3s',
            rationale: 'Identificar nova narrativa visual antes de ampliação de verba.'
          },
          blast_radius: {
            risk_level: 'LOW',
            daily_budget_impact_brl: 0,
            affected_entities_count: 1,
            is_reversible: true,
            scope_description: `Variação experimental para ${item.ad_id}.`
          },
          proposed_payload: proposedPayload,
          previous_state_snapshot: previousState,
          proposal_hash: proposalHash,
          expected_postcondition: {
            checkTool: 'meta.get_ad',
            targetField: 'status',
            expectedValue: 'ACTIVE',
            comparisonOperator: 'EQUALS'
          },
          rollback_spec: {
            isReversible: true,
            previousStateSnapshot: previousState
          },
          evidence_refs: [evidenceRef],
          locators,
          status: 'PROVISIONAL',
          declared_effect: 'INTERNAL_WRITE',
          created_at: now
        });
      }
    }

    // Se nenhum extremo foi atingido, propor experimento padrão de variação de gancho
    if (proposals.length === 0 && performanceList.length > 0) {
      const first = performanceList[0]!;
      const previousState = { ad_id: first.ad_id, status: 'ACTIVE' };
      const proposedPayload = {
        experiment_type: 'HOOK_VARIATION',
        target_ad_id: first.ad_id,
        test_duration_days: 7
      };

      const proposalHash = calculateProposalHash({
        resource: `meta_ads:ad:${first.ad_id}`,
        operation: 'CREATE_EXPERIMENT',
        payload: proposedPayload,
        previousStateSnapshot: previousState
      });

      proposals.push({
        proposal_id: `prop_exp_${first.ad_id}`,
        client_id: input.client_id,
        timeframe: input.timeframe,
        operation: 'CREATE_EXPERIMENT',
        target_type: 'AD',
        target_id: first.ad_id,
        target_resource: `meta_ads:ad:${first.ad_id}`,
        title: `Criar Experimento A/B de Gancho para '${first.ad_name}'`,
        causal_justification: 'Performance intermediária requer teste controlado de novos 3 primeiros segundos para alavancar conversão.',
        expected_impact: {
          primary_metric: 'CTR / Hook Score',
          estimated_delta: '+20% de retenção',
          rationale: 'Identificar ângulo vencedor de comunicação antes de aporte de maior capital.'
        },
        blast_radius: {
          risk_level: 'LOW',
          daily_budget_impact_brl: 0,
          affected_entities_count: 1,
          is_reversible: true,
          scope_description: `Criação de variação experimental para ${first.ad_id}.`
        },
        proposed_payload: proposedPayload,
        previous_state_snapshot: previousState,
        proposal_hash: proposalHash,
        expected_postcondition: {
          checkTool: 'meta.get_ad',
          targetField: 'status',
          expectedValue: 'ACTIVE',
          comparisonOperator: 'EQUALS'
        },
        rollback_spec: {
          isReversible: true,
          previousStateSnapshot: previousState
        },
        evidence_refs: [`evi_prop_${first.ad_id}`],
        locators: [`meta_ads:ad:${first.ad_id}`],
        status: 'PROVISIONAL',
        declared_effect: 'INTERNAL_WRITE',
        created_at: now
      });
    }

    const narrative = `Foram geradas ${proposals.length} propostas de decisão formais (status PROVISIONAL) para ${input.client_id}. Cada proposta possui hash criptográfico único SHA-256 amarrado ao payload, blast radius delimitado e especificação de pós-condição verificável. Nenhuma escrita externa foi disparada nesta fase.`;

    return {
      schemaVersion: '1.0.0',
      client_id: input.client_id,
      timeframe: input.timeframe,
      generated_at: now,
      proposals,
      summary_narrative: narrative,
      total_budget_impact_brl: totalBudgetImpact,
      evidence_refs: allEvidenceRefs
    };
  }
}
