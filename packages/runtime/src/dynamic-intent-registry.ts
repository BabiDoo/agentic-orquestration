export interface OperatorContext {
  id?: string;
  name?: string;
  role?: string;
  company?: string;
}

export interface ActionCardTemplate {
  actionType?: string;
  titleTemplate: string;
  subtextTemplate: string;
  btnTextTemplate: string;
  successMsgTemplate?: string;
}

export interface ReasoningStepTemplate {
  reasoning: string;
  tools: string[];
  observationTemplate: string;
}

export interface DynamicIntentDefinition {
  intentId: string;
  category: string;
  description: string;
  keywords: string[];
  exemplars: string[];
  requiredTools: string[];
  requiresApproval: boolean;
  isInformational?: boolean;
  isAtomicCommit?: boolean;
  actionCardTemplate?: ActionCardTemplate;
  step1Template?: ReasoningStepTemplate;
  step2Template?: ReasoningStepTemplate;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExtractedEntities {
  targetPerson: string;
  targetPersonId: string;
  targetRole?: string;
  targetAsset?: string;
  isDirectDispatch: boolean;
  isDevolutiva: boolean;
  isBriefing: boolean;
  topic?: string;
}

export interface ResolvedIntent {
  intentId: string;
  category: string;
  confidence: number;
  entities: ExtractedEntities;
  isActionRequired: boolean;
  isInformational: boolean;
  isAtomicCommit: boolean;
  definition: DynamicIntentDefinition;
  renderedCard?: {
    actionType?: string;
    title: string;
    subtext: string;
    btnText: string;
    successMsg: string;
  };
  renderedTrace?: {
    step1: {
      reasoningText: string;
      tools: string[];
      observation: string;
    };
    step2: {
      reasoningText: string;
      tools: string[];
      observation: string;
    };
  };
}

const DEFAULT_INTENTS: DynamicIntentDefinition[] = [
  {
    intentId: 'PROPOSAL_DELEGATION',
    category: 'PROPOSAL_DELEGATION',
    description: 'Formalização de propostas executivas, delegação de tarefas técnicas, envio de briefings e devolução de aprovação de governança.',
    keywords: ['proposta', 'delegar', 'devolutiva', 'devolver', 'despacho', 'briefing', 'atribuir', 'submeter', 'encaminhar', 'enviar proposta', 'mande um briefing', 'pauta da reunião'],
    exemplars: [
      'escreva essa proposta',
      'escreva a proposta formal para o marcos',
      'delegar tarefa para aline',
      'delegar para luiza',
      'emitir documento de devolutiva de aprovação',
      'devolver para carolina',
      'mande um briefing da proxima reuniao para a Luiza',
      'enviar um briefing para a aline',
      'despachar briefing para o marcos',
      'submeter proposta executiva',
      'submeter proposta de pausa no meta ads',
      'pode enviar a proposta',
      'pode mandar o briefing'
    ],
    requiredTools: ['read_memory_context', 'supercerebro:get_hierarchy', 'governed_pevc:eval', 'delegate_task'],
    requiresApproval: true,
    isAtomicCommit: true,
    isInformational: false,
    actionCardTemplate: {
      titleTemplate: 'Enviar {docType} para {targetPerson}',
      subtextTemplate: 'Ação: Formalizar {docTypeLower} e despachar para {targetPerson} ({targetRole})',
      btnTextTemplate: 'Enviar {docTypeLower} para {targetFirstName}?',
      successMsgTemplate: '✓ {docType} formalmente despachado(a) para {targetPerson} e commitado(a) no SQLite (Supercérebro atualizado).'
    },
    step1Template: {
      reasoning: 'Consultar dados consolidados, atas e histórico de decisões no Supercérebro.',
      tools: ['read_memory_context', 'supercerebro:get_hierarchy'],
      observationTemplate: 'Contexto da conta e perfil de {targetPerson} localizados'
    },
    step2Template: {
      reasoning: 'Estruturar {docTypeLower} e registrar solicitação de despacho no Capability Broker.',
      tools: ['governed_pevc:eval', 'delegate_task'],
      observationTemplate: '{docType} formatado(a) com sucesso · Solicitação de despacho pronta para {targetPerson}'
    }
  },
  {
    intentId: 'EXTERNAL_WRITE_PAUSE',
    category: 'EXTERNAL_WRITE_PAUSE',
    description: 'Pausa operacional de criativos ou campanhas saturadas/com baixo desempenho no Meta Ads.',
    keywords: ['pausa', 'pausar', 'pause', 'desativar', 'desativa', 'interromper veiculação', 'parar anúncio', 'parar criativo', 'para de rodar', 'para esse', 'baixo desempenho', 'fadiga', 'gastando muito', 'tá gastando', 'manda parar', 'testar pausa'],
    exemplars: [
      'pause os anúncios saturados',
      'pausar criativo ad_namorados_casal_03',
      'pausar anúncios de baixo desempenho',
      'desativar anúncio saturado',
      'manda parar'
    ],
    requiredTools: ['meta_ads:inspect_creatives', 'crm:fetch_orders', 'governed_pevc:eval', 'meta_ads:pause_ad'],
    requiresApproval: true,
    isAtomicCommit: true,
    isInformational: false,
    actionCardTemplate: {
      titleTemplate: 'Confirmar Pausa de Anúncios',
      subtextTemplate: 'Ação: Pausar {targetAsset} no Meta Ads e commitar no SQLite',
      btnTextTemplate: 'Confirmar Pausa',
      successMsgTemplate: '✓ Pausa do anúncio {targetAsset} executada no Meta Ads e commitada com sucesso no SQLite.'
    },
    step1Template: {
      reasoning: 'Inspecionar criativos saturados e métricas operacionais no Meta Ads.',
      tools: ['meta_ads:inspect_creatives', 'get_cta_diagnostics'],
      observationTemplate: 'Criativos saturados mapeados ({targetAsset}) · Métricas de CPA auditadas'
    },
    step2Template: {
      reasoning: 'Preparar proposta formal de governança e requisição de pausa no Capability Broker.',
      tools: ['capability_broker:check_approval', 'staging_writer:draft'],
      observationTemplate: 'Pausa em rascunho aguardando confirmação do operador'
    }
  },
  {
    intentId: 'EXTERNAL_WRITE_REACTIVATE',
    category: 'EXTERNAL_WRITE_REACTIVATE',
    description: 'Reativação ou religamento operacional de criativos e campanhas no Meta Ads.',
    keywords: ['reativar', 'religar', 'despausar', 'ativar', 'voltar a rodar', 'reativação'],
    exemplars: [
      'reativar campanhas pausadas',
      'religar o anúncio de baunilha',
      'despausar criativos',
      'ativar anúncios de alta conversão'
    ],
    requiredTools: ['list_ads', 'capability_broker:check_approval', 'reactivate_ad'],
    requiresApproval: true,
    isAtomicCommit: true,
    isInformational: false,
    actionCardTemplate: {
      titleTemplate: 'Confirmar Reativação de Anúncios',
      subtextTemplate: 'Ação: Reativar e religar a veiculação dos anúncios selecionados no Meta Ads',
      btnTextTemplate: 'Confirmar Reativação',
      successMsgTemplate: '✓ Reativação aprovada pelo operador. Anúncios religados com sucesso no Meta Ads (Commit auditado no SQLite).'
    },
    step1Template: {
      reasoning: 'Inspecionar histórico de anúncios pausados e verificar métricas de checkout no CRM.',
      tools: ['list_ads', 'fetch_crm_orders'],
      observationTemplate: 'Ativos selecionados validados para reativação com ROAS positivo'
    },
    step2Template: {
      reasoning: 'Validar alçada e emitir requisição de reativação no Capability Broker.',
      tools: ['capability_broker:check_approval', 'staging_writer:draft'],
      observationTemplate: 'Reativação em rascunho aguardando confirmação expressa'
    }
  },
  {
    intentId: 'UPDATE_BID_STRATEGY',
    category: 'UPDATE_BID_STRATEGY',
    description: 'Ajuste de estratégia de lance, limite de CPA ou meta de custo de veiculação no Meta Ads.',
    keywords: ['estratégia de lance', 'estrategia de lance', 'limite de cpa', 'lance', 'cpa limite', 'menor custo', 'bid strategy'],
    exemplars: [
      'alterar a estratégia de lance',
      'mudar estrategia de lance para limite de cpa',
      'alterar lance da campanha',
      'ajustar cpa limite'
    ],
    requiredTools: ['meta_ads:inspect_creatives', 'governed_pevc:eval', 'capability_broker:verify'],
    requiresApproval: true,
    isAtomicCommit: true,
    isInformational: false,
    actionCardTemplate: {
      titleTemplate: 'Submeter Ajuste de Estratégia de Lance',
      subtextTemplate: 'Ação: Alterar estratégia de lance para limite de CPA e submeter para aprovação de Marcos Silva',
      btnTextTemplate: 'Submeter Ajuste para Aprovação',
      successMsgTemplate: '✓ Proposta de ajuste de estratégia de lance submetida com sucesso para validação executiva de Marcos Silva.'
    },
    step1Template: {
      reasoning: 'Inspecionar métricas de lance, CPA histórico e orçamento da campanha.',
      tools: ['meta_ads:inspect_creatives', 'meta_ads:get_insights'],
      observationTemplate: 'Estratégia de lance e histórico de CPA analisados'
    },
    step2Template: {
      reasoning: 'Verificar alçada de governança e preparar proposta de alteração de bid.',
      tools: ['governed_pevc:eval', 'capability_broker:verify'],
      observationTemplate: 'Proposta de ajuste de lance pronta para despacho e aprovação'
    }
  },
  {
    intentId: 'BUDGET_REALLOCATION',
    category: 'BUDGET_REALLOCATION',
    description: 'Remanejamento de verba e realocação de orçamento entre campanhas ou plataformas no Meta Ads.',
    keywords: ['remanejamento', 'remanejamento de verba', 'remanejamento de orçamento', 'realocar verba', 'mudar orçamento', 'executar remanejamento', 'alterar orçamento', 'aumentar orçamento', 'reallocate_funds'],
    exemplars: [
      'submeter proposta de remanejamento',
      'executar remanejamento de verba',
      'remanejamento de verba no supercérebro',
      'solicito executar a ação executar remanejamento de verba no supercérebro'
    ],
    requiredTools: ['meta_ads:inspect_creatives', 'governed_pevc:eval', 'capability_broker:verify'],
    requiresApproval: true,
    isAtomicCommit: true,
    isInformational: false,
    actionCardTemplate: {
      titleTemplate: 'Submeter Proposta de Remanejamento',
      subtextTemplate: 'Ação: Formalizar proposta de remanejamento de verba e despachar para Marcos Silva',
      btnTextTemplate: 'Enviar Proposta para Marcos',
      successMsgTemplate: '✓ Proposta formal de remanejamento de verba despachada para Marcos Silva e commitada no SQLite (Supercérebro atualizado).'
    },
    step1Template: {
      reasoning: 'Inspecionar orçamento disponível e métricas das campanhas afetadas.',
      tools: ['meta_ads:inspect_creatives', 'crm:fetch_orders'],
      observationTemplate: 'Valores e campanhas de origem e destino validados'
    },
    step2Template: {
      reasoning: 'Preparar proposta formal de remanejamento para aprovação executiva.',
      tools: ['governed_pevc:eval', 'staging_writer:draft'],
      observationTemplate: 'Proposta de remanejamento formatada e pronta para envio a Marcos Silva'
    }
  },
  {
    intentId: 'REALLOCATE_FUNDS',
    category: 'REALLOCATE_FUNDS',
    description: 'Realocação e remanejamento de verba entre canais e campanhas.',
    keywords: ['reallocate_funds', 'realocar fundos', 'transferência de verba', 'transferencia de verba'],
    exemplars: [
      'solicito executar a ação executar remanejamento de verba',
      'reallocate_funds'
    ],
    requiredTools: ['meta_ads:inspect_creatives', 'governed_pevc:eval', 'capability_broker:verify'],
    requiresApproval: true,
    isAtomicCommit: true,
    isInformational: false,
    actionCardTemplate: {
      titleTemplate: 'Submeter Proposta de Remanejamento',
      subtextTemplate: 'Ação: Formalizar proposta de remanejamento de verba e despachar para Marcos Silva',
      btnTextTemplate: 'Enviar Proposta para Marcos',
      successMsgTemplate: '✓ Proposta formal de remanejamento de verba despachada para Marcos Silva e commitada no SQLite (Supercérebro atualizado).'
    },
    step1Template: {
      reasoning: 'Inspecionar orçamento disponível e métricas das campanhas afetadas.',
      tools: ['meta_ads:inspect_creatives', 'crm:fetch_orders'],
      observationTemplate: 'Valores e campanhas de origem e destino validados'
    },
    step2Template: {
      reasoning: 'Preparar proposta formal de remanejamento para aprovação executiva.',
      tools: ['governed_pevc:eval', 'staging_writer:draft'],
      observationTemplate: 'Proposta de remanejamento formatada e pronta para envio a Marcos Silva'
    }
  },
  {
    intentId: 'APPLY_SAC_DISCOUNT',
    category: 'APPLY_SAC_DISCOUNT',
    description: 'Autorização de cupons de desconto e exceções de vendas do atendimento SAC WhatsApp.',
    keywords: ['cupom', 'cupom de 15%', 'cupom de desconto', 'autorização de cupom', 'autorizacao de cupom', 'desconto no whatsapp', 'carrinho pendente'],
    exemplars: [
      'autorização de cupom',
      'solicito autorização de cupom de 15% off',
      'aplicar cupom para carrinho pendente',
      'liberar desconto no whatsapp'
    ],
    requiredTools: ['read_memory_context', 'supercerebro:graph', 'governed_pevc:eval'],
    requiresApproval: true,
    isAtomicCommit: true,
    isInformational: false,
    actionCardTemplate: {
      titleTemplate: 'Submeter Autorização de Cupom de Desconto',
      subtextTemplate: 'Ação: Solicitar autorização de cupom de desconto para clientes do WhatsApp com carrinho pendente',
      btnTextTemplate: 'Submeter Autorização de Cupom',
      successMsgTemplate: '✓ Solicitação de autorização de cupom de desconto registrada no Supercérebro e submetida para aprovação.'
    },
    step1Template: {
      reasoning: 'Verificar histórico de carrinhos pendentes e conversas do WhatsApp no Supercérebro.',
      tools: ['supercerebro:whatsapp_threads', 'read_memory_context'],
      observationTemplate: 'Carrinhos pendentes e margem de desconto verificados'
    },
    step2Template: {
      reasoning: 'Avaliar alçada do atendimento SAC e submeter solicitação de cupom.',
      tools: ['governed_pevc:eval', 'capability_broker:verify'],
      observationTemplate: 'Solicitação de cupom pronta para despacho e aprovação'
    }
  },
  {
    intentId: 'SUBMIT_GOVERNANCE_RULE',
    category: 'SUBMIT_GOVERNANCE_RULE',
    description: 'Submissão de propostas formais para criação ou alteração de regras automáticas de governança e tolerância.',
    keywords: ['proposta formal de governança', 'regra de governança', 'regra de tolerância', 'pausado automaticamente', 'cpa 3x acima', 'regras automatizadas'],
    exemplars: [
      'submeter uma proposta formal de governança',
      'proposta de regra de tolerância',
      'pausado automaticamente se cpa for alto',
      'criar regra de governança'
    ],
    requiredTools: ['read_memory_context', 'supercerebro:get_hierarchy', 'governed_pevc:eval'],
    requiresApproval: true,
    isAtomicCommit: true,
    isInformational: false,
    actionCardTemplate: {
      titleTemplate: 'Submeter Regra Formal para Marcos Silva',
      subtextTemplate: 'Ação: Submeter proposta de nova regra automatizada de governança para validação de Marcos Silva',
      btnTextTemplate: 'Enviar Proposta para Marcos Silva',
      successMsgTemplate: '✓ Proposta formal de regra de governança submetida com sucesso para validação de Marcos Silva.'
    },
    step1Template: {
      reasoning: 'Consultar matriz de governança e regras ativas no Supercérebro.',
      tools: ['read_memory_context', 'supercerebro:get_hierarchy'],
      observationTemplate: 'Estrutura de governança e políticas ativas consultadas'
    },
    step2Template: {
      reasoning: 'Formatar proposta de nova regra automatizada para submissão executiva.',
      tools: ['governed_pevc:eval', 'capability_broker:verify'],
      observationTemplate: 'Proposta de regra formatada e pronta para envio a Marcos Silva'
    }
  },
  {
    intentId: 'SAC_RECONCILIATION',
    category: 'SAC_RECONCILIATION',
    description: 'Reconciliação e commit de conversões de leads do WhatsApp Business / SAC com o CRM e Supercérebro.',
    keywords: ['reconciliar conversões', 'sac whatsapp', 'leads whatsapp', 'atendimentos whatsapp', 'conversões do whatsapp', 'whatsapp business', 'leads do whatsapp'],
    exemplars: [
      'reconciliar conversões de leads do whatsapp business',
      'reconciliar atendimentos sac com crm',
      'salvar conversões do whatsapp no supercérebro',
      'leads do whatsapp business de agosto'
    ],
    requiredTools: ['fetch_crm_orders', 'memory:get_whatsapp_threads', 'supercerebro:graph'],
    requiresApproval: true,
    isAtomicCommit: true,
    isInformational: false,
    actionCardTemplate: {
      titleTemplate: 'Commit de Reconciliação do WhatsApp',
      subtextTemplate: 'Ação: Salvar reconciliação de atendimentos e conversões do WhatsApp no Supercérebro',
      btnTextTemplate: 'Salvar no Supercérebro',
      successMsgTemplate: '✓ Reconciliação de conversões SAC do WhatsApp Business auditada e salva com sucesso no Supercérebro (Commit registrado no SQLite).'
    },
    step1Template: {
      reasoning: 'Auditar volume de conversões do WhatsApp Business e cruzar com pedidos no CRM.',
      tools: ['fetch_crm_orders', 'memory:get_whatsapp_threads'],
      observationTemplate: '48 conversões SAC identificadas e 86.4% de cobertura UTM'
    },
    step2Template: {
      reasoning: 'Preparar commit de reconciliação de dados no Supercérebro.',
      tools: ['governed_pevc:eval', 'staging_writer:draft'],
      observationTemplate: 'Reconciliação SAC pronta para commit no SQLite'
    }
  },
  {
    intentId: 'COPY_GENERATION',
    category: 'COPY_GENERATION',
    description: 'Geração de novas cópias, chamadas para ação (CTAs), ganchos e headlines para criativos.',
    keywords: ['cta', 'copy', 'copys', 'cópias', 'headline', 'headlines', 'sugira', 'ganchos', 'variações de copy', 'ideias de anúncio', 'ideias de headline'],
    exemplars: [
      'sugira 3 variações de cta',
      'escreva copys para o whey baunilha',
      'proponha novos ganchos para o ômega 3',
      'sugira cópias e chamadas para ação',
      'ideias de anúncio para o produto de baunilha'
    ],
    requiredTools: ['run_app_mapa_solucao', 'format_analytical_output'],
    requiresApproval: false,
    isInformational: true,
    isAtomicCommit: false,
    step1Template: {
      reasoning: 'Resgatar diferenciais de produto, laudos e propostas de valor no Mapa da Solução.',
      tools: ['run_app_mapa_solucao', 'read_memory_context'],
      observationTemplate: 'Atributos clean label e diferenciais técnicos recuperados'
    },
    step2Template: {
      reasoning: 'Formular sugestões de copys e CTAs segmentados por ângulo de conversão.',
      tools: ['format_analytical_output', 'adzhub_agent:draft_copys'],
      observationTemplate: '3 variações de copy e CTA geradas com sucesso'
    }
  },
  {
    intentId: 'GOVERNANCE_TEAM_QUERY',
    category: 'GOVERNANCE_TEAM_QUERY',
    description: 'Consultas sobre estado de governança, responsáveis por tarefas, pendências e decisões registradas.',
    keywords: ['quem ficou responsável', 'qual a proposta', 'quem é o responsável', 'o que a aline ficou responsável', 'marcos recebeu a proposta', 'status da proposta', 'como está a pendência', 'última decisão commitada', 'decisão commitada', 'status de governança'],
    exemplars: [
      'quem ficou responsável pela tarefa?',
      'qual a proposta e quem é o responsável?',
      'o marcos recebeu a proposta?',
      'a aline já foi avisada?',
      'como está o status de governança?',
      'qual foi a última decisão commitada?'
    ],
    requiredTools: ['governance_commit_store', 'get_whatsapp_threads', 'read_memory_context'],
    requiresApproval: false,
    isInformational: true,
    isAtomicCommit: false,
    step1Template: {
      reasoning: 'Consultar estado de commits imutáveis no SQLite e histórico de governança.',
      tools: ['governance_commit_store', 'read_memory_context'],
      observationTemplate: 'Estado de delegações e commits auditado no SQLite'
    },
    step2Template: {
      reasoning: 'Consolidar registro de responsáveis, alçadas e hash de integridade.',
      tools: ['supercerebro:graph', 'format_analytical_output'],
      observationTemplate: 'Informações de governança estruturadas para o operador'
    }
  },
  {
    intentId: 'ANALYTICAL_AUDIT',
    category: 'ANALYTICAL_AUDIT',
    description: 'Auditorias de métricas, diagnóstico de anomalias, reconciliação cruzada Meta × CRM e consultas técnicas.',
    keywords: ['cruzar vendas', 'analisar', 'anomalia', 'cpa', 'roas', 'crm', 'faturamento', 'relatório', 'por que aumentou'],
    exemplars: [
      'cruzar resultado dos anúncios com vendas reais no crm',
      'investigar anomalias na conta e por que o custo por conversão aumentou',
      'qual o cpa do whey isolado baunilha?',
      'analise a performance de agosto'
    ],
    requiredTools: ['run_app_analise_criativos', 'fetch_crm_orders', 'calculate_cpa_variance'],
    requiresApproval: false,
    isInformational: true,
    isAtomicCommit: false,
    step1Template: {
      reasoning: 'Coletar métricas downstream do Meta Ads e pedidos transacionais do CRM HubSpot.',
      tools: ['run_app_analise_criativos', 'fetch_crm_orders'],
      observationTemplate: 'Métricas de 01 a 20 de Agosto reconciliadas com 86.4% de cobertura UTM'
    },
    step2Template: {
      reasoning: 'Calcular variância de CPA, notas de criativo e isolar fatores causais.',
      tools: ['calculate_cpa_variance', 'format_analytical_output'],
      observationTemplate: 'Diagnóstico causal concluído com isolamento de top performers e gargalos'
    }
  },
  {
    intentId: 'CONVERSATIONAL_GREETING',
    category: 'CONVERSATIONAL_GREETING',
    description: 'Saudações, cumprimentos e conversações casuais do operador com o assistente.',
    keywords: ['oi', 'olá', 'ola', 'tudo bem', 'bom dia', 'boa tarde', 'boa noite', 'como vai', 'ajuda'],
    exemplars: [
      'oi',
      'olá',
      'tudo bem?',
      'bom dia',
      'boa tarde',
      'boa noite'
    ],
    requiredTools: ['read_memory_context'],
    requiresApproval: false,
    isInformational: true,
    isAtomicCommit: false,
    step1Template: {
      reasoning: 'Identificar operador ativo e carregar contexto da sessão no Supercérebro.',
      tools: ['read_memory_context', 'supercerebro:operator_profiles'],
      observationTemplate: 'Perfil de operador identificado e sessão ativa sincronizada'
    },
    step2Template: {
      reasoning: 'Sincronizar alçadas de governança e formatar atendimento personalizado.',
      tools: ['supercerebro:operators', 'format_conversational_output'],
      observationTemplate: 'Atendimento inicial pronto com alçadas e contexto ativos'
    }
  },
  {
    intentId: 'OPERATOR_TASK_INQUIRY',
    category: 'OPERATOR_TASK_INQUIRY',
    description: 'Consultas do operador sobre suas tarefas, afazeres, pendências e ações prioritárias.',
    keywords: ['o que eu tenho pra fazer', 'o que tenho pra fazer', 'o que tenho que fazer', 'o que eu tenho que fazer', 'quais sao minhas pendencias', 'quais são minhas pendências', 'minhas tarefas', 'o que devo fazer', 'quais minhas acoes', 'minhas ações'],
    exemplars: [
      'eu quero saber o que eu tenho pra fazer',
      'o que eu tenho para fazer?',
      'quais são minhas pendências?',
      'quais minhas tarefas hoje?',
      'o que devo fazer agora?'
    ],
    requiredTools: ['read_memory_context', 'supercerebro:operator_profiles', 'supercerebro:graph'],
    requiresApproval: false,
    isInformational: true,
    isAtomicCommit: false,
    step1Template: {
      reasoning: 'Consultar pendências ativas, perfil do operador e alçadas de governança no Supercérebro.',
      tools: ['read_memory_context', 'supercerebro:operator_profiles'],
      observationTemplate: 'Pendências operacionais e alçadas do operador carregadas'
    },
    step2Template: {
      reasoning: 'Reconciliar ações prioritárias e formatar lista de recomendações para o operador.',
      tools: ['supercerebro:graph', 'format_conversational_output'],
      observationTemplate: 'Ações prioritárias e pendências formatadas com sucesso'
    }
  }
];

export class DynamicIntentRegistry {
  private intents: Map<string, DynamicIntentDefinition> = new Map();
  private learnedExemplars: Map<string, string[]> = new Map();

