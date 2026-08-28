import { describe, it, expect, beforeEach } from 'vitest';
import { RunsService, extractUserIntent } from './runs-service.js';
import { handleApiRequest } from './api.js';

describe('Dynamic Learning & Extensible Agentic Microkernel', () => {
  let runsService: RunsService;

  beforeEach(() => {
    runsService = new RunsService();
  });

  it('deve extrair e resolver intenção dinamicamente com suporte a actionCard parametrizado', () => {
    const intent = extractUserIntent('mande um briefing da proxima reuniao para a Luiza');
    expect(intent.category).toBe('PROPOSAL_DELEGATION');
    expect(intent.targetPerson).toBe('Luiza Valente');
    expect(intent.targetPersonId).toBe('p_luiza');
    expect(intent.isActionRequired).toBe(true);
    expect(intent.actionCard).toBeDefined();
    expect(intent.actionCard?.title).toContain('Luiza Valente');
    expect(intent.actionCard?.btnText).toContain('Luiza');
  });

  it('deve permitir aprender novos exemplares via POST /api/learn', async () => {
    const novelPrompt = 'repassar atas e resumo financeiro para o Roberto';

    // 1. Aprende novo padrão via API
    const response = await handleApiRequest({
      method: 'POST',
      path: '/api/learn',
      body: {
        prompt: novelPrompt,
        intentId: 'PROPOSAL_DELEGATION'
      },
      runsService
    });

    expect(response.status).toBe(200);
    expect((response.body as any).status).toBe('LEARNED');
    expect((response.body as any).intentId).toBe('PROPOSAL_DELEGATION');

    // 2. Verifica catálogo via GET /api/intents
    const intentsRes = await handleApiRequest({
      method: 'GET',
      path: '/api/intents',
      runsService
    });

    expect(intentsRes.status).toBe(200);
    const intents = (intentsRes.body as any).intents;
    const delegIntent = intents.find((i: any) => i.intentId === 'PROPOSAL_DELEGATION');
    expect(delegIntent).toBeDefined();
    expect(delegIntent.exemplars).toContain(novelPrompt);
  });

  it('deve permitir registrar uma nova intenção totalmente customizada via POST /api/intents', async () => {
    const res = await handleApiRequest({
      method: 'POST',
      path: '/api/intents',
      runsService,
      body: {
        intentId: 'DYNAMIC_SCALE_CAMPAIGN',
        category: 'DYNAMIC_SCALE_CAMPAIGN',
        description: 'Escalação autônoma de orçamento diário',
        keywords: ['escalar verba', 'aumentar orçamento diário'],
        exemplars: ['escale a verba da campanha de ômega 3'],
        requiredTools: ['meta_ads:inspect_budget', 'meta_ads:reallocate_budget'],
        requiresApproval: true,
        actionCardTemplate: {
          titleTemplate: 'Governança de Escala: Confirmar Aumento de Orçamento',
          subtextTemplate: 'Ação: Aumentar verba diária no Meta Ads',
          btnTextTemplate: 'Confirmar Escala'
        }
      }
    });

    expect(res.status).toBe(201);
    expect((res.body as any).status).toBe('REGISTERED');

    const intent = extractUserIntent('escale a verba da campanha de ômega 3');
    expect(intent.category).toBe('DYNAMIC_SCALE_CAMPAIGN');
    expect(intent.isActionRequired).toBe(true);
    expect(intent.actionCard?.title).toBe('Confirmar Aumento de Orçamento');
  });
});
