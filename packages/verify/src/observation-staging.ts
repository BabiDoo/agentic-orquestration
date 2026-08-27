import { createHash, randomUUID } from 'node:crypto';
import { Observation, Timeframe, OperationalValidators } from '@adzhub/contracts';

export type ObservationSource = 'supercerebro' | 'meta_ads' | 'crm' | 'app' | 'conversations';

export interface IngestToolReturnParams {
  taskId: string;
  runId: string;
  toolCallId: string;
  source: ObservationSource;
  timeframe: Timeframe;
  payload: Record<string, unknown>;
  redactedPayload?: Record<string, unknown>;
  capturedAt?: string;
}

/**
 * Utilitário determinístico de cálculo de hash SHA-256 para payloads de observação.
 */
export function calculatePayloadHash(payload: unknown): string {
  const serialized = JSON.stringify(payload ?? {}, Object.keys(payload ?? {}).sort());
  return createHash('sha256').update(serialized).digest('hex');
}

/**
 * Staging de observações que isola retornos brutos de ferramentas antes de qualquer
 * verificação formal ou promoção para artefatos definitivos.
 */
export class ObservationStaging {
  private stagingMap: Map<string, Observation> = new Map();

  /**
   * Ingere o retorno válido de uma ferramenta e transforma em uma Observation estruturada em staging.
   * Por definição arquitetural (M4-01), o status inicial é SEMPRE 'RAW'.
   */
  public stageObservation(params: IngestToolReturnParams): Observation {
    const observationId = `obs_${params.source}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const capturedAt = params.capturedAt ?? new Date().toISOString();
    const payloadHash = calculatePayloadHash(params.payload);

    const rawObservation: Observation = {
      schemaVersion: '1.0.0',
      observationId,
      taskId: params.taskId,
      runId: params.runId,
      toolCallId: params.toolCallId,
      source: params.source,
      capturedAt,
      status: 'RAW', // NUNCA VERIFIED por padrão
      timeframe: params.timeframe,
      payloadHash,
      operationalPayload: params.payload ?? {},
      redactedPayload: params.redactedPayload ?? {}
    };

    // Validação estrita via Zod do schema de observação canônico
    const validatedObservation = OperationalValidators.validateObservation(rawObservation);

    this.stagingMap.set(validatedObservation.observationId, validatedObservation);
    return validatedObservation;
  }

  /**
   * Registra diretamente uma observação já instanciada (ex: vinda do dag-scheduler).
   */
  public registerObservation(observation: Observation): Observation {
    const validated = OperationalValidators.validateObservation(observation);
    this.stagingMap.set(validated.observationId, validated);
    return validated;
  }

  /**
   * Obtém observação por ID.
   */
  public getObservation(observationId: string): Observation | undefined {
    return this.stagingMap.get(observationId);
  }

  /**
   * Lista todas as observações em staging filtradas opcionalmente por runId ou taskId.
   */
  public listObservations(filter?: {
    taskId?: string;
    runId?: string;
    status?: Observation['status'];
  }): Observation[] {
    let list = Array.from(this.stagingMap.values());
    if (filter?.taskId) {
      list = list.filter((obs) => obs.taskId === filter.taskId);
    }
    if (filter?.runId) {
      list = list.filter((obs) => obs.runId === filter.runId);
    }
    if (filter?.status) {
      list = list.filter((obs) => obs.status === filter.status);
    }
    return list;
  }

  /**
   * Atualiza o status da observação após verificações formais (ex: de RAW para VERIFIED ou REJECTED).
   */
  public updateStatus(observationId: string, status: Observation['status']): Observation {
    const obs = this.stagingMap.get(observationId);
    if (!obs) {
      throw new Error(`Observação ${observationId} não encontrada no staging`);
    }
    obs.status = status;
    this.stagingMap.set(observationId, obs);
    return obs;
  }

  /**
   * Retorna apenas observações verificadas. Observações com status 'RAW' ou 'REJECTED'
   * são categoricamente impedidas de entrar em artefatos definitivos.
   */
  public getVerifiedObservations(runId?: string): Observation[] {
    return this.listObservations({ runId, status: 'VERIFIED' });
  }

  /**
   * Limpa o staging de observações de uma run ou completo.
   */
  public clear(runId?: string): void {
    if (!runId) {
      this.stagingMap.clear();
      return;
    }
    for (const [id, obs] of this.stagingMap.entries()) {
      if (obs.runId === runId) {
        this.stagingMap.delete(id);
      }
    }
  }
}
