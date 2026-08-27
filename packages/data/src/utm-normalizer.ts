/**
 * @adzhub/data - UTM Normalizer
 * Normalizador determinístico de parâmetros UTM com suporte a Unicode NFKC,
 * aliases explícitos versionados, preservação de raw_value e garantia estrita anti-fuzzy para commits.
 */

import { UtmAliasTable, DEFAULT_UTM_ALIAS_TABLE_V1 } from './utm-aliases.js';

export const MISSING_UTM_SENTINEL = 'MISSING_UTM';

export type UtmResolutionSource = 'exact' | 'alias' | 'missing' | 'sanitized';

export interface UtmNormalizationResult {
  /** Valor bruto original exatamente como recebido */
  rawValue: string | null | undefined;
  /** Valor normalizado canônico ou MISSING_UTM */
  normalizedValue: string;
  /** Indica se o valor é uma UTM válida e utilizável */
  isValid: boolean;
  /** Indica se a entrada era nula, indefinida ou vazia */
  isMissing: boolean;
  /** Indica se foi aplicado um de-para através da tabela de aliases */
  isAlias: boolean;
  /** Chave do alias que casou com a entrada, se aplicável */
  aliasMatched?: string;
  /** Versão da tabela de aliases utilizada na resolução */
  aliasTableVersion?: string;
  /** Origem da resolução (exact, alias, missing, sanitized) */
  resolutionSource: UtmResolutionSource;
  /**
   * Garantia contratual: o registro SEMPRE permanece no denominador
   * para cálculo de cobertura de join e evidências.
   */
  includeInDenominator: true;
}

export interface RawUtmBundle {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
}

export interface NormalizedUtmBundle {
  utm_source: UtmNormalizationResult;
  utm_medium: UtmNormalizationResult;
  utm_campaign: UtmNormalizationResult;
  utm_content: UtmNormalizationResult;
  utm_term: UtmNormalizationResult;
  /** Verdadeiro se todos os campos presentes forem válidos e nenhum for MISSING_UTM em chaves obrigatórias */
  allValid: boolean;
  /** Verdadeiro se qualquer um dos parâmetros UTM for MISSING_UTM */
  hasMissing: boolean;
  /** Chave canônica unificada de join (source:campaign:content) */
  canonicalKey: string;
}

export interface UtmNormalizerOptions {
  /** Tabela de aliases a utilizar. Se omitida, usa a tabela default v1. Se null, desativa aliases. */
  aliasTable?: UtmAliasTable | null;
  /** Se true, rejeita caracteres especiais não conformes. Default: true */
  sanitizePunctuation?: boolean;
}

export interface FuzzySuggestionResult {
  candidate: string;
  distance: number;
  similarityScore: number;
  /** Garantia arquitetural: sugestões fuzzy são meramente consultivas */
  advisoryOnly: true;
  /** Garantia arquitetural: PROIBIDO usar para commit em memória definitiva */
  prohibitedForCommit: true;
  warning: string;
}

export class UtmNormalizer {
  private readonly aliasTable: UtmAliasTable | null;

  constructor(aliasTable: UtmAliasTable | null = DEFAULT_UTM_ALIAS_TABLE_V1) {
    this.aliasTable = aliasTable;
  }

  /**
   * Normaliza um valor bruto de UTM aplicando:
   * 1. Detecção de nulo/vazio -> MISSING_UTM com permanência no denominador;
   * 2. Preservação do rawValue original;
   * 3. Decodificação de URL percent-encoding se aplicável;
   * 4. Normalização Unicode NFKC;
   * 5. Trim de espaços iniciais e finais;
   * 6. Lowercase;
   * 7. Conversão de sequências de espaços em underscore (_);
   * 8. Resolução determinística por tabela de aliases explícita e versionada.
   */
  public normalize(
    raw: string | null | undefined,
    options?: UtmNormalizerOptions
  ): UtmNormalizationResult {
    // 1. Tratamento de valores nulos, indefinidos ou tipos não-string
    if (raw === null || raw === undefined || typeof raw !== 'string') {
      return {
        rawValue: raw,
        normalizedValue: MISSING_UTM_SENTINEL,
        isValid: false,
        isMissing: true,
        isAlias: false,
        resolutionSource: 'missing',
        includeInDenominator: true
      };
    }

    // 2. Trim preliminar
    let processed = raw.trim();
    if (processed.length === 0) {
      return {
        rawValue: raw,
        normalizedValue: MISSING_UTM_SENTINEL,
        isValid: false,
        isMissing: true,
        isAlias: false,
        resolutionSource: 'missing',
        includeInDenominator: true
      };
    }

    // 3. Decodificação segura de URL percent-encoding (ex: %20 -> espaço, %2F -> /)
    if (processed.includes('%')) {
      try {
        processed = decodeURIComponent(processed);
      } catch {
        // Se a sequência de escape for inválida, mantém o texto original
      }
    }

    // 4. Normalização Unicode NFKC (decompõe ligaduras, normaliza compatibilidade e largura total)
    processed = processed.normalize('NFKC');

    // 5. Lowercase
    processed = processed.toLowerCase();

    // 6. Conversão de espaços e tabulações para underscore
    processed = processed.replace(/[\s\t\n\r]+/g, '_');

    // 7. Sanitização de pontuação e caracteres não seguros para slugs de UTM
    const sanitize = options?.sanitizePunctuation ?? true;
    if (sanitize) {
      // Remove caracteres especiais exceto alfanuméricos, underscore e hífen
      processed = processed.replace(/[^a-z0-9_-]/g, '_');
      // Colapsa múltiplos hifens consecutivos
      processed = processed.replace(/-+/g, '-');
      // Colapsa múltiplos underscores consecutivos
      processed = processed.replace(/_+/g, '_');
      // Remove underscores e hífens nas bordas
      processed = processed.replace(/^[-_]+|[-_]+$/g, '');
    }

    if (processed.length === 0) {
      return {
        rawValue: raw,
        normalizedValue: MISSING_UTM_SENTINEL,
        isValid: false,
        isMissing: true,
        isAlias: false,
        resolutionSource: 'missing',
        includeInDenominator: true
      };
    }

    // 8. Consulta à tabela de aliases explícita e versionada
    const activeAliasTable =
      options?.aliasTable !== undefined ? options.aliasTable : this.aliasTable;

    if (activeAliasTable && activeAliasTable.aliases[processed]) {
      const canonicalTarget = activeAliasTable.aliases[processed]!;
      return {
        rawValue: raw,
        normalizedValue: canonicalTarget,
        isValid: true,
        isMissing: false,
        isAlias: true,
        aliasMatched: processed,
        aliasTableVersion: activeAliasTable.version,
        resolutionSource: 'alias',
        includeInDenominator: true
      };
    }

    const wasSanitized = processed !== raw.trim().toLowerCase();

    return {
      rawValue: raw,
      normalizedValue: processed,
      isValid: true,
      isMissing: false,
      isAlias: false,
      resolutionSource: wasSanitized ? 'sanitized' : 'exact',
      includeInDenominator: true
    };
  }

