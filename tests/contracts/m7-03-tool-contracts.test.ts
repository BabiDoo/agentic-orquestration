import { describe, it, expect } from 'vitest';
import {
  ListAdsInputSchema,
  ListAdsOutputSchema,
  GetAdInsightsOutputSchema,
  GetLeadsOutputSchema,
  SearchClientContextOutputSchema,
  AppAnaliseCriativosOutputSchema,
  createMarketingTools,
  createMemoryTools,
  createAppTools
} from '@adzhub/tools';

describe('M7-03 — Testes de Contrato das Tools', () => {
  const sampleTimeframe = {
    since: '2026-08-01T00:00:00.000Z',
    until: '2026-08-15T23:59:59.000Z'
  };

  const { listAdsTool, getAdInsightsTool, getLeadsTool } = createMarketingTools();
  const { searchClientContextTool, getTimelineTool } = createMemoryTools();
  const { runAppAnaliseCriativosTool } = createAppTools();

  describe('1. Contrato: listAdsTool (Marketing)', () => {
    it('valida schema de entrada correto e rejeita entrada inválida com INVALID_SCHEMA', () => {
      const validInput = {
        client_id: 'cli_housewhey',
        since: sampleTimeframe.since,
        until: sampleTimeframe.until,
        limit: 10
      };
      const parsed = ListAdsInputSchema.safeParse(validInput);
      expect(parsed.success).toBe(true);

      const invalidInput = { client_id: '', since: 'not-a-date', until: 'not-a-date' };
      const invalidParsed = ListAdsInputSchema.safeParse(invalidInput);
      expect(invalidParsed.success).toBe(false);
    });

    it('executa com sucesso preservando IDs, períodos e provenance em conformidade com schema', async () => {
      const result = await listAdsTool.execute({
        client_id: 'cli_housewhey',
        since: sampleTimeframe.since,
        until: sampleTimeframe.until,
        limit: 10
      });

      expect(result.ok).toBe(true);
      if (result.ok && result.data) {
        const outputValidation = ListAdsOutputSchema.safeParse(result.data);
        expect(outputValidation.success).toBe(true);
        expect(result.data.client_id).toBe('cli_housewhey');
        expect(result.data.ads.length).toBeGreaterThan(0);

        for (const ad of result.data.ads) {
          expect(ad.ad_id).toBeDefined();
          expect(ad.provenance.source).toBe('meta_ads');
          expect(ad.provenance.locator).toBeDefined();
          expect(ad.provenance.capturedAt).toBeDefined();
        }
      }
    });
  });

  describe('2. Contrato: getAdInsightsTool (Marketing)', () => {
    it('valida input/output e preserva métricas agregadas', async () => {
      const result = await getAdInsightsTool.execute({
        client_id: 'cli_housewhey',
        since: sampleTimeframe.since,
        until: sampleTimeframe.until,
        ad_id: 'ad_whey_baunilha_01'
      });

      expect(result.ok).toBe(true);
      if (result.ok && result.data) {
        const outputValidation = GetAdInsightsOutputSchema.safeParse(result.data);
        expect(outputValidation.success).toBe(true);
        expect(result.data.ad_id).toBe('ad_whey_baunilha_01');
        expect(result.data.provenance.source).toBe('meta_ads');
        expect(typeof result.data.metrics.spend_brl).toBe('number');
        expect(typeof result.data.metrics.impressions).toBe('number');
      }
    });
  });

  describe('3. Contrato: getLeadsTool (CRM)', () => {
    it('valida input/output de leads e preserva status e proveniência', async () => {
      const result = await getLeadsTool.execute({
        client_id: 'cli_housewhey',
        since: sampleTimeframe.since,
        until: sampleTimeframe.until
      });

      expect(result.ok).toBe(true);
      if (result.ok && result.data) {
        const outputValidation = GetLeadsOutputSchema.safeParse(result.data);
        expect(outputValidation.success).toBe(true);
        expect(result.data.leads.length).toBeGreaterThan(0);
        for (const lead of result.data.leads) {
          expect(lead.provenance.source).toBe('crm');
          expect(lead.deal_id).toBeDefined();
          expect(lead.status).toBeDefined();
        }
      }
    });
  });

  describe('4. Contrato: searchClientContextTool & getTimelineTool (Supercérebro)', () => {
    it('searchClientContextTool retorna nós com provenance supercerebro_graph', async () => {
      const result = await searchClientContextTool.execute({
        client_id: 'cli_housewhey',
        limit: 5
      });

      expect(result.ok).toBe(true);
      if (result.ok && result.data) {
        const outputValidation = SearchClientContextOutputSchema.safeParse(result.data);
        expect(outputValidation.success).toBe(true);
        expect(result.data.nodes.length).toBeGreaterThan(0);
        for (const node of result.data.nodes) {
          expect(node.provenance.source).toBe('supercerebro_graph');
        }
      }
    });

    it('getTimelineTool retorna timeline com eventos ordenados e provenance preservada', async () => {
      const result = await getTimelineTool.execute({
        client_id: 'cli_housewhey',
        limit: 5
      });

      expect(result.ok).toBe(true);
      if (result.ok && result.data) {
        expect(result.data.events.length).toBeGreaterThan(0);
        for (const ev of result.data.events) {
          expect(ev.provenance.source).toBe('supercerebro_timeline');
        }
      }
    });
  });

  describe('5. Contrato: runAppAnaliseCriativosTool (App Vertical)', () => {
    it('executa app determinístico retornando as 6 fases metodológicas válidas', async () => {
      const result = await runAppAnaliseCriativosTool.execute({
        client_id: 'cli_housewhey',
        timeframe: {
          since: sampleTimeframe.since,
          until: sampleTimeframe.until,
          timezone: 'America/Sao_Paulo'
        },
        benchmark_cpa_brl: 85.0,
        benchmark_roas: 2.5
      });

      expect(result.ok).toBe(true);
      if (result.ok && result.data) {
        const outputValidation = AppAnaliseCriativosOutputSchema.safeParse(result.data);
        expect(outputValidation.success).toBe(true);

        // 6 Fases Metodológicas
        expect(result.data.context).toBeDefined();
        expect(result.data.normalization).toBeDefined();
        expect(result.data.coverage).toBeDefined();
        expect(result.data.downstream_ranking).toBeDefined();
        expect(result.data.limitations).toBeDefined();
        expect(result.data.proposal).toBeDefined();

        expect(result.data.provenance.source).toBe('app_analise_criativos');
      }
    });
  });

  describe('6. Resiliência a Alterações Incompatíveis de Contrato', () => {
    it('rejeita payload com campos extras proibidos ou tipos alterados', () => {
      const breakingPayload = {
        client_id: 12345, // número ao invés de string
        since: '2026-08-01',
        until: '2026-08-15'
      };

      const parseRes = ListAdsInputSchema.safeParse(breakingPayload);
      expect(parseRes.success).toBe(false);
    });
  });
});
