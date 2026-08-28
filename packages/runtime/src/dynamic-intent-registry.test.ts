import { describe, it, expect } from 'vitest';
import { DynamicIntentRegistry } from './dynamic-intent-registry.js';

describe('DynamicIntentRegistry — Motor Dinâmico de Intenções e Aprendizado', () => {
  it('deve inicializar com o catálogo canônico de intenções', () => {
    const registry = new DynamicIntentRegistry();
    const intents = registry.getIntents();
    expect(intents.length).toBeGreaterThanOrEqual(6);
    expect(intents.some((i) => i.intentId === 'PROPOSAL_DELEGATION')).toBe(true);
    expect(intents.some((i) => i.intentId === 'EXTERNAL_WRITE_PAUSE')).toBe(true);
  });

  it('deve classificar dinamicamente prompt de briefing com extração correta de destinatário', () => {
    const registry = new DynamicIntentRegistry();
    const resolved = registry.matchIntent('mande um briefing da proxima reuniao para a Luiza');

    expect(resolved.category).toBe('PROPOSAL_DELEGATION');
    expect(resolved.entities.targetPerson).toBe('Luiza Valente');
    expect(resolved.entities.targetPersonId).toBe('p_luiza');
    expect(resolved.entities.isBriefing).toBe(true);
    expect(resolved.isActionRequired).toBe(true);
    expect(resolved.renderedCard?.title).toContain('Luiza Valente');
    expect(resolved.renderedCard?.btnText).toContain('Luiza');
  });

  it('deve aprender novo exemplar em tempo de execução via addExemplar', () => {
    const registry = new DynamicIntentRegistry();
    const novelPrompt = 'repassar o compilado semanal para a Luiza';
    
    // Antes de aprender, pode ser aproximado
    const before = registry.matchIntent(novelPrompt);
    expect(before).toBeDefined();
    
    // Adiciona exemplar à intenção de delegação
    const added = registry.addExemplar('PROPOSAL_DELEGATION', novelPrompt);
    expect(added).toBe(true);

    // Após aprender
    const after = registry.matchIntent(novelPrompt);
    expect(after.category).toBe('PROPOSAL_DELEGATION');
    expect(after.confidence).toBe(1.0);
  });

  it('deve permitir registrar uma nova intenção totalmente customizada', () => {
    const registry = new DynamicIntentRegistry();
    registry.registerIntent({
      intentId: 'CUSTOM_BUDGET_OPTIMIZATION',
      category: 'CUSTOM_BUDGET_OPTIMIZATION',
      description: 'Otimização autônoma de lance de CPA no Meta Ads',
      keywords: ['lance de cpa', 'otimizar lance', 'bid cap'],
      exemplars: ['otimize o bid cap do whey baunilha'],
      requiredTools: ['meta_ads:adjust_bid', 'governed_pevc:eval'],
      requiresApproval: true,
      actionCardTemplate: {
        titleTemplate: 'Governança & Lances: Confirmar Ajuste de Bid Cap',
        subtextTemplate: 'Ação: Ajustar lance no Meta Ads',
        btnTextTemplate: 'Confirmar Lance',
        successMsgTemplate: '✓ Bid cap ajustado com sucesso no Meta Ads.'
      }
    });

    const match = registry.matchIntent('otimize o bid cap do whey baunilha');
    expect(match.intentId).toBe('CUSTOM_BUDGET_OPTIMIZATION');
    expect(match.isActionRequired).toBe(true);
    expect(match.renderedCard?.title).toBe('Confirmar Ajuste de Bid Cap');
  });
});
