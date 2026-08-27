import { describe, it, expect } from 'vitest';
import {
  DataQualityApp,
  PerformanceReconciliationApp,
  AccountDiagnosisApp,
  ActionRecommendationApp,
  CreativeBriefApp,
  MeetingBriefApp
} from './index.js';
import { RAW_CRM_LEADS_DATA } from '@adzhub/data';

describe('ÉPICO 2: Apps de Metodologia e Diagnóstico (@adzhub/apps)', () => {
  const sampleTimeframe = {
    since: '2026-08-01T00:00:00.000Z',
    until: '2026-08-20T23:59:59.000Z',
    timezone: 'America/Sao_Paulo'
  };

  describe('Task 2.1 — DataQualityApp (Auditoria de Dados & Atribuição)', () => {
    it('deve auditar com sucesso os dados canônicos da Housewhey e retornar status VERIFIED', () => {
      const app = new DataQualityApp();
      const result = app.audit({
        client_id: 'cli_housewhey',
        timeframe: sampleTimeframe
      });

      expect(result.status).toBe('VERIFIED');
      expect(result.client_id).toBe('cli_housewhey');
      expect(result.metrics.total_deals_processed).toBeGreaterThan(0);
      expect(result.metrics.missing_utm_rate_percent).toBeLessThan(30.0);
      expect(result.metrics.freshness_score).toBeGreaterThanOrEqual(0.5);
      expect(result.passed_checks).toContain('TIMEZONE_ALIGNED (America/Sao_Paulo)');
      expect(result.quarantine_recommendation).toBeUndefined();
    });

    it('deve retornar status INSUFFICIENT_EVIDENCE e quarentena se cobertura de UTM for < 70%', () => {
      const app = new DataQualityApp();

      // Mock com alta taxa de missing UTM
      const badCrm = {
        ...RAW_CRM_LEADS_DATA,
        deals: RAW_CRM_LEADS_DATA.deals.map((d, idx) =>
          idx > 1 ? { ...d, utm_source: '', utm_content: '' } : d
        )
      };

      const result = app.audit(
        {
          client_id: 'cli_housewhey',
          timeframe: sampleTimeframe
        },
        { crmLeadsData: badCrm }
      );

      expect(result.status).toBe('INSUFFICIENT_EVIDENCE');
      expect(result.failed_checks.some((c) => c.includes('LOW_UTM_COVERAGE'))).toBe(true);
      expect(result.quarantine_recommendation?.reasonCode).toBe('LOW_COVERAGE');
    });

    it('deve isolar estritamente clientes diferentes prevenindo vazamento de dados', () => {
      const app = new DataQualityApp();
      expect(() =>
        app.audit({
          client_id: 'cli_competitor',
          timeframe: sampleTimeframe
        })
      ).toThrowError(/Isolamento de cliente violado/);
    });
  });

  describe('Task 2.2 — PerformanceReconciliationApp (Cruzamento Meta Ads x CRM x GA4)', () => {
    it('deve gerar tabela reconciliada com métricas reais vs plataforma e EvidenceRefs', () => {
      const app = new PerformanceReconciliationApp();
      const result = app.reconcile({
        client_id: 'cli_housewhey',
        timeframe: sampleTimeframe
      });

      expect(result.client_id).toBe('cli_housewhey');
      expect(result.totals.total_meta_spend_brl).toBeGreaterThan(0);
      expect(result.totals.total_crm_sales_count).toBeGreaterThan(0);
      expect(result.totals.blended_real_roas).not.toBeNull();
      expect(result.reconciled_ads.length).toBeGreaterThan(0);

      // Validação de um anúncio específico
      const firstAd = result.reconciled_ads[0]!;
      expect(firstAd.ad_id).toBeDefined();
      expect(firstAd.meta_spend_brl).toBeGreaterThanOrEqual(0);
      expect(firstAd.evidence_locators.length).toBeGreaterThan(0);
      expect(result.evidence_refs.length).toBeGreaterThan(0);
    });
  });

  describe('Task 2.3 — AccountDiagnosisApp (Diagnóstico Causal em 6 Blocos)', () => {
    it('deve estruturar o diagnóstico analítico nos 6 blocos normativos com hipóteses PROVISIONAL', () => {
      const app = new AccountDiagnosisApp();
      const result = app.diagnose({
        client_id: 'cli_housewhey',
        timeframe: sampleTimeframe,
        target_question: 'Por que o CPA subiu na última semana de Agosto?'
      });

      expect(result.schemaVersion).toBe('1.0.0');

      // Bloco 1: Fatos Confirmados
      expect(result.block_1_confirmed_facts.length).toBeGreaterThan(0);
      expect(result.block_1_confirmed_facts[0]!.evidence_refs.length).toBeGreaterThan(0);

      // Bloco 2: Anomalias
      expect(result.block_2_detected_anomalies).toBeInstanceOf(Array);

      // Bloco 3: Hipóteses Concorrentes (INVARIANTE CRÍTICA: status PROVISIONAL)
      expect(result.block_3_competing_hypotheses.length).toBeGreaterThan(0);
      for (const hyp of result.block_3_competing_hypotheses) {
        expect(hyp.status).toBe('PROVISIONAL');
      }

      // Bloco 4: Matriz de Evidências
      expect(result.block_4_evidence_evaluation.length).toBeGreaterThan(0);

      // Bloco 5: Gaps de Informação
      expect(result.block_5_information_gaps).toBeInstanceOf(Array);

      // Bloco 6: Próximos Testes Recomendados
      expect(result.block_6_recommended_tests.length).toBeGreaterThan(0);
      expect(result.narrative_synthesis.length).toBeGreaterThan(0);
    });
  });
});

