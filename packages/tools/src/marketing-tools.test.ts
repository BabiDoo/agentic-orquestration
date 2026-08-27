import { describe, expect, it } from 'vitest';
import { createMarketingTools } from './index.js';

describe('Meta Ads & CRM Tools (M2-03)', () => {
  const timeframe = {
    since: '2026-08-01T00:00:00.000Z',
    until: '2026-08-20T23:59:59.000Z'
  };

  const { listAdsTool, getAdInsightsTool, getLeadsTool } = createMarketingTools();

  describe('list_ads', () => {
    it('lista anúncios preservando ad_id, utm_content e provenance', async () => {
      const result = await listAdsTool.execute({
        client_id: 'cli_housewhey',
        since: timeframe.since,
        until: timeframe.until,
        limit: 10
      });

      expect(result.ok).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.client_id).toBe('cli_housewhey');
      expect(result.data?.ads.length).toBeGreaterThan(0);

      for (const ad of result.data!.ads) {
        expect(ad.ad_id).toBeDefined();
        expect(ad.utm_content).toBeDefined();
        expect(ad.utm_content.length).toBeGreaterThan(0);
        expect(ad.provenance).toEqual({
          source: 'meta_ads',
          locator: `meta:ad:${ad.ad_id}`,
          capturedAt: expect.any(String)
        });
      }
    });

    it('filtra anúncios por campaign_id', async () => {
      const result = await listAdsTool.execute({
        client_id: 'cli_housewhey',
        since: timeframe.since,
        until: timeframe.until,
        campaign_id: 'camp_whey_isolado'
      });

      expect(result.ok).toBe(true);
      expect(result.data?.ads.length).toBeGreaterThan(0);
      expect(result.data?.ads.every((a) => a.campaign_id === 'camp_whey_isolado')).toBe(true);
    });

    it('rejeita chamada com período ou client_id ausente', async () => {
      const result = await listAdsTool.execute({
        client_id: 'cli_housewhey'
      });

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('INVALID_SCHEMA');
      expect(result.error).toContain('since');
      expect(result.error).toContain('until');
    });

    it('rejeita período invertido (since > until)', async () => {
      const result = await listAdsTool.execute({
        client_id: 'cli_housewhey',
        since: '2026-08-25T00:00:00.000Z',
        until: '2026-08-01T00:00:00.000Z'
      });

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('TOOL_ERROR');
      expect(result.error).toContain('Período inválido');
    });
  });

  describe('get_ad_insights', () => {
    it('retorna métricas detalhadas preservando ad_id e utm_content', async () => {
      const result = await getAdInsightsTool.execute({
        client_id: 'cli_housewhey',
        since: timeframe.since,
        until: timeframe.until,
        ad_id: 'ad_whey_baunilha_01'
      });

      expect(result.ok).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.ad_id).toBe('ad_whey_baunilha_01');
      expect(result.data?.utm_content).toBe('ad_whey_baunilha_01');
      expect(result.data?.metrics.spend_brl).toBe(4250.0);
      expect(result.data?.metrics.clicks).toBe(2150);
      expect(result.data?.metrics.ctr).toBeGreaterThan(0);
      expect(result.data?.provenance.source).toBe('meta_ads');
    });

    it('retorna erro tipado quando ad_id não existe na conta', async () => {
      const result = await getAdInsightsTool.execute({
        client_id: 'cli_housewhey',
        since: timeframe.since,
        until: timeframe.until,
        ad_id: 'ad_inexistente_999'
      });

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('TOOL_ERROR');
      expect(result.error).toContain("Anúncio com ad_id 'ad_inexistente_999' não foi encontrado");
    });
  });

  describe('get_leads', () => {
    it('retorna leads preservando origem declarada e UTMs', async () => {
      const result = await getLeadsTool.execute({
        client_id: 'cli_housewhey',
        since: timeframe.since,
        until: timeframe.until,
        limit: 50
      });

      expect(result.ok).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.client_id).toBe('cli_housewhey');
      expect(result.data?.leads.length).toBeGreaterThan(0);
      expect(result.data?.summary.matched_deals_count).toBeGreaterThan(0);
      expect(result.data?.summary.matched_sales_count).toBeGreaterThan(0);
      expect(result.data?.summary.matched_revenue_brl).toBeGreaterThan(0);

      // Checa preservação de origem declarada e UTMs
      const leadWithOrigin = result.data?.leads.find((l) => l.origem_declarada);
      expect(leadWithOrigin).toBeDefined();
      expect(typeof leadWithOrigin?.origem_declarada).toBe('string');
      expect(typeof leadWithOrigin?.utm_content).toBe('string');
      expect(leadWithOrigin?.provenance.source).toBe('crm');
    });

    it('filtra leads por utm_content específico', async () => {
      const result = await getLeadsTool.execute({
        client_id: 'cli_housewhey',
        since: timeframe.since,
        until: timeframe.until,
        utm_content: 'ad_whey_baunilha_01'
      });

      expect(result.ok).toBe(true);
      expect(result.data?.leads.length).toBeGreaterThan(0);
      expect(result.data?.leads.every((l) => l.utm_content === 'ad_whey_baunilha_01')).toBe(true);
    });

    it('rejeita parâmetros obrigatórios ausentes', async () => {
      const result = await getLeadsTool.execute({
        client_id: 'cli_housewhey'
      });

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('INVALID_SCHEMA');
    });
  });

  describe('Cenário S1 (CRM Indisponível)', () => {
    const s1Tools = createMarketingTools({ scenario: 'S1' });

    it('simula CRM indisponível em get_leads sem afetar Meta Ads', async () => {
      // 1. Chamada a get_leads falha com erro simulado de CRM indisponível
      const crmResult = await s1Tools.getLeadsTool.execute({
        client_id: 'cli_housewhey',
        since: timeframe.since,
        until: timeframe.until
      });

      expect(crmResult.ok).toBe(false);
      expect(crmResult.errorCode).toBe('TOOL_ERROR');
      expect(crmResult.error).toContain('S1: CRM_UNAVAILABLE');
      expect(crmResult.error).toContain('503');

      // 2. list_ads continua funcionando perfeitamente
      const metaListResult = await s1Tools.listAdsTool.execute({
        client_id: 'cli_housewhey',
        since: timeframe.since,
        until: timeframe.until
      });
      expect(metaListResult.ok).toBe(true);
      expect(metaListResult.data?.ads.length).toBeGreaterThan(0);

      // 3. get_ad_insights continua funcionando perfeitamente
      const metaInsightsResult = await s1Tools.getAdInsightsTool.execute({
        client_id: 'cli_housewhey',
        since: timeframe.since,
        until: timeframe.until,
        ad_id: 'ad_whey_baunilha_01'
      });
      expect(metaInsightsResult.ok).toBe(true);
      expect(metaInsightsResult.data?.ad_id).toBe('ad_whey_baunilha_01');
    });
  });

  describe('OpenAI Function Schemas', () => {
    it('gera schemas de função válidos para OpenAI / OpenRouter', () => {
      const listAdsSchema = listAdsTool.toOpenAISchema();
      const insightsSchema = getAdInsightsTool.toOpenAISchema();
      const leadsSchema = getLeadsTool.toOpenAISchema();

      expect(listAdsSchema.function.name).toBe('list_ads');
      expect(insightsSchema.function.name).toBe('get_ad_insights');
      expect(leadsSchema.function.name).toBe('get_leads');

      expect(listAdsSchema.type).toBe('function');
      expect(insightsSchema.type).toBe('function');
      expect(leadsSchema.type).toBe('function');
    });
  });

  describe('ÉPICO 5: Tools Operacionais e Idempotência (CAMPAIGN_OPERATION)', () => {
    const { updateBudgetTool, pauseAdTool, reactivateAdTool, getAdTool } = createMarketingTools();

    it('executa meta.update_budget com snapshot anterior e garantia de idempotência (Invariantes 2 e 7)', async () => {
      const idempotencyKey = 'idem_upd_budget_001';

      // 1. Primeira execução
      const result1 = await updateBudgetTool.execute({
        client_id: 'cli_housewhey',
        ad_id: 'ad_whey_baunilha_01',
        daily_budget_brl: 175.0,
        idempotency_key: idempotencyKey
      });

      expect(result1.ok).toBe(true);
      expect(result1.data?.operation).toBe('UPDATE_BUDGET');
      expect(result1.data?.ad_id).toBe('ad_whey_baunilha_01');
      expect(result1.data?.previous_state_snapshot.daily_budget_brl).toBeGreaterThan(0);
      expect(result1.data?.current_state.daily_budget_brl).toBe(175.0);
      expect(result1.data?.idempotency_key).toBe(idempotencyKey);

      // 2. Replay idempotente com a mesma chave e mesmos parâmetros
      const result2 = await updateBudgetTool.execute({
        client_id: 'cli_housewhey',
        ad_id: 'ad_whey_baunilha_01',
        daily_budget_brl: 175.0,
        idempotency_key: idempotencyKey
      });

      expect(result2.ok).toBe(true);
      expect(result2.data).toEqual(result1.data);

      // 3. Releitura com meta.get_ad confirma novo orçamento
      const liveAd = await getAdTool.execute({
        client_id: 'cli_housewhey',
        ad_id: 'ad_whey_baunilha_01'
      });
      expect(liveAd.ok).toBe(true);
      expect(liveAd.data?.daily_budget_brl).toBe(175.0);
    });

    it('rejeita com IDEMPOTENCY_CONFLICT se a mesma chave for reenviada com parâmetros divergentes', async () => {
      const conflictKey = 'idem_conflict_key_999';

      await updateBudgetTool.execute({
        client_id: 'cli_housewhey',
        ad_id: 'ad_whey_baunilha_01',
        daily_budget_brl: 120.0,
        idempotency_key: conflictKey
      });

      // Tentativa de reusar a mesma chave com valor diferente (R$ 200,00)
      const conflictResult = await updateBudgetTool.execute({
        client_id: 'cli_housewhey',
        ad_id: 'ad_whey_baunilha_01',
        daily_budget_brl: 200.0,
        idempotency_key: conflictKey
      });

      expect(conflictResult.ok).toBe(false);
      expect(conflictResult.error).toContain('IDEMPOTENCY_CONFLICT');
    });

    it('executa meta.pause_ad e permite releitura ativa via meta.get_ad (Invariante 8)', async () => {
      const pauseKey = 'idem_pause_casal_03';

      const pauseResult = await pauseAdTool.execute({
        client_id: 'cli_housewhey',
        ad_id: 'ad_namorados_casal_03',
        reason: 'CPA estourado e fadiga de gancho',
        idempotency_key: pauseKey
      });

      expect(pauseResult.ok).toBe(true);
      expect(pauseResult.data?.operation).toBe('PAUSE');
      expect(pauseResult.data?.current_state.status).toBe('PAUSED');
      expect(pauseResult.data?.previous_state_snapshot.status).toBeDefined();

      // Releitura ativa com meta.get_ad
      const liveRead = await getAdTool.execute({
        client_id: 'cli_housewhey',
        ad_id: 'ad_namorados_casal_03'
      });

      expect(liveRead.ok).toBe(true);
      expect(liveRead.data?.status).toBe('PAUSED');
    });

    it('executa meta.reactivate_ad para viabilizar rollback determinístico (Invariante 7)', async () => {
      const reactivateKey = 'idem_reactivate_01';

      const reactivateResult = await reactivateAdTool.execute({
        client_id: 'cli_housewhey',
        ad_id: 'ad_namorados_casal_03',
        idempotency_key: reactivateKey
      });

      expect(reactivateResult.ok).toBe(true);
      expect(reactivateResult.data?.operation).toBe('REACTIVATE');
      expect(reactivateResult.data?.current_state.status).toBe('ACTIVE');

      // Releitura ativa confirma status ACTIVE
      const liveRead = await getAdTool.execute({
        client_id: 'cli_housewhey',
        ad_id: 'ad_namorados_casal_03'
      });

      expect(liveRead.ok).toBe(true);
      expect(liveRead.data?.status).toBe('ACTIVE');
    });
  });
});
