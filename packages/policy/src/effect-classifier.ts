import { AllowedEffect, ApprovalPolicy } from '@adzhub/contracts';
import { PolicyEnvironment } from './index.js';

/**
 * Categorias de efeitos do sistema governado.
 * Separação estrita entre operações de leitura, persistência interna,
 * mutação externa e controle do ambiente.
 */
export type EffectCategory = 'READ' | 'INTERNAL_WRITE' | 'EXTERNAL_WRITE' | 'CONTROL';

/**
 * Níveis de risco operacional para autorização e governança.
 */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Metadados normativos e imutáveis de cada efeito suportado pelo microkernel.
 */
export interface EffectMetadata {
  readonly effect: AllowedEffect;
  readonly category: EffectCategory;
  readonly riskLevel: RiskLevel;
  readonly isExternalMutation: boolean;
  readonly isInternalPersistence: boolean;
  readonly isReadOperation: boolean;
  readonly requiresHumanApprovalByDefault: boolean;
  readonly description: string;
}

/**
 * Catálogo canônico estático dos 8 efeitos mínimos do Microkernel PEV-C.
 * Qualquer ação fora deste catálogo é rejeitada deny-by-default.
 */
export const EFFECT_CATALOG: Readonly<Record<AllowedEffect, EffectMetadata>> = Object.freeze({
  'read:memory': {
    effect: 'read:memory',
    category: 'READ',
    riskLevel: 'LOW',
    isExternalMutation: false,
    isInternalPersistence: false,
    isReadOperation: true,
    requiresHumanApprovalByDefault: false,
    description: 'Leitura de memórias, histórico, grafo e timeline prévios no Supercérebro'
  },
  'read:meta': {
    effect: 'read:meta',
    category: 'READ',
    riskLevel: 'LOW',
    isExternalMutation: false,
    isInternalPersistence: false,
    isReadOperation: true,
    requiresHumanApprovalByDefault: false,
    description: 'Leitura de anúncios, métricas de performance e criativos da Meta Ads API'
  },
  'read:crm': {
    effect: 'read:crm',
    category: 'READ',
    riskLevel: 'LOW',
    isExternalMutation: false,
    isInternalPersistence: false,
    isReadOperation: true,
    requiresHumanApprovalByDefault: false,
    description: 'Leitura de pedidos, clientes e oportunidades de venda no CRM'
  },
  'read:app': {
    effect: 'read:app',
    category: 'READ',
    riskLevel: 'LOW',
    isExternalMutation: false,
    isInternalPersistence: false,
    isReadOperation: true,
    requiresHumanApprovalByDefault: false,
    description: 'Leitura e execução determinística de pacotes de análise e inteligência (apps)'
  },
  'write:staging': {
    effect: 'write:staging',
    category: 'INTERNAL_WRITE',
    riskLevel: 'LOW',
    isExternalMutation: false,
    isInternalPersistence: true,
    isReadOperation: false,
    requiresHumanApprovalByDefault: false,
    description: 'Persistência transitória e staging de observações ou artefatos provisórios'
  },
  'write:insight': {
    effect: 'write:insight',
    category: 'INTERNAL_WRITE',
    riskLevel: 'MEDIUM',
    isExternalMutation: false,
    isInternalPersistence: true,
    isReadOperation: false,
    requiresHumanApprovalByDefault: false,
    description: 'Commit definitivo de relatórios verificados na memória canônica do sistema'
  },
  external_write: {
    effect: 'external_write',
    category: 'EXTERNAL_WRITE',
    riskLevel: 'HIGH',
    isExternalMutation: true,
    isInternalPersistence: false,
    isReadOperation: false,
    requiresHumanApprovalByDefault: true,
    description:
      'Mutação em sistemas de terceiros (ex: pausar anúncios ou alterar orçamentos no Meta Ads)'
  },
  'demo:control': {
    effect: 'demo:control',
    category: 'CONTROL',
    riskLevel: 'LOW',
    isExternalMutation: false,
    isInternalPersistence: false,
    isReadOperation: false,
    requiresHumanApprovalByDefault: false,
    description: 'Controle de parâmetros de demonstração e simulação de anomalias/cenários'
  }
});

/**
 * Obtém os metadados estáticos de um efeito conhecido.
 * Retorna undefined caso o efeito não conste no catálogo.
 */