describe('ÉPICO 3: Recomendação, Briefings e Pautas (@adzhub/apps)', () => {
  const sampleTimeframe = {
    since: '2026-08-01T00:00:00.000Z',
    until: '2026-08-20T23:59:59.000Z',
    timezone: 'America/Sao_Paulo'
  };

  describe('Task 3.1 — ActionRecommendationApp (ACTION_RECOMMENDATION)', () => {
    it('deve gerar DecisionProposals com proposal_hash, blast radius e pós-condições', () => {
      const app = new ActionRecommendationApp();
      const result = app.recommend({
        client_id: 'cli_housewhey',
        timeframe: sampleTimeframe
      });

      expect(result.schemaVersion).toBe('1.0.0');
      expect(result.client_id).toBe('cli_housewhey');
      expect(result.proposals.length).toBeGreaterThan(0);

      for (const proposal of result.proposals) {
        expect(proposal.status).toBe('PROVISIONAL');
        expect(proposal.declared_effect).toBe('INTERNAL_WRITE');
        expect(proposal.proposal_hash).toHaveLength(64);
        expect(proposal.expected_postcondition).toBeDefined();
        expect(proposal.expected_postcondition.checkTool).toBe('meta.get_ad');
        expect(proposal.rollback_spec).toBeDefined();
        expect(proposal.rollback_spec.isReversible).toBe(true);
        expect(proposal.blast_radius).toBeDefined();
        expect(proposal.evidence_refs.length).toBeGreaterThan(0);
        expect(proposal.locators.length).toBeGreaterThan(0);
      }

      // Verifica proposta específica de pausa para anúncio saturado
      const pauseProposal = result.proposals.find((p) => p.operation === 'PAUSE');
      expect(pauseProposal).toBeDefined();
      expect(pauseProposal?.target_id).toBe('ad_namorados_casal_03');
      expect(pauseProposal?.proposed_payload.target_status).toBe('PAUSED');
      expect(pauseProposal?.blast_radius.risk_level).toBe('LOW');

      // Verifica proposta específica de escala para top performer
      const scaleProposal = result.proposals.find((p) => p.operation === 'UPDATE_BUDGET');
      expect(scaleProposal).toBeDefined();
      expect(scaleProposal?.target_id).toBe('ad_whey_baunilha_01');
      expect(scaleProposal?.proposed_payload.daily_budget_brl).toBe(150.0);
    });

    it('deve rejeitar cliente inconsistente (isolamento de tenant/cliente)', () => {
      const app = new ActionRecommendationApp();
      expect(() =>
        app.recommend({
          client_id: 'cli_outro_cliente',
          timeframe: sampleTimeframe
        })
      ).toThrowError(/Isolamento de cliente violado/);
    });
  });

  describe('Task 3.2 — CreativeBriefApp (CREATIVE_BRIEF_GENERATION)', () => {
    it('deve gerar briefing criativo estruturado com 10 seções, hook 3s e markdown', () => {
      const app = new CreativeBriefApp();
      const result = app.generateBrief({
        client_id: 'cli_housewhey',
        timeframe: sampleTimeframe,
        angle_focus: 'SABOR_E_DIGESTAO',
        format_preference: 'VIDEO_VERTICAL_9X16'
      });

      expect(result.schemaVersion).toBe('1.0.0');
      expect(result.briefs.length).toBeGreaterThan(0);

      const brief = result.briefs[0]!;
      expect(brief.brief_id).toMatch(/^art_cb_/);
      expect(brief.brand_name).toBe('Housewhey');
      expect(brief.target_audience.persona).toBeDefined();
      expect(brief.core_offer.product_name).toContain('Whey Protein');
      expect(brief.hook.visual_direction_3s.length).toBeGreaterThan(10);
      expect(brief.body_and_offer.demonstrations.length).toBeGreaterThan(0);
      expect(brief.forbidden_claims.length).toBeGreaterThanOrEqual(4);
      expect(brief.technical_specs.aspect_ratio).toBe('9:16');
      expect(brief.success_metrics.target_hook_score).toBeGreaterThanOrEqual(8.0);
      expect(brief.rendered_markdown).toContain('# Briefing Criativo:');
      expect(brief.rendered_markdown).toContain('PROIBIDO:');
    });

    it('deve aplicar restrições de compliance estritas do mapa da solução no briefing', () => {
      const app = new CreativeBriefApp();
      const result = app.generateBrief({
        client_id: 'cli_housewhey',
        timeframe: sampleTimeframe,
        angle_focus: 'PUREZA_E_LAUDOS'
      });

      const brief = result.briefs[0]!;
      expect(brief.forbidden_claims.some((c) => c.includes('milagroso'))).toBe(true);
      expect(brief.rendered_markdown).toContain('QR code da embalagem');
    });
  });

  describe('Task 3.2 — MeetingBriefApp (MEETING_AGENDA_GENERATION)', () => {
    it('deve compilar pauta de reunião cruzando métricas reconciliadas, anomalias e decisões', () => {
      const app = new MeetingBriefApp();
      const result = app.generateAgenda({
        client_id: 'cli_housewhey',
        timeframe: sampleTimeframe,
        meeting_type: 'WEEKLY_PERFORMANCE'
      });

      expect(result.schemaVersion).toBe('1.0.0');
      expect(result.agenda_id).toMatch(/^art_ma_/);
      expect(result.reconciled_metrics.total_spend_brl).toBeGreaterThan(0);
      expect(result.reconciled_metrics.total_crm_sales).toBeGreaterThan(0);
      expect(result.reconciled_metrics.blended_roas).toBeGreaterThan(0);
      expect(result.critical_highlights.length).toBeGreaterThanOrEqual(2);
      expect(result.pending_decisions.length).toBeGreaterThanOrEqual(2);
      expect(result.agenda_topics.length).toBe(4);
      expect(result.proposed_action_items.length).toBe(3);
      expect(result.rendered_markdown).toContain('# Pauta de Alinhamento Semanal de Performance');
      expect(result.rendered_markdown).toContain('Métricas Reconciliadas');
      expect(result.evidence_refs.length).toBeGreaterThan(0);
    });
  });
});

