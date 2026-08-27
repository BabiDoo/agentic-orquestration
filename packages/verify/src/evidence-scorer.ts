/**
 * Configuração versionada de thresholds para o motor de Evidence Scoring.
 */
export interface EvidenceScoringThresholds {
  version: string;
  recommendationThreshold: number; // ≥ 0.80 -> RECOMMENDATION_ALLOWED
  provisionalThreshold: number; // 0.50 - 0.79 -> PROVISIONAL_ONLY
  abstentionThreshold: number; // < 0.50 -> ABSTENTION_REQUIRED
  exploratorySalesThreshold: number; // < 3 vendas -> EXPLORATORY
  mainClaimCoverageRequired: number; // = 1.00 para claims principais
  weights: {
    freshness: number; // peso do frescor dos dados
    consistency: number; // peso da consistência/ausência de conflitos
    coverage: number; // peso da cobertura de join/evidência
  };
}

export const DEFAULT_SCORING_THRESHOLDS: EvidenceScoringThresholds = {
  version: '1.0.0',
  recommendationThreshold: 0.8,
  provisionalThreshold: 0.5,
  abstentionThreshold: 0.5,
  exploratorySalesThreshold: 3,
  mainClaimCoverageRequired: 1.0,
  weights: {
    freshness: 0.2,
    consistency: 0.3,
    coverage: 0.5
  }
};

/**
 * Status de decisão derivada do Evidence Score.
 */
export type EvidenceDecisionStatus =
  'RECOMMENDATION_ALLOWED' | 'PROVISIONAL_ONLY' | 'ABSTENTION_REQUIRED';

/**
 * Classificação amostral de robustez estatística.
 */
export type SampleMaturity = 'ROBUST' | 'EXPLORATORY';

export interface ScoreInput {
  freshnessScore: number; // 0.0 a 1.0 (ex: baseado em recência dentro do timeframe)
  consistencyScore: number; // 0.0 a 1.0 (ex: integridade de schemas, ausência de conflitos)
  coverageScore: number; // 0.0 a 1.0 (join coverage ou evidence coverage)
  salesCount?: number; // Contagem de vendas para determinação de amostra exploratória
  isMainClaim?: boolean; // Se avaliando claim principal que exige coverage 1.00
}

export interface EvidenceScoreResult {
  scoreId: string;
  thresholdsVersion: string;
  compositeScore: number; // Score ponderado final (0.0 a 1.0)
  components: {
    freshness: number;
    consistency: number;
    coverage: number;
  };
  weights: {
    freshness: number;
    consistency: number;
    coverage: number;
  };
  decision: EvidenceDecisionStatus;
  sampleMaturity: SampleMaturity;
  isExploratory: boolean;
  mainClaimSatisfied: boolean;
  canRecommend: boolean;
  safeDetails: {
    explanation: string;
    abstentionReason?: string;
    warning?: string;
  };
}

/**
 * Motor determinístico de Evidence Scoring.
 * Avalia freshness, consistency e coverage aplicando thresholds versionados e
 * regras de abstenção/amostra exploratória.
 */
export class EvidenceScorer {
  private thresholds: EvidenceScoringThresholds;

  constructor(thresholds: Partial<EvidenceScoringThresholds> = {}) {
    this.thresholds = {
      ...DEFAULT_SCORING_THRESHOLDS,
      ...thresholds,
      weights: {
        ...DEFAULT_SCORING_THRESHOLDS.weights,
        ...thresholds.weights
      }
    };
  }

  public getThresholds(): EvidenceScoringThresholds {
    return { ...this.thresholds };
  }

  /**
   * Calcula o score ponderado de evidência e determina status de recomendação, provisório ou abstenção.
   */
  public evaluate(input: ScoreInput): EvidenceScoreResult {
    const scoreId = `ev_score_${Date.now()}`;
    const { freshnessScore, consistencyScore, coverageScore, salesCount, isMainClaim } = input;

    // Normaliza scores para o intervalo [0.0, 1.0]
    const normFreshness = Math.min(1.0, Math.max(0.0, freshnessScore));
    const normConsistency = Math.min(1.0, Math.max(0.0, consistencyScore));
    const normCoverage = Math.min(1.0, Math.max(0.0, coverageScore));

    const w = this.thresholds.weights;
    const totalWeight = w.freshness + w.consistency + w.coverage;
    const compositeScore =
      Math.round(
        ((normFreshness * w.freshness +
          normConsistency * w.consistency +
          normCoverage * w.coverage) /
          totalWeight) *
          1000
      ) / 1000;

    // 1. Verificação de Amostra Exploratória (< 3 vendas)
    const isExploratory =
      salesCount !== undefined && salesCount < this.thresholds.exploratorySalesThreshold;
    const sampleMaturity: SampleMaturity = isExploratory ? 'EXPLORATORY' : 'ROBUST';

    // 2. Verificação de Claim Principal (exige coverage = 1.00)
    const mainClaimSatisfied =
      !isMainClaim || normCoverage >= this.thresholds.mainClaimCoverageRequired;

    // 3. Determinação da Decisão de Recomendação (thresholds)
    let decision: EvidenceDecisionStatus;
    let abstentionReason: string | undefined;
    let warning: string | undefined;

    if (
      normCoverage < this.thresholds.abstentionThreshold ||
      compositeScore < this.thresholds.abstentionThreshold
    ) {
      decision = 'ABSTENTION_REQUIRED';
      abstentionReason = `Score composto (${compositeScore}) ou coverage (${normCoverage}) abaixo do threshold mínimo de ${this.thresholds.abstentionThreshold}. Abstenção mandatória.`;
    } else if (
      compositeScore >= this.thresholds.recommendationThreshold &&
      normCoverage >= this.thresholds.recommendationThreshold &&
      mainClaimSatisfied &&
      !isExploratory
    ) {
      decision = 'RECOMMENDATION_ALLOWED';
    } else {
      decision = 'PROVISIONAL_ONLY';
      if (isExploratory) {
        warning = `Amostra com apenas ${salesCount} venda(s) (< ${this.thresholds.exploratorySalesThreshold}). Classificada como exploratória, mantendo recomendação em caráter estritamente provisório.`;
      } else if (!mainClaimSatisfied) {
        warning = `Claim principal exige coverage de ${this.thresholds.mainClaimCoverageRequired * 100}%, mas atingiu ${normCoverage * 100}%. Mantida como provisória.`;
      } else {
        warning = `Score de evidência (${compositeScore}) entre ${this.thresholds.provisionalThreshold} e ${this.thresholds.recommendationThreshold}. Status permanece provisório.`;
      }
    }

    const canRecommend = decision === 'RECOMMENDATION_ALLOWED';

    return {
      scoreId,
      thresholdsVersion: this.thresholds.version,
      compositeScore,
      components: {
        freshness: normFreshness,
        consistency: normConsistency,
        coverage: normCoverage
      },
      weights: { ...w },
      decision,
      sampleMaturity,
      isExploratory,
      mainClaimSatisfied,
      canRecommend,
      safeDetails: {
        explanation: `Score composto: ${compositeScore} (Freshness: ${normFreshness}, Consistency: ${normConsistency}, Coverage: ${normCoverage}). Decisão: ${decision}.`,
        abstentionReason,
        warning
      }
    };
  }
}
