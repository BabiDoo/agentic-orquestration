import { AdzHubDatabase, createDatabase } from './sqlite-database.js';
import { RAW_GRAPH_DATA, RAW_TIMELINE_DATA, RAW_MAPA_SOLUCAO_DATA } from './raw-fixtures.js';

export interface TraversalProvenance {
  source: 'supercerebro_graph' | 'supercerebro_timeline' | 'app_mapa_solucao';
  locator: string;
  capturedAt: string;
}

export interface TraversedGraphNode {
  id: string;
  type: string;
  label: string;
  props: Record<string, unknown>;
  provenance: TraversalProvenance;
  updatedAt?: string;
}

export interface TraversedGraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
  props?: Record<string, unknown>;
  provenance: TraversalProvenance;
}

export interface TraversedTimelineEvent {
  id: string;
  occurredAt: string;
  title: string;
  summary: string;
  actorIds: string[];
  relatedNodeIds: string[];
  provenance: TraversalProvenance;
}

export interface SupercerebroTraversalParams {
  clientId: string;
  query?: string;
  startNodeIds?: string[];
  nodeTypes?: string[];
  since?: string;
  until?: string;
  freshnessHours?: number;
  maxHops?: number;
  limit?: number;
  now?: Date;
}

export interface SupercerebroTraversalResult {
  clientId: string;
  nodes: TraversedGraphNode[];
  edges: TraversedGraphEdge[];
  events: TraversedTimelineEvent[];
  solutionMap?: {
    brandName: string;
    marketSegment: string;
    coreOffer: string;
    promise: string;
    proofElements: string[];
    forbiddenClaims: string[];
    provenance: TraversalProvenance;
  };
  totalNodes: number;
  totalEdges: number;
  totalEvents: number;
  isTruncated: boolean;
}

export class SupercerebroTraversalEngine {
  private db: AdzHubDatabase;

  constructor(db?: AdzHubDatabase) {
    this.db = db ?? createDatabase(':memory:');
    this.ensureSeeded();
  }

