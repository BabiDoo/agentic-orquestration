import { z } from 'zod';
import {
  RawMetaAdsData,
  RawCrmLeadsData,
  RawAnaliseCriativosData,
  RAW_META_ADS_DATA,
  RAW_CRM_LEADS_DATA,
  RAW_ANALISE_CRIATIVOS_DATA,
  reconcileMetaAdsAndCrm
} from '@adzhub/data';

/**
 * Schema de entrada para geração de Pauta de Reunião Executiva.
 */
export const MeetingAgendaInputSchema = z.object({
  client_id: z.string().min(1, { message: 'client_id é obrigatório' }),
  timeframe: z.object({
    since: z.string().datetime({ message: 'since deve ser data ISO-8601' }),
    until: z.string().datetime({ message: 'until deve ser data ISO-8601' }),
    timezone: z.string().default('America/Sao_Paulo')
  }),
  meeting_type: z
    .enum(['WEEKLY_PERFORMANCE', 'MONTHLY_EXECUTIVE', 'STRATEGIC_ALIGNMENT'])
    .optional()
    .default('WEEKLY_PERFORMANCE'),
  participants: z
    .array(
      z.object({
        name: z.string(),
        role: z.string()
      })
    )
    .optional()
    .default([
      { name: 'Marcos Silva', role: 'Head de Marketing (Cliente - Housewhey)' },
      { name: 'Carolina Mendes', role: 'Gerente de Contas (SPOT)' },
      { name: 'Aline Rocha', role: 'Gestora de Mídia e Performance (SPOT)' }
    ])
});

export type MeetingAgendaInput = z.infer<typeof MeetingAgendaInputSchema>;
export type MeetingAgendaInputRaw = z.input<typeof MeetingAgendaInputSchema>;

/**
 * Item de discussão estruturado na pauta.
 */
export const AgendaTopicSchema = z.object({
  order: z.number().int().positive(),
  duration_minutes: z.number().int().positive(),
  topic_title: z.string(),
  objective: z.string(),
  key_data_points: z.array(z.string()).min(1),
  presenter: z.string()
});

export type AgendaTopic = z.infer<typeof AgendaTopicSchema>;

/**
 * Item de ação com responsável e prazo.
 */
export const ActionItemProposalSchema = z.object({
  action_id: z.string(),
  description: z.string(),
  assignee: z.string(),
  deadline_days: z.number().int().positive(),
  status: z.enum(['PROPOSED', 'PENDING_APPROVAL', 'SCHEDULED'])
});

export type ActionItemProposal = z.infer<typeof ActionItemProposalSchema>;

/**
 * Schema de Saída da Pauta de Reunião.
 */
export const MeetingAgendaOutputSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  agenda_id: z.string().regex(/^art_ma_[a-zA-Z0-9_-]+$/),
  client_id: z.string(),
  meeting_title: z.string(),
  meeting_type: z.string(),
  timeframe: z.object({
    since: z.string(),
    until: z.string(),
    timezone: z.string()
  }),
  generated_at: z.string().datetime(),
  participants: z.array(
    z.object({
      name: z.string(),
      role: z.string()
    })
  ),
  executive_summary: z.string(),
  reconciled_metrics: z.object({
    total_spend_brl: z.number(),
    total_crm_sales: z.number(),
    total_crm_revenue_brl: z.number(),
    blended_roas: z.number(),
    blended_cpa_brl: z.number()
  }),
  critical_highlights: z.array(z.string()).min(1),
  pending_decisions: z.array(
    z.object({
      decision_id: z.string(),
      title: z.string(),
      rationale: z.string(),
      impact: z.string(),
      requires_approval_from: z.string()
    })
  ),
  agenda_topics: z.array(AgendaTopicSchema).min(1),
  proposed_action_items: z.array(ActionItemProposalSchema).min(1),
  rendered_markdown: z.string().min(1),
  evidence_refs: z.array(z.string()).min(1)
});

export type MeetingAgendaOutput = z.infer<typeof MeetingAgendaOutputSchema>;

export interface MeetingBriefAppOptions {
  metaAdsData?: RawMetaAdsData;
  crmLeadsData?: RawCrmLeadsData;
  analiseCriativosData?: RawAnaliseCriativosData;
}

/**
 * App de Geração de Pauta de Reunião com o Cliente (MEETING_AGENDA_GENERATION).
 * Cruza métricas reconciliadas, anomalias, decisões pendentes e plano de ação em formato estruturado.
 */
