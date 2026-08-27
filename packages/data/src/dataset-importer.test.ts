import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  importRawDataset,
  getCanonicalNormalizedDataset,
  computeNormalizedDatasetHash,
  validateRawDatasetFiles,
  getCanonicalRawJsonMap,
  exportNormalizedDatasetToDisk,
  reconcileMetaAdsAndCrm,
  RAW_META_ADS_DATA,
  RAW_CRM_LEADS_DATA,
  RAW_ANALISE_CRIATIVOS_DATA
} from './index.js';

describe('@adzhub/data - M1-05: Importador e Modelo Canônico Normalizado', () => {
  const rawMap = getCanonicalRawJsonMap();

  describe('1. Validação de Schema de todos os arquivos', () => {
    it('deve validar com sucesso os 7 arquivos brutos canônicos (S0)', () => {
      const validation = validateRawDatasetFiles(rawMap);
      expect(validation.valid).toBe(true);
      expect(validation.dataset).toBeDefined();
      expect(Object.keys(validation.errors).length).toBe(0);

      expect(validation.dataset?.graph.client_id).toBe('cli_housewhey');
      expect(validation.dataset?.metaAds.account_id).toBe('act_housewhey_9921');
      expect(validation.dataset?.crmLeads.deals.length).toBeGreaterThan(0);
      expect(validation.dataset?.analiseCriativos.creatives.length).toBe(4);
    });

    it('deve rejeitar e reportar erro se algum arquivo obrigatório estiver ausente', () => {
      const incompleteMap = { ...rawMap };
      delete (incompleteMap as Record<string, string | undefined>)['api_crm_leads.json'];

      const validation = validateRawDatasetFiles(incompleteMap);
      expect(validation.valid).toBe(false);
      expect(validation.errors['api_crm_leads.json']).toBeDefined();
      expect(validation.errors['api_crm_leads.json']![0]).toContain(
        'Arquivo obrigatório não encontrado'
      );
    });

    it('deve rejeitar e reportar erro se um arquivo contiver JSON corrompido', () => {
      const corruptMap = {
        ...rawMap,
        'supercerebro_timeline.json': '{ "invalido": true, ' // JSON quebrado
      };

      const validation = validateRawDatasetFiles(corruptMap);
      expect(validation.valid).toBe(false);
      expect(validation.errors['supercerebro_timeline.json']).toBeDefined();
      expect(validation.errors['supercerebro_timeline.json']![0]).toContain('Erro de sintaxe JSON');
    });

    it('deve rejeitar se violar os tipos ou campos obrigatórios do schema Zod', () => {
      const invalidData = JSON.parse(rawMap['api_meta_ads.json']!);
      invalidData.currency = 'USD'; // Viola z.literal('BRL')
      invalidData.summary.total_spend_brl = -500; // Viola z.number().nonnegative()

      const invalidMap = {
        ...rawMap,
        'api_meta_ads.json': JSON.stringify(invalidData)
      };

      const validation = validateRawDatasetFiles(invalidMap);
      expect(validation.valid).toBe(false);
      expect(validation.errors['api_meta_ads.json']).toBeDefined();
      expect(validation.errors['api_meta_ads.json']!.length).toBeGreaterThan(0);
    });
  });

  describe('2. Geração determinística de data/normalized', () => {
    it('deve executar o pipeline completo e gerar o NormalizedDataset com sucesso', () => {
      const result = importRawDataset(rawMap);
      expect(result.success).toBe(true);
      expect(result.dataset).toBeDefined();

      const dataset = result.dataset!;
      expect(dataset.schemaVersion).toBe('1.0.0');
      expect(dataset.tenantId).toBe('tenant_spot');
      expect(dataset.clientId).toBe('cli_housewhey');
      expect(dataset.globalHash).toHaveLength(64);
      expect(dataset.joinedPerformance).toHaveLength(4);
    });

    it('deve retornar a instância canônica e em memória via getCanonicalNormalizedDataset', () => {
      const canonical = getCanonicalNormalizedDataset();
      expect(canonical).toBeDefined();
      expect(canonical.joinedPerformance.length).toBe(4);
      expect(canonical.joinSummary.total_ads).toBe(4);
    });

    it('deve exportar os arquivos normalizados para disco corretamente', () => {
      const dataset = getCanonicalNormalizedDataset();
      const outputDir = path.join(process.cwd(), 'node_modules', '.cache', 'test_data_normalized');

      const exportMap = exportNormalizedDatasetToDisk(dataset, outputDir);
      expect(Object.keys(exportMap)).toContain('normalized_dataset.json');
      expect(Object.keys(exportMap)).toContain('joined_performance.json');
      expect(Object.keys(exportMap)).toContain('join_summary.json');

      expect(fs.existsSync(path.join(outputDir, 'normalized_dataset.json'))).toBe(true);

      // Limpeza
      fs.rmSync(outputDir, { recursive: true, force: true });
    });
  });

  describe('3. Join por tenant, client, UTM normalizada e conformidade temporal', () => {
    it('deve reconciliar e cruzar dados de anúncios com transações reais de CRM', () => {
      const result = importRawDataset(rawMap);
      expect(result.success).toBe(true);
      const dataset = result.dataset!;

      // 1. Criativo de Namorados (ad_namorados_casal_03)
      const namoradosJoined = dataset.joinedPerformance.find(
        (j) => j.ad_id === 'ad_namorados_casal_03'
      );
      expect(namoradosJoined).toBeDefined();
      expect(namoradosJoined!.spend_brl).toBe(4850.0);
      expect(namoradosJoined!.sales_count).toBe(3);
      expect(namoradosJoined!.revenue_brl).toBe(720.0);
      expect(namoradosJoined!.creative_evaluation?.recommendation).toBe('PAUSAR');

      // 2. Criativo de Whey Baunilha (ad_whey_baunilha_01)
      const wheyJoined = dataset.joinedPerformance.find((j) => j.ad_id === 'ad_whey_baunilha_01');
      expect(wheyJoined).toBeDefined();
      expect(wheyJoined!.spend_brl).toBe(4250.0);
      expect(wheyJoined!.sales_count).toBeGreaterThanOrEqual(5);
      expect(wheyJoined!.creative_evaluation?.recommendation).toBe('SEGUIR');

      // 3. Criativo de Ômega 3 (ad_omega3_alta_conc_02)
      const omegaJoined = dataset.joinedPerformance.find(
        (j) => j.ad_id === 'ad_omega3_alta_conc_02'
      );
      expect(omegaJoined).toBeDefined();
      expect(omegaJoined!.creative_evaluation?.recommendation).toBe('VARIAR');
    });

    it('deve detectar divergências de atribuição entre UTM técnica e origem declarada', () => {
      const result = importRawDataset(rawMap);
      const dataset = result.dataset!;

      expect(dataset.joinSummary.divergent_deals_count).toBeGreaterThanOrEqual(2);

      // Verificando divergência de indicação (REFERRAL_VS_PAID)
      const referralDiv = dataset.joinedPerformance
        .flatMap((j) => j.divergences)
        .find((div) => div.deal_id === 'deal_hw_1005');
      expect(referralDiv).toBeDefined();
      expect(referralDiv!.divergence_type).toBe('REFERRAL_VS_PAID');

      // Verificando divergência de Google Search (SEARCH_VS_PAID)
      const searchDiv = dataset.joinedPerformance
        .flatMap((j) => j.divergences)
        .find((div) => div.deal_id === 'deal_hw_1010');
      expect(searchDiv).toBeDefined();
      expect(searchDiv!.divergence_type).toBe('SEARCH_VS_PAID');
    });

    it('deve rejeitar join em tentativa de cruzamento cross-tenant ou cross-client', () => {
      const crossTenantMeta = {
        ...RAW_META_ADS_DATA,
        currency: 'BRL' as const,
        tenant_id: 'tenant_outro'
      };

      expect(() => {
        reconcileMetaAdsAndCrm(crossTenantMeta, RAW_CRM_LEADS_DATA, RAW_ANALISE_CRIATIVOS_DATA, {
          strictTenantCheck: true
        });
      }).toThrow('Violação de isolamento multi-tenant');

      const crossClientMeta = {
        ...RAW_META_ADS_DATA,
        currency: 'BRL' as const,
        client_id: 'cli_outro'
      };

      expect(() => {
        reconcileMetaAdsAndCrm(crossClientMeta, RAW_CRM_LEADS_DATA, RAW_ANALISE_CRIATIVOS_DATA, {
          strictTenantCheck: true
        });
      }).toThrow('Violação de isolamento de cliente');
    });
  });

  describe('4. Repetibilidade de hash estável em múltiplas reexecuções', () => {
    it('deve gerar exatamente o mesmo hash global em 10 execuções consecutivas com a mesma entrada', () => {
      const firstResult = importRawDataset(rawMap);
      const expectedHash = firstResult.dataset!.globalHash;

      // Verificando função de cálculo direto
      const computedHash = computeNormalizedDatasetHash(firstResult.dataset!);
      expect(computedHash).toBe(expectedHash);

      for (let i = 0; i < 10; i++) {
        const repeatResult = importRawDataset(rawMap);
        expect(repeatResult.dataset!.globalHash).toBe(expectedHash);
      }
    });

    it('qualquer alteração no dado de entrada deve alterar o hash determinístico', () => {
      const modifiedCrm = JSON.parse(rawMap['api_crm_leads.json']!);
      modifiedCrm.deals[0].value_brl += 10.0; // Altera 1 valor de deal

      const modifiedMap = {
        ...rawMap,
        'api_crm_leads.json': JSON.stringify(modifiedCrm)
      };

      const originalHash = importRawDataset(rawMap).dataset!.globalHash;
      const modifiedHash = importRawDataset(modifiedMap).dataset!.globalHash;

      expect(modifiedHash).not.toBe(originalHash);
      expect(modifiedHash).toHaveLength(64);
    });
  });

  describe('5. Substituibilidade do dataset bruto oficial', () => {
    it('deve processar dataset alternativo/customizado sem alteração no código do runtime', () => {
      const customMetaAds = {
        ...RAW_META_ADS_DATA,
        account_id: 'act_custom_001',
        campaigns: [
          {
            campaign_id: 'camp_custom_01',
            campaign_name: 'Campanha Teste Customizada',
            objective: 'OUTCOME_SALES',
            status: 'ACTIVE' as const,
            budget_daily_brl: 500.0,
            ads: [
              {
                ad_id: 'ad_custom_01',
                ad_name: 'Anúncio Customizado 01',
                spend_brl: 1200.0,
                impressions: 25000,
                clicks: 600,
                ctr: 0.024,
                cpc_brl: 2.0,
                cpm_brl: 48.0,
                frequency: 1.2,
                utm_source: 'meta_ads',
                utm_medium: 'cpc',
                utm_campaign: 'camp_custom_01',
                utm_content: 'ad_custom_01',
                status: 'ACTIVE' as const
              }
            ]
          }
        ]
      };

      const customCrm = {
        ...RAW_CRM_LEADS_DATA,
        deals: [
          {
            deal_id: 'deal_custom_101',
            created_at: '2026-08-10T12:00:00.000Z',
            customer_name: 'Cliente Teste',
            customer_email: 'cliente.teste@example.com',
            status: 'venda' as const,
            value_brl: 300.0,
            utm_source: 'meta_ads',
            utm_medium: 'cpc',
            utm_campaign: 'camp_custom_01',
            utm_content: 'ad_custom_01',
            origem_declarada: 'Instagram'
          }
        ]
      };

      const customMap = {
        ...rawMap,
        'api_meta_ads.json': JSON.stringify(customMetaAds),
        'api_crm_leads.json': JSON.stringify(customCrm)
      };

      const customResult = importRawDataset(customMap);
      expect(customResult.success).toBe(true);
      expect(customResult.dataset?.joinedPerformance).toHaveLength(1);
      expect(customResult.dataset?.joinedPerformance[0]?.ad_id).toBe('ad_custom_01');
      expect(customResult.dataset?.joinedPerformance[0]?.sales_count).toBe(1);
      expect(customResult.dataset?.joinedPerformance[0]?.revenue_brl).toBe(300.0);
    });
  });
});
