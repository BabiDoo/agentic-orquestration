/**
 * @adzhub/data - Account Context Loader (Grounding & Domain Knowledge)
 * Carrega e sintetiza dinamicamente o estado da conta (Meta Ads, CRM HubSpot, Supercérebro e Governança SQLite)
 * a partir das entidades e tabelas canônicas para fornecer o contexto de grounding aos modelos de IA em tempo real.
 */

import {
  RAW_GRAPH_DATA,
  RAW_TIMELINE_DATA,
  RAW_MAPA_SOLUCAO_DATA,
  RAW_CONVERSAS_DATA,
  RAW_META_ADS_DATA,
  RAW_CRM_LEADS_DATA,
  RAW_ANALISE_CRIATIVOS_DATA
} from './raw-fixtures.js';

export interface GovernanceDelegationState {
  isDelegated: boolean;
  delegatedTo: string;
  delegatedAt?: string;
  committedAt?: string;
  commitHash?: string;
  proposalTitle?: string;
}

export interface GovernancePauseState {
  isPaused: boolean;
  pausedAds?: string[];
  committedAt?: string;
  commitHash?: string;
  details?: string;
}

export interface BuildAccountContextOptions {
  isApproved?: boolean;
  isReactivated?: boolean;
  isPaused?: boolean;
  pausedAds?: string[];
  pauseState?: GovernancePauseState;
  delegationState?: GovernanceDelegationState;
  compact?: boolean;
  isInformational?: boolean;
}

export interface AccountDataset {
  account: {
    id: string;
    name: string;
    partnerOrganizations: string[];
  };

  people: Array<{
    id: string;
    name: string;
    role: string;
    organization: string;
  }>;

  governance: {
    actionPolicies: Array<{
      action: string;
      effect: string;
      authorizedExecutorIds: string[];
      requiresApproval: boolean;
      authorizedApproverIds: string[];
      actionCard?: {
        title: string;
        buttonText: string;
      };
    }>;
  };

  campaigns: Array<{
    id: string;
    name: string;
    status: string;
  }>;

  metrics: Record<string, number | string | null>;
}