export class MeetingBriefApp {
  public generateAgenda(
    rawInput: MeetingAgendaInputRaw,
    options: MeetingBriefAppOptions = {}
  ): MeetingAgendaOutput {
    const input = MeetingAgendaInputSchema.parse(rawInput);
    const metaAds = options.metaAdsData ?? RAW_META_ADS_DATA;
    const crmLeads = options.crmLeadsData ?? RAW_CRM_LEADS_DATA;
    const analiseCriativos = options.analiseCriativosData ?? RAW_ANALISE_CRIATIVOS_DATA;

    if (metaAds.client_id !== input.client_id || crmLeads.client_id !== input.client_id) {
      throw new Error(
        `Isolamento de cliente violado na pauta de reunião: solicitado '${input.client_id}'.`
      );
    }

    const reconcileResult = reconcileMetaAdsAndCrm(metaAds, crmLeads, analiseCriativos);
    const joined = reconcileResult.joinedPerformance;

    let totalSpend = 0;
    let totalSales = 0;
    let totalRevenue = 0;
    const allEvidenceRefs: string[] = [];

    for (const item of joined) {
      totalSpend += item.spend_brl;
      totalSales += item.sales_count;
      totalRevenue += item.revenue_brl;
      allEvidenceRefs.push(`evi_ma_${item.ad_id}`);
    }

    const blendedRoas = totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100) / 100 : 0;
    const blendedCpa = totalSales > 0 ? Math.round((totalSpend / totalSales) * 100) / 100 : 0;

    const now = new Date().toISOString();
    const agendaId = `art_ma_sync_${input.client_id}_${input.timeframe.since.slice(0, 10)}`;

    const topPerformer = joined.find((j) => j.sales_count >= 5) ?? joined[0];
    const underPerformer = joined.find((j) => j.spend_brl > 3000 && j.sales_count <= 4);

    const criticalHighlights = [
      `Faturamento auditado no CRM de R$ ${totalRevenue.toFixed(2)} sobre gasto Meta Ads de R$ ${totalSpend.toFixed(2)} (ROAS Consolidado Real: ${blendedRoas}x).`,
      topPerformer
        ? `Criativo destaque '${topPerformer.ad_name}' responde por ${topPerformer.sales_count} vendas com CPA saudável de R$ ${(topPerformer.spend_brl / Math.max(1, topPerformer.sales_count)).toFixed(2)}.`
        : 'Volume de vendas disperso entre anúncios.',
      underPerformer
        ? `Alerta Crítico: O anúncio '${underPerformer.ad_name}' consumiu R$ ${underPerformer.spend_brl.toFixed(2)} com apenas ${underPerformer.sales_count} vendas (CPA R$ ${(underPerformer.spend_brl / Math.max(1, underPerformer.sales_count)).toFixed(2)}), demandando pausa imediata.`
        : 'Nenhum anúncio em queima orçamentária crítica.'
    ];

    const pendingDecisions = [
      {
        decision_id: 'dec_pause_underperforming_ad',
        title: `Pausa do anúncio '${underPerformer?.ad_name ?? 'Namorados Casal'}' e remanejamento de verba`,
        rationale: 'Frequência elevada (2.65x) e Hook Score 4.2 geraram queima de verba nos últimos 7 dias.',
        impact: `Estancar perda financeira de R$ ${underPerformer?.spend_brl.toFixed(2) ?? '4.850,00'} e direcionar orçamento para escala de criativos validados.`,
        requires_approval_from: 'Marcos Silva (Head de Marketing - Housewhey)'
      },
      {
        decision_id: 'dec_scale_top_performer',
        title: `Escala de 50% no orçamento diário do '${topPerformer?.ad_name ?? 'Whey Baunilha'}'`,
        rationale: 'ROAS real acima de 2.6x com volume constante de fechamento no CRM.',
        impact: 'Aumento previsto de 30% a 45% em volume de novos pedidos com CPA controlado.',
        requires_approval_from: 'Marcos Silva (Head de Marketing - Housewhey)'
      }
    ];

    const topics: AgendaTopic[] = [
      {
        order: 1,
        duration_minutes: 10,
        topic_title: '1. Panorama Reconciliado de Performance (Meta Ads x CRM x Receita)',
        objective: 'Apresentar números consolidados de vendas reais e demonstrar integridade de atribuição.',
        key_data_points: [
          `Gasto Total: R$ ${totalSpend.toFixed(2)}`,
          `Receita Real CRM: R$ ${totalRevenue.toFixed(2)}`,
          `ROAS Real: ${blendedRoas}x | CPA Médio: R$ ${blendedCpa.toFixed(2)}`
        ],
        presenter: 'Aline Rocha (SPOT)'
      },
      {
        order: 2,
        duration_minutes: 15,
        topic_title: '2. Diagnóstico de Criativos e Detecção de Saturação',
        objective: 'Avaliar retenção, hook score e causas da elevação do CPA em criativos específicos.',
        key_data_points: [
          'Análise de fadiga no criativo casal_03 (Hook Score 4.2)',
          'Feedback qualitativo de vendas via WhatsApp (preferência por Whey Baunilha e Ômega 3)'
        ],
        presenter: 'Carolina Mendes (SPOT)'
      },
      {
        order: 3,
        duration_minutes: 15,
        topic_title: '3. Decisões Estratégicas e Governança de Mídia',
        objective: 'Discutir e aprovar as propostas de pausa, escala e teste de novos ganchos.',
        key_data_points: [
          'Proposta formal de pausa do anúncio em queima de verba',
          'Proposta de remanejamento orçamentário para escala'
        ],
        presenter: 'Marcos Silva (Housewhey) & Carolina Mendes (SPOT)'
      },
      {
        order: 4,
        duration_minutes: 10,
        topic_title: '4. Pipeline de Novos Briefings e Próximos Passos',
        objective: 'Alinhar prazos para gravação dos novos ganchos (Hook Refresh) e cronograma da semana.',
        key_data_points: [
          'Apresentação do briefing do novo hook focado em pureza/laudo',
          'Definição de prazos de entrega'
        ],
        presenter: 'Aline Rocha (SPOT)'
      }
    ];

