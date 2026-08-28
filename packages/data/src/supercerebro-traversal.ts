import { AdzHubDatabase, createDatabase } from './sqlite-database.js';
import { RAW_GRAPH_DATA, RAW_TIMELINE_DATA, RAW_MAPA_SOLUCAO_DATA, RAW_META_ADS_DATA } from './raw-fixtures.js';

export interface TraversalProvenance {
  source: 'supercerebro_graph' | 'supercerebro_timeline' | 'app_mapa_solucao' | 'supercerebro_pendencies';
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
  isPaused?: boolean;
  isReactivated?: boolean;
  isApproved?: boolean;
  isSacReconciled?: boolean;
  isSacDiscountSubmitted?: boolean;
  delegationState?: { isDelegated: boolean; delegatedTo?: string; isApproved?: boolean } | null;
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
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);
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
      const edgeParams = [params.clientId, ...nodeIds, ...nodeIds, Math.max(limit * 5, 100)];
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

    // Sintetizar pendências dinâmicas dos operadores no Grafo
    try {
      const isCorrectClient = params.clientId === RAW_GRAPH_DATA.client_id;
      const shouldIncludePendencies = isCorrectClient && (!params.nodeTypes || params.nodeTypes.length === 0 || params.nodeTypes.includes('pendency'));
      if (shouldIncludePendencies) {
        const operatorProfiles = getSupercerebroOperatorProfiles({
          isPaused: params.isPaused,
          isReactivated: params.isReactivated,
          isApproved: params.isApproved,
          isSacReconciled: params.isSacReconciled,
          isSacDiscountSubmitted: params.isSacDiscountSubmitted,
          delegationState: params.delegationState
        });

        for (const op of operatorProfiles) {
          if (!op.pendencies || op.pendencies.length === 0) continue;
          for (let idx = 0; idx < op.pendencies.length; idx++) {
            const p = op.pendencies[idx];
            if (!p) continue;
            const statusStr = String(p.status || '');
            if (statusStr === 'Concluído' || statusStr === 'RESOLVED' || statusStr === 'APPROVED') continue;
            const pId = `pendency_${op.id}_${idx}`;
            const pendencyNode: TraversedGraphNode = {
              id: pId,
              type: 'pendency',
              label: p.title,
              props: {
                status: p.status,
                meta: p.meta,
                prompt: p.prompt,
                btnText: p.btnText,
                operatorId: op.id,
                operador_responsavel: op.name,
                motivo_pendencia: p.meta
              },
              provenance: {
                source: 'supercerebro_pendencies',
                locator: `pendency:${pId}`,
                capturedAt: new Date().toISOString()
              }
            };

            if (params.query && params.query.trim().length > 0) {
              const q = params.query.trim().toLowerCase();
              const str = JSON.stringify(pendencyNode).toLowerCase();
              if (!str.includes(q)) continue;
            }

            nodesMap.set(pId, pendencyNode);

            const edgeId = `edge_${op.id}_GEROU_PENDENCIA_${pId}`;
            edgesMap.set(edgeId, {
              id: edgeId,
              source: op.id,
              target: pId,
              relationship: 'GEROU_PENDENCIA',
              provenance: {
                source: 'supercerebro_pendencies',
                locator: `graph:edge:${edgeId}`,
                capturedAt: new Date().toISOString()
              }
            });
          }
        }
      }
    } catch (e) {
      // Ignora falhas secundárias de parsing de opção
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

    const allNodes = Array.from(nodesMap.values());
    const nodes = allNodes.slice(0, limit);
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
  delegationState?: { isDelegated: boolean; delegatedTo?: string; isApproved?: boolean; proposalTitle?: string; actionType?: string } | null;
  isSacReconciled?: boolean;
  isSacDiscountSubmitted?: boolean;
  isBudgetReallocated?: boolean;
  isBidStrategyUpdated?: boolean;
  approvedActions?: Record<string, boolean> | string[];
  delegatedActions?: Record<string, boolean> | string[];
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

    const isTrafficRole = cleanRole.toLowerCase().includes('gesto') || cleanRole.toLowerCase().includes('tráfego') || focusAreas.some((f) => f.toLowerCase().includes('meta ads') || f.toLowerCase().includes('cpa'));
    const isAccountRole = cleanRole.toLowerCase().includes('gerente') || cleanRole.toLowerCase().includes('contas') || focusAreas.some((f) => f.toLowerCase().includes('estratégia') || f.toLowerCase().includes('crescimento'));
    const isApproverRole = cleanRole.toLowerCase().includes('head') || cleanRole.toLowerCase().includes('diretor') || focusAreas.some((f) => f.toLowerCase().includes('aprovação') || f.toLowerCase().includes('marca'));
    const isSacRole = cleanRole.toLowerCase().includes('atendimento') || cleanRole.toLowerCase().includes('vendas') || focusAreas.some((f) => f.toLowerCase().includes('whatsapp') || f.toLowerCase().includes('sac'));
    void isSacRole;

    const avatarBg =
      isTrafficRole ? '#294A91' :
      isAccountRole ? '#5932EA' :
      isApproverRole ? '#F59A19' : '#1E6B56';

    const badge =
      isTrafficRole ? 'Operação Meta Ads' :
      isAccountRole ? 'Estratégia & Contas' :
      isApproverRole ? 'Aprovador de Governança' : 'WhatsApp & Vendas';

    const pendencies: SupercerebroPendency[] = [];

    // Derivação dinâmica das pendências a partir das políticas de ação e eventos da timeline
    const isApproved = Boolean(options.isApproved);
    const isPaused = Boolean(options.isPaused);
    const isGlobalDelegated = Boolean(options.delegationState?.isDelegated);
    const delTitle = options.delegationState?.proposalTitle || '';
    const delAction = options.delegationState?.actionType || '';
    const isSacReconciled = Boolean(options.isSacReconciled);
    const isSacDiscountSubmitted = Boolean(options.isSacDiscountSubmitted);
    const isBudgetReallocated = Boolean(options.isBudgetReallocated);
    const isBidStrategyUpdated = Boolean(options.isBidStrategyUpdated);

    const delTitleLower = delTitle.toLowerCase();
    const isPauseDelegated = isGlobalDelegated && (
      delAction === 'EXTERNAL_WRITE_PAUSE' ||
      delTitleLower.includes('pausa') ||
      delTitleLower.includes('pause')
    );

    const isBidDelegated = isGlobalDelegated && (
      delAction === 'UPDATE_BID_STRATEGY' ||
      delTitleLower.includes('lance') ||
      delTitleLower.includes('estratégia') ||
      delTitleLower.includes('estrategia')
    );
    const isBudgetDelegated = isGlobalDelegated && (
      delAction === 'BUDGET_REALLOCATION' ||
      delAction === 'APPROVE_BUDGET_REALLOCATION' ||
      delTitleLower.includes('remanejamento') ||
      delTitleLower.includes('verba')
    );
    const isSacDiscountDelegated = isGlobalDelegated && (
      delAction === 'APPLY_SAC_DISCOUNT' ||
      delTitleLower.includes('cupom') ||
      delTitleLower.includes('sac')
    );

    const isActionApproved = (action: string): boolean => {
      if (options.approvedActions) {
        if (Array.isArray(options.approvedActions)) return options.approvedActions.includes(action);
        if (typeof options.approvedActions === 'object') return Boolean(options.approvedActions[action]);
      }
      return isApproved && (
        (action.includes('PAUSE') && (delAction.includes('PAUSE') || delTitleLower.includes('pausa'))) ||
        (action.includes('BID') && (delAction.includes('BID') || delAction.includes('STRATEGY') || delTitleLower.includes('lance') || delTitleLower.includes('estratégia') || delTitleLower.includes('estrategia'))) ||
        (action.includes('DISCOUNT') && (delAction.includes('DISCOUNT') || delAction.includes('SAC') || delTitleLower.includes('cupom'))) ||
        ((action.includes('BUDGET') || action.includes('REALLOCATION')) && (delAction.includes('BUDGET') || delAction.includes('REALLOCATION') || delTitleLower.includes('verba') || delTitleLower.includes('remanejamento')))
      );
    };

    const isActionDelegated = (action: string): boolean => {
      if (options.delegatedActions) {
        if (Array.isArray(options.delegatedActions)) return options.delegatedActions.includes(action);
        if (typeof options.delegatedActions === 'object') return Boolean(options.delegatedActions[action]);
      }
      if (action === 'EXTERNAL_WRITE_PAUSE') return isPauseDelegated;
      if (action === 'UPDATE_BID_STRATEGY') return isBidDelegated;
      if (action === 'BUDGET_REALLOCATION' || action === 'APPROVE_BUDGET_REALLOCATION') return isBudgetDelegated;
      if (action === 'APPLY_SAC_DISCOUNT') return isSacDiscountDelegated;
      return false;
    };

    // Mapeamento dos recursos e ativos reais cadastrados no Grafo (anúncios, campanhas, canais)
    const campaignsList = RAW_META_ADS_DATA.campaigns;
    const primaryCampaign = campaignsList[0];
    const primaryCampName = primaryCampaign ? primaryCampaign.campaign_name : 'Campanha de Mídia';

    const rawPolicies = [
      { action: 'EXTERNAL_WRITE_PAUSE', title: 'Submeter Proposta de Pausa no Meta Ads', buttonText: 'Enviar Proposta para Marcos Silva', authorizedExecutorIds: ['p_aline'], authorizedApproverIds: ['p_marcos'] },
      { action: 'UPDATE_BID_STRATEGY', title: 'Submeter Ajuste de Estratégia de Lance', buttonText: 'Enviar para Aprovação de Marcos Silva', authorizedExecutorIds: ['p_aline'], authorizedApproverIds: ['p_marcos'] },
      { action: 'BUDGET_REALLOCATION', title: 'Submeter Proposta de Remanejamento', buttonText: 'Enviar para Aprovação', authorizedExecutorIds: ['p_carolina'], authorizedApproverIds: ['p_marcos'] },
      { action: 'APPROVE_BUDGET_REALLOCATION', title: 'Aprovar Mudança de Verba', buttonText: 'Aprovar Proposta →', authorizedExecutorIds: [], authorizedApproverIds: ['p_marcos'] },
      { action: 'APPLY_SAC_DISCOUNT', title: 'Submeter Autorização de Cupom SAC', buttonText: 'Enviar Autorização de Cupom', authorizedExecutorIds: ['p_luiza'], authorizedApproverIds: ['p_marcos', 'p_carolina'] },
      { action: 'RECONCILE_CONVERSIONS', title: 'Reconciliar Conversões SAC', buttonText: 'Executar Reconciliação Auditada', authorizedExecutorIds: ['p_luiza'], authorizedApproverIds: [] }
    ];

    for (const pol of rawPolicies) {
      const isExecutor = pol.authorizedExecutorIds.includes(id);
      const isApprover = pol.authorizedApproverIds.includes(id);
      const isPolicyDelegated = isActionDelegated(pol.action);
      const isPolicyApproved = isActionApproved(pol.action);

      let isAssigned = false;
      if (isExecutor) {
        isAssigned = true;
      } else if (isApprover) {
        isAssigned = isPolicyDelegated || isPolicyApproved;
      }

      if (isAssigned) {
        const isApprovedForThisPolicy = isApprover && !isExecutor && isPolicyApproved;

        const isDone = (pol.action.includes('PAUSE') && (isPaused || isApprovedForThisPolicy)) ||
                       (pol.action === 'APPROVE_BUDGET_REALLOCATION' && isApprovedForThisPolicy) ||
                       (pol.action === 'BUDGET_REALLOCATION' && (isBudgetReallocated || isApprovedForThisPolicy)) ||
                       (pol.action === 'UPDATE_BID_STRATEGY' && (isBidStrategyUpdated || isApprovedForThisPolicy)) ||
                       (pol.action === 'APPLY_SAC_DISCOUNT' && (isSacDiscountSubmitted || isApprovedForThisPolicy)) ||
                       (pol.action === 'RECONCILE_CONVERSIONS' && isSacReconciled);

        const isActionApprovedForExecutor = isExecutor && isPolicyApproved;

        let effectiveTitle = pol.title;
        if (isApprover && !isExecutor) {
          if (pol.action === 'EXTERNAL_WRITE_PAUSE') {
            effectiveTitle = isDone ? 'Aprovação de Pausa no Meta Ads' : 'Aprovar Proposta de Pausa no Meta Ads';
          } else if (pol.action === 'UPDATE_BID_STRATEGY') {
            effectiveTitle = isDone ? 'Aprovação de Ajuste de Estratégia de Lance' : 'Aprovar Ajuste de Estratégia de Lance';
          } else if (pol.action === 'APPLY_SAC_DISCOUNT') {
            effectiveTitle = isDone ? 'Aprovação de Autorização de Cupom SAC' : 'Aprovar Autorização de Cupom SAC';
          } else if (pol.action === 'BUDGET_REALLOCATION' || pol.action === 'APPROVE_BUDGET_REALLOCATION') {
            effectiveTitle = isDone ? 'Aprovação de Mudança de Verba' : 'Aprovar Mudança de Verba';
          }
        } else {
          if (pol.action === 'EXTERNAL_WRITE_PAUSE') {
            effectiveTitle = 'Submeter Proposta de Pausa no Meta Ads';
          } else if (pol.action === 'UPDATE_BID_STRATEGY') {
            effectiveTitle = 'Submeter Ajuste de Estratégia de Lance';
          } else if (pol.action === 'APPLY_SAC_DISCOUNT') {
            effectiveTitle = 'Submeter Autorização de Cupom SAC';
          } else if (pol.action === 'BUDGET_REALLOCATION') {
            effectiveTitle = 'Submeter Proposta de Remanejamento';
          }
        }

        let effectiveBtnText = pol.buttonText || 'Executar Ação →';
        if (isDone) {
          effectiveBtnText = 'Ver Auditoria →';
        } else if (isApprover && !isExecutor) {
          effectiveBtnText = isPolicyApproved ? 'Ver Auditoria →' : 'Aprovar Proposta →';
        } else if (isActionApprovedForExecutor) {
          if (pol.action === 'EXTERNAL_WRITE_PAUSE') effectiveBtnText = 'Executar Pausa Auditada';
          else if (pol.action === 'UPDATE_BID_STRATEGY') effectiveBtnText = 'Executar Ajuste Auditado';
          else if (pol.action === 'APPLY_SAC_DISCOUNT') effectiveBtnText = 'Liberar Cupom no WhatsApp';
          else if (pol.action === 'BUDGET_REALLOCATION') effectiveBtnText = 'Executar Remanejamento Auditado';
        } else if (isPolicyDelegated && isExecutor) {
          effectiveBtnText = 'Aguardando Aprovação de Marcos Silva';
        } else {
          effectiveBtnText = pol.buttonText || 'Enviar para Aprovação de Marcos Silva';
        }

        const statusLabel: SupercerebroPendency['status'] = isDone
          ? 'Concluído'
          : (isPolicyDelegated && !isPolicyApproved && isExecutor ? 'Aguardando Aprovação' : 'Pendente');

        const statusClass = isDone
          ? 'tag-status-active'
          : (pol.action.includes('PAUSE') ? 'tag-status-danger' : 'tag-status-warning');

        const metaText = isDone
          ? `${effectiveTitle} concluído por ${name} e registrado no Supercérebro.`
          : `Atribuído a ${name} (${cleanRole}). Recurso: ${primaryCampName}.`;

        let promptText = `Como ${name} (${cleanRole}), solicito executar a ação ${effectiveTitle} no Supercérebro.`;
        if (isApprover && !isExecutor) {
          if (pol.action === 'EXTERNAL_WRITE_PAUSE') {
            promptText = `Como ${name} (${cleanRole}), solicito executar a ação Aprovar Proposta de Pausa do Criativo ad_namorados_casal_03 no Meta Ads e delegar execução para Aline Rocha no Supercérebro.`;
          } else if (pol.action === 'UPDATE_BID_STRATEGY') {
            promptText = `Como ${name} (${cleanRole}), solicito executar a ação Aprovar Ajuste de Estratégia de Lance para Limite de CPA de R$ 75,00 e delegar execução para Aline Rocha no Supercérebro.`;
          } else if (pol.action === 'BUDGET_REALLOCATION' || pol.action === 'APPROVE_BUDGET_REALLOCATION') {
            promptText = `Como ${name} (${cleanRole}), solicito executar a ação Aprovar Proposta de Remanejamento de Verba de R$ 3.000,00 e delegar execução para Carolina Mendes no Supercérebro.`;
          } else if (pol.action === 'APPLY_SAC_DISCOUNT') {
            promptText = `Como ${name} (${cleanRole}), solicito executar a ação Aprovar Autorização de Cupom SAC de 15% e delegar para Luiza Valente no Supercérebro.`;
          }
        } else if (pol.action === 'EXTERNAL_WRITE_PAUSE') {
          if (isActionApprovedForExecutor) {
            promptText = `Como ${name} (${cleanRole}), solicito executar a ação Executar Pausa Auditada do Criativo ad_namorados_casal_03 na Campanha Dia dos Namorados no Supercérebro.`;
          } else {
            promptText = `Como ${name} (${cleanRole}), solicito executar a ação Submeter Proposta de Pausa do Criativo ad_namorados_casal_03 na Campanha Dia dos Namorados para Aprovação de Marcos Silva no Supercérebro.`;
          }
        } else if (pol.action === 'UPDATE_BID_STRATEGY') {
          if (isActionApprovedForExecutor) {
            promptText = `Como ${name} (${cleanRole}), solicito executar a ação Executar Ajuste Auditado de Estratégia de Lance para Limite de CPA de R$ 75,00 na Campanha Whey Isolado Baunilha no Supercérebro.`;
          } else {
            promptText = `Como ${name} (${cleanRole}), solicito executar a ação Submeter Ajuste de Estratégia de Lance para Limite de CPA de R$ 75,00 na Campanha Whey Isolado Baunilha para Aprovação de Marcos Silva no Supercérebro.`;
          }
        } else if (pol.action === 'BUDGET_REALLOCATION') {
          if (isActionApprovedForExecutor) {
            promptText = `Como ${name} (${cleanRole}), solicito executar a ação Executar Remanejamento Auditado de R$ 3.000,00 da Campanha Dia dos Namorados para Influenciadores SPOT no Supercérebro.`;
          } else {
            promptText = `Como ${name} (${cleanRole}), solicito executar a ação Submeter Proposta de Remanejamento de R$ 3.000,00 da Campanha Dia dos Namorados para Influenciadores SPOT para Aprovação de Marcos Silva no Supercérebro.`;
          }
        } else if (pol.action === 'APPLY_SAC_DISCOUNT') {
          if (isActionApprovedForExecutor) {
            promptText = `Como ${name} (${cleanRole}), solicito executar a ação Liberar Cupom SAC de 15% para Carrinho Pendente no WhatsApp no Supercérebro.`;
          } else {
            promptText = `Como ${name} (${cleanRole}), solicito executar a ação Submeter Autorização de Cupom SAC de 15% para Carrinho Pendente no WhatsApp para Aprovação de Marcos Silva no Supercérebro.`;
          }
        }

        if (!pendencies.some((p) => p.title === effectiveTitle)) {
          pendencies.push({
            title: effectiveTitle,
            status: statusLabel,
            statusClass,
            meta: metaText,
            prompt: promptText,
            btnText: effectiveBtnText,
            sourceEventId: RAW_TIMELINE_DATA.events[0]?.event_id || 'evt_tl_01'
          });
        }
      }
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