  /**
   * Normaliza um conjunto completo de parâmetros UTM (source, medium, campaign, content, term)
   */
  public normalizeBundle(
    rawBundle: RawUtmBundle,
    options?: UtmNormalizerOptions
  ): NormalizedUtmBundle {
    const utm_source = this.normalize(rawBundle.utm_source, options);
    const utm_medium = this.normalize(rawBundle.utm_medium, options);
    const utm_campaign = this.normalize(rawBundle.utm_campaign, options);
    const utm_content = this.normalize(rawBundle.utm_content, options);
    const utm_term = this.normalize(rawBundle.utm_term, options);

    const hasMissing =
      utm_source.isMissing ||
      utm_medium.isMissing ||
      utm_campaign.isMissing ||
      utm_content.isMissing;

    const allValid =
      utm_source.isValid && utm_medium.isValid && utm_campaign.isValid && utm_content.isValid;

    const canonicalKey = `${utm_source.normalizedValue}:${utm_campaign.normalizedValue}:${utm_content.normalizedValue}`;

    return {
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      allValid,
      hasMissing,
      canonicalKey
    };
  }

  /**
   * Sugestão consultiva de candidatos por proximidade de edição (Levenshtein).
   *
   * ATENÇÃO ARQUITETURAL:
   * Este método é ESTRITAMENTE consultivo e NÃO PODE ser utilizado para commits
   * ou promoção de dados para memória definitiva / Supercérebro.
   */
  public suggestFuzzyCandidates(
    raw: string,
    candidatePool: string[],
    maxDistance: number = 3
  ): FuzzySuggestionResult[] {
    const normalizedInput = this.normalize(raw).normalizedValue;
    if (normalizedInput === MISSING_UTM_SENTINEL) {
      return [];
    }

    const suggestions: FuzzySuggestionResult[] = [];

    for (const candidate of candidatePool) {
      const normCandidate = this.normalize(candidate).normalizedValue;
      const distance = this.levenshteinDistance(normalizedInput, normCandidate);
      if (distance <= maxDistance) {
        const maxLength = Math.max(normalizedInput.length, normCandidate.length);
        const similarityScore = maxLength === 0 ? 1.0 : (maxLength - distance) / maxLength;

        suggestions.push({
          candidate: normCandidate,
          distance,
          similarityScore,
          advisoryOnly: true,
          prohibitedForCommit: true,
          warning:
            'Fuzzy matching is strictly advisory and prohibited for Supercérebro or canonical commits.'
        });
      }
    }

    return suggestions.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Cálculo de distância de Levenshtein determinístico para sugestões consultivas.
   */
  private levenshteinDistance(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = [];
    for (let i = 0; i <= m; i++) {
      dp[i] = new Array(n + 1).fill(0);
      dp[i]![0] = i;
    }
    for (let j = 0; j <= n; j++) {
      dp[0]![j] = j;
    }

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        const row = dp[i]!;
        const prevRow = dp[i - 1]!;
        row[j] = Math.min(
          prevRow[j]! + 1, // exclusão
          row[j - 1]! + 1, // inserção
          prevRow[j - 1]! + cost // substituição
        );
      }
    }

    return dp[m]![n]!;
  }
}

/**
 * Função utilitária para verificar se um valor de UTM é ausente (MISSING_UTM).
 */
export function isMissingUtm(value: string | UtmNormalizationResult | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'object' && 'isMissing' in value) return value.isMissing;
  if (typeof value === 'string') return value.trim() === '' || value === MISSING_UTM_SENTINEL;
  return false;
}

/**
 * Função utilitária para verificar se um valor de UTM é válido.
 */
export function isValidUtm(value: string | UtmNormalizationResult | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'object' && 'isValid' in value) return value.isValid;
  if (typeof value === 'string') return value.trim() !== '' && value !== MISSING_UTM_SENTINEL;
  return false;
}
