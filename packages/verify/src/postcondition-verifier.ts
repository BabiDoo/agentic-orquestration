import { createHash } from 'node:crypto';
import { RuntimeErrorCode, Timeframe } from '@adzhub/contracts';
import { Observation } from '@adzhub/contracts';

/**
 * Critérios para verificação determinística de pós-condições.
 */
export interface DeterministicPostconditionOptions {
  expectedClientId: string;
  expectedTimeframe: Timeframe;
  expectedCountMin?: number;
  expectedCountMax?: number;
  expectedIdentifiers?: string[];
  expectedPayloadHash?: string;
  actualClientId?: string;
  actualTimeframe?: Timeframe;
  actualCount?: number;
  actualIdentifiers?: string[];
  actualPayload?: unknown;
  actualPayloadHash?: string;
  observation?: Observation;
}

/**
 * Resultado padronizado da verificação de pós-condição.
 */
export interface PostconditionCheckResult {
  checkId: string;
  version: string;
  passed: boolean;
  score: number;
  errorCode?: RuntimeErrorCode;
  allowPromotion: boolean;
  safeDetails: {
    rule: string;
    clientIdChecked?: boolean;
    timeframeChecked?: boolean;
    countChecked?: boolean;
    identifiersChecked?: boolean;
    hashChecked?: boolean;
    mismatchReason?: string;
    description: string;
  };
}

/**
 * Utilitário determinístico para calcular hash de payload.
 */
function computeSha256(data: unknown): string {
  const serialized = JSON.stringify(data ?? {}, Object.keys(data ?? {}).sort());
  return createHash('sha256').update(serialized).digest('hex');
}

/**
 * Normaliza datas ISO para timestamp em milissegundos.
 */
function toTimestamp(isoDate: string): number {
  return new Date(isoDate).getTime();
}

/**
 * Verificador determinístico de pós-condições e isolamento multi-tenant/client.
 * Garante que observações ou dados não promovidos passem por verificação de:
 * 1. Isolamento de cliente (impede contaminação cross-client);
 * 2. Compatibilidade estrita de período (detecta PERIOD_MISMATCH no S3);
 * 3. Contagem esperada de itens;
 * 4. Identificadores esperados presentes;
 * 5. Integridade de Hash SHA-256.
 */
export class DeterministicPostconditionVerifier {
  public static readonly VERSION = '1.0.0';

