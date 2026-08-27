import { describe, it, expect } from 'vitest';
import {
  UtmNormalizer,
  DEFAULT_UTM_ALIAS_TABLE_V1,
  createUtmAliasTable,
  isMissingUtm,
  isValidUtm,
  MISSING_UTM_SENTINEL
} from './index.js';

describe('@adzhub/data - M1-04: Implementar normalizador de UTM', () => {
  const normalizer = new UtmNormalizer();

  describe('1. Transformações canônicas: trim, lowercase, Unicode NFKC e espaços para underscore', () => {
    it('deve aplicar trim, lowercase e converter espaços para underscore', () => {
      const result = normalizer.normalize('  Housewhey Promo 2026 ');
      expect(result.normalizedValue).toBe('housewhey_promo_2026');
      expect(result.isValid).toBe(true);
      expect(result.isMissing).toBe(false);
    });

    it('deve colapsar múltiplos espaços, tabs e quebras de linha para um único underscore', () => {
      const result = normalizer.normalize('whey   isolado \t\n baunilha');
      expect(result.normalizedValue).toBe('whey_isolado_baunilha');
    });

    it('deve normalizar caracteres Unicode NFKC (ligaduras e fullwidth)', () => {
      // Ligadura 'ﬁ' (U+FB01) deve normalizar para 'fi'
      const ligatureResult = normalizer.normalize('proﬁssional_whey');
      expect(ligatureResult.normalizedValue).toBe('profissional_whey');

      // Caracteres Fullwidth 'ＵＴＭ_１' devem normalizar para 'utm_1'
      const fullwidthResult = normalizer.normalize('ＵＴＭ_１');
      expect(fullwidthResult.normalizedValue).toBe('utm_1');
    });

    it('deve decodificar strings com URL percent-encoding', () => {
      const encodedResult = normalizer.normalize('ad%20whey%20baunilha%2001');
      expect(encodedResult.normalizedValue).toBe('ad_whey_baunilha_01');
    });

    it('deve sanitizar pontuações agressivas e caracteres especiais', () => {
      const dirtyResult = normalizer.normalize('ad--whey__baunilha!!@@01');
      expect(dirtyResult.normalizedValue).toBe('ad-whey_baunilha_01');
    });
  });

  describe('2. Preservação estrita de raw_value', () => {
    it('deve preservar o raw_value original intacto para strings válidas', () => {
      const raw = '  AD_Whey_Baunilha_01  ';
      const result = normalizer.normalize(raw);
      expect(result.rawValue).toBe(raw);
      expect(result.normalizedValue).toBe('ad_whey_baunilha_01');
    });

    it('deve preservar o raw_value original para valores nulos e indefinidos', () => {
      const nullResult = normalizer.normalize(null);
      expect(nullResult.rawValue).toBeNull();

      const undefinedResult = normalizer.normalize(undefined);
      expect(undefinedResult.rawValue).toBeUndefined();
    });

    it('deve preservar o raw_value original para strings vazias ou só com espaços', () => {
      const emptyRaw = '   ';
      const emptyResult = normalizer.normalize(emptyRaw);
      expect(emptyResult.rawValue).toBe(emptyRaw);
    });
  });

  describe('3. Vazio gera MISSING_UTM e permanece no denominador', () => {
    it('deve retornar MISSING_UTM para null, undefined e strings vazias', () => {
      const inputs = [null, undefined, '', '   ', '\t\n\r'];

      for (const input of inputs) {
        const result = normalizer.normalize(input);
        expect(result.normalizedValue).toBe(MISSING_UTM_SENTINEL);
        expect(result.isValid).toBe(false);
        expect(result.isMissing).toBe(true);
        expect(result.resolutionSource).toBe('missing');
        // Garantia de permanência no denominador de cálculo
        expect(result.includeInDenominator).toBe(true);
      }
    });

    it('deve retornar MISSING_UTM para strings compostas unicamente por pontuação inválida', () => {
      const result = normalizer.normalize('!@#$%^&*()');
      expect(result.normalizedValue).toBe(MISSING_UTM_SENTINEL);
      expect(result.isValid).toBe(false);
      expect(result.isMissing).toBe(true);
      expect(result.includeInDenominator).toBe(true);
    });

    it('funções utilitárias isMissingUtm e isValidUtm devem reconhecer estados corretamente', () => {
      expect(isMissingUtm(null)).toBe(true);
      expect(isMissingUtm(undefined)).toBe(true);
      expect(isMissingUtm('')).toBe(true);
      expect(isMissingUtm('MISSING_UTM')).toBe(true);
      expect(isMissingUtm('ad_whey_baunilha_01')).toBe(false);

      const normMissing = normalizer.normalize(null);
      expect(isMissingUtm(normMissing)).toBe(true);
      expect(isValidUtm(normMissing)).toBe(false);

      const normValid = normalizer.normalize('ad_whey_baunilha_01');
      expect(isMissingUtm(normValid)).toBe(false);
      expect(isValidUtm(normValid)).toBe(true);
    });
  });

  describe('4. Aliases usam tabela explícita e versionada', () => {
    it('deve aplicar aliases conhecidos da tabela padrão v1.0.0', () => {
      expect(DEFAULT_UTM_ALIAS_TABLE_V1.version).toBe('1.0.0');
      expect(DEFAULT_UTM_ALIAS_TABLE_V1.aliases['facebook']).toBe('meta_ads');

      // Alias de canal: facebook -> meta_ads
      const fbResult = normalizer.normalize('facebook');
      expect(fbResult.normalizedValue).toBe('meta_ads');
      expect(fbResult.isAlias).toBe(true);
      expect(fbResult.aliasMatched).toBe('facebook');
      expect(fbResult.aliasTableVersion).toBe('1.0.0');
      expect(fbResult.resolutionSource).toBe('alias');

      // Alias de criativo: ad_whey_baunilha_v1 -> ad_whey_baunilha_01
      const creativeResult = normalizer.normalize('ad_whey_baunilha_v1');
      expect(creativeResult.normalizedValue).toBe('ad_whey_baunilha_01');
      expect(creativeResult.isAlias).toBe(true);
      expect(creativeResult.aliasMatched).toBe('ad_whey_baunilha_v1');

      // Alias de criativo: combo_namorados_casal -> ad_namorados_casal_03
      const namoradosResult = normalizer.normalize('combo_namorados_casal');
      expect(namoradosResult.normalizedValue).toBe('ad_namorados_casal_03');
      expect(namoradosResult.isAlias).toBe(true);
    });

    it('deve suportar tabela customizada e versionada de aliases', () => {
      const customTable = createUtmAliasTable({
        version: '2.0.0-custom',
        clientId: 'cli_housewhey',
        description: 'Tabela de migração de campanha Q3',
        aliases: {
          whey_verao_2026: 'ad_whey_baunilha_01'
        }
      });

      const customNormalizer = new UtmNormalizer(customTable);
      const result = customNormalizer.normalize('whey_verao_2026');

      expect(result.normalizedValue).toBe('ad_whey_baunilha_01');
      expect(result.isAlias).toBe(true);
      expect(result.aliasTableVersion).toBe('2.0.0-custom');
      expect(result.aliasMatched).toBe('whey_verao_2026');
    });

    it('deve permitir desabilitar resolução de aliases passando aliasTable: null', () => {
      const strictNormalizer = new UtmNormalizer(null);
      const result = strictNormalizer.normalize('facebook');

      // Sem tabela de aliases, 'facebook' permanece 'facebook' de forma exata
      expect(result.normalizedValue).toBe('facebook');
      expect(result.isAlias).toBe(false);
      expect(result.resolutionSource).toBe('exact');
    });
  });

  describe('5. Fuzzy matching NUNCA é usado para commit', () => {
    it('o método canônico de normalização deve ser 100% determinístico e nunca aplicar fuzzy silencioso', () => {
      // Typos não mapeados na tabela explícita não são "adivinhados" na normalização
      const typoResult = normalizer.normalize('ad_whey_baunilha_01_typo_desconhecido');
      expect(typoResult.normalizedValue).toBe('ad_whey_baunilha_01_typo_desconhecido');
      expect(typoResult.isAlias).toBe(false);
    });

    it('método consultivo de fuzzy matching deve emitir sinalização explícita proibindo commit', () => {
      const candidates = [
        'ad_whey_baunilha_01',
        'ad_omega3_alta_conc_02',
        'ad_namorados_casal_03',
        'ad_whey_sabores_04'
      ];

      const suggestions = normalizer.suggestFuzzyCandidates('ad_whey_baunilha_02', candidates, 3);
      expect(suggestions.length).toBeGreaterThan(0);

      const topSuggestion = suggestions[0]!;
      expect(topSuggestion.candidate).toBe('ad_whey_baunilha_01');
      expect(topSuggestion.advisoryOnly).toBe(true);
      expect(topSuggestion.prohibitedForCommit).toBe(true);
      expect(topSuggestion.warning).toContain('prohibited for Supercérebro or canonical commits');
    });
  });

  describe('6. Normalização de Bundle completo de UTMs', () => {
    it('deve normalizar pacote com source, medium, campaign, content e term', () => {
      const rawBundle = {
        utm_source: '  Facebook Ads ',
        utm_medium: ' CPC ',
        utm_campaign: ' Whey Isolado Baunilha ',
        utm_content: ' ad_whey_baunilha_v1 ',
        utm_term: null
      };

      const normalizedBundle = normalizer.normalizeBundle(rawBundle);

      expect(normalizedBundle.utm_source.normalizedValue).toBe('meta_ads'); // alias aplicado
      expect(normalizedBundle.utm_medium.normalizedValue).toBe('cpc');
      expect(normalizedBundle.utm_campaign.normalizedValue).toBe('whey_isolado_baunilha');
      expect(normalizedBundle.utm_content.normalizedValue).toBe('ad_whey_baunilha_01'); // alias aplicado
      expect(normalizedBundle.utm_term.normalizedValue).toBe('MISSING_UTM');

      expect(normalizedBundle.allValid).toBe(true);
      expect(normalizedBundle.hasMissing).toBe(false); // term é opcional
      expect(normalizedBundle.canonicalKey).toBe(
        'meta_ads:whey_isolado_baunilha:ad_whey_baunilha_01'
      );
    });

    it('deve acusar hasMissing quando chave crítica estiver ausente', () => {
      const rawBundle = {
        utm_source: 'meta_ads',
        utm_medium: 'cpc',
        utm_campaign: 'whey_isolado',
        utm_content: null // Ausente!
      };

      const normalizedBundle = normalizer.normalizeBundle(rawBundle);
      expect(normalizedBundle.hasMissing).toBe(true);
      expect(normalizedBundle.allValid).toBe(false);
      expect(normalizedBundle.utm_content.normalizedValue).toBe('MISSING_UTM');
    });
  });
});