export function getAccountDataset(options: BuildAccountContextOptions = {}): AccountDataset {
  const brandName = RAW_MAPA_SOLUCAO_DATA.brand_name || 'Housewhey';
  const persons = RAW_GRAPH_DATA.nodes.filter((n) => n.type === 'person');

  const people = persons.map((p) => {
    const props = p.props as Record<string, any>;
    return {
      id: p.id,
      name: p.label,
      role: props.role || 'Membro da Equipe',
      organization: props.company || (props.role?.includes('SPOT') ? 'SPOT' : brandName)
    };
  });

  const campaigns = RAW_META_ADS_DATA.campaigns.map((c) => ({
    id: c.campaign_id,
    name: c.campaign_name,
    status: options.isReactivated ? 'ACTIVE' : c.status
  }));

  const totalSpend = RAW_META_ADS_DATA.campaigns.reduce(
    (acc, camp) => acc + camp.ads.reduce((a, ad) => a + ad.spend_brl, 0),
    0
  );
  const totalRevenue = RAW_CRM_LEADS_DATA.summary.total_revenue_brl;
  const approvedDeals = RAW_CRM_LEADS_DATA.deals.filter((d) => d.status === 'venda').length;
  const totalLeads = 165;

  return {
    account: {
      id: 'cli_housewhey',
      name: brandName,
      partnerOrganizations: ['SPOT']
    },
    people,
    governance: {
      actionPolicies: [
        {
          action: 'EXTERNAL_WRITE_PAUSE',
          effect: 'write:meta_ads',
          authorizedExecutorIds: ['p_aline'],
          requiresApproval: options.isApproved ? false : true,
          authorizedApproverIds: ['p_marcos'],
          actionCard: {
            title: options.isApproved ? 'Confirmar Pausa no Meta Ads' : 'Submeter Proposta de Pausa no Meta Ads',
            buttonText: options.isApproved ? 'Executar Pausa Auditada' : 'Enviar Proposta para Marcos Silva'
          }
        },
        {
          action: 'APPROVE_PROPOSAL',
          effect: 'governance:approval',
          authorizedExecutorIds: ['p_marcos', 'p_carolina'],
          requiresApproval: false,
          authorizedApproverIds: ['p_marcos', 'p_carolina'],
          actionCard: {
            title: 'Confirmar Devolutiva de Aprovação para Aline Rocha',
            buttonText: 'Confirmar Devolutiva de Aprovação'
          }
        },
        {
          action: 'EXTERNAL_WRITE_REACTIVATE',
          effect: 'write:meta_ads',
          authorizedExecutorIds: ['p_aline'],
          requiresApproval: options.isReactivated ? false : true,
          authorizedApproverIds: ['p_marcos'],
          actionCard: {
            title: options.isReactivated ? 'Confirmar Reativação no Meta Ads' : 'Submeter Proposta de Reativação no Meta Ads',
            buttonText: options.isReactivated ? 'Executar Reativação Auditada' : 'Enviar Proposta para Marcos Silva'
          }
        },
        {
          action: 'BUDGET_REALLOCATION',
          effect: 'write:meta_ads_budget',
          authorizedExecutorIds: ['p_carolina', 'p_aline', 'p_marcos'],
          requiresApproval: options.isApproved ? false : true,
          authorizedApproverIds: ['p_marcos'],
          actionCard: {
            title: options.isApproved ? 'Confirmar Remanejamento de Verba' : 'Submeter Proposta de Remanejamento',
            buttonText: options.isApproved ? 'Executar Remanejamento Auditado' : 'Enviar Proposta para Marcos Silva'
          }
        },
        {
          action: 'UPDATE_BID_STRATEGY',
          effect: 'write:meta_ads_bidding',
          authorizedExecutorIds: ['p_aline', 'p_carolina'],
          requiresApproval: options.isApproved ? false : true,
          authorizedApproverIds: ['p_marcos'],
          actionCard: {
            title: options.isApproved ? 'Confirmar Ajuste de Estratégia de Lance' : 'Submeter Ajuste de Estratégia de Lance',
            buttonText: options.isApproved ? 'Executar Ajuste Auditado' : 'Enviar para Aprovação de Marcos Silva'
          }
        },
        {
          action: 'APPLY_SAC_DISCOUNT',
          effect: 'write:sac_discounts',
          authorizedExecutorIds: ['p_luiza'],
          requiresApproval: options.isApproved ? false : true,
          authorizedApproverIds: ['p_marcos', 'p_carolina'],
          actionCard: {
            title: options.isApproved ? 'Confirmar Concessão de Cupom SAC' : 'Submeter Autorização de Cupom SAC',
            buttonText: options.isApproved ? 'Conceder Cupom Auditado' : 'Enviar Autorização de Cupom'
          }
        },
        {
          action: 'SUBMIT_GOVERNANCE_RULE',
          effect: 'write:governance_rules',
          authorizedExecutorIds: ['p_carolina', 'p_aline'],
          requiresApproval: true,
          authorizedApproverIds: ['p_marcos'],
          actionCard: {
            title: 'Submeter Regra Formal de Governança',
            buttonText: 'Enviar Proposta para Marcos Silva'
          }
        },
        {
          action: 'REALLOCATE_FUNDS',
          effect: 'write:meta_ads_budget',
          authorizedExecutorIds: ['p_marcos', 'p_carolina', 'p_aline'],
          requiresApproval: true,
          authorizedApproverIds: ['p_marcos'],
          actionCard: {
            title: 'Confirmar Remanejamento de Verba',
            buttonText: 'Enviar para Aprovação'
          }
        }
      ]
    },
    campaigns,
    metrics: {
      totalSpend,
      totalRevenue,
      roas: totalSpend > 0 ? Number((totalRevenue / totalSpend).toFixed(2)) : 3.48,
      cpl: totalSpend > 0 ? Number((totalSpend / totalLeads).toFixed(2)) : 96.97,
      cac: approvedDeals > 0 ? Number((totalSpend / approvedDeals).toFixed(2)) : 115.11,
      reconciliationRate: 86.4
    }
  };
}

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function buildAccountGroundingContext(options: BuildAccountContextOptions = {}): string {
  const isReactivated = Boolean(options.isReactivated);
  const isPaused = Boolean(options.isPaused || options.pauseState?.isPaused);
  const pausedAds = options.pausedAds || options.pauseState?.pausedAds || ['ad_namorados_casal_03', 'ad_whey_sabores_04'];
  const delegation = options.delegationState;

  // 1. Meta Ads - Agregação e Mapeamento Dinâmico de Campanhas e Anúncios
  let totalSpend = 0;
  let totalImpressions = 0;
  let totalClicks = 0;

  const campaignSections: string[] = [];

  for (const camp of RAW_META_ADS_DATA.campaigns) {
    let campSpend = 0;
    let campSales = 0;
    const adLines: string[] = [];

    for (const ad of camp.ads) {
      campSpend += ad.spend_brl;
      totalSpend += ad.spend_brl;
      totalImpressions += ad.impressions;
      totalClicks += ad.clicks;

      // Cruza com vendas atribuídas no CRM
      const attributedSales = RAW_CRM_LEADS_DATA.deals.filter(
        (d) => d.utm_content === ad.utm_content && d.status === 'venda'
      ).length;
      campSales += attributedSales;

      const adCpa = attributedSales > 0 ? ad.spend_brl / attributedSales : ad.spend_brl;
      const ctrPercent = (ad.ctr * 100).toFixed(1) + '%';

      // Cruza com scores do framework de criativos
      const creativeEval = RAW_ANALISE_CRIATIVOS_DATA.creatives.find((c) => c.ad_id === ad.ad_id);
      const hookScore = creativeEval ? creativeEval.hook_score.toFixed(1) : (ad.hook_rate_3s * 25).toFixed(1);
      const retScore = creativeEval ? creativeEval.retention_score.toFixed(1) : '7.5';
      const ctaScore = creativeEval ? creativeEval.cta_score.toFixed(1) : '7.0';
      const recommendation = creativeEval ? creativeEval.recommendation : 'SEGUIR';

      let adStatus = ad.status === 'ACTIVE' ? 'Ativo' : 'Pausado';
      if (isReactivated) {
        adStatus = 'Ativo (REATIVADO e auditado no SQLite)';
      } else if (isPaused && (pausedAds.includes(ad.ad_id) || ad.ad_id === 'ad_namorados_casal_03' || ad.ad_id === 'ad_whey_sabores_04')) {
        adStatus = 'Pausado (PAUSADO via commit auditado no SQLite pelo operador)';
      } else if (ad.ad_id === 'ad_namorados_casal_03') {
        adStatus = 'Pausado';
      }

      adLines.push(
        `  • Anúncio "${ad.ad_id}" (${ad.ad_name}): Spend ${formatCurrency(ad.spend_brl)} | CPA ${formatCurrency(adCpa)} | CTR ${ctrPercent} | Hook: ${hookScore} | Retenção: ${retScore} | CTA: ${ctaScore} | Status: ${adStatus} | Recomendação: ${recommendation}`
      );
    }

    const campCpa = campSales > 0 ? campSpend / campSales : campSpend;
    const campStatus = isReactivated || camp.status === 'ACTIVE' ? 'Ativo' : 'Pausado';
    campaignSections.push(
      `- Campanha "${camp.campaign_name}" (${camp.campaign_id}): Spend ${formatCurrency(campSpend)} | CPA ${formatCurrency(campCpa)} | ${campSales} vendas | Status: ${campStatus}\n${adLines.join('\n')}`
    );
  }

  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) + '%' : '1.86%';
  const avgCpc = totalClicks > 0 ? formatCurrency(totalSpend / totalClicks) : 'R$ 1,25';
  const totalRevenue = RAW_CRM_LEADS_DATA.summary.total_revenue_brl;
  const overallRoas = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) + 'x' : '3.48x';

  const metaAdsHeader = `- Investimento Total: ${formatCurrency(totalSpend)} | ${totalImpressions.toLocaleString('pt-BR')} impressões | ${totalClicks.toLocaleString('pt-BR')} cliques | CTR médio: ${avgCtr} | CPC médio: ${avgCpc} | ROAS: ${overallRoas}`;
  const metaAdsSection = `${metaAdsHeader}\n${campaignSections.join('\n')}`;

  // 2. CRM HubSpot - Resumo Dinâmico de Deals e Atribuição
  const deals = RAW_CRM_LEADS_DATA.deals;
  const approvedDeals = deals.filter((d) => d.status === 'venda');
  const approvedRev = approvedDeals.reduce((sum, d) => sum + d.value_brl, 0);
  const ticketMedio = approvedDeals.length > 0 ? formatCurrency(approvedRev / approvedDeals.length) : 'R$ 240,16';

  const crmSection = `- Período Analisado: 01/08/2026 a 20/08/2026 (Agosto/2026)
- Volume de Pedidos Auditados: ${deals.length} pedidos no CRM HubSpot | Faturamento Total: ${formatCurrency(totalRevenue)} | Ticket Médio: ${ticketMedio}
- Status dos Deals: ${approvedDeals.length} Vendas Aprovadas (${formatCurrency(approvedRev)}) | 8 Abandonos de Carrinho | 6 Boletos/PIX Pendentes
- Reconciliação Meta Ads × CRM: 142 pedidos vinculados por UTMs/HubSpot (86.4% de taxa de reconciliação) | 23 pedidos sem origem confirmada (13.6% não reconciliados)
- Performance & Métricas Financeiras:
  • Investimento Meta Ads: ${formatCurrency(totalSpend)} | Cliques: ${totalClicks.toLocaleString('pt-BR')} (CTR: ${avgCtr}) | Leads: 165 | Vendas Aprovadas: ${approvedDeals.length}
  • CPL (Custo por Lead): ${formatCurrency(totalSpend / 165)} (Fórmula: Investimento ${formatCurrency(totalSpend)} ÷ 165 leads)
  • CAC (Custo de Aquisição): ${formatCurrency(totalSpend / approvedDeals.length)} (Fórmula: Investimento ${formatCurrency(totalSpend)} ÷ ${approvedDeals.length} vendas)
  • ROAS (Retorno em Mídia): ${(totalRevenue / totalSpend).toFixed(2)}x (Fórmula: Receita ${formatCurrency(totalRevenue)} ÷ Investimento ${formatCurrency(totalSpend)})
  • Taxa de Reconciliação: 86.4% (Fórmula: 142 pedidos reconciliados ÷ 165 total de pedidos)`;

  // 3. Mapa da Solução e Produtos (RAW_MAPA_SOLUCAO_DATA)
  const mapData = RAW_MAPA_SOLUCAO_DATA;
  const targetAudiences = mapData.target_audiences
    ? mapData.target_audiences.map((p: { persona: string; main_driver: string }) => `${p.persona} (${p.main_driver})`).join(' | ')
    : 'Atleta & Performance | Longevidade & Saúde';
  const proofPoints = mapData.proof_elements ? mapData.proof_elements.join(', ') : 'Laudo lote a lote em QR code';

  const solutionMapSection = `- Posicionamento: ${mapData.brand_name} - ${mapData.market_segment} (${mapData.core_offer}).
- Matéria-Prima: 100% Proteína Isolada Glanbia Grass-Fed importada, Creatina Creapure alemã, Ômega 3 com certificação internacional IFOS 5 estrelas.
- Personas: ${targetAudiences}.
- Diferencial: ${proofPoints}.`;

  // 4. Supercérebro Equipe & Governança (RAW_GRAPH_DATA)
  const persons = RAW_GRAPH_DATA.nodes.filter((n) => n.type === 'person');
  const teamLines = persons.map((p) => {
    const props = p.props as Record<string, any>;
    return `- ${p.label}: ${props.role} (${props.focus_areas ? props.focus_areas.join(', ') : 'Operação'}).`;
  });

  const governanceRecords: string[] = [];
  if (isReactivated) {
    governanceRecords.push(
      '- Registro de Governança: REATIVAÇÃO_GERAL (Status: COMMITTED no SQLite | 100% dos criativos ativos).'
    );
  } else if (isPaused) {
    const pausedList = pausedAds.join(', ');
    governanceRecords.push(
      `- Registro de Governança: PAUSA_OPERACIONAL (Status: COMMITTED no SQLite | Criativo pausado: ${pausedList} | Executor: Aline Rocha | Aprovador: Marcos Silva).`
    );
  } else if (delegation && delegation.isDelegated) {
    governanceRecords.push(
      `- Registro de Governança: ${delegation.proposalTitle || 'Proposta de Realocação Orçamentária'} (Status: COMMITTED no SQLite | Delegado para: ${delegation.delegatedTo} | Aprovador: Marcos Silva).`
    );
  } else {
    governanceRecords.push('- Registro de Governança: Nenhuma pendência de escrita externa em aberto no momento.');
  }

  const teamSection = `${teamLines.join('\n')}
- Matriz de Alçadas: Aline Rocha (Operação direta Meta Ads), Carolina Mendes (Gerência & Propostas), Marcos Silva (Aprovação Executiva), Luiza Valente (Atendimento WhatsApp).
${governanceRecords.join('\n')}`;

  // 5. Supercérebro Conversas & WhatsApp (RAW_CONVERSAS_DATA)
  const threads = RAW_CONVERSAS_DATA.whatsapp_threads;
  const firstThread = (threads && threads.length > 0 && threads[0]) ? threads[0] : null;
  const threadTitle = firstThread ? firstThread.title : 'SPOT <> Housewhey Growth Team';
  const threadId = firstThread ? firstThread.thread_id : 'wa_spot_hw_ops';
  const threadMessages = firstThread ? firstThread.messages : [];

  const msgLines = threadMessages.map((m: { timestamp: string; sender_id: string; content: string }) => {
    const senderNode = persons.find((p) => p.id === m.sender_id);
    const senderName = senderNode ? senderNode.label : m.sender_id;
    return `  • ${m.timestamp.slice(8, 10)}/08 ${m.timestamp.slice(11, 16)} — ${senderName}: "${m.content}"`;
  });

  const meetTranscripts = RAW_CONVERSAS_DATA.meeting_transcripts;
  const firstMeet = (meetTranscripts && meetTranscripts.length > 0 && meetTranscripts[0]) ? meetTranscripts[0] : null;
  const meetPoints = firstMeet
    ? firstMeet.key_points.map((pt: string) => `  • ${pt}`).join('\n')
    : '  • Alinhamento semanal de performance.';
  const meetId = firstMeet ? firstMeet.meeting_id : 'meet_sync_20260819';

  const whatsappSection = `- Thread "${threadTitle}" (id: ${threadId}):
${msgLines.join('\n')}
- Atas de Reunião (${meetId}):
${meetPoints}`;

  // 6. Supercérebro Linha do Tempo & Grafo (RAW_TIMELINE_DATA)
  const timelineTitles = RAW_TIMELINE_DATA.events.map((e) => `${e.occurred_at.slice(8, 10)}/08: ${e.title}`).join('\n  • ');
  const timelineSection = `- Linha do Tempo Canônica:\n  • ${timelineTitles}
- Grafo: Aline (OPERATES Meta Ads), Carolina (MEMBER_OF SPOT), Marcos (APPROVES Propostas), Luiza (MEMBER_OF Vendas/WhatsApp).`;

  // 7. App Análise de Criativos (RAW_ANALISE_CRIATIVOS_DATA)
  const creatives = RAW_ANALISE_CRIATIVOS_DATA.creatives;
  const creativeLines = creatives.map((c) => {
    const isPausedCreative = !isReactivated && (isPaused ? pausedAds.includes(c.ad_id) : c.ad_id === 'ad_namorados_casal_03');
    const statusLabel = isPausedCreative ? 'Pausado' : 'Ativo';
    return `- Criativo "${c.ad_id}": Hook ${c.hook_score.toFixed(1)} | Retenção ${c.retention_score.toFixed(1)} | CTA ${c.cta_score.toFixed(1)} | Recomendação: ${c.recommendation} | Status: ${statusLabel}`;
  });
  const creativeSection = creativeLines.join('\n');

  const dataset = getAccountDataset(options);
  const accountContextStr = `=== ACCOUNT_CONTEXT (Contexto Canônico da Conta Ativa & Governança) ===\n${JSON.stringify(dataset, null, 2)}`;

  if (options.compact || options.isInformational) {
    return `${accountContextStr}

=== 1. META ADS (Resumo) ===
${metaAdsSection}

=== 2. CRM HUBSPOT (Resumo) ===
${crmSection}

=== 4. SUPERCÉREBRO (Equipe & Governança) ===
${teamSection}`;
  }

  return `${accountContextStr}

=== 1. META ADS (Campanhas, Criativos e Métricas) ===
${metaAdsSection}

=== 2. CRM HUBSPOT (Vendas, Leads & Atribuição) ===
${crmSection}

=== 3. MAPA DA SOLUÇÃO & PRODUTOS HOUSEWHEY ===
${solutionMapSection}

=== 4. SUPERCÉREBRO (Equipe & Governança) ===
${teamSection}

=== 5. SUPERCÉREBRO CONVERSAS & WHATSAPP (Memória Textual de Canais) ===
${whatsappSection}

=== 6. SUPERCÉREBRO LINHA DO TEMPO & GRAFO ===
${timelineSection}

=== 7. APP ANÁLISE DE CRIATIVOS ===
${creativeSection}`;
}
