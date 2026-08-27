import { randomUUID } from 'node:crypto';
import { QuarantineItem, OperationalValidators, TraceEvent } from '@adzhub/contracts';

export type QuarantineReasonCode =
  | 'LOW_COVERAGE'
  | 'SCHEMA_VIOLATION'
  | 'UNRESOLVED_CONFLICT'
  | 'PERIOD_MISMATCH'
  | 'SUSPECTED_INJECTION';

export interface QuarantineAdmissionParams {
  taskId: string;
  runId: string;
  sourceId: string; // Ex: observationId, datasetFileId, claimId
  reasonCode: QuarantineReasonCode;
  reasonDetails: string;
  ttlSeconds?: number;
  requiredResolution: string;
  quarantinedAt?: string;
  payload?: unknown;
}

export interface QuarantineResolutionCheck {
  checkId: string;
  recheck: () =>
    | Promise<{ passed: boolean; details?: Record<string, unknown> }>
    | { passed: boolean; details?: Record<string, unknown> };
}

/**
 * Gerenciador de Quarentena do Verify Path.
 * Retém e isola dados ou observações com baixa cobertura (S2), violações de schema,
 * conflitos, incompatibilidade de período (S3) ou injeções adversariais (S4).
 *
 * Regras:
 * 1. Cada item informa reasonCode, status, TTL e requiredResolution;
 * 2. Itens expirados não podem ser promovidos;
 * 3. Resolução reexecuta checks aplicáveis;
 * 4. Emite eventos rastreáveis para inspeção na UI / EventLog.
 */
export class QuarantineManager {
  private itemsMap: Map<string, QuarantineItem> = new Map();
  private quarantinedPayloads: Map<string, unknown> = new Map();
  private onQuarantineEvent?: (event: TraceEvent) => void;

  constructor(options?: { onQuarantineEvent?: (event: TraceEvent) => void }) {
    this.onQuarantineEvent = options?.onQuarantineEvent;
  }

