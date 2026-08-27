import { randomUUID } from 'node:crypto';
import { Evidence, Observation, ArtifactClaim, OperationalValidators } from '@adzhub/contracts';
import { ObservationStaging, calculatePayloadHash } from './observation-staging.js';

/**
 * Parâmetros para criação de uma Evidence atômica verificada.
 */
export interface CreateEvidenceParams {
  taskId: string;
  runId: string;
  observationId: string;
  locator: string; // Ex: "jsonpath:$.leads[0].deal_id" ou "fields.spend_brl"
  claim: string; // Afirmação factual fundamentada
  checkId: string; // ID do check de verificação que validou o fato
  score?: number; // Score de confiança/cobertura [0.0, 1.0]
  freshnessSeconds?: number;
  status?: 'VALID' | 'STALE' | 'INVALID';
  payloadValue?: unknown; // Valor do campo extraído pelo locator
}

/**
 * Item de navegação resolvido para UI de claim para evidência e observação fonte.
 */
export interface ClaimEvidenceNavigationNode {
  claimId: string;
  claimText: string;
  evidence: Evidence;
  observation?: Observation;
  extractedValue?: unknown;
  integrityVerified: boolean;
  hashMismatch?: boolean;
}

/**
 * Utilitário seguro para resolver locators simples (dot-notation / basic jsonpath) em objetos JavaScript.
 */
export function resolveLocatorValue(data: unknown, locator: string): unknown {
  if (!data || typeof data !== 'object') return undefined;

  // Remove prefixos como 'jsonpath:$.', 'jsonpath:$', 'fields.'
  const cleanPath = locator
    .replace(/^jsonpath:\$\.?/, '')
    .replace(/^fields\./, '')
    .trim();

  if (!cleanPath) return data;

  const parts = cleanPath.split(/\.|\[(\d+)\]/).filter(Boolean);
  let current: any = data;

  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }

  return current;
}

/**
 * Gerenciador de EvidenceRefs e Locators.
 * Garante que:
 * 1. Cada claim verificável aponte para observation, locator e check válidos;
 * 2. Referências quebradas (observation inexistente, locator inválido) sejam rejeitadas;
 * 3. A UI consiga navegar de claim para evidência e para a observação original;
 * 4. O hash do payload da observação permita detectar qualquer alteração após verificação.
 */
export class EvidenceRefManager {
  private evidenceMap: Map<string, Evidence> = new Map();
  private observationStaging: ObservationStaging;

  constructor(staging: ObservationStaging) {
    this.observationStaging = staging;
  }

  /**
   * Cria e registra uma nova Evidence atômica vinculada a uma Observation em staging.
   * Rejeita referências quebradas se a observação não existir no staging.
   */
  public createEvidence(params: CreateEvidenceParams): Evidence {
    const observation = this.observationStaging.getObservation(params.observationId);
    if (!observation) {
      throw new Error(
        `Referência quebrada (BROKEN_REF): Observação '${params.observationId}' não encontrada no staging.`
      );
    }

    // Valida se o locator é passível de resolução no payload
    resolveLocatorValue(observation.operationalPayload, params.locator);

    const evidenceId = `evi_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const rawEvidence: Evidence = {
      schemaVersion: '1.0.0',
      evidenceId,
      taskId: params.taskId,
      runId: params.runId,
      observationId: params.observationId,
      locator: params.locator,
      claim: params.claim,
      checkId: params.checkId,
      score: params.score ?? 1.0,
      freshnessSeconds: params.freshnessSeconds ?? 0,
      status: params.status ?? 'VALID',
      createdAt: new Date().toISOString()
    };

    const validated = OperationalValidators.validateEvidence(rawEvidence);
    this.evidenceMap.set(validated.evidenceId, validated);
    return validated;
  }

  /**
   * Obtém uma evidência pelo ID.
   */
  public getEvidence(evidenceId: string): Evidence | undefined {
    return this.evidenceMap.get(evidenceId);
  }

  /**
   * Valida se uma claim de artefato possui EvidenceRefs íntegras e não quebradas.
   */
  public validateClaimRefs(claim: ArtifactClaim): {
    valid: boolean;
    brokenRefs: string[];
    missingObservations: string[];
  } {
    const brokenRefs: string[] = [];
    const missingObservations: string[] = [];

    for (const refId of claim.evidenceRefs) {
      const evi = this.evidenceMap.get(refId);
      if (!evi) {
        brokenRefs.push(refId);
        continue;
      }

      const obs = this.observationStaging.getObservation(evi.observationId);
      if (!obs) {
        missingObservations.push(evi.observationId);
      }
    }

    return {
      valid: brokenRefs.length === 0 && missingObservations.length === 0,
      brokenRefs,
      missingObservations
    };
  }

  /**
   * Navega de uma Claim para suas evidências e observações associadas,
   * verificando se o hash da observação não foi adulterado pós-verificação.
   */
  public navigateClaimToEvidence(claim: ArtifactClaim): ClaimEvidenceNavigationNode[] {
    const nodes: ClaimEvidenceNavigationNode[] = [];

    for (const refId of claim.evidenceRefs) {
      const evi = this.evidenceMap.get(refId);
      if (!evi) {
        throw new Error(`Referência quebrada detectada para EvidenceId '${refId}'`);
      }

      const obs = this.observationStaging.getObservation(evi.observationId);
      let integrityVerified = false;
      let hashMismatch = false;
      let extractedValue: unknown = undefined;

      if (obs) {
        const currentHash = calculatePayloadHash(obs.operationalPayload);
        integrityVerified = currentHash === obs.payloadHash;
        hashMismatch = !integrityVerified;
        extractedValue = resolveLocatorValue(obs.operationalPayload, evi.locator);
      }

      nodes.push({
        claimId: claim.claimId,
        claimText: claim.text,
        evidence: evi,
        observation: obs,
        extractedValue,
        integrityVerified,
        hashMismatch
      });
    }

    return nodes;
  }
}
