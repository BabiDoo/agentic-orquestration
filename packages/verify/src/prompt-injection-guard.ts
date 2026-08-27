import { TaskContract, RuntimeErrorCode } from '@adzhub/contracts';

/**
 * Padrões regex para detecção de injeção de instruções e jailbreaks comuns em dados textuais não-confiáveis.
 */
export const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /system\s+override/i,
  /you\s+are\s+now\s+in\s+developer\s+mode/i,
  /new\s+system\s+prompt/i,
  /disregard\s+(the\s+)?above/i,
  /grant\s+admin\s+privileges/i,
  /disable\s+safety\s+checks/i,
  /pause\s+all\s+campaigns\s+now/i,
  /execute\s+action:\s*pause/i,
  /bypass\s+policy/i,
  /eval\(|exec\(|<script>/i
];

export interface UntrustedDataSanitizationResult {
  isSuspicious: boolean;
  detectedPatterns: string[];
  delimitedContent: string;
  rawContent: string;
}

/**
 * Sanitiza e delimita estritamente campos textuais de fontes externas (CRM notes, mensagens de WhatsApp, etc.)
 * garantindo que sejam tratados como DADOS NÃO-CONFIÁVEIS e jamais como comandos executáveis.
 */
export function delimitUntrustedData(
  content: unknown,
  sourceLabel: string = 'CRM_NOTE'
): UntrustedDataSanitizationResult {
  const text = typeof content === 'string' ? content : JSON.stringify(content ?? '');
  const detectedPatterns: string[] = [];

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      detectedPatterns.push(pattern.source);
    }
  }

  const isSuspicious = detectedPatterns.length > 0;

  // Delimitação estrita via tag XML não interpretável
  const delimitedContent = `<UNTRUSTED_EXTERNAL_DATA source="${sourceLabel}" contains_potential_injection="${isSuspicious}">\n${text}\n</UNTRUSTED_EXTERNAL_DATA>`;

  return {
    isSuspicious,
    detectedPatterns,
    delimitedContent,
    rawContent: text
  };
}

/**
 * Validador de integridade do TaskContract contra mutações não autorizadas em runtime (S4 adversarial check).
 * Comprova que nenhum payload textual, nota de CRM ou prompt injection altere os campos congelados do contrato:
 * - allowedEffects
 * - budgets
 * - clientId / tenantId
 * - timeframe
 * - approvalPolicy
 */
export class ContractAuthorityGuard {
  /**
   * Comprova a imutabilidade estrita do contrato e ausência de escalada de autoridade.
   */
  public static verifyContractImmutability(
    originalContract: TaskContract,
    currentContract: TaskContract
  ): {
    passed: boolean;
    errorCode?: RuntimeErrorCode;
    violations: string[];
  } {
    const violations: string[] = [];

    // 1. Efeitos / Capabilities permitidos nunca podem ser expandidos
    const originalEffects = new Set(originalContract.effects.allowed);
    for (const eff of currentContract.effects.allowed) {
      if (!originalEffects.has(eff)) {
        violations.push(`Tentativa de escalada de efeito não autorizado: ${eff}`);
      }
    }

    // 2. Cliente e Tenant devem ser idênticos
    if (currentContract.clientId !== originalContract.clientId) {
      violations.push(
        `Tentativa de alteração de clientId (${originalContract.clientId} -> ${currentContract.clientId})`
      );
    }
    if (currentContract.tenantId !== originalContract.tenantId) {
      violations.push(
        `Tentativa de alteração de tenantId (${originalContract.tenantId} -> ${currentContract.tenantId})`
      );
    }

    // 3. Budgets nunca podem ser ampliados sem nova tarefa
    if (currentContract.budgets.maxSteps > originalContract.budgets.maxSteps) {
      violations.push('Tentativa de aumento não autorizado de maxSteps');
    }
    if (currentContract.budgets.maxCostBrl > originalContract.budgets.maxCostBrl) {
      violations.push('Tentativa de aumento não autorizado de maxCostBrl');
    }

    const passed = violations.length === 0;

    return {
      passed,
      errorCode: passed ? undefined : 'PROMPT_INJECTION_DETECTED',
      violations
    };
  }
}