  /**
   * Semeia os dados iniciais do Supercérebro no SQLite caso as tabelas estejam vazias.
   */
  public ensureSeeded(): void {
    const nodeCount = this.db.prepare('SELECT COUNT(*) as count FROM nodes').get() as {
      count: number;
    };
    if (nodeCount.count === 0) {
      this.db.transaction(() => {
        // 1. Inserir nós
        const insertNode = this.db.prepare(`
          INSERT INTO nodes (node_id, client_id, type, label, properties_json, source, locator, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const node of RAW_GRAPH_DATA.nodes) {
          insertNode.run(
            node.id,
            RAW_GRAPH_DATA.client_id,
            node.type,
            node.label,
            JSON.stringify(node.props),
            'supercerebro_graph',
            `graph:node:${node.id}`,
            RAW_GRAPH_DATA.generated_at,
            RAW_GRAPH_DATA.generated_at
          );
        }

        // 2. Inserir arestas
        const insertEdge = this.db.prepare(`
          INSERT INTO edges (edge_id, client_id, source_node_id, target_node_id, relationship, properties_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const edge of RAW_GRAPH_DATA.edges) {
          const edgeId = `edge_${edge.from}_${edge.rel}_${edge.to}`;
          insertEdge.run(
            edgeId,
            RAW_GRAPH_DATA.client_id,
            edge.from,
            edge.to,
            edge.rel,
            null,
            RAW_GRAPH_DATA.generated_at
          );
        }

        // 3. Inserir timeline
        const insertTimeline = this.db.prepare(`
          INSERT INTO timeline_events (event_id, client_id, occurred_at, title, summary, actor_ids_json, related_node_ids_json, source, locator, captured_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const evt of RAW_TIMELINE_DATA.events) {
          insertTimeline.run(
            evt.event_id,
            RAW_TIMELINE_DATA.client_id,
            evt.occurred_at,
            evt.title,
            evt.summary,
            JSON.stringify(evt.actor_ids),
            JSON.stringify(evt.related_node_ids),
            'supercerebro_timeline',
            `timeline:event:${evt.event_id}`,
            RAW_TIMELINE_DATA.generated_at
          );
        }
      });
    }
  }

  /**
   * Executa traversal limitado do grafo e timeline do Supercérebro:
   * 1. Restringe estritamente por client_id (isolamento multi-tenant).
   * 2. Filtra por query textual, tipos de nós (nodeTypes), janela temporal (since/until) e frescor (freshnessHours).
   * 3. Bounded traversal: limita quantidade e profundidade de saltos (maxHops) para não carregar o grafo integral.
   * 4. Preserva proveniência completa para cada nó, aresta e evento retornado.
   */
  public traverse(params: SupercerebroTraversalParams): SupercerebroTraversalResult {
    const limit = Math.min(Math.max(params.limit ?? 10, 1), 50);
    const maxHops = Math.min(params.maxHops ?? 1, 2);
    const currentTime = params.now ?? new Date();

    // 1. Filtragem de Nós
    let nodeSql = 'SELECT * FROM nodes WHERE client_id = ?';
    const nodeParams: unknown[] = [params.clientId];

    if (params.nodeTypes && params.nodeTypes.length > 0) {
      const placeholders = params.nodeTypes.map(() => '?').join(',');
      nodeSql += ` AND type IN (${placeholders})`;
      nodeParams.push(...params.nodeTypes);
    }

    if (params.query && params.query.trim().length > 0) {
      nodeSql += ' AND (label LIKE ? OR properties_json LIKE ?)';
      const queryPattern = `%${params.query.trim()}%`;
      nodeParams.push(queryPattern, queryPattern);
    }

    if (params.freshnessHours && params.freshnessHours > 0) {
      const thresholdTime = new Date(
        currentTime.getTime() - params.freshnessHours * 3600 * 1000
      ).toISOString();
      nodeSql += ' AND updated_at >= ?';
      nodeParams.push(thresholdTime);
    }

    nodeSql += ` ORDER BY created_at DESC LIMIT ?`;
    nodeParams.push(limit);

    const rawNodes = this.db.prepare(nodeSql).all(...nodeParams) as Record<string, unknown>[];

    const nodesMap = new Map<string, TraversedGraphNode>();
    for (const r of rawNodes) {
      const id = String(r.node_id);
      nodesMap.set(id, {
        id,
        type: String(r.type),
        label: String(r.label),
        props: JSON.parse(String(r.properties_json)),
        provenance: {
          source: 'supercerebro_graph',
          locator: String(r.locator),
          capturedAt: String(r.created_at)
        },
        updatedAt: r.updated_at ? String(r.updated_at) : undefined
      });
    }

    // 2. Traversal de Arestas conectadas aos nós encontrados (até maxHops)
    const nodeIds = Array.from(nodesMap.keys());
    const edgesMap = new Map<string, TraversedGraphEdge>();

    if (nodeIds.length > 0 && maxHops >= 1) {
      const placeholders = nodeIds.map(() => '?').join(',');
      const edgeSql = `
        SELECT * FROM edges
        WHERE client_id = ? AND (source_node_id IN (${placeholders}) OR target_node_id IN (${placeholders}))
        LIMIT ?
      `;
      const edgeParams = [params.clientId, ...nodeIds, ...nodeIds, limit * 2];
      const rawEdges = this.db.prepare(edgeSql).all(...edgeParams) as Record<string, unknown>[];

      for (const r of rawEdges) {
        const id = String(r.edge_id);
        edgesMap.set(id, {
          id,
          source: String(r.source_node_id),
          target: String(r.target_node_id),
          relationship: String(r.relationship),
          props: r.properties_json ? JSON.parse(String(r.properties_json)) : undefined,
          provenance: {
            source: 'supercerebro_graph',
            locator: `graph:edge:${id}`,
            capturedAt: String(r.created_at)
          }
        });
      }
    }

    // 3. Consulta de Eventos na Timeline
    let eventSql = 'SELECT * FROM timeline_events WHERE client_id = ?';
    const eventParams: unknown[] = [params.clientId];

    if (params.since) {
      eventSql += ' AND occurred_at >= ?';
      eventParams.push(params.since);
    }
    if (params.until) {
      eventSql += ' AND occurred_at <= ?';
      eventParams.push(params.until);
    }
    if (params.query && params.query.trim().length > 0) {
      eventSql += ' AND (title LIKE ? OR summary LIKE ?)';
      const queryPattern = `%${params.query.trim()}%`;
      eventParams.push(queryPattern, queryPattern);
    }

    eventSql += ` ORDER BY occurred_at DESC LIMIT ?`;
    eventParams.push(limit);

    const rawEvents = this.db.prepare(eventSql).all(...eventParams) as Record<string, unknown>[];
    const events: TraversedTimelineEvent[] = rawEvents.map((r) => ({
      id: String(r.event_id),
      occurredAt: String(r.occurred_at),
      title: String(r.title),
      summary: String(r.summary),
      actorIds: JSON.parse(String(r.actor_ids_json ?? '[]')),
      relatedNodeIds: JSON.parse(String(r.related_node_ids_json ?? '[]')),
      provenance: {
        source: 'supercerebro_timeline',
        locator: String(r.locator),
        capturedAt: String(r.captured_at)
      }
    }));

    // 4. Mapa da Solução (se client for Housewhey)
    let solutionMap = undefined;
    if (params.clientId === RAW_MAPA_SOLUCAO_DATA.client_id) {
      solutionMap = {
        brandName: RAW_MAPA_SOLUCAO_DATA.brand_name,
        marketSegment: RAW_MAPA_SOLUCAO_DATA.market_segment,
        coreOffer: RAW_MAPA_SOLUCAO_DATA.core_offer,
        promise: RAW_MAPA_SOLUCAO_DATA.promise,
        proofElements: RAW_MAPA_SOLUCAO_DATA.proof_elements,
        forbiddenClaims: RAW_MAPA_SOLUCAO_DATA.forbidden_claims,
        provenance: {
          source: 'app_mapa_solucao' as const,
          locator: `solution_map:${params.clientId}`,
          capturedAt: RAW_MAPA_SOLUCAO_DATA.generated_at
        }
      };
    }

    const nodes = Array.from(nodesMap.values());
    const edges = Array.from(edgesMap.values());

    return {
      clientId: params.clientId,
      nodes,
      edges,
      events,
      solutionMap,
      totalNodes: nodes.length,
      totalEdges: edges.length,
      totalEvents: events.length,
      isTruncated: nodes.length >= limit || events.length >= limit
    };
  }
}

export interface SupercerebroPendency {
  title: string;
  status: 'Pendente' | 'Concluído' | 'Em Análise' | 'Aguardando Aprovação' | 'Aguardando Proposta';
  statusClass: string;
  meta: string;
  prompt: string;
  btnText: string;
  sourceEventId?: string;
}

export interface SupercerebroOperatorProfile {
  id: string;
  name: string;
  role: string;
  company: 'SPOT' | 'Housewhey';
  email: string;
  badge: string;
  avatarBg: string;
  initials: string;
  focusAreas?: string[];
  pendencies: SupercerebroPendency[];
}

/**
 * Deriva a lista de perfis de operadores e suas pendências dinâmicas a partir do grafo e da timeline do Supercérebro.
 */
export function getSupercerebroOperatorProfiles(options: {
  isPaused?: boolean;
  isReactivated?: boolean;
  isApproved?: boolean;
  delegationState?: { isDelegated: boolean; delegatedTo?: string; isApproved?: boolean } | null;
  isSacReconciled?: boolean;
} = {}): SupercerebroOperatorProfile[] {
  const personNodes = RAW_GRAPH_DATA.nodes.filter((n) => n.type === 'person');

  return personNodes.map((p) => {
    const id = p.id;
    const name = p.label;
    const email = String(p.props.email ?? '');
    const isSpot = email.endsWith('@spot.ag') || id === 'p_aline' || id === 'p_carolina';
    const company: 'SPOT' | 'Housewhey' = isSpot ? 'SPOT' : 'Housewhey';
    const rawRole = String(p.props.role ?? '');
    const cleanRole = rawRole.replace(/\s*(SPOT|Housewhey)\s*$/i, '').trim() || (isSpot ? 'Operação SPOT' : 'Equipe Housewhey');
    const focusAreas = Array.isArray(p.props.focus_areas) ? (p.props.focus_areas as string[]) : [];

    const initials = name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const avatarBg =
      id === 'p_aline' ? '#294A91' :
      id === 'p_carolina' ? '#5932EA' :
      id === 'p_marcos' ? '#F59A19' : '#1E6B56';

    const badge =
      id === 'p_aline' ? 'Operação Meta Ads' :
      id === 'p_carolina' ? 'Estratégia & Contas' :
      id === 'p_marcos' ? 'Aprovador de Governança' : 'WhatsApp & Vendas';

    const pendencies: SupercerebroPendency[] = [];

    const isApproved = Boolean(options.isApproved);
    const isPaused = Boolean(options.isPaused) || isApproved;
    const isDelegated = Boolean(options.delegationState?.isDelegated);
    const isSacReconciled = Boolean(options.isSacReconciled);

    if (id === 'p_aline') {
      const isDone = isPaused;
      const isWaitingApproval = !isDone && isDelegated;

      pendencies.push({
        title: 'Pausar Criativos Fracos',
        status: isDone ? 'Concluído' : (isWaitingApproval ? 'Aguardando Aprovação' : 'Aguardando Proposta'),
        statusClass: isDone ? 'tag-status-active' : 'tag-status-paused',
        meta: isDone
          ? 'Pausa executada e auditada no SQLite'
          : (isWaitingApproval
              ? 'Proposta despachada; aguardando aprovação de Marcos Silva'
              : 'Exige proposta formal de Carolina Mendes e aprovação de Marcos Silva'),
        prompt: 'Pausar criativos com baixo desempenho e sugerir 3 variações de copy e chamada',
        btnText: isDone ? 'Ver Auditoria →' : (isWaitingApproval ? 'Aguardando Aprovação' : 'Aguardando Proposta'),
        sourceEventId: 'evt_tl_06'
      });
    } else if (id === 'p_carolina') {
      const isDone = isPaused || isDelegated;
      pendencies.push({
        title: 'Submeter Proposta SPOT',
        status: isDone ? 'Concluído' : 'Pendente',
        statusClass: isDone ? 'tag-status-active' : 'tag-status-paused',
        meta: isDone
          ? (isPaused ? 'Proposta aprovada e pausa commitada no SQLite' : 'Proposta formalizada e despachada para Marcos Silva')
          : 'Aguardando formalização e despacho para Marcos Silva',
        prompt: 'Gerar proposta executiva de realocação de verba para validação do Head de Marketing',
        btnText: isDone ? (isPaused ? 'Ver Histórico →' : 'Ver Despacho →') : 'Submeter Proposta →',
        sourceEventId: 'evt_tl_07'
      });
    } else if (id === 'p_marcos') {
      const isDone = isPaused;
      const isPendingApproval = !isDone && isDelegated;

      pendencies.push({
        title: 'Aprovar Mudança de Verba',
        status: isDone ? 'Concluído' : (isPendingApproval ? 'Pendente' : 'Aguardando Proposta'),
        statusClass: isDone ? 'tag-status-active' : 'tag-status-paused',
        meta: isDone
          ? 'Aprovação registrada com hash SHA-256 no SQLite'
          : (isPendingApproval
              ? 'Proposta SPOT despachada por Carolina Mendes; aguardando sua validação'
              : 'Aguardando despacho da proposta formal pela SPOT (Carolina Mendes)'),
        prompt: 'Aprovar formalmente a alteração e realocação de verba de mídia da SPOT',
        btnText: isDone ? 'Ver Aprovação →' : (isPendingApproval ? 'Aprovar Proposta →' : 'Aguardando Proposta'),
        sourceEventId: 'evt_tl_07'
      });
    } else if (id === 'p_luiza') {
      const isDone = isSacReconciled;
      pendencies.push({
        title: 'Reconciliar Conversões SAC',
        status: isDone ? 'Concluído' : 'Pendente',
        statusClass: isDone ? 'tag-status-active' : 'tag-status-paused',
        meta: isDone
          ? 'Reconciliação salva no Supercérebro (Commit no SQLite)'
          : 'Atendimentos WhatsApp Business',
        prompt: 'Reconciliar conversões de leads do WhatsApp Business com as campanhas de Meta Ads',
        btnText: isDone ? 'Ver Auditoria →' : 'Executar Tarefa →',
        sourceEventId: 'evt_tl_05'
      });
    }

    return {
      id,
      name,
      role: cleanRole,
      company,
      email,
      badge,
      avatarBg,
      initials,
      focusAreas,
      pendencies
    };
  });
}
