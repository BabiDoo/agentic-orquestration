/**
 * @adzhub/verify
 * Motor de verificação determinística, scoring de evidência e quarentena de dados.
 */
import { z } from 'zod';
import { TaskContract } from '@adzhub/contracts';
import { StructuralVerifier, StructuralCheckResult } from './structural-verifier.js';
import {
  DeterministicPostconditionVerifier,
  DeterministicPostconditionOptions,
  PostconditionCheckResult,
  ActivePostconditionRunner,
  ActivePostconditionVerificationOptions,
  ActivePostconditionResult
} from './postcondition-verifier.js';
import {
  SemanticAuxiliaryVerifier,
  SemanticVerificationOptions,
  SemanticCheckResult
} from './semantic-verifier.js';
import { EvidenceScorer, ScoreInput, EvidenceScoreResult } from './evidence-scorer.js';
import { ObservationStaging } from './observation-staging.js';
import { EvidenceRefManager } from './evidence-ref-manager.js';
import { QuarantineManager } from './quarantine-manager.js';
import {
  delimitUntrustedData,
  ContractAuthorityGuard,
  UntrustedDataSanitizationResult
} from './prompt-injection-guard.js';

export * from './observation-staging.js';
export * from './structural-verifier.js';
export * from './postcondition-verifier.js';
export * from './semantic-verifier.js';
export * from './evidence-scorer.js';
export * from './evidence-ref-manager.js';
export * from './quarantine-manager.js';
export * from './prompt-injection-guard.js';

export interface VerificationCheckResult {
  checkId: string;
  passed: boolean;
  score: number;
  details?: Record<string, unknown>;
}

export class Verifier {
  private structuralVerifier = new StructuralVerifier();
  private postconditionVerifier = new DeterministicPostconditionVerifier();
  private activePostconditionRunner = new ActivePostconditionRunner();
  private semanticVerifier = new SemanticAuxiliaryVerifier();
  private evidenceScorer = new EvidenceScorer();
  private observationStaging: ObservationStaging;
  private evidenceRefManager: EvidenceRefManager;
  private quarantineManager: QuarantineManager;

  constructor(staging?: ObservationStaging, quarantine?: QuarantineManager) {
    this.observationStaging = staging ?? new ObservationStaging();
    this.evidenceRefManager = new EvidenceRefManager(this.observationStaging);
    this.quarantineManager = quarantine ?? new QuarantineManager();
  }

  public getStaging(): ObservationStaging {
    return this.observationStaging;
  }

  public getEvidenceManager(): EvidenceRefManager {
    return this.evidenceRefManager;
  }

  public getQuarantineManager(): QuarantineManager {
    return this.quarantineManager;
  }

  public verifyStructural<T extends Record<string, unknown>>(
    data: T,
    requiredKeys: (keyof T)[]
  ): VerificationCheckResult {
    const res = this.structuralVerifier.verifyRequiredKeys(data, requiredKeys);
    return {
      checkId: res.checkId,
      passed: res.passed,
      score: res.score,
      details: res.safeDetails as Record<string, unknown>
    };
  }

  public verifySchema<T>(
    schema: z.ZodType<T>,
    data: unknown,
    options?: { checkId?: string; schemaName?: string }
  ): StructuralCheckResult {
    return this.structuralVerifier.verifySchema(schema, data, options);
  }

  public verifyPostconditions(
    options: DeterministicPostconditionOptions
  ): PostconditionCheckResult {
    return this.postconditionVerifier.verify(options);
  }

  public verifyActivePostcondition(
    options: ActivePostconditionVerificationOptions
  ): ActivePostconditionResult {
    return this.activePostconditionRunner.verify(options);
  }

  public verifySemantic(options: SemanticVerificationOptions): SemanticCheckResult {
    return this.semanticVerifier.verify(options);
  }

  public scoreEvidence(input: ScoreInput): EvidenceScoreResult {
    return this.evidenceScorer.evaluate(input);
  }

  public sanitizeUntrustedData(
    content: unknown,
    sourceLabel?: string
  ): UntrustedDataSanitizationResult {
    return delimitUntrustedData(content, sourceLabel);
  }

  public verifyContractImmutability(original: TaskContract, current: TaskContract) {
    return ContractAuthorityGuard.verifyContractImmutability(original, current);
  }

  public calculateEvidenceCoverage(matchedCount: number, totalCount: number): number {
    if (totalCount <= 0) return 0.0;
    return Math.min(1.0, Math.max(0.0, matchedCount / totalCount));
  }
}
