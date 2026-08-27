import { z } from 'zod';
import { RuntimeErrorCode } from '@adzhub/contracts';

/**
 * Resultado padronizado de uma verificação estrutural.
 */
export interface StructuralCheckResult {
  checkId: string;
  version: string;
  passed: boolean;
  score: number;
  errorCode?: RuntimeErrorCode;
  allowRetry: boolean;
  safeDetails: {
    schemaName?: string;
    missingFields?: string[];
    invalidFields?: Array<{
      path: string;
      expected: string;
      received: string;
      message: string;
    }>;
    totalFieldsEvaluated?: number;
    description?: string;
  };
}

/**
 * Motor de verificação estrutural estrita para dados brutos, retornos de tools e schemas.
 * Garante que falhas gerem INVALID_SCHEMA sem retry cego (allowRetry = false) e com detalhes seguros.
 */
export class StructuralVerifier {
  public static readonly VERSION = '1.0.0';

  /**
   * Valida um payload desconhecido contra um ZodSchema arbitrário.
   */
  public verifySchema<T>(
    schema: z.ZodType<T>,
    data: unknown,
    options?: { checkId?: string; schemaName?: string }
  ): StructuralCheckResult {
    const checkId = options?.checkId ?? 'check:structural:schema';
    const schemaName = options?.schemaName ?? 'AnonymousSchema';

    const parseResult = schema.safeParse(data);

    if (parseResult.success) {
      return {
        checkId,
        version: StructuralVerifier.VERSION,
        passed: true,
        score: 1.0,
        allowRetry: false,
        safeDetails: {
          schemaName,
          description: `Schema '${schemaName}' validado com sucesso sem violações estruturais.`
        }
      };
    }

    // Mapeia erros de validação do Zod para detalhes seguros e sanitizados
    const invalidFields = parseResult.error.issues.map((issue) => ({
      path: issue.path.length > 0 ? issue.path.join('.') : 'root',
      expected: 'expected' in issue ? String(issue.expected) : issue.code,
      received: 'received' in issue ? String(issue.received) : 'invalid',
      message: issue.message
    }));

    return {
      checkId,
      version: StructuralVerifier.VERSION,
      passed: false,
      score: 0.0,
      errorCode: 'INVALID_SCHEMA',
      allowRetry: false, // Critério M4-02: schema inválido não recebe retry
      safeDetails: {
        schemaName,
        invalidFields,
        totalFieldsEvaluated: invalidFields.length,
        description: `Falha na verificação estrutural do schema '${schemaName}'. Campos inválidos ou ausentes detectados.`
      }
    };
  }

  /**
   * Valida campos obrigatórios em objetos de chave-valor.
   */
  public verifyRequiredKeys<T extends Record<string, unknown>>(
    data: T,
    requiredKeys: (keyof T)[],
    options?: { checkId?: string; schemaName?: string }
  ): StructuralCheckResult {
    const checkId = options?.checkId ?? 'check:structural:required_keys';
    const schemaName = options?.schemaName ?? 'Record';

    if (!data || typeof data !== 'object') {
      return {
        checkId,
        version: StructuralVerifier.VERSION,
        passed: false,
        score: 0.0,
        errorCode: 'INVALID_SCHEMA',
        allowRetry: false,
        safeDetails: {
          schemaName,
          missingFields: requiredKeys.map(String),
          totalFieldsEvaluated: requiredKeys.length,
          description: 'Objeto fornecido é nulo ou não é um objeto válido.'
        }
      };
    }

    const missing = requiredKeys.filter((key) => data[key] === undefined || data[key] === null);
    const passed = missing.length === 0;

    return {
      checkId,
      version: StructuralVerifier.VERSION,
      passed,
      score: passed ? 1.0 : 0.0,
      errorCode: passed ? undefined : 'INVALID_SCHEMA',
      allowRetry: false, // Critério M4-02: schema inválido não recebe retry
      safeDetails: {
        schemaName,
        missingFields: missing.map(String),
        totalFieldsEvaluated: requiredKeys.length,
        description: passed
          ? `Todos os ${requiredKeys.length} campos obrigatórios estão presentes.`
          : `${missing.length} campo(s) obrigatório(s) ausente(s): ${missing.map(String).join(', ')}`
      }
    };
  }
}