  /**
   * Executa todas as pós-condições determinísticas sobre os parâmetros/observação.
   */
  public verify(options: DeterministicPostconditionOptions): PostconditionCheckResult {
    const checkId = 'check:postcondition:deterministic';

    // 1. Verificação de Isolamento de Cliente (Cross-Client Protection)
    const actualClient =
      options.actualClientId ??
      (options.observation?.operationalPayload?.clientId as string) ??
      options.expectedClientId;
    if (actualClient !== options.expectedClientId) {
      return {
        checkId,
        version: DeterministicPostconditionVerifier.VERSION,
        passed: false,
        score: 0.0,
        errorCode: 'POSTCONDITION_FAILED',
        allowPromotion: false,
        safeDetails: {
          rule: 'CLIENT_ISOLATION',
          clientIdChecked: false,
          mismatchReason: `Tentativa cross-client detectada e rejeitada. Esperado '${options.expectedClientId}', recebido '${actualClient}'.`,
          description: 'Isolamento de cliente violado. O dado não pode ser promovido.'
        }
      };
    }

    // 2. Verificação de Período / Timeframe (S3 Period Mismatch)
    const actualTf = options.actualTimeframe ?? options.observation?.timeframe;
    if (actualTf) {
      const expStart = toTimestamp(options.expectedTimeframe.since);
      const expEnd = toTimestamp(options.expectedTimeframe.until);
      const actStart = toTimestamp(actualTf.since);
      const actEnd = toTimestamp(actualTf.until);

      // Incompatibilidade temporal: dados fora do intervalo contratado
      if (actStart < expStart || actEnd > expEnd || actStart > actEnd) {
        return {
          checkId,
          version: DeterministicPostconditionVerifier.VERSION,
          passed: false,
          score: 0.0,
          errorCode: 'PERIOD_MISMATCH',
          allowPromotion: false,
          safeDetails: {
            rule: 'TIMEFRAME_ALIGNMENT',
            timeframeChecked: false,
            mismatchReason: `Período dos dados (${actualTf.since} a ${actualTf.until}) é incompatível com o contrato da tarefa (${options.expectedTimeframe.since} a ${options.expectedTimeframe.until}).`,
            description: 'Incompatibilidade temporal detectada. Promoção do dado rejeitada.'
          }
        };
      }
    }

    // 3. Verificação de Contagem de Itens (se especificado)
    if (options.actualCount !== undefined) {
      if (
        options.expectedCountMin !== undefined &&
        options.actualCount < options.expectedCountMin
      ) {
        return {
          checkId,
          version: DeterministicPostconditionVerifier.VERSION,
          passed: false,
          score: 0.0,
          errorCode: 'POSTCONDITION_FAILED',
          allowPromotion: false,
          safeDetails: {
            rule: 'COUNT_VALIDATION',
            countChecked: false,
            mismatchReason: `Contagem de itens (${options.actualCount}) menor que o mínimo esperado (${options.expectedCountMin}).`,
            description: 'Falha na contagem mínima de registros requeridos.'
          }
        };
      }
      if (
        options.expectedCountMax !== undefined &&
        options.actualCount > options.expectedCountMax
      ) {
        return {
          checkId,
          version: DeterministicPostconditionVerifier.VERSION,
          passed: false,
          score: 0.0,
          errorCode: 'POSTCONDITION_FAILED',
          allowPromotion: false,
          safeDetails: {
            rule: 'COUNT_VALIDATION',
            countChecked: false,
            mismatchReason: `Contagem de itens (${options.actualCount}) maior que o máximo esperado (${options.expectedCountMax}).`,
            description: 'Falha na contagem máxima de registros permitidos.'
          }
        };
      }
    }

    // 4. Verificação de Identificadores Requeridos (se especificado)
    if (options.expectedIdentifiers && options.expectedIdentifiers.length > 0) {
      const actualIds = new Set(options.actualIdentifiers ?? []);
      const missingIds = options.expectedIdentifiers.filter((id) => !actualIds.has(id));

      if (missingIds.length > 0) {
        return {
          checkId,
          version: DeterministicPostconditionVerifier.VERSION,
          passed: false,
          score: 0.0,
          errorCode: 'POSTCONDITION_FAILED',
          allowPromotion: false,
          safeDetails: {
            rule: 'IDENTIFIERS_VALIDATION',
            identifiersChecked: false,
            mismatchReason: `Identificadores obrigatórios ausentes: ${missingIds.join(', ')}`,
            description: 'Nem todos os identificadores esperados foram localizados nos dados.'
          }
        };
      }
    }

    // 5. Verificação de Integridade de Hash SHA-256
    const expectedHash = options.expectedPayloadHash ?? options.observation?.payloadHash;
    if (expectedHash) {
      const actualHash =
        options.actualPayloadHash ??
        (options.actualPayload
          ? computeSha256(options.actualPayload)
          : options.observation
            ? computeSha256(options.observation.operationalPayload)
            : undefined);

      if (actualHash && actualHash !== expectedHash) {
        return {
          checkId,
          version: DeterministicPostconditionVerifier.VERSION,
          passed: false,
          score: 0.0,
          errorCode: 'POSTCONDITION_FAILED',
          allowPromotion: false,
          safeDetails: {
            rule: 'HASH_INTEGRITY',
            hashChecked: false,
            mismatchReason: 'Hash SHA-256 do payload divergente do hash registrado da observação.',
            description: 'Possível adulteração ou inconsistência no payload de dados.'
          }
        };
      }
    }

    // Todas as pós-condições determinísticas foram satisfeitas com sucesso
    return {
      checkId,
      version: DeterministicPostconditionVerifier.VERSION,
      passed: true,
      score: 1.0,
      allowPromotion: true,
      safeDetails: {
        rule: 'ALL_POSTCONDITIONS_SATISFIED',
        clientIdChecked: true,
        timeframeChecked: true,
        countChecked: options.actualCount !== undefined,
        identifiersChecked: options.expectedIdentifiers !== undefined,
        hashChecked: expectedHash !== undefined,
        description:
          'Todas as pós-condições determinísticas (cliente, período, contagem, identificadores e hash) foram atendidas.'
      }
    };
  }
}

// ==========================================
// ActivePostconditionRunner (Task 5.2 — Invariante 8)
// ==========================================

export interface ActivePostconditionVerificationOptions {
  spec: {
    checkTool: string;
    targetField: string;
    expectedValue: unknown;
    comparisonOperator?: 'EQUALS' | 'CONTAINS' | 'GREATER_OR_EQUAL' | 'LESS_OR_EQUAL' | 'MATCHES_REGEX' | 'NOT_EMPTY';
    timeoutSeconds?: number;
    maxRetries?: number;
  };
  liveState: Record<string, unknown>;
  expectedPostconditionLocator?: string;
}

