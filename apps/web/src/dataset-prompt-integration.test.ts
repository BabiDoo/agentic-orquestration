import { describe, expect, it } from 'vitest';
import { generateAuditedDatasetResponse } from './runs-service.js';
import { createSearchConversationsTool } from '@adzhub/tools';
import { RAW_CONVERSAS_DATA } from '@adzhub/data';

describe('Dataset & Prompt Integration Tests', () => {
  it('deve responder corretamente a perguntas sobre mensagens e decisões trocadas via WhatsApp (Mock/Offline)', () => {
    const question = 'quais conversas e decisoes via whatsapp existem?';
    const response = generateAuditedDatasetResponse(question);

    expect(response).toContain('Memória Textual de Conversas & Decisões via WhatsApp');
    expect(response).toContain('wa_spot_hw_ops');
    expect(response).toContain('Aline Rocha');
    expect(response).toContain('Luiza Valente');
    expect(response).toContain('Marcos Silva');
    expect(response).toContain('Qualquer recomendação de pausar anúncio ou remanejar verba diária precisa passar pelo fluxo formal de proposta e aprovação');
  });

  it('deve permitir a busca isolada no canal whatsapp via ferramenta search_conversations', async () => {
    const tool = createSearchConversationsTool({ conversations: RAW_CONVERSAS_DATA });
    const result = await tool.execute(
      {
        client_id: 'cli_housewhey',
        channel: 'whatsapp',
        limit: 10
      },
      { taskId: 'task_test', runId: 'run_test', correlationId: 'corr_test', toolCallId: 'tc_1' }
    );

    expect(result.ok).toBe(true);
    if (result.ok && result.data) {
      expect(result.data.messages.length).toBeGreaterThan(0);
      expect(result.data.messages.every((m) => m.channel === 'whatsapp')).toBe(true);
      expect(result.data.messages.some((m) => m.content.includes('pausar anúncio'))).toBe(true);
    }
  });

  it('deve cobrir as 7 fontes do dataset canônico no gerador de respostas', () => {
    // 1. Meta Ads
    expect(generateAuditedDatasetResponse('quais são os criativos de melhor performance no meta ads?')).toContain('ad_whey_baunilha_01');
    // 2. CRM Leads
    expect(generateAuditedDatasetResponse('qual o faturamento e vendas reais no crm?')).toContain('62 pedidos auditados');
    // 3. Mapa da Solução
    expect(generateAuditedDatasetResponse('qual a matéria-prima e certificação do ômega 3?')).toContain('IFOS 5 estrelas');
    // 4. Supercérebro Equipe
    expect(generateAuditedDatasetResponse('quem é a equipe e qual a governança?')).toContain('Aline Rocha');
    expect(generateAuditedDatasetResponse('quais sao os meus funcionarios atualmente?')).toContain('Supercérebro — Equipe e Políticas de Governança');
    expect(generateAuditedDatasetResponse('me fale mais sobre o marco silva')).toContain('Supercérebro — Equipe e Políticas de Governança');
    // 5. Conversas / WhatsApp
    expect(generateAuditedDatasetResponse('quais mensagens de whatsapp foram trocadas?')).toContain('Luiza Valente');
  });

  it('deve confirmar que não existem mais ativos pausados após commit de reativação pelo operador', () => {
    const question = 'agora me diga se existe algum ativo pausado ainda';
    
    // Antes da reativação:
    const beforeResponse = generateAuditedDatasetResponse(question, undefined, false);
    expect(beforeResponse).toContain('Dia dos Namorados');

    // Após commit de reativação:
    const afterResponse = generateAuditedDatasetResponse(question, undefined, true);
    expect(afterResponse).toContain('Não existem ativos pausados na conta Housewhey neste momento');
    expect(afterResponse).toContain('100% dos ativos da conta Housewhey estão Ativos');
  });

  it('deve gerar a proposta formal de alteração e delegação para Aline Rocha', () => {
    const prompt = 'escreva essa proposta e delege para a Aline';
    const response = generateAuditedDatasetResponse(prompt);

    expect(response).toContain('PROPOSTA FORMAL DE ALTERAÇÃO OPERACIONAL E DELEGAÇÃO');
    expect(response).toContain('PARA: Marcos Silva, Head de Marketing Housewhey');
    expect(response).toContain('DE: Aline Rocha, Gestora de Tráfego SPOT');
    expect(response).toContain('ad_namorados_casal_03');
    expect(response).toContain('Escopo da Delegação de Tarefa');
  });

  it('deve responder corretamente a perguntas subsequentes sobre a proposta delegada no Supercérebro após commit', () => {
    const query = 'qual a proposta e quem ficou responsável?';
    const delegationState = {
      isDelegated: true,
      delegatedTo: 'Aline Rocha',
      personId: 'p_aline',
      proposalTitle: 'Pausa do Criativo ad_namorados_casal_03 e Realocação de Verba',
      proposalDetails: 'Solicitação de aprovação formal para pausa do criativo ad_namorados_casal_03.',
      committedAt: '2026-08-26T17:00:00.000Z',
      commitHash: 'commit_deleg_12345678'
    };

    const response = generateAuditedDatasetResponse(query, undefined, false, delegationState);
    expect(response).toContain('Diagnóstico & Consulta ao Supercérebro');
    expect(response).toContain('Aline Rocha');
    expect(response).toContain('Pausa do Criativo ad_namorados_casal_03');
    expect(response).toContain('Status de Governança: COMMITTED');
  });

  it('deve gerar o documento formal de devolutiva de Marcos Silva aprovando a pausa e delegando para Carolina Mendes', () => {
    const prompt = 'escreva o documento de devolutiva confirmando a pausa dos anuncios que foram pedidos';
    const response = generateAuditedDatasetResponse(prompt);

    expect(response).toContain('DOCUMENTO DE DEVOLUTIVA E APROVAÇÃO FORMAL DE PAUSA OPERACIONAL');
    expect(response).toContain('PARA: Carolina Mendes, Gerente de Contas SPOT');
    expect(response).toContain('DE: Marcos Silva, Head de Marketing Housewhey');
    expect(response).toContain('ASSUNTO: Devolutiva de Aprovação Expressa para Pausa de Anúncios e Realocação de Verba');
    expect(response).toContain('ad_namorados_casal_03');
    expect(response).toContain('ad_whey_sabores_04');
    expect(response).toContain('Devolução & Delegação Operacional');
    expect(response).toContain('Carolina Mendes');
  });

  it('deve confirmar que Marcos recebeu a proposta quando a proposta já foi commitada no sistema', () => {
    const question = 'Marcos recebeu a proposta formal da carol para pausar os anuncios do dia dos namorados?';
    const delegationState = {
      isDelegated: true,
      delegatedTo: 'Carolina Mendes',
      personId: 'p_carolina',
      proposalTitle: 'Pausa do Criativo ad_namorados_casal_03 e Realocação de Verba',
      proposalDetails: 'Solicitação de aprovação formal para pausa do criativo ad_namorados_casal_03.',
      committedAt: '2026-08-26T17:00:00.000Z',
      commitHash: 'commit_deleg_87654321'
    };

    const response = generateAuditedDatasetResponse(question, undefined, false, delegationState);
    expect(response).toContain('Sim, Marcos Silva recebeu a proposta formal');
    expect(response).toContain('Status de Governança: COMMITTED');
    expect(response).toContain('Carolina Mendes');
  });

  it('deve confirmar que os anúncios ad_namorados_casal_03 e ad_whey_sabores_04 estão pausados e auditados no SQLite após commit de pausa pelo operador', () => {
    const question = 'qual o status atual dos anuncios ad_namorados_casal_03 e ad_whey_sabores_04?';
    const response = generateAuditedDatasetResponse(question, undefined, false, undefined, true);

    expect(response).toContain('ad_namorados_casal_03');
    expect(response).toContain('Status: Pausado');
    expect(response).toContain('ad_whey_sabores_04');
    expect(response).toContain('Status de Governança: COMMITTED');
    expect(response).toContain('Transição de Governança: PROVISIONAL ➔ COMMITTED');
  });
});
