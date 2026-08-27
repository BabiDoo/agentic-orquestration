import { describe, it, expect } from 'vitest';
import {
  RAW_GRAPH_DATA,
  RAW_TIMELINE_DATA,
  RAW_META_ADS_DATA,
  RAW_CRM_LEADS_DATA,
  RAW_ANALISE_CRIATIVOS_DATA,
  RAW_MAPA_SOLUCAO_DATA,
  RAW_CONVERSAS_DATA,
  getCanonicalRawJsonMap
} from './raw-fixtures.js';
import {
  createDefaultHousewheyManifest,
  verifyDatasetManifestIntegrity,
  CANONICAL_RAW_FILES_SPEC
} from './manifest.js';

describe('@adzhub/data - M1-02: Dataset Bruto Housewhey (S0)', () => {
  const ISO_8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

  it('1. Deve validar formatos: JSON UTF-8, datas ISO-8601 e valores numéricos em BRL', () => {
    const rawMap = getCanonicalRawJsonMap();

    for (const spec of CANONICAL_RAW_FILES_SPEC) {
      const content = rawMap[spec.filename];
      expect(content).toBeDefined();
      if (content) {
        expect(() => JSON.parse(content)).not.toThrow();
      }
    }

    // Validação de datas ISO-8601
    expect(RAW_GRAPH_DATA.generated_at).toMatch(ISO_8601_REGEX);
    expect(RAW_TIMELINE_DATA.generated_at).toMatch(ISO_8601_REGEX);
    expect(RAW_TIMELINE_DATA.events.every((e) => ISO_8601_REGEX.test(e.occurred_at))).toBe(true);
    expect(RAW_META_ADS_DATA.timeframe.since).toMatch(ISO_8601_REGEX);
    expect(RAW_META_ADS_DATA.timeframe.until).toMatch(ISO_8601_REGEX);
    expect(RAW_CRM_LEADS_DATA.deals.every((d) => ISO_8601_REGEX.test(d.created_at))).toBe(true);

    // Validação monetária em BRL
    expect(RAW_META_ADS_DATA.currency).toBe('BRL');
    expect(RAW_CRM_LEADS_DATA.currency).toBe('BRL');
    expect(RAW_META_ADS_DATA.summary.total_spend_brl).toBeGreaterThan(0);
    expect(
      RAW_CRM_LEADS_DATA.deals.every((d) => typeof d.value_brl === 'number' && d.value_brl >= 0)
    ).toBe(true);
  });

  it('2. Deve conter escopo restrito a um único tenant/cliente demonstrável: SPOT/Housewhey', () => {
    const expectedClient = 'cli_housewhey';
    const expectedTenant = 'tenant_spot';

    expect(RAW_GRAPH_DATA.client_id).toBe(expectedClient);
    expect(RAW_GRAPH_DATA.tenant_id).toBe(expectedTenant);

    expect(RAW_TIMELINE_DATA.client_id).toBe(expectedClient);
    expect(RAW_TIMELINE_DATA.tenant_id).toBe(expectedTenant);

    expect(RAW_META_ADS_DATA.client_id).toBe(expectedClient);
    expect(RAW_META_ADS_DATA.tenant_id).toBe(expectedTenant);

    expect(RAW_CRM_LEADS_DATA.client_id).toBe(expectedClient);
    expect(RAW_CRM_LEADS_DATA.tenant_id).toBe(expectedTenant);

    expect(RAW_ANALISE_CRIATIVOS_DATA.client_id).toBe(expectedClient);
    expect(RAW_ANALISE_CRIATIVOS_DATA.tenant_id).toBe(expectedTenant);

    expect(RAW_MAPA_SOLUCAO_DATA.client_id).toBe(expectedClient);
    expect(RAW_MAPA_SOLUCAO_DATA.tenant_id).toBe(expectedTenant);

    expect(RAW_CONVERSAS_DATA.client_id).toBe(expectedClient);
    expect(RAW_CONVERSAS_DATA.tenant_id).toBe(expectedTenant);
  });

  it('3. Pessoas do grafo devem aparecer de forma consistente na timeline e nas conversas', () => {
    const personNodes = RAW_GRAPH_DATA.nodes.filter((n) => n.type === 'person');
    const personIds = personNodes.map((n) => n.id);

    expect(personIds).toContain('p_aline');
    expect(personIds).toContain('p_carolina');
    expect(personIds).toContain('p_luiza');
    expect(personIds).toContain('p_marcos');

    // Checando presença na timeline
    const timelineActors = new Set(RAW_TIMELINE_DATA.events.flatMap((e) => e.actor_ids));
    for (const pId of personIds) {
      expect(timelineActors.has(pId)).toBe(true);
    }

    // Checando presença nas conversas (WhatsApp e reuniões)
    const threadParticipants = new Set(
      RAW_CONVERSAS_DATA.whatsapp_threads.flatMap((t) => t.participants.map((p) => p.person_id))
    );
    for (const pId of personIds) {
      expect(threadParticipants.has(pId)).toBe(true);
    }

    const meetingParticipants = new Set(
      RAW_CONVERSAS_DATA.meeting_transcripts.flatMap((m) => m.participants.map((p) => p.person_id))
    );
    expect(meetingParticipants.has('p_aline')).toBe(true);
    expect(meetingParticipants.has('p_carolina')).toBe(true);
    expect(meetingParticipants.has('p_marcos')).toBe(true);
  });

  it('4. ad_id e utm_content devem cruzar perfeitamente entre Meta Ads, CRM Leads e App de Metodologia', () => {
    // 1. Coleta de ad_ids do Meta Ads
    const metaAds = RAW_META_ADS_DATA.campaigns.flatMap((c) => c.ads);
    const metaAdIds = metaAds.map((a) => a.ad_id);
    const metaUtmContents = metaAds.map((a) => a.utm_content);

    expect(metaAdIds).toHaveLength(4);
    expect(metaAdIds).toContain('ad_whey_baunilha_01');
    expect(metaAdIds).toContain('ad_omega3_alta_conc_02');
    expect(metaAdIds).toContain('ad_namorados_casal_03');
    expect(metaAdIds).toContain('ad_whey_sabores_04');

    // 2. Coleta de utm_content do CRM Deals
    const crmUtmContents = new Set(RAW_CRM_LEADS_DATA.deals.map((d) => d.utm_content));
    for (const utm of metaUtmContents) {
      expect(crmUtmContents.has(utm)).toBe(true);
    }

    // 3. Coleta de ad_ids do App de Análise de Criativos
    const appAdIds = RAW_ANALISE_CRIATIVOS_DATA.creatives.map((c) => c.ad_id);
    for (const adId of metaAdIds) {
      expect(appAdIds).toContain(adId);
    }

    // 4. Coleta no grafo de memória
    const graphAssetAds = RAW_GRAPH_DATA.nodes
      .filter((n) => n.type === 'asset')
      .map((n) => (n.props as { ad_id?: string })?.ad_id);
    for (const adId of metaAdIds) {
      expect(graphAssetAds).toContain(adId);
    }
  });

  it('5. Integridade do dataset canônico Housewhey contra o manifesto', () => {
    const rawMap = getCanonicalRawJsonMap();
    const manifest = createDefaultHousewheyManifest(rawMap);

    expect(manifest.synthetic).toBe(true);
    expect(manifest.files).toHaveLength(7);
    expect(manifest.globalHash).toHaveLength(64);

    const integrityResult = verifyDatasetManifestIntegrity(manifest, rawMap);
    expect(integrityResult.valid).toBe(true);
    expect(integrityResult.errors).toHaveLength(0);
  });

  it('6. Problemas realistas e diagnosticáveis plantados sem anotações artificiais', () => {
    // A. Ad de namorados consumiu R$ 4850 e gerou poucas vendas no CRM
    const namoradosAd = RAW_META_ADS_DATA.campaigns
      .flatMap((c) => c.ads)
      .find((a) => a.ad_id === 'ad_namorados_casal_03');
    expect(namoradosAd?.spend_brl).toBe(4850.0);
    expect(namoradosAd?.frequency).toBeGreaterThan(2.0); // saturação

    const namoradosDeals = RAW_CRM_LEADS_DATA.deals.filter(
      (d) => d.utm_content === 'ad_namorados_casal_03' && d.status === 'venda'
    );
    expect(namoradosDeals.length).toBeLessThanOrEqual(3);

    // B. Ad de whey baunilha é o top performer
    const wheyBaunilhaDeals = RAW_CRM_LEADS_DATA.deals.filter(
      (d) => d.utm_content === 'ad_whey_baunilha_01' && d.status === 'venda'
    );
    expect(wheyBaunilhaDeals.length).toBeGreaterThan(5);

    // C. Divergência de atribuição: alguns leads declararam origem diferente da UTM
    const divergentDeals = RAW_CRM_LEADS_DATA.deals.filter(
      (d) => d.utm_source === 'meta_ads' && d.origem_declarada?.includes('Indicação')
    );
    expect(divergentDeals.length).toBeGreaterThan(0);
  });
});