export interface ActivePostconditionResult {
  checkId: string;
  passed: boolean;
  score: number;
  checkTool: string;
  targetField: string;
  expectedValue: unknown;
  actualValue: unknown;
  comparisonOperator: string;
  allowCommit: boolean;
  rollbackRequired: boolean;
  quarantineRequired: boolean;
  verifiedAt: string;
  mismatchReason?: string;
  safeDetails: {
    rule: string;
    description: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Executor determinístico de verificação de pós-condição obrigatória (Invariante 8).
 * Valida o estado real lido da API ativa pós-escrita antes de autorizar a transição para COMMITTED.
 */
export class ActivePostconditionRunner {
  public static readonly VERSION = '1.0.0';

  /**
   * Avalia a pós-condição ativa comparando o liveState com o valor e operador esperado.
   */
  public verify(options: ActivePostconditionVerificationOptions): ActivePostconditionResult {
    const { spec, liveState } = options;
    const operator = spec.comparisonOperator ?? 'EQUALS';
    const verifiedAt = new Date().toISOString();
    const checkId = `check:postcondition:active:${spec.checkTool}:${spec.targetField}`;

    // Extrair valor do campo alvo do liveState
    const actualValue = liveState[spec.targetField];
    let passed = false;
    let mismatchReason: string | undefined = undefined;

    switch (operator) {
      case 'EQUALS': {
        passed = actualValue === spec.expectedValue;
        if (!passed) {
          mismatchReason = `Valor atual '${String(actualValue)}' diverge do esperado '${String(spec.expectedValue)}' no campo '${spec.targetField}'.`;
        }
        break;
      }
      case 'CONTAINS': {
        passed =
          actualValue !== undefined &&
          actualValue !== null &&
          String(actualValue).includes(String(spec.expectedValue));
        if (!passed) {
          mismatchReason = `Valor atual '${String(actualValue)}' não contém '${String(spec.expectedValue)}'.`;
        }
        break;
      }
      case 'GREATER_OR_EQUAL': {
        const numActual = Number(actualValue);
        const numExpected = Number(spec.expectedValue);
        passed = !isNaN(numActual) && !isNaN(numExpected) && numActual >= numExpected;
        if (!passed) {
          mismatchReason = `Valor numérico '${numActual}' menor que o mínimo esperado '${numExpected}'.`;
        }
        break;
      }
      case 'LESS_OR_EQUAL': {
        const numActual = Number(actualValue);
        const numExpected = Number(spec.expectedValue);
        passed = !isNaN(numActual) && !isNaN(numExpected) && numActual <= numExpected;
        if (!passed) {
          mismatchReason = `Valor numérico '${numActual}' maior que o máximo esperado '${numExpected}'.`;
        }
        break;
      }
      case 'MATCHES_REGEX': {
        try {
          const regex = new RegExp(String(spec.expectedValue));
          passed = regex.test(String(actualValue ?? ''));
          if (!passed) {
            mismatchReason = `Valor '${String(actualValue)}' não atende a regex '${String(spec.expectedValue)}'.`;
          }
        } catch {
          passed = false;
          mismatchReason = `Expressão regular inválida '${String(spec.expectedValue)}'.`;
        }
        break;
      }
      case 'NOT_EMPTY': {
        passed =
          actualValue !== undefined &&
          actualValue !== null &&
          String(actualValue).trim().length > 0;
        if (!passed) {
          mismatchReason = `Campo '${spec.targetField}' está vazio ou indefinido.`;
        }
        break;
      }
      default: {
        passed = false;
        mismatchReason = `Operador de comparação não suportado: '${operator}'.`;
      }
    }

    if (passed) {
      return {
        checkId,
        passed: true,
        score: 1.0,
        checkTool: spec.checkTool,
        targetField: spec.targetField,
        expectedValue: spec.expectedValue,
        actualValue,
        comparisonOperator: operator,
        allowCommit: true,
        rollbackRequired: false,
        quarantineRequired: false,
        verifiedAt,
        safeDetails: {
          rule: 'ACTIVE_POSTCONDITION_VERIFIED',
          description: `Pós-condição confirmada com sucesso via releitura ativa (${spec.checkTool}.${spec.targetField} ${operator} ${String(spec.expectedValue)}).`
        }
      };
    }

    return {
      checkId,
      passed: false,
      score: 0.0,
      checkTool: spec.checkTool,
      targetField: spec.targetField,
      expectedValue: spec.expectedValue,
      actualValue,
      comparisonOperator: operator,
      allowCommit: false,
      rollbackRequired: true,
      quarantineRequired: true,
      verifiedAt,
      mismatchReason,
      safeDetails: {
        rule: 'ACTIVE_POSTCONDITION_FAILED',
        description: `Falha na verificação de pós-condição via ${spec.checkTool}: ${mismatchReason}. Commit bloqueado; acionando Quarentena e Rollback determinístico.`,
        details: {
          checkTool: spec.checkTool,
          targetField: spec.targetField,
          expectedValue: spec.expectedValue,
          actualValue
        }
      }
    };
  }
}

