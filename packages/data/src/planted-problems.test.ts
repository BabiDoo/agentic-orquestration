import { describe, it, expect } from 'vitest';
import {
  RAW_GRAPH_DATA,
  RAW_TIMELINE_DATA,
  RAW_META_ADS_DATA,
  RAW_CRM_LEADS_DATA,
  RAW_ANALISE_CRIATIVOS_DATA,
  RAW_CONVERSAS_DATA,
  getCanonicalRawJsonMap
} from './raw-fixtures.js';

describe('@adzhub/data - M1-03: Problemas Realistas e Explicáveis Plantados', () => {
  const rawMap = getCanonicalRawJsonMap();

  describe('Critérios de Qualidade e Governança Semântica', () => {
    it('1. Não devem existir rótulos artificiais como "ANOMALIA", "BUG", "DEFECT", "ERROR_FLAG"', () => {
      const forbiddenTokens = ['ANOMALIA', 'ANOMALY', 'IS_BUG', 'DEFECT', 'ERROR_FLAG', 'SPOILER:'];

      for (const [filename, jsonContent] of Object.entries(rawMap)) {
        for (const token of forbiddenTokens) {
          const regex = new RegExp(`\\b${token}\\b`, 'i');
          expect(
            regex.test(jsonContent),
            `Arquivo ${filename} contém rótulo artificial proibido: "${token}"`
          ).toBe(false);
        }
      }
    });

    it('2. Notas e summaries de timeline e reuniões não devem entregar a resposta pronta/mastigada', () => {
      // Nenhum texto deve conter diagnósticos imperativos artificiais
      const allText = Object.values(rawMap).join(' ');
      expect(allText).not.toContain('A RESPOSTA É:');
      expect(allText).not.toContain('DIAGNÓSTICO FINAL:');
      expect(allText).not.toContain('GABARITO:');
    });
  });

  describe('Inferência Rastreável dos 5 Problemas Reais de Gestão', () => {
    it('Problema 1 (CPA Alto / Queima Orçamentária): Inferível por join de Meta Ads × CRM Deals', () => {
      // 1. Obter gasto no anúncio de namorados
      const namoradosAd = RAW_META_ADS_DATA.campaigns
        .flatMap((c) => c.ads)
        .find((a) => a.ad_id === 'ad_namorados_casal_03');
      expect(namoradosAd).toBeDefined();
      const spend = namoradosAd!.spend_brl;
      expect(spend).toBe(4850.0);

      // 2. Obter vendas registradas no CRM para o utm_content correspondente
      const salesDeals = RAW_CRM_LEADS_DATA.deals.filter(
        (d) => d.utm_content === 'ad_namorados_casal_03' && d.status === 'venda'
      );
      const salesCount = salesDeals.length;
      expect(salesCount).toBe(3);

      const totalRevenue = salesDeals.reduce((sum, d) => sum + d.value_brl, 0);
      expect(totalRevenue).toBe(720.0);

      // 3. Cálculo de métricas derivadas: CPA real e ROAS
      const calculatedCpa = spend / salesCount;
      const calculatedRoas = totalRevenue / spend;

      expect(calculatedCpa).toBeCloseTo(1616.67, 1);
      expect(calculatedRoas).toBeCloseTo(0.148, 2);

      // 4. Comparação com o CPA alvo definido na campanha (Grafo)
      const campaignNode = RAW_GRAPH_DATA.nodes.find((n) => n.id === 'camp_namorados');
      const targetCpa = (campaignNode?.props as { target_cpa_brl?: number })?.target_cpa_brl ?? 0;
      expect(targetCpa).toBe(75.0);

      // O CPA real está mais de 20x acima da meta contratada
      expect(calculatedCpa).toBeGreaterThan(targetCpa * 20);
    });

    it('Problema 2 (Saturação de Criativo / Fadiga de Frequência): Inferível por métricas de retenção e engajamento', () => {
      const namoradosAd = RAW_META_ADS_DATA.campaigns
        .flatMap((c) => c.ads)
        .find((a) => a.ad_id === 'ad_namorados_casal_03')!;

      const wheyAd = RAW_META_ADS_DATA.campaigns
        .flatMap((c) => c.ads)
        .find((a) => a.ad_id === 'ad_whey_baunilha_01')!;

      // Frequência elevada (fadiga de base)
      expect(namoradosAd.frequency).toBe(2.65);
      expect(namoradosAd.frequency).toBeGreaterThan(wheyAd.frequency * 1.8);

      // CTR em queda
      expect(namoradosAd.ctr).toBeLessThan(0.012);
      expect(namoradosAd.ctr).toBeLessThan(wheyAd.ctr * 0.6);

      // Custo por clique inflacionado
      expect(namoradosAd.cpc_brl).toBe(5.449438);
      expect(namoradosAd.cpc_brl).toBeGreaterThan(wheyAd.cpc_brl * 2.5);

      // Hook rate de 3 segundos com baixa retenção
      expect(namoradosAd.hook_rate_3s).toBeLessThan(0.2);

      // Avaliação independente da metodologia (App) corrobora a saturação
      const creativeAppEval = RAW_ANALISE_CRIATIVOS_DATA.creatives.find(
        (c) => c.ad_id === 'ad_namorados_casal_03'
      );
      expect(creativeAppEval?.recommendation).toBe('PAUSAR');
      expect(creativeAppEval?.hook_score).toBeLessThan(5.0);
    });

    it('Problema 3 (Divergência de Origem / Atribuição): Inferível por comparação entre utm_source e origem_declarada', () => {
      const dealsWithDeclaredOrigin = RAW_CRM_LEADS_DATA.deals.filter(
        (d) => d.origem_declarada !== undefined
      );

      expect(dealsWithDeclaredOrigin.length).toBeGreaterThan(0);

      // Encontrando divergências concretas (ex: clique via Meta Ads mas cliente declara Indicação ou Google)
      const divergentDeals = dealsWithDeclaredOrigin.filter(
        (d) =>
          d.utm_source === 'meta_ads' &&
          (d.origem_declarada.includes('Indicação') || d.origem_declarada.includes('Google'))
      );

      expect(divergentDeals.length).toBeGreaterThanOrEqual(2);

      // Deal específico deal_hw_1005: utm_source meta_ads vs declaração Indicação de Amigo
      const deal1005 = RAW_CRM_LEADS_DATA.deals.find((d) => d.deal_id === 'deal_hw_1005');
      expect(deal1005).toBeDefined();
      expect(deal1005?.utm_source).toBe('meta_ads');
      expect(deal1005?.origem_declarada).toBe('Indicação de Amigo');
    });

    it('Problema 4 (Governança & Aprovação Travada): Inferível por arestas de autoridade e histórico de governança', () => {
      // 1. Grafo: Quem tem poder de autorização (APPROVES)?
      const approverEdges = RAW_GRAPH_DATA.edges.filter((e) => e.rel === 'APPROVES');
      const approverIds = new Set(approverEdges.map((e) => e.from));

      expect(approverIds.has('p_marcos')).toBe(true);
      expect(approverIds.has('p_aline')).toBe(false);
      expect(approverIds.has('p_carolina')).toBe(false);

      // 2. Timeline: Proposta pendente formalizada no evento evt_tl_07
      const pendingApprovalEvent = RAW_TIMELINE_DATA.events.find((e) => e.event_id === 'evt_tl_07');
      expect(pendingApprovalEvent).toBeDefined();
      expect(pendingApprovalEvent?.title).toContain('encaminhada para aprovação');
      expect(pendingApprovalEvent?.summary).toContain('formaliza junto a Marcos Silva');
      expect(pendingApprovalEvent?.actor_ids).toContain('p_marcos');

      // 3. Conversas: Mensagem expressa de Marcos exigindo aprovação prévia
      const thread = RAW_CONVERSAS_DATA.whatsapp_threads[0];
      expect(thread).toBeDefined();
      const marcosMsg = thread?.messages.find((m) => m.sender_id === 'p_marcos');
      expect(marcosMsg).toBeDefined();
      expect(marcosMsg?.content).toContain(
        'precisa passar pelo fluxo formal de proposta e aprovação'
      );
    });

    it('Problema 5 (Spend Incompatível / Desvio de Budget Diário): Inferível por cálculo de spend diário vs teto contratado', () => {
      const namoradosCampaign = RAW_META_ADS_DATA.campaigns.find(
        (c) => c.campaign_id === 'camp_namorados'
      );
      expect(namoradosCampaign).toBeDefined();

      const plannedDailyBudget = namoradosCampaign!.budget_daily_brl;
      expect(plannedDailyBudget).toBe(350.0);

      // Período de veiculação: Ativação em 08/08 (evt_tl_04) até 20/08 = 12 dias
      const activeDays = 12;
      const totalSpend = namoradosCampaign!.ads.reduce((sum, a) => sum + a.spend_brl, 0);
      expect(totalSpend).toBe(4850.0);

      const actualDailySpend = totalSpend / activeDays;
      expect(actualDailySpend).toBeCloseTo(404.17, 2);

      // Desvio percentual positivo (estouro de verba diária)
      const budgetDeviationPercent =
        ((actualDailySpend - plannedDailyBudget) / plannedDailyBudget) * 100;
      expect(budgetDeviationPercent).toBeCloseTo(15.48, 1);
      expect(actualDailySpend).toBeGreaterThan(plannedDailyBudget);
    });
  });
});