  /**
   * Admite um dado ou observação suspeita em quarentena.
   */
  public admit(params: QuarantineAdmissionParams): QuarantineItem {
    const quarantineId = `quar_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const quarantinedAt = params.quarantinedAt ?? new Date().toISOString();
    const ttlSeconds = params.ttlSeconds ?? 3600; // Padrão: 1 hora

    const rawItem: QuarantineItem = {
      schemaVersion: '1.0.0',
      quarantineId,
      taskId: params.taskId,
      runId: params.runId,
      sourceId: params.sourceId,
      reasonCode: params.reasonCode,
      reasonDetails: params.reasonDetails,
      quarantinedAt,
      ttlSeconds,
      requiredResolution: params.requiredResolution,
      status: 'ACTIVE'
    };

    const validated = OperationalValidators.validateQuarantineItem(rawItem);
    this.itemsMap.set(validated.quarantineId, validated);

    if (params.payload !== undefined) {
      this.quarantinedPayloads.set(validated.quarantineId, params.payload);
    }

    // Emite evento de quarentena rastreável para Inspector e Trace
    if (this.onQuarantineEvent) {
      const traceEvent: TraceEvent = {
        schemaVersion: '1.0.0',
        eventId: `evt_quar_${randomUUID().replace(/-/g, '').slice(0, 10)}`,
        seq: Date.now(),
        taskId: params.taskId,
        runId: params.runId,
        eventType: 'QUARANTINE_RECORDED',
        correlationId: params.runId,
        phase: 'VERIFY',
        operationalPayload: {
          quarantineId: validated.quarantineId,
          sourceId: validated.sourceId,
          reasonCode: validated.reasonCode,
          reasonDetails: validated.reasonDetails,
          requiredResolution: validated.requiredResolution,
          ttlSeconds: validated.ttlSeconds
        },
        redactedPayload: {
          quarantineId: validated.quarantineId,
          reasonCode: validated.reasonCode,
          status: 'ACTIVE'
        },
        timestamp: quarantinedAt
      };
      this.onQuarantineEvent(traceEvent);
    }

    return validated;
  }

  /**
   * Obtém item de quarentena atualizando dinamicamente o status se expirado pelo TTL.
   */
  public getItem(quarantineId: string): QuarantineItem | undefined {
    const item = this.itemsMap.get(quarantineId);
    if (!item) return undefined;

    // Checagem de TTL
    if (item.status === 'ACTIVE') {
      const quarantinedTime = new Date(item.quarantinedAt).getTime();
      const expirationTime = quarantinedTime + item.ttlSeconds * 1000;
      if (Date.now() > expirationTime) {
        item.status = 'EXPIRED';
        this.itemsMap.set(quarantineId, item);
      }
    }

    return item;
  }

  /**
   * Lista itens em quarentena com opção de filtros.
   */
  public listItems(filter?: {
    taskId?: string;
    runId?: string;
    status?: QuarantineItem['status'];
    reasonCode?: QuarantineReasonCode;
  }): QuarantineItem[] {
    const now = Date.now();
    const result: QuarantineItem[] = [];

    for (const item of this.itemsMap.values()) {
      if (item.status === 'ACTIVE') {
        const quarantinedTime = new Date(item.quarantinedAt).getTime();
        const expirationTime = quarantinedTime + item.ttlSeconds * 1000;
        if (now > expirationTime) {
          item.status = 'EXPIRED';
        }
      }

      if (filter?.taskId && item.taskId !== filter.taskId) continue;
      if (filter?.runId && item.runId !== filter.runId) continue;
      if (filter?.status && item.status !== filter.status) continue;
      if (filter?.reasonCode && item.reasonCode !== filter.reasonCode) continue;

      result.push(item);
    }

    return result;
  }

  /**
   * Avalia se um item em quarentena é elegível para promoção.
   * Regra estrita (M4-07): Itens ACTIVE ou EXPIRED NUNCA podem ser promovidos.
   */
  public isEligibleForPromotion(quarantineId: string): {
    eligible: boolean;
    reason?: string;
  } {
    const item = this.getItem(quarantineId);
    if (!item) {
      return { eligible: false, reason: 'Item de quarentena não encontrado.' };
    }

    if (item.status === 'EXPIRED') {
      return {
        eligible: false,
        reason: `Item expirado pelo TTL (${item.ttlSeconds}s). Promoção permanentemente bloqueada.`
      };
    }

    if (item.status === 'ACTIVE') {
      return {
        eligible: false,
        reason: `Item ainda ativo em quarentena pendente de resolução: ${item.requiredResolution}`
      };
    }

    return { eligible: true };
  }

  /**
   * Resolve um item de quarentena reexecutando checks aplicáveis.
   */
  public async resolve(
    quarantineId: string,
    resolutionCheck: QuarantineResolutionCheck
  ): Promise<{
    resolved: boolean;
    item: QuarantineItem;
    checkResult: { passed: boolean; details?: Record<string, unknown> };
  }> {
    const item = this.getItem(quarantineId);
    if (!item) {
      throw new Error(`Item ${quarantineId} não encontrado em quarentena`);
    }

    if (item.status === 'EXPIRED') {
      throw new Error(
        `Item ${quarantineId} está EXPIRED e não pode ser re-avaliado nem resolvido.`
      );
    }

    const checkResult = await Promise.resolve(resolutionCheck.recheck());

    if (checkResult.passed) {
      item.status = 'RESOLVED';
      this.itemsMap.set(quarantineId, item);
    }

    return {
      resolved: checkResult.passed,
      item,
      checkResult
    };
  }

  /**
   * Obtém o payload isolado associado ao item de quarentena.
   */
  public getQuarantinedPayload(quarantineId: string): unknown {
    return this.quarantinedPayloads.get(quarantineId);
  }
}
