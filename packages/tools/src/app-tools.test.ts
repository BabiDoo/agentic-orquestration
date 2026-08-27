import { describe, expect, it } from 'vitest';
import { createAppTools } from './index.js';

describe('App Tools — Análise de Criativos & Mapa da Solução (M2-04)', () => {
  const timeframe = {
    since: '2026-08-01T00:00:00.000Z',
    until: '2026-08-20T23:59:59.000Z',
    timezone: 'America/Sao_Paulo'
  };

  const { runAppAnaliseCriativosTool, getMapaSolucaoTool } = createAppTools();

  describe('run_app_analise_criativos', () => {
    it('executa a metodologia completa de 6 etapas e retorna saída estruturada', async () => {
      const result = await runAppAnaliseCriativosTool.execute({
        client_id: 'cli_housewhey',
        timeframe,
        benchmark_cpa_brl: 85.0,
        benchmark_roas: 2.5
      });

      expect(result.ok).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data!;

      // 1. Contexto
      expect(data.context).toBeDefined();
      expect(data.context.client_id).toBe('cli_housewhey');
      expect(data.context.benchmarks.target_cpa_brl).toBe(85.0);
      expect(data.context.benchmarks.target_roas).toBe(2.5);

      // 2. Normalização
      expect(data.normalization).toBeDefined();
      expect(data.normalization.total_ads_evaluated).toBeGreaterThan(0);
      expect(data.normalization.total_deals_processed).toBeGreaterThan(0);

      // 3. Cobertura
      expect(data.coverage).toBeDefined();
      expect(data.coverage.join_coverage_percent).toBeGreaterThan(0);
      expect(data.coverage.coverage_level).toBe('SUFFICIENT');

      // 4. Ranking Downstream
      expect(data.downstream_ranking).toBeDefined();
      expect(data.downstream_ranking.length).toBeGreaterThan(0);

      const topAd = data.downstream_ranking[0];
      expect(topAd?.rank).toBe(1);
      expect(topAd?.ad_id).toBeDefined();
      expect(topAd?.cpa_sale_brl).toBeDefined();
      expect(topAd?.data_locators.length).toBeGreaterThan(0);
      expect(topAd?.data_locators[0]).toContain('meta:ad:');

      // 5. Limitações
      expect(data.limitations).toBeDefined();
      expect(data.limitations.length).toBeGreaterThanOrEqual(3);

      // 6. Proposta
      expect(data.proposal).toBeDefined();
      expect(data.proposal.actions.length).toBeGreaterThan(0);
      expect(data.proposal.narrative_summary).toBeDefined();
      expect(data.proposal.narrative_summary.length).toBeGreaterThan(50);

      // Checa se ações citam locators de evidência
      for (const action of data.proposal.actions) {
        expect(action.evidence_locators.length).toBeGreaterThan(0);
        expect(action.target_ad_id).toBeDefined();
        expect(action.target_utm_content).toBeDefined();
        expect(action.rationale).toBeDefined();
      }

      // Checa proveniência
      expect(data.provenance.source).toBe('app_analise_criativos');
      expect(data.provenance.locator).toContain('app:creative_analysis:');
    });

    it('identifica Top Performer para escala e queima crítica de verba para pausa', async () => {
      const result = await runAppAnaliseCriativosTool.execute({
        client_id: 'cli_housewhey',
        timeframe,
        benchmark_cpa_brl: 85.0
      });

      expect(result.ok).toBe(true);
      const actions = result.data!.proposal.actions;

      const scaleAction = actions.find((a) => a.action_type === 'ESCALAR');
      const pauseAction = actions.find((a) => a.action_type === 'PAUSAR_RECOMENDACAO');

      expect(scaleAction).toBeDefined();
      expect(scaleAction?.target_ad_id).toBe('ad_whey_baunilha_01');
      expect(scaleAction?.suggested_brief).toBeDefined();

      expect(pauseAction).toBeDefined();
      expect(pauseAction?.target_ad_id).toBe('ad_namorados_casal_03');
      expect(pauseAction?.rationale).toContain('queima de verba');
    });

    it('garante que o efeito declarado é estritamente read:app (sem capability de escrita)', () => {
      expect(runAppAnaliseCriativosTool.effect).toBe('read:app');
    });

    it('rejeita chamada para cliente desconhecido (isolamento cross-client)', async () => {
      const result = await runAppAnaliseCriativosTool.execute({
        client_id: 'cli_desconhecido',
        timeframe
      });

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('TOOL_ERROR');
      expect(result.error).toContain("Cliente 'cli_desconhecido' não encontrado");
    });
  });

  describe('get_mapa_solucao', () => {
    it('retorna a estrutura completa do mapa da solução com provenance', async () => {
      const result = await getMapaSolucaoTool.execute({
        client_id: 'cli_housewhey'
      });

      expect(result.ok).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data!;
      expect(data.brand_name).toBe('Housewhey');
      expect(data.market_segment).toContain('Nutrição Esportiva');
      expect(data.core_offer).toBeDefined();
      expect(data.promise).toBeDefined();
      expect(data.target_audiences.length).toBeGreaterThanOrEqual(2);
      expect(data.proof_elements.length).toBeGreaterThanOrEqual(4);
      expect(data.forbidden_claims.length).toBeGreaterThanOrEqual(4);
      expect(data.tone_of_voice.style).toBeDefined();

      expect(data.provenance.source).toBe('app_mapa_solucao');
      expect(data.provenance.locator).toBe('app_mapa_solucao:cli_housewhey');
    });

    it('garante que o efeito declarado de get_mapa_solucao é read:app', () => {
      expect(getMapaSolucaoTool.effect).toBe('read:app');
    });

    it('rejeita cliente sem mapa da solução registrado', async () => {
      const result = await getMapaSolucaoTool.execute({
        client_id: 'cli_inexistente'
      });

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('TOOL_ERROR');
      expect(result.error).toContain('não possui mapa da solução');
    });
  });

  describe('run_app_data_quality_attribution (Task 2.1)', () => {
    const { runAppDataQualityAttributionTool } = createAppTools();

    it('executa auditoria de qualidade e retorna status VERIFIED para dados canônicos', async () => {
      const result = await runAppDataQualityAttributionTool.execute({
        client_id: 'cli_housewhey',
        timeframe
      });

      expect(result.ok).toBe(true);
      expect(result.data?.status).toBe('VERIFIED');
      expect(result.data?.metrics.total_deals_processed).toBeGreaterThan(0);
      expect(result.data?.evidence_locators.length).toBeGreaterThan(0);
    });

    it('garante que o efeito declarado é read:app', () => {
      expect(runAppDataQualityAttributionTool.effect).toBe('read:app');
    });
  });

  describe('run_app_performance_reconciliation (Task 2.2)', () => {
    const { runAppPerformanceReconciliationTool } = createAppTools();

    it('executa reconciliação de performance com EvidenceRefs e totais calculados', async () => {
      const result = await runAppPerformanceReconciliationTool.execute({
        client_id: 'cli_housewhey',
        timeframe,
        include_divergences: true
      });

      expect(result.ok).toBe(true);
      expect(result.data?.client_id).toBe('cli_housewhey');
      expect(result.data?.totals.total_meta_spend_brl).toBeGreaterThan(0);
      expect(result.data?.reconciled_ads.length).toBeGreaterThan(0);
      expect(result.data?.evidence_refs.length).toBeGreaterThan(0);
    });

    it('garante que o efeito declarado é read:app', () => {
      expect(runAppPerformanceReconciliationTool.effect).toBe('read:app');
    });
  });

  describe('run_app_account_diagnosis (Task 2.3)', () => {
    const { runAppAccountDiagnosisTool } = createAppTools();

    it('executa diagnóstico analítico em 6 blocos com hipóteses PROVISIONAL', async () => {
      const result = await runAppAccountDiagnosisTool.execute({
        client_id: 'cli_housewhey',
        timeframe,
        target_question: 'Por que o CPA subiu em Agosto?'
      });

      expect(result.ok).toBe(true);
      expect(result.data?.block_1_confirmed_facts.length).toBeGreaterThan(0);
      expect(result.data?.block_3_competing_hypotheses.length).toBeGreaterThan(0);
      expect(
        result.data?.block_3_competing_hypotheses.every((h) => h.status === 'PROVISIONAL')
      ).toBe(true);
      expect(result.data?.block_4_evidence_evaluation.length).toBeGreaterThan(0);
      expect(result.data?.block_6_recommended_tests.length).toBeGreaterThan(0);
    });

    it('garante que o efeito declarado é read:app', () => {
      expect(runAppAccountDiagnosisTool.effect).toBe('read:app');
    });
  });

  describe('run_app_action_recommendation (Task 3.1)', () => {
    const { runAppActionRecommendationTool } = createAppTools();

    it('executa recomendação de ações e retorna propostas com proposal_hash e status PROVISIONAL', async () => {
      const result = await runAppActionRecommendationTool.execute({
        client_id: 'cli_housewhey',
        timeframe
      });

      expect(result.ok).toBe(true);
      expect(result.data?.proposals.length).toBeGreaterThan(0);
      expect(result.data?.proposals.every((p) => p.status === 'PROVISIONAL')).toBe(true);
      expect(result.data?.proposals.every((p) => p.proposal_hash.length === 64)).toBe(true);
      expect(result.data?.proposals.every((p) => p.declared_effect === 'INTERNAL_WRITE')).toBe(true);
    });

    it('garante que o efeito declarado é estritamente write:staging (sem mutação externa)', () => {
      expect(runAppActionRecommendationTool.effect).toBe('write:staging');
    });
  });

  describe('run_app_creative_brief (Task 3.2)', () => {
    const { runAppCreativeBriefTool } = createAppTools();

    it('executa geração de briefing criativo estruturado com hook e restrições de compliance', async () => {
      const result = await runAppCreativeBriefTool.execute({
        client_id: 'cli_housewhey',
        timeframe,
        angle_focus: 'SABOR_E_DIGESTAO'
      });

      expect(result.ok).toBe(true);
      expect(result.data?.briefs.length).toBeGreaterThan(0);
      expect(result.data?.briefs[0]?.brief_id).toMatch(/^art_cb_/);
      expect(result.data?.briefs[0]?.rendered_markdown.length).toBeGreaterThan(100);
    });

    it('garante que o efeito declarado é read:app', () => {
      expect(runAppCreativeBriefTool.effect).toBe('read:app');
    });
  });

  describe('run_app_meeting_agenda (Task 3.2)', () => {
    const { runAppMeetingAgendaTool } = createAppTools();

    it('executa compilação de pauta de reunião executiva cruzando métricas e decisões', async () => {
      const result = await runAppMeetingAgendaTool.execute({
        client_id: 'cli_housewhey',
        timeframe,
        meeting_type: 'WEEKLY_PERFORMANCE'
      });

      expect(result.ok).toBe(true);
      expect(result.data?.agenda_id).toMatch(/^art_ma_/);
      expect(result.data?.agenda_topics.length).toBe(4);
      expect(result.data?.pending_decisions.length).toBeGreaterThan(0);
      expect(result.data?.rendered_markdown.length).toBeGreaterThan(100);
    });

    it('garante que o efeito declarado é read:app', () => {
      expect(runAppMeetingAgendaTool.effect).toBe('read:app');
    });
  });

  describe('OpenAI Function Schemas', () => {
    it('gera schemas válidos para Function Calling em todos os apps', () => {
      const {
        runAppAnaliseCriativosTool,
        getMapaSolucaoTool,
        runAppDataQualityAttributionTool,
        runAppPerformanceReconciliationTool,
        runAppAccountDiagnosisTool,
        runAppActionRecommendationTool,
        runAppCreativeBriefTool,
        runAppMeetingAgendaTool
      } = createAppTools();

      const schemaApp = runAppAnaliseCriativosTool.toOpenAISchema();
      const schemaMapa = getMapaSolucaoTool.toOpenAISchema();
      const schemaDqa = runAppDataQualityAttributionTool.toOpenAISchema();
      const schemaRec = runAppPerformanceReconciliationTool.toOpenAISchema();
      const schemaDiag = runAppAccountDiagnosisTool.toOpenAISchema();
      const schemaRecAct = runAppActionRecommendationTool.toOpenAISchema();
      const schemaCb = runAppCreativeBriefTool.toOpenAISchema();
      const schemaMa = runAppMeetingAgendaTool.toOpenAISchema();

      expect(schemaApp.function.name).toBe('run_app_analise_criativos');
      expect(schemaMapa.function.name).toBe('get_mapa_solucao');
      expect(schemaDqa.function.name).toBe('run_app_data_quality_attribution');
      expect(schemaRec.function.name).toBe('run_app_performance_reconciliation');
      expect(schemaDiag.function.name).toBe('run_app_account_diagnosis');
      expect(schemaRecAct.function.name).toBe('run_app_action_recommendation');
      expect(schemaCb.function.name).toBe('run_app_creative_brief');
      expect(schemaMa.function.name).toBe('run_app_meeting_agenda');
    });
  });
});
