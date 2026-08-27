import { describe, expect, it } from 'vitest';
import { getStatusBadgeInfo, renderHtmlShell, renderGovernanceCard } from './ui-shell.js';

describe('M6-06: Badges de Estado sem Optimistic Truth', () => {
  it('deve mapear corretamente todos os 6 estados obrigatórios com texto, ícone e classe', () => {
    const states = [
      { status: 'PROVISIONAL', label: 'PROVISIONAL', icon: '⏳', css: 'badge-provisional' },
      { status: 'VERIFYING', label: 'VERIFYING', icon: '⚙', css: 'badge-verifying' },
      { status: 'QUARANTINED', label: 'QUARANTINED', icon: '⚠', css: 'badge-quarantined' },
      { status: 'COMMITTED', label: 'SALVO NO SUPERCÉREBRO', icon: '✓', css: 'badge-committed' },
      { status: 'BLOCKED', label: 'BLOCKED', icon: '🔒', css: 'badge-blocked' },
      { status: 'FAILED', label: 'FAILED', icon: '❌', css: 'badge-failed' }
    ];

    for (const item of states) {
      const badge = getStatusBadgeInfo(item.status, item.status === 'COMMITTED');
      expect(badge.status).toBe(item.status);
      expect(badge.label).toBe(item.label);
      expect(badge.icon).toBe(item.icon);
      expect(badge.cssClass).toBe(item.css);
      expect(badge.description).toBeDefined();
      expect(badge.description.length).toBeGreaterThan(10);
    }
  });

  it('o estado BLOCKED deve reportar a condição faltante de governança', () => {
    const defaultBlocked = getStatusBadgeInfo('BLOCKED');
    expect(defaultBlocked.missingCondition).toBeDefined();
    expect(defaultBlocked.missingCondition).toContain('Aprovação humana');

    const customBlocked = getStatusBadgeInfo(
      'BLOCKED',
      false,
      'Falta token de escrita no Meta Ads'
    );
    expect(customBlocked.missingCondition).toBe('Falta token de escrita no Meta Ads');
  });

  it('o HTML Shell deve conter containers e classes de estilo que não dependem apenas de cor', () => {
    const html = renderHtmlShell();

    // 6 badges definidos em CSS
    expect(html).toContain('.badge-provisional');
    expect(html).toContain('.badge-verifying');
    expect(html).toContain('.badge-quarantined');
    expect(html).toContain('.badge-committed');
    expect(html).toContain('.badge-blocked');
    expect(html).toContain('.badge-failed');

    // Container de condição faltante para bloqueio (S5)
    expect(html).toContain('id="chat-blocked-missing-condition"');
    expect(html).toContain('id="chat-blocked-condition-text"');

    // Lógica client-side para alternar os 6 estados com ícones e textos
    expect(html).toContain('✓ SALVO NO SUPERCÉREBRO');
    expect(html).toContain('⚙ VERIFYING');
    expect(html).toContain('⚠ QUARANTINED');
    expect(html).toContain('🔒 BLOCKED');
    expect(html).toContain('❌ FAILED');
    expect(html).toContain('⏳ PROVISIONAL');
  });

  describe('Task 6.2 — Card Dinâmico de Governança', () => {
    it('renderiza o Card de Governança com Proposal Hash SHA-256, Blast Radius e botões de ação', () => {
      const cardHtml = renderGovernanceCard({
        proposalId: 'prop_pause_001',
        proposalHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        operation: 'PAUSE',
        resource: 'meta:ad:ad_namorados_casal_03',
        targetId: 'ad_namorados_casal_03',
        proposerId: 'agent_action_rec',
        actionSummary: 'Pausar anúncio devido a CPA estourado de R$ 1.616,67 e saturação.',
        blastRadius: {
          affectedCreativesCount: 1,
          financialDeltaBrl: 50.0,
          riskTier: 'LOW'
        },
        rollbackWindowSeconds: 86400,
        status: 'PENDING_APPROVAL'
      });

      expect(cardHtml).toContain('governance-card');
      expect(cardHtml).toContain('prop_pause_001');
      expect(cardHtml).toContain('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
      expect(cardHtml).toContain('ad_namorados_casal_03');
      expect(cardHtml).toContain('R$ 50.00');
      expect(cardHtml).toContain('86400s');
      expect(cardHtml).toContain('Aprovar Alteração (Assinar Hash)');
      expect(cardHtml).toContain('Rejeitar Proposta');
    });
  });
});