  constructor(initialIntents?: DynamicIntentDefinition[]) {
    const list = initialIntents || DEFAULT_INTENTS;
    for (const intent of list) {
      this.intents.set(intent.intentId, {
        ...intent,
        createdAt: intent.createdAt || new Date().toISOString(),
        updatedAt: intent.updatedAt || new Date().toISOString()
      });
      this.learnedExemplars.set(intent.intentId, [...(intent.exemplars || [])]);
    }
  }

  public registerIntent(definition: DynamicIntentDefinition): void {
    const existing = this.intents.get(definition.intentId);
    const updated: DynamicIntentDefinition = {
      ...definition,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.intents.set(definition.intentId, updated);
    const exemplars = this.learnedExemplars.get(definition.intentId) || [];
    for (const ex of definition.exemplars || []) {
      if (!exemplars.includes(ex)) exemplars.push(ex);
    }
    this.learnedExemplars.set(definition.intentId, exemplars);
  }

  public addExemplar(intentId: string, prompt: string): boolean {
    const normalized = prompt.trim();
    if (!normalized) return false;

    let targetIntent = this.intents.get(intentId);
    if (!targetIntent) {
      targetIntent = {
        intentId,
        category: intentId,
        description: `Intenção dinâmica aprendida: ${intentId}`,
        keywords: [intentId.toLowerCase()],
        exemplars: [normalized],
        requiredTools: ['read_memory_context', 'governed_pevc:eval'],
        requiresApproval: true
      };
      this.registerIntent(targetIntent);
      return true;
    }

    const currentList = this.learnedExemplars.get(intentId) || [];
    if (!currentList.some((e) => e.toLowerCase() === normalized.toLowerCase())) {
      currentList.push(normalized);
      this.learnedExemplars.set(intentId, currentList);
      targetIntent.exemplars = currentList;
      targetIntent.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  public getIntents(): DynamicIntentDefinition[] {
    return Array.from(this.intents.values());
  }

  public extractEntities(prompt: string, operator?: OperatorContext): ExtractedEntities {
    const q = (prompt || '').toLowerCase().trim();

    const isOperatorMarcos = Boolean(operator?.id === 'p_marcos') || (operator?.name || '').toLowerCase().includes('marcos') || q.startsWith('sou o marcos') || q.startsWith('como marcos') || q.includes('sou marcos') || q.includes('como marcos');
    const isOperatorCarolina = Boolean(operator?.id === 'p_carolina') || (operator?.name || '').toLowerCase().includes('carolina') || q.startsWith('sou a carolina') || q.startsWith('como carolina') || q.includes('sou carolina') || q.includes('como carolina');
    const isOperatorAline = Boolean(operator?.id === 'p_aline') || (operator?.name || '').toLowerCase().includes('aline') || q.startsWith('sou a aline') || q.startsWith('como aline') || q.includes('sou aline') || q.includes('como aline');
    const isOperatorLuiza = Boolean(operator?.id === 'p_luiza') || (operator?.name || '').toLowerCase().includes('luiza') || q.startsWith('sou a luiza') || q.startsWith('como luiza') || q.includes('sou luiza') || q.includes('como luiza');

    const isDevolutiva =
      !q.includes('submeter') && (
        (isOperatorMarcos && !isOperatorCarolina && !isOperatorAline && !isOperatorLuiza) ||
        q.includes('devolutiva') ||
        q.includes('devolver') ||
        q.includes('despacho') ||
        q.startsWith('aprovar ') ||
        q.startsWith('como marcos') ||
        q.includes('aprovo a proposta') ||
        (q.includes('aprovar') && !q.includes('para aprovação') && !q.includes('para aprovacao'))
      );

    const isBriefing =
      q.includes('briefing') ||
      q.includes('resumo da reunião') ||
      q.includes('resumo da reuniao') ||
      q.includes('pauta da reunião') ||
      q.includes('pauta da reuniao');

    const isDirectDispatch =
      q.includes('pode enviar') ||
      q.includes('pode mandar') ||
      q.includes('confirmar envio') ||
      q.includes('despachar proposta') ||
      q.includes('despachar briefing') ||
      (q.includes('enviar') && (q.includes('proposta') || q.includes('briefing'))) ||
      (q.includes('mande') && (q.includes('proposta') || q.includes('briefing'))) ||
      (q.includes('submeter') && q.includes('proposta'));

    let targetPerson = 'Marcos Silva';
    let targetPersonId = 'p_marcos';
    let targetRole = 'Head de Marketing';

    if (isOperatorMarcos || isDevolutiva) {
      if (q.includes('carolina') || q.includes('carol')) {
        targetPerson = 'Carolina Mendes';
        targetPersonId = 'p_carolina';
        targetRole = 'Gerente de Contas';
      } else if (q.includes('luiza')) {
        targetPerson = 'Luiza Valente';
        targetPersonId = 'p_luiza';
        targetRole = 'Atendimento & Vendas';
      } else {
        targetPerson = 'Aline Rocha';
        targetPersonId = 'p_aline';
        targetRole = 'Gestora de Tráfego';
      }
    } else if (isOperatorCarolina) {
      if (q.includes('para aline') || q.includes('para a aline') || q.includes('delegar para aline')) {
        targetPerson = 'Aline Rocha';
        targetPersonId = 'p_aline';
        targetRole = 'Gestora de Tráfego';
      } else if (q.includes('para luiza') || q.includes('para a luiza')) {
        targetPerson = 'Luiza Valente';
        targetPersonId = 'p_luiza';
        targetRole = 'Atendimento & Vendas';
      } else {
        targetPerson = 'Marcos Silva';
        targetPersonId = 'p_marcos';
        targetRole = 'Head de Marketing';
      }
    } else if (isOperatorAline || isOperatorLuiza) {
      if (q.includes('carolina') || q.includes('carol')) {
        targetPerson = 'Carolina Mendes';
        targetPersonId = 'p_carolina';
        targetRole = 'Gerente de Contas';
      } else if (q.includes('luiza') && !isOperatorLuiza) {
        targetPerson = 'Luiza Valente';
        targetPersonId = 'p_luiza';
        targetRole = 'Atendimento & Vendas';
      } else {
        targetPerson = 'Marcos Silva';
        targetPersonId = 'p_marcos';
        targetRole = 'Head de Marketing';
      }
    } else {
      if ((q.includes('para aline') || q.includes('aline')) && !q.includes('sou a aline') && !q.includes('como aline')) {
        targetPerson = 'Aline Rocha';
        targetPersonId = 'p_aline';
        targetRole = 'Gestora de Tráfego';
      } else if ((q.includes('para luiza') || q.includes('luiza')) && !q.includes('sou a luiza') && !q.includes('como luiza')) {
        targetPerson = 'Luiza Valente';
        targetPersonId = 'p_luiza';
        targetRole = 'Atendimento & Vendas';
      } else if ((q.includes('para carolina') || q.includes('carolina')) && !q.includes('sou a carolina') && !q.includes('como carolina')) {
        targetPerson = 'Carolina Mendes';
        targetPersonId = 'p_carolina';
        targetRole = 'Gerente de Contas';
      } else {
        targetPerson = 'Marcos Silva';
        targetPersonId = 'p_marcos';
        targetRole = 'Head de Marketing';
      }
    }

    let targetAsset: string | undefined;
    if (q.includes('namorados') || q.includes('casal_03')) {
      targetAsset = 'ad_namorados_casal_03';
    } else if (q.includes('sabores_04') || q.includes('whey sabores')) {
      targetAsset = 'ad_whey_sabores_04';
    } else if (q.includes('baunilha_01') || q.includes('whey baunilha') || q.includes('whey isolado')) {
      targetAsset = 'ad_whey_baunilha_01';
    } else if (q.includes('omega') || q.includes('ômega') || q.includes('ifos')) {
      targetAsset = 'ad_omega3_alta_conc_02';
    } else {
      const assetMatch = prompt.match(/(?:campanha|anúncio|anuncio|produto)\s+([^\+,\.]+?)(?=\s+de|\s+para|\s+com|\$|$)/i);
      targetAsset = (assetMatch && assetMatch[1]) ? assetMatch[1].trim() : 'Campanha de Mídia';
    }

    return {
      targetPerson,
      targetPersonId,
      targetRole,
      targetAsset: targetAsset || 'Campanha de Mídia',
      isDirectDispatch,
      isDevolutiva,
      isBriefing,
      topic: isBriefing ? 'Briefing da Próxima Reunião' : (isDevolutiva ? 'Devolutiva de Aprovação de Orçamento' : 'Proposta Operacional de Realocação')
    };
  }

  public matchIntent(prompt: string, operator?: OperatorContext): ResolvedIntent {
    const q = (prompt || '').toLowerCase().trim();
    const entities = this.extractEntities(prompt, operator);

    let bestIntent: DynamicIntentDefinition | undefined;
    let bestScore = 0;

    for (const intent of this.intents.values()) {
      let score = 0;

      const exemplars = this.learnedExemplars.get(intent.intentId) || intent.exemplars || [];
      for (const ex of exemplars) {
        const exLower = ex.toLowerCase().trim();
        if (q === exLower) {
          score = Math.max(score, 1.0);
          break;
        }
        if (q.includes(exLower) || exLower.includes(q)) {
          score = Math.max(score, 0.85);
        }
      }

      for (const kw of intent.keywords || []) {
        const kwLower = kw.toLowerCase().trim();
        if (kwLower === 'oi' || kwLower === 'ola' || kwLower === 'olá' || kwLower === 'opa') {
          const firstWord = q.split(/\s+/)[0]?.replace(/[^a-z]/g, '');
          if (firstWord === kwLower || q === kwLower) {
            score += 0.35;
          }
        } else if (q.includes(kwLower)) {
          score += 0.35;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    }

    const isQueryState =
      (q.includes('quem') || q.includes('recebeu') || q.includes('status') || q.includes('conversa') || q.includes('mensagem') || q.includes('fale mais') || q.includes('funcionari') || q.includes('equipe') || q.includes('avisad')) &&
      // Não é query de governança se mencionar métricas analíticas
      !q.includes('qual o cpa') &&
      !q.includes('qual o roas') &&
      !q.includes('por que') &&
      !q.includes('custo por') &&
      !q.includes('desempenho') &&
      !q.includes('performance') &&
      !q.includes('análise') &&
      !q.includes('analise') &&
      !q.includes('delegar') &&
      !q.includes('atribuir') &&
      !q.includes('enviar') &&
      !q.includes('submeter') &&
      !q.includes('mande') &&
      !q.includes('escreva essa proposta') &&
      !q.includes('escreva a proposta') &&
      !q.includes('documento de devolutiva') &&
      !q.includes('gerar proposta') &&
      !q.includes('pode enviar') &&
      !q.includes('pode mandar') &&
      !q.includes('pausar') &&
      !q.includes('reativar');

    // Detecta intent analítica por termos de métricas
    const isAnalytical =
      (q.includes('cpa') || q.includes('roas') || q.includes('por que') || q.includes('custo por') ||
       q.includes('performance') || q.includes('faturamento') || q.includes('cruzar') ||
       q.includes('analise') || q.includes('análise') || q.includes('criativos trouxeram') ||
       q.includes('ticket') || q.includes('vendas')) &&
      !q.includes('escreva') &&
      !q.includes('delegar') &&
      !q.includes('enviar') &&
      !q.includes('pausar') &&
      !q.includes('reativar');

    // Detecta intent de pausa por termos coloquiais não cobertos por keywords
    const isPause =
      (q.includes('desativa') || q.includes('para de rodar') || q.includes('para esse anúncio') ||
       q.includes('tá gastando') || q.includes('manda parar') || q.includes('interromper')) &&
      !q.includes('reativ') &&
      !q.includes('proposta');

    // Detecta intent de reativação por termos coloquiais
    const isReactivate =
      (q.includes('reativ') || q.includes('religar') || q.includes('despausar') ||
       q.includes('volta a rodar') || q.includes('ativa os anúncios') || q.includes('ativar anúncios')) &&
      !q.includes('proposta');

    // Detecta saudações e conversações casuais
    const isGreeting =
      q === 'oi' || q === 'olá' || q === 'ola' || q.startsWith('oi ') || q.startsWith('olá ') || q.startsWith('ola ') ||
      q.includes('tudo bem') || q.includes('bom dia') || q.includes('boa tarde') || q.includes('boa noite') ||
      q.includes('como vai') || q.includes('como posso ajudar');

    // Detecta consultas de tarefas e pendências do operador
    const isTaskInquiry =
      q.includes('tarefa') || q.includes('pendênci') || q.includes('pendenci') ||
      q.includes('pra fazer') || q.includes('para fazer') || q.includes('que fazer');

    const isGovernanceRuleProposal =
      q.includes('regra de governança') || q.includes('regra de tolerância') ||
      q.includes('submeter uma proposta') || q.includes('proposta formal de governança') ||
      (q.includes('proposta') && (q.includes('regra') || q.includes('tolerância') || q.includes('pausado automaticamente')));

    const isSacDiscountProposal =
      q.includes('cupom sac') || q.includes('autorização de cupom') || q.includes('autorizacao de cupom') ||
      q.includes('cupom de 15%') || (q.includes('cupom') && q.includes('sac'));

    const isSacReconcileProposal =
      q.includes('reconciliar conversões') || q.includes('reconciliar conversoes') ||
      (q.includes('reconciliar') && q.includes('sac'));

    const isBudgetReallocation =
      q.includes('remanejamento') || q.includes('realocar') || q.includes('reallocate') ||
      (q.includes('orçamento') && (q.includes('verba') || q.includes('mídia'))) ||
      (q.includes('orcamento') && (q.includes('verba') || q.includes('midia')));

    const isBidStrategy =
      q.includes('estratégia de lance') || q.includes('estrategia de lance') ||
      q.includes('limite de cpa') || (q.includes('lance') && (q.includes('campanha') || q.includes('cpa') || q.includes('meta')));

    if (entities.isDevolutiva || q.startsWith('aprovar') || (q.includes('aprovar') && !q.includes('para aprovação') && !q.includes('para aprovacao'))) {
      bestIntent = this.intents.get('PROPOSAL_DELEGATION');
    } else if (isBudgetReallocation && (this.intents.has('BUDGET_REALLOCATION') || this.intents.has('REALLOCATE_FUNDS'))) {
      bestIntent = this.intents.get('BUDGET_REALLOCATION') || this.intents.get('REALLOCATE_FUNDS');
    } else if (isBidStrategy && this.intents.has('UPDATE_BID_STRATEGY')) {
      bestIntent = this.intents.get('UPDATE_BID_STRATEGY');
    } else if (isSacDiscountProposal && this.intents.has('APPLY_SAC_DISCOUNT')) {
      bestIntent = this.intents.get('APPLY_SAC_DISCOUNT');
    } else if (isSacReconcileProposal && (this.intents.has('SAC_RECONCILIATION') || this.intents.has('RECONCILE_CONVERSIONS'))) {
      bestIntent = this.intents.get('SAC_RECONCILIATION') || this.intents.get('RECONCILE_CONVERSIONS');
    } else if (isGovernanceRuleProposal && this.intents.has('SUBMIT_GOVERNANCE_RULE')) {
      bestIntent = this.intents.get('SUBMIT_GOVERNANCE_RULE');
    } else if (isPause) {
      bestIntent = this.intents.get('EXTERNAL_WRITE_PAUSE') || bestIntent;
    } else if (isReactivate) {
      bestIntent = this.intents.get('EXTERNAL_WRITE_REACTIVATE') || bestIntent;
    } else if (isGreeting) {
      bestIntent = this.intents.get('CONVERSATIONAL_GREETING') || bestIntent;
    } else if (isTaskInquiry) {
      bestIntent = this.intents.get('OPERATOR_TASK_INQUIRY') || bestIntent;
    } else if (isAnalytical) {
      bestIntent = this.intents.get('ANALYTICAL_AUDIT') || bestIntent;
    } else if (isQueryState) {
      bestIntent = this.intents.get('GOVERNANCE_TEAM_QUERY') || bestIntent;
    } else if (entities.isBriefing || q.includes('proposta') || q.includes('deleg') || q.includes('mande') || q.includes('enviar') || q.includes('submeter')) {
      if (q.includes('paus') && !entities.isBriefing && !q.includes('proposta') && !q.includes('submeter')) {
        bestIntent = this.intents.get('EXTERNAL_WRITE_PAUSE') || bestIntent;
      } else {
        bestIntent = this.intents.get('PROPOSAL_DELEGATION') || bestIntent;
      }
    }

    const fallbackIntent = (q.length < 25 && !isPause && !isReactivate)
      ? (this.intents.get('CONVERSATIONAL_GREETING') || this.intents.get('ANALYTICAL_AUDIT'))
      : (this.intents.get('ANALYTICAL_AUDIT') || DEFAULT_INTENTS[0]!);

    const finalIntent: DynamicIntentDefinition = bestIntent || fallbackIntent || DEFAULT_INTENTS[0]!;

    const docType = entities.isBriefing ? 'Briefing' : entities.isDevolutiva ? 'Devolutiva' : 'Proposta';
    const docTypeLower = docType.toLowerCase();
    const targetFirstName = entities.targetPerson.split(' ')[0] || 'Marcos';

    let renderedCard: ResolvedIntent['renderedCard'];
    if (finalIntent.actionCardTemplate && finalIntent.requiresApproval) {
      if (entities.isDevolutiva) {
        renderedCard = {
          actionType: 'APPROVE_PROPOSAL',
          title: `Confirmar Devolutiva de Aprovação para ${entities.targetPerson}`,
          subtext: `Ação: Formalizar aprovação de Marcos Silva e delegar execução técnica a ${entities.targetPerson} (${entities.targetRole || 'SPOT'})`,
          btnText: `Confirmar Devolutiva de Aprovação`,
          successMsg: `✓ Devolutiva de aprovação confirmada e commitada com sucesso no sistema. Decisão oficialmente delegada de volta para ${entities.targetPerson} (Commit auditado no SQLite).`
        };
      } else {
        const tpl = finalIntent.actionCardTemplate;
        const replaceVars = (str: string) =>
          str
            .replace(/{docType}/g, docType)
            .replace(/{docTypeLower}/g, docTypeLower)
            .replace(/{targetPerson}/g, entities.targetPerson)
            .replace(/{targetRole}/g, entities.targetRole || '')
            .replace(/{targetFirstName}/g, targetFirstName)
            .replace(/{targetAsset}/g, entities.targetAsset || 'ad_namorados_casal_03');

        const resolvedCardAction =
          finalIntent.category === 'UPDATE_BID_STRATEGY' ? 'UPDATE_BID_STRATEGY' :
          finalIntent.category === 'BUDGET_REALLOCATION' || finalIntent.category === 'REALLOCATE_FUNDS' ? 'BUDGET_REALLOCATION' :
          finalIntent.category === 'APPLY_SAC_DISCOUNT' ? 'APPLY_SAC_DISCOUNT' :
          finalIntent.category === 'EXTERNAL_WRITE_PAUSE' ? 'EXTERNAL_WRITE_PAUSE' :
          finalIntent.category === 'EXTERNAL_WRITE_REACTIVATE' ? 'EXTERNAL_WRITE_REACTIVATE' :
          finalIntent.category === 'SAC_RECONCILIATION' || finalIntent.category === 'RECONCILE_CONVERSIONS' ? 'RECONCILE_CONVERSIONS' :
          (docTypeLower.includes('lance') || q.includes('lance') ? 'UPDATE_BID_STRATEGY' :
           docTypeLower.includes('remanej') || docTypeLower.includes('verba') || q.includes('remanejamento') || q.includes('verba') ? 'BUDGET_REALLOCATION' :
           docTypeLower.includes('cupom') || q.includes('cupom') ? 'APPLY_SAC_DISCOUNT' :
           docTypeLower.includes('pausa') || q.includes('pausa') ? 'EXTERNAL_WRITE_PAUSE' :
           'PROPOSAL_DELEGATION');

        renderedCard = {
          actionType: resolvedCardAction,
          title: cleanCardTitle(replaceVars(tpl.titleTemplate)),
          subtext: replaceVars(tpl.subtextTemplate),
          btnText: replaceVars(tpl.btnTextTemplate),
          successMsg: replaceVars(tpl.successMsgTemplate || '✓ Ação aprovada e commitada no SQLite.')
        };
      }
    }

    let renderedTrace: ResolvedIntent['renderedTrace'];
    if (finalIntent.step1Template && finalIntent.step2Template) {
      const replaceVars = (str: string) =>
        str
          .replace(/{docType}/g, docType)
          .replace(/{docTypeLower}/g, docTypeLower)
          .replace(/{targetPerson}/g, entities.targetPerson)
          .replace(/{targetAsset}/g, entities.targetAsset || 'ad_namorados_casal_03');

      renderedTrace = {
        step1: {
          reasoningText: replaceVars(finalIntent.step1Template.reasoning),
          tools: finalIntent.step1Template.tools,
          observation: replaceVars(finalIntent.step1Template.observationTemplate)
        },
        step2: {
          reasoningText: replaceVars(finalIntent.step2Template.reasoning),
          tools: finalIntent.step2Template.tools,
          observation: replaceVars(finalIntent.step2Template.observationTemplate)
        }
      };
    }

    return {
      intentId: finalIntent.intentId,
      category: finalIntent.category,
      confidence: Math.min(Math.max(bestScore, 0.75), 1.0),
      entities,
      isActionRequired: finalIntent.requiresApproval,
      isInformational: Boolean(finalIntent.isInformational ?? !finalIntent.requiresApproval),
      isAtomicCommit: Boolean(finalIntent.isAtomicCommit ?? finalIntent.requiresApproval),
      definition: finalIntent,
      renderedCard,
      renderedTrace
    };
  }

  public exportState(): string {
    return JSON.stringify({
      intents: Array.from(this.intents.values()),
      learnedExemplars: Object.fromEntries(this.learnedExemplars.entries())
    });
  }

  public importState(jsonStr: string): void {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed.intents)) {
        for (const it of parsed.intents) {
          this.registerIntent(it);
        }
      }
      if (parsed.learnedExemplars && typeof parsed.learnedExemplars === 'object') {
        for (const [id, list] of Object.entries(parsed.learnedExemplars)) {
          if (Array.isArray(list)) {
            this.learnedExemplars.set(id, list as string[]);
          }
        }
      }
    } catch {
      // Ignora payload malformado
    }
  }
}

export const globalIntentRegistry = new DynamicIntentRegistry();

export function cleanCardTitle(title?: string): string {
  if (!title) return '';
  return title.replace(/^(Governança|Governanca)\s*(?:&|de)?\s*[A-Za-zÀ-ÿ\s]*:\s*/i, '').trim();
}
