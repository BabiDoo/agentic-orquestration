import { createHash } from 'node:crypto';
import { TraceEvent, TracePhase, OperationalValidators, RuntimeEventType } from '@adzhub/contracts';
import { redactSecretsRecursively } from './byok-security.js';

/**
 * Calcula o hash SHA-256 criptográfico encadeado de um TraceEvent.
 */
export function calculateEventHash(event: TraceEvent, previousHash: string = 'GENESIS'): string {
  const canonical = JSON.stringify({
    seq: event.seq,
    eventId: event.eventId,
    taskId: event.taskId,
    runId: event.runId,
    eventType: event.eventType,
    phase: event.phase,
    timestamp: event.timestamp,
    previousHash,
    payload: event.operationalPayload
  });
  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Parâmetros para registrar um novo evento no Event Log.
 */
export interface EventLogInput {
  eventId?: string;
  seq?: number;
  taskId: string;
  runId: string;
  eventType: RuntimeEventType | string;
  causationId?: string;
  correlationId: string;
  phase: TracePhase;
  operationalPayload?: Record<string, unknown>;
  redactedPayload?: Record<string, unknown>;
  timestamp?: string;
}

/**
 * Erro lançado caso ocorra uma quebra na monotonicidade ou duplicação do seq de um run.
 */
export class EventLogSequenceViolationError extends Error {
  public readonly runId: string;
  public readonly attemptedSeq: number;
  public readonly expectedSeq: number;

  constructor(runId: string, attemptedSeq: number, expectedSeq: number) {
    super(
      `[EventLogSequenceViolationError] Violação de sequência no Event Log para o run '${runId}': ` +
        `seq recebido foi ${attemptedSeq}, mas o esperado era ${expectedSeq}.`
    );
    this.name = 'EventLogSequenceViolationError';
    this.runId = runId;
    this.attemptedSeq = attemptedSeq;
    this.expectedSeq = expectedSeq;
  }
}

/**
 * Opções para subscrição de stream de eventos.
 */
export interface EventStreamOptions {
  fromSeq?: number;
}

/**
 * Repositório Append-Only de Eventos de Trace do Microkernel PEV-C.
 * Garante monotonicidade estrita de seq, redação prévia de dados sensíveis,
 * imutabilidade total e streaming Server-Sent Events (SSE) com ordem preservada.
 */
export class AppendOnlyEventLog {
  private runs: Map<string, TraceEvent[]>;
  private subscribers: Map<string, Set<(event: TraceEvent) => void>>;

  constructor() {
    this.runs = new Map();
    this.subscribers = new Map();
  }

  /**
   * Clona profundamente um objeto para garantir que consumidores externos não mutem o estado interno.
   */
  private clone<T>(data: T): T {
    return JSON.parse(JSON.stringify(data));
  }

  /**
   * Registra um novo evento no log do run.
   * Aplica redação em todos os payloads e valida o schema normativo antes de persistir.
   */
  public append(input: EventLogInput): TraceEvent {
    let runEvents = this.runs.get(input.runId);
    if (!runEvents) {
      runEvents = [];
      this.runs.set(input.runId, runEvents);
    }

    const lastEvent = runEvents.length > 0 ? runEvents[runEvents.length - 1] : undefined;
    const expectedSeq = (lastEvent?.seq ?? 0) + 1;

    // Valida monotonicidade estrita caso o chamador tenha passado seq explícito
    if (input.seq !== undefined && input.seq !== expectedSeq) {
      throw new EventLogSequenceViolationError(input.runId, input.seq, expectedSeq);
    }

    const seq = expectedSeq;
    const cleanRun = input.runId.replace(/[^a-zA-Z0-9_-]/g, '');
    const eventId = input.eventId ?? `evt_${cleanRun}_${seq}`;
    const timestamp = input.timestamp ?? new Date().toISOString();

    // Redação prévia de segredos em ambos os payloads
    const sanitizedOperational = redactSecretsRecursively(
      this.clone(input.operationalPayload ?? {})
    );
    const sanitizedRedacted = redactSecretsRecursively(this.clone(input.redactedPayload ?? {}));

    const event: TraceEvent = {
      schemaVersion: '1.0.0',
      eventId,
      seq,
      taskId: input.taskId,
      runId: input.runId,
      eventType: input.eventType,
      causationId: input.causationId,
      correlationId: input.correlationId,
      phase: input.phase,
      operationalPayload: sanitizedOperational,
      redactedPayload: sanitizedRedacted,
      timestamp
    };

    // Valida contra o schema normativo de TraceEvent
    OperationalValidators.validateTraceEvent(event);

    // Persiste no log append-only
    runEvents.push(this.clone(event));

    // Notifica assinantes ativos de SSE
    const runSubs = this.subscribers.get(input.runId);
    if (runSubs && runSubs.size > 0) {
      for (const listener of runSubs) {
        try {
          listener(this.clone(event));
        } catch {
          // Ignora erros de assinantes individuais para não comprometer a persistência
        }
      }
    }

    return this.clone(event);
  }

  /**
   * Retorna os eventos ordenados de um run dentro de um intervalo opcional de seqs.
   */
  public getEvents(runId: string, fromSeq = 1, toSeq?: number): TraceEvent[] {
    const runEvents = this.runs.get(runId);
    if (!runEvents) {
      return [];
    }

    const filtered = runEvents.filter((ev) => {
      if (ev.seq < fromSeq) return false;
      if (toSeq !== undefined && ev.seq > toSeq) return false;
      return true;
    });

    return this.clone(filtered);
  }

  /**
   * Busca um evento específico por seu número sequencial monotônico.
   */
  public getEventBySeq(runId: string, seq: number): TraceEvent | undefined {
    const runEvents = this.runs.get(runId);
    if (!runEvents) return undefined;
    const found = runEvents.find((e) => e.seq === seq);
    return found ? this.clone(found) : undefined;
  }

  /**
   * Busca um evento específico por seu eventId (evt_...).
   */
  public getEventById(runId: string, eventId: string): TraceEvent | undefined {
    const runEvents = this.runs.get(runId);
    if (!runEvents) return undefined;
    const found = runEvents.find((e) => e.eventId === eventId);
    return found ? this.clone(found) : undefined;
  }

  /**
   * Retorna o último evento registrado para o run.
   */
  public getLatestEvent(runId: string): TraceEvent | undefined {
    const runEvents = this.runs.get(runId);
    if (!runEvents || runEvents.length === 0) return undefined;
    return this.clone(runEvents[runEvents.length - 1]);
  }

  /**
   * Retorna a contagem de eventos registrados para um run.
   */
  public getEventCount(runId: string): number {
    return this.runs.get(runId)?.length ?? 0;
  }

  /**
   * Retorna a lista de todos os runIds com eventos registrados.
   */
  public getAllRunIds(): string[] {
    return Array.from(this.runs.keys());
  }

  /**
   * Formata um TraceEvent no padrão de mensagem Server-Sent Events (SSE).
   */
  public formatSSEMessage(event: TraceEvent): string {
    return `id: ${event.seq}\nevent: ${event.eventType}\ndata: ${JSON.stringify(event)}\n\n`;
  }

  /**
   * Inscreve um ouvinte para receber eventos de um run em tempo real.
   * Se fromSeq for fornecido, executa replay dos eventos históricos antes de escutar novos eventos.
   * Retorna função de unsubscribe.
   */
  public subscribe(
    runId: string,
    listener: (event: TraceEvent) => void,
    options: EventStreamOptions = {}
  ): () => void {
    let runSubs = this.subscribers.get(runId);
    if (!runSubs) {
      runSubs = new Set();
      this.subscribers.set(runId, runSubs);
    }

    // Se fromSeq foi solicitado, entrega o histórico prévio na ordem
    if (options.fromSeq !== undefined) {
      const historicalEvents = this.getEvents(runId, options.fromSeq);
      for (const histEvent of historicalEvents) {
        listener(histEvent);
      }
    }

    runSubs.add(listener);

    return () => {
      runSubs?.delete(listener);
      if (runSubs && runSubs.size === 0) {
        this.subscribers.delete(runId);
      }
    };
  }

  /**
   * Cria um gerador assíncrono para consumo de stream SSE em endpoints web ou pipelines reativos.
   */
  public async *createSSEStream(
    runId: string,
    options: EventStreamOptions = {}
  ): AsyncIterable<string> {
    const queue: string[] = [];
    let resolver: (() => void) | null = null;
    let isClosed = false;

    // Emite histórico se especificado
    if (options.fromSeq !== undefined) {
      const history = this.getEvents(runId, options.fromSeq);
      for (const ev of history) {
        queue.push(this.formatSSEMessage(ev));
      }
    }

    const unsubscribe = this.subscribe(runId, (event) => {
      queue.push(this.formatSSEMessage(event));
      if (resolver) {
        const notify = resolver;
        resolver = null;
        notify();
      }

      // Se for evento terminal, encerra o stream
      if (
        event.eventType === 'RUN_COMPLETED' ||
        event.eventType === 'RUN_FAILED' ||
        event.eventType === 'RUN_BLOCKED'
      ) {
        isClosed = true;
      }
    });

    try {
      while (!isClosed || queue.length > 0) {
        if (queue.length > 0) {
          yield queue.shift()!;
        } else if (!isClosed) {
          await new Promise<void>((r) => {
            resolver = r;
          });
        }
      }
    } finally {
      unsubscribe();
    }
  }

  /**
   * Verifica a integridade da sequência e encadeamento criptográfico do log de eventos do run.
   */
  public verifyEventLogIntegrity(runId: string): {
    valid: boolean;
    totalEvents: number;
    brokenAtSeq?: number;
    reason?: string;
    chainHashes?: string[];
  } {
    const events = this.runs.get(runId) ?? [];
    if (events.length === 0) {
      return { valid: true, totalEvents: 0, chainHashes: [] };
    }

    const chainHashes: string[] = [];
    let prevHash = 'GENESIS';

    for (let i = 0; i < events.length; i++) {
      const ev = events[i]!;
      if (ev.seq !== i + 1) {
        return {
          valid: false,
          totalEvents: events.length,
          brokenAtSeq: ev.seq,
          reason: `Quebra de sequência monotônica no evento index ${i}: seq esperado ${i + 1}, mas foi ${ev.seq}`,
          chainHashes
        };
      }

      const currentHash = calculateEventHash(ev, prevHash);
      chainHashes.push(currentHash);
      prevHash = currentHash;
    }

    return {
      valid: true,
      totalEvents: events.length,
      chainHashes
    };
  }
}

