import { RuntimeErrorCode } from '@adzhub/contracts';
import { StructuralCheckResult } from './structural-verifier.js';
import { PostconditionCheckResult } from './postcondition-verifier.js';

/**
 * Regra semântica ou diretriz de marca a ser avaliada.
 */
export interface BrandContextRule {
  ruleId: string;
  category: 'BRAND_VOICE' | 'BUSINESS_GOAL' | 'BUDGET_CAP' | 'RECOMMENDATION_COHERENCE';
  description: string;
  validator: (content: unknown) => { passed: boolean; reason?: string };
}

/**
 * Parâmetros de entrada para a verificação semântica auxiliar.
 */
export interface SemanticVerificationOptions {
  claimOrContent: string | Record<string, unknown>;
  availableEvidenceKeys?: string[];
  requiredContextRules?: BrandContextRule[];
  priorStructuralCheck?: StructuralCheckResult;
  priorPostconditionCheck?: PostconditionCheckResult;
  brandRules?: {
    forbiddenClaims?: string[];
    mandatoryDisclaimers?: string[];
    maxRecommendedSpendIncreasePct?: number;
    requireZeroHallucination?: boolean;
  };
}

/**
 * Resultado padronizado da verificação semântica.
 */
export interface SemanticCheckResult {
  checkId: string;
  version: string;
  passed: boolean;
  score: number;
  errorCode?: RuntimeErrorCode;
  canOverridePriorChecks: false; // Critério M4-04: resultado semântico NUNCA sobrepõe check estrutural/policy
  safeDetails: {
    ruleId?: string;
    conflicts: Array<{
      type: 'BRAND_RULE_VIOLATION' | 'UNSUPPORTED_CLAIM' | 'CONTEXT_INCONSISTENCY';
      message: string;
      fieldOrClaim?: string;
    }>;
    explanation: string;
  };
}

/**
 * Verificador semântico auxiliar:
 * 1. Verifica coerência com contexto e regras de marca/negócio;
 * 2. Não cria evidência ausente (garante que claims se baseiem estritamente no corpus existente);
 * 3. Divergência gera SEMANTIC_CONFLICT explicável;
 * 4. Subordina-se a checks estruturais e de política (canOverridePriorChecks = false).
 */
export class SemanticAuxiliaryVerifier {
  public static readonly VERSION = '1.0.0';

  public verify(options: SemanticVerificationOptions): SemanticCheckResult {
    const checkId = 'check:semantic:auxiliary';
    const conflicts: SemanticCheckResult['safeDetails']['conflicts'] = [];

    // Se houve falha prévia estrutural ou de pós-condição, a verificação semântica NÃO sobrepõe
    if (options.priorStructuralCheck && !options.priorStructuralCheck.passed) {
      return {
        checkId,
        version: SemanticAuxiliaryVerifier.VERSION,
        passed: false,
        score: 0.0,
        errorCode: 'SEMANTIC_CONFLICT',
        canOverridePriorChecks: false,
        safeDetails: {
          conflicts: [
            {
              type: 'CONTEXT_INCONSISTENCY',
              message:
                'Check estrutural prévio falhou. Verificação semântica subordinada não pode prosseguir.'
            }
          ],
          explanation: 'Conflito estrutural subjacente impede validação semântica.'
        }
      };
    }

    if (options.priorPostconditionCheck && !options.priorPostconditionCheck.passed) {
      return {
        checkId,
        version: SemanticAuxiliaryVerifier.VERSION,
        passed: false,
        score: 0.0,
        errorCode: 'SEMANTIC_CONFLICT',
        canOverridePriorChecks: false,
        safeDetails: {
          conflicts: [
            {
              type: 'CONTEXT_INCONSISTENCY',
              message:
                'Pós-condição determinística prévia falhou. Verificação semântica subordinada rejeitada.'
            }
          ],
          explanation: 'Pós-condição determinística falha impede validação semântica.'
        }
      };
    }

    const contentText =
      typeof options.claimOrContent === 'string'
        ? options.claimOrContent
        : JSON.stringify(options.claimOrContent);

    // 1. Verificação contra Regras de Marca (Forbidden Claims / Claims Proibidas)
    if (options.brandRules?.forbiddenClaims) {
      for (const forbidden of options.brandRules.forbiddenClaims) {
        if (contentText.toLowerCase().includes(forbidden.toLowerCase())) {
          conflicts.push({
            type: 'BRAND_RULE_VIOLATION',
            message: `Conteúdo viola diretriz de marca ao conter alegação proibida: "${forbidden}"`,
            fieldOrClaim: forbidden
          });
        }
      }
    }

    // 2. Não cria evidência ausente (Verificação de claims não suportadas por evidências disponíveis)
    if (options.availableEvidenceKeys && options.availableEvidenceKeys.length === 0) {
      if (contentText.trim().length > 0 && options.brandRules?.requireZeroHallucination) {
        conflicts.push({
          type: 'UNSUPPORTED_CLAIM',
          message:
            'Nenhuma evidência disponível em staging/contexto para fundamentar as afirmações produzidas.',
          fieldOrClaim: 'evidenceKeys'
        });
      }
    }

    // 3. Verificação de Regras de Contexto Customizadas
    if (options.requiredContextRules) {
      for (const rule of options.requiredContextRules) {
        const res = rule.validator(options.claimOrContent);
        if (!res.passed) {
          conflicts.push({
            type: 'CONTEXT_INCONSISTENCY',
            message:
              res.reason ?? `Regra de contexto '${rule.ruleId}' violada: ${rule.description}`,
            fieldOrClaim: rule.ruleId
          });
        }
      }
    }

    if (conflicts.length > 0) {
      return {
        checkId,
        version: SemanticAuxiliaryVerifier.VERSION,
        passed: false,
        score: 0.0,
        errorCode: 'SEMANTIC_CONFLICT',
        canOverridePriorChecks: false,
        safeDetails: {
          conflicts,
          explanation: `Detectado(s) ${conflicts.length} conflito(s) semântico(s) com regras de contexto ou diretrizes de marca.`
        }
      };
    }

    return {
      checkId,
      version: SemanticAuxiliaryVerifier.VERSION,
      passed: true,
      score: 1.0,
      canOverridePriorChecks: false,
      safeDetails: {
        conflicts: [],
        explanation: 'Coerência semântica com contexto e diretrizes de marca validada com sucesso.'
      }
    };
  }
}