export function getEffectMetadata(effect: string): EffectMetadata | undefined {
  return (EFFECT_CATALOG as Record<string, EffectMetadata>)[effect];
}

/**
 * Verifica se um efeito representa mutação externa a sistemas de terceiros.
 */
export function isExternalMutationEffect(effect: string): boolean {
  const meta = getEffectMetadata(effect);
  return meta ? meta.isExternalMutation : false;
}

/**
 * Verifica se um efeito representa persistência interna em banco local/staging.
 */
export function isInternalPersistenceEffect(effect: string): boolean {
  const meta = getEffectMetadata(effect);
  return meta ? meta.isInternalPersistence : false;
}

/**
 * Verifica se um efeito é uma operação de leitura segura.
 */
export function isReadOperationEffect(effect: string): boolean {
  const meta = getEffectMetadata(effect);
  return meta ? meta.isReadOperation : false;
}

/**
 * Avalia previamente o risco e os requisitos de aprovação antes de qualquer chamada de ferramenta.
 */
export interface PreExecutionRiskEvaluation {
  effect: AllowedEffect | string;
  category: EffectCategory | 'UNKNOWN';
  riskLevel: RiskLevel | 'CRITICAL';
  isExternalMutation: boolean;
  isInternalPersistence: boolean;
  requiresApproval: boolean;
  approvalReason?: string;
}

export function evaluatePreExecutionRisk(params: {
  effect: AllowedEffect | string;
  approvalPolicy?: ApprovalPolicy;
  environment?: PolicyEnvironment;
}): PreExecutionRiskEvaluation {
  const meta = getEffectMetadata(params.effect);

  if (!meta) {
    return {
      effect: params.effect,
      category: 'UNKNOWN',
      riskLevel: 'CRITICAL',
      isExternalMutation: false,
      isInternalPersistence: false,
      requiresApproval: true,
      approvalReason: `Efeito desconhecido '${params.effect}'. Rejeitado deny-by-default.`
    };
  }

  let requiresApproval = false;
  let approvalReason: string | undefined = undefined;

  // 1. Escrita Externa: sempre requer aprovação em demo ou se configurado na task policy
  if (meta.isExternalMutation) {
    if (params.environment?.env === 'demo' || params.environment?.externalWritesEnabled === false) {
      requiresApproval = true;
      approvalReason =
        'Mutação externa bloqueada/requer aprovação em ambiente de demonstração e segurança.';
    } else if (params.approvalPolicy?.externalWritesRequireApproval !== false) {
      requiresApproval = true;
      approvalReason =
        'Mutação externa exige aprovação humana explícita segundo a política da tarefa.';
    }
  }

  // 2. Operações de leitura: se autoApproveReadOnly for explicitamente falso
  if (meta.isReadOperation && params.approvalPolicy?.autoApproveReadOnly === false) {
    requiresApproval = true;
    approvalReason = 'Aprovação manual exigida mesmo para operações de leitura.';
  }

  return {
    effect: meta.effect,
    category: meta.category,
    riskLevel: meta.riskLevel,
    isExternalMutation: meta.isExternalMutation,
    isInternalPersistence: meta.isInternalPersistence,
    requiresApproval,
    approvalReason
  };
}

/**
 * Garante que o efeito utilizado seja estritamente o declarado estaticamente no contrato/tool,
 * impedindo qualquer tentativa do modelo ou de outputs de texto de alterar ou inferir o efeito.
 */
export function assertStaticEffect(
  declaredEffect: AllowedEffect | string,
  untrustedToolOutput?: unknown
): AllowedEffect {
  const meta = getEffectMetadata(declaredEffect);
  if (!meta) {
    throw new Error(`Efeito inválido ou desconhecido: '${declaredEffect}'`);
  }

  // Se o output retornado tentar injetar ou sobrepor campo 'effect', rejeita sumariamente
  if (untrustedToolOutput && typeof untrustedToolOutput === 'object') {
    const rawObj = untrustedToolOutput as Record<string, unknown>;
    if ('effect' in rawObj && rawObj.effect !== meta.effect) {
      throw new Error(
        `Violação de segurança: tentativa de inferir/alterar effect ('${String(rawObj.effect)}') a partir do payload de retorno da ferramenta.`
      );
    }
  }

  return meta.effect;
}