    const actionItems: ActionItemProposal[] = [
      {
        action_id: 'act_01_submit_formal_pause_proposal',
        description: 'Emitir e aprovar proposta com Hash-Binding para pausa no Meta Ads',
        assignee: 'Aline Rocha & Marcos Silva',
        deadline_days: 1,
        status: 'PENDING_APPROVAL'
      },
      {
        action_id: 'act_02_send_creative_brief_production',
        description: 'Enviar Briefing Criativo de Hook Refresh para equipe de produção de conteúdo',
        assignee: 'Carolina Mendes',
        deadline_days: 2,
        status: 'SCHEDULED'
      },
      {
        action_id: 'act_03_monitor_crm_daily_reconciliation',
        description: 'Acompanhar fechamentos diários no CRM pós-escala do Whey Baunilha',
        assignee: 'Aline Rocha',
        deadline_days: 5,
        status: 'SCHEDULED'
      }
    ];

    const meetingTitle = `Pauta de Alinhamento Semanal de Performance — ${input.client_id.toUpperCase()} (Agosto 2026)`;
    const executiveSummary = `Reunião executiva para apresentar os resultados reconciliados de performance de Agosto, diagnosticar a divergência de CPA entre criativos e submeter à aprovação as propostas de remanejamento orçamentário e novos briefings criativos.`;

    const renderedMarkdown = `# ${meetingTitle}
**ID da Pauta:** \`${agendaId}\`  
**Data da Reunião:** ${input.timeframe.until.slice(0, 10)}  
**Participantes:** ${input.participants.map((p) => `${p.name} (${p.role})`).join(', ')}  

---

## 📊 1. Resumo Executivo & Métricas Reconciliadas
- **Investimento Total em Mídia:** R$ ${totalSpend.toFixed(2)}
- **Pedidos Reais Confirmados no CRM:** ${totalSales}
- **Faturamento Real Gerado:** R$ ${totalRevenue.toFixed(2)}
- **ROAS Real Blended:** **${blendedRoas}x**
- **CPA Médio da Conta:** R$ ${blendedCpa.toFixed(2)}

### Destaques Críticos:
${criticalHighlights.map((h) => `- ${h}`).join('\n')}

---

## ⏱️ 2. Grade de Tópicos e Discussão (50 minutos)
${topics
  .map(
    (t) => `### ${t.topic_title} (${t.duration_minutes} min) — *Apresentador: ${t.presenter}*
**Objetivo:** ${t.objective}  
**Pontos de Dados Centrais:**  
${t.key_data_points.map((dp) => `  - ${dp}`).join('\n')}
`
  )
  .join('\n')}

---

## ⚖️ 3. Decisões Pendentes de Aprovação Executiva
${pendingDecisions
  .map(
    (d) => `### 📌 ${d.title}
- **Justificativa:** ${d.rationale}
- **Impacto:** ${d.impact}
- **Aprovador Responsável:** **${d.requires_approval_from}**
`
  )
  .join('\n')}

---

## ✅ 4. Plano de Ação e Próximos Passos
| Item | Ação | Responsável | Prazo | Status |
| :--- | :--- | :--- | :--- | :--- |
${actionItems.map((a) => `| \`${a.action_id}\` | ${a.description} | ${a.assignee} | D+${a.deadline_days} | \`${a.status}\` |`).join('\n')}
`;

    return {
      schemaVersion: '1.0.0',
      agenda_id: agendaId,
      client_id: input.client_id,
      meeting_title: meetingTitle,
      meeting_type: input.meeting_type,
      timeframe: input.timeframe,
      generated_at: now,
      participants: input.participants,
      executive_summary: executiveSummary,
      reconciled_metrics: {
        total_spend_brl: totalSpend,
        total_crm_sales: totalSales,
        total_crm_revenue_brl: totalRevenue,
        blended_roas: blendedRoas,
        blended_cpa_brl: blendedCpa
      },
      critical_highlights: criticalHighlights,
      pending_decisions: pendingDecisions,
      agenda_topics: topics,
      proposed_action_items: actionItems,
      rendered_markdown: renderedMarkdown,
      evidence_refs: allEvidenceRefs
    };
  }
}
