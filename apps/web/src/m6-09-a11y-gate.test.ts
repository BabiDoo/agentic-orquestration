import { describe, expect, it } from 'vitest';
import { MockModelAdapter } from '@adzhub/runtime';
import { renderHtmlShell, getStatusBadgeInfo } from './ui-shell.js';
import { RunsService } from './runs-service.js';
import { getCanonicalScenario } from './canonical-scenarios.js';

describe('M6-09: Acessibilidade WCAG AA & Gate M6', () => {
  const runsService = new RunsService();
  const html = renderHtmlShell();

  describe('Critérios de Aceite M6-09 (Acessibilidade AA)', () => {
    it('deve possuir idioma raiz e meta viewport acessível para zoom', () => {
      expect(html).toContain('<html lang="pt-BR">');
      expect(html).toContain('name="viewport"');
      expect(html).not.toContain('user-scalable=no');
      expect(html).not.toContain('maximum-scale=1');
    });

    it('deve definir landmarks semânticos e roles acessíveis (banner, main, region, tablist, listbox, dialog)', () => {
      expect(html).toContain('role="banner"');
      expect(html).toContain('role="region"');
      expect(html).toContain('role="main"');
      expect(html).toContain('role="tablist"');
      expect(html).toContain('role="tab"');
      expect(html).toContain('role="listbox"');
      expect(html).toContain('role="dialog"');
    });

    it('deve usar aria-live="polite" para atualizações de estado e validação', () => {
      expect(html).toContain('id="system-status-badge" class="status-badge" aria-live="polite"');
      expect(html).toContain('id="chat-status-badge"');
      expect(html).toContain('aria-live="polite"');
      expect(html).toContain('id="execution-validation-msg"');
      expect(html).toContain('id="trajectory-metrics"');
    });

    it('deve declarar regras explícitas para :focus-visible', () => {
      expect(html).toContain(':focus-visible');
      expect(html).toContain('outline: 2px solid var(--border-focus)');
    });

    it('deve respeitar a preferência de usuário prefers-reduced-motion', () => {
      expect(html).toContain('@media (prefers-reduced-motion: reduce)');
      expect(html).toContain('animation-duration: 0.01ms !important');
      expect(html).toContain('transition-duration: 0.01ms !important');
    });

    it('nenhum badge de estado deve depender unicamente de cor (texto + ícone + borda)', () => {
      const states = [
        'PROVISIONAL',
        'VERIFYING',
        'QUARANTINED',
        'COMMITTED',
        'BLOCKED',
        'FAILED'
      ] as const;
      for (const st of states) {
        const badge = getStatusBadgeInfo(st);
        expect(badge.label).toBeDefined();
        expect(badge.icon).toBeDefined();
        expect(badge.cssClass).toBeDefined();
        // Garante que o texto renderizado possui ícone e texto legível
        expect(badge.label.length).toBeGreaterThan(3);
        expect(badge.icon.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('Gate M6: Checklist Global do Épico M6', () => {
    it('1. Avaliador executa e compara os dois modos sem conta (BYOK ou Mock sem login)', async () => {
      const scenarioS0 = getCanonicalScenario('S0')!;

      // Execução e comparação sem autenticação prévia
      const comparison = await runsService.compareRuns({
        taskContract: scenarioS0.contract,
        model: 'google/gemini-2.5-flash',
        mockAdapter: new MockModelAdapter(),
        dataset: 'housewhey-canonical-v1'
      });

      expect(comparison.basicRun.mode).toBe('BASIC_REACT');
      expect(comparison.governedRun.mode).toBe('GOVERNED_PEVC');
      expect(comparison.observedWinner).toBe('GOVERNED_PEVC');
      expect(comparison.metrics.status).toBeDefined();
    });

    it('2. Trajetória mostra transições de fase, checks e EvidenceRefs com proveniência', async () => {
      const scenarioS0 = getCanonicalScenario('S0')!;
      const run = await runsService.startRun({
        taskContract: scenarioS0.contract,
        mode: 'GOVERNED_PEVC',
        model: 'google/gemini-2.5-flash',
        mockAdapter: new MockModelAdapter()
      });

      const phaseEvents = run.events.filter((e) => e.type === 'PHASE_TRANSITION');
      expect(phaseEvents.length).toBeGreaterThanOrEqual(3);
      expect(phaseEvents.some((e) => e.payload.phase === 'PLAN')).toBe(true);
      expect(phaseEvents.some((e) => e.payload.phase === 'FORK_JOIN')).toBe(true);
      expect(phaseEvents.some((e) => e.payload.phase === 'VERIFY')).toBe(true);
      expect(phaseEvents.some((e) => e.payload.phase === 'COMMIT')).toBe(true);

      expect(run.structuredAnswer?.evidenceRefs.length).toBeGreaterThan(0);
      for (const ref of run.structuredAnswer!.evidenceRefs) {
        expect(ref.hash).toMatch(/^[a-f0-9]{64}$/);
        expect(ref.source).toBeDefined();
        expect(ref.locator).toBeDefined();
        expect(ref.checkId).toBeDefined();
      }
    });

    it('3. Export de trace e summary não contém segredos ou chaves sensíveis', async () => {
      const sensitiveToken = 'sk-or-v1-secret-key-123456789';
      const scenarioS0 = getCanonicalScenario('S0')!;
      const run = await runsService.startRun({
        taskContract: {
          ...scenarioS0.contract,
          metadata: {
            apiKey: sensitiveToken
          }
        },
        mode: 'GOVERNED_PEVC',
        model: 'google/gemini-2.5-flash',
        mockAdapter: new MockModelAdapter(),
        apiKey: sensitiveToken
      });

      const jsonExport = runsService.exportRun(run.runId, 'json', sensitiveToken);
      const mdExport = runsService.exportRun(run.runId, 'markdown', sensitiveToken);

      expect(jsonExport.content).not.toContain(sensitiveToken);
      expect(mdExport.content).not.toContain(sensitiveToken);
      expect(jsonExport.content).toContain('[REDACTED');
    });

    it('4. Estados Provisório e Confirmado são inequivocamente diferentes', () => {
      const provisional = getStatusBadgeInfo('PROVISIONAL');
      const committed = getStatusBadgeInfo('COMMITTED');

      expect(provisional.label).toBe('PROVISIONAL');
      expect(provisional.icon).toBe('⏳');
      expect(provisional.cssClass).toBe('badge-provisional');

      expect(committed.label).toBe('SALVO NO SUPERCÉREBRO');
      expect(committed.icon).toBe('✓');
      expect(committed.cssClass).toBe('badge-committed');

      expect(provisional.label).not.toEqual(committed.label);
      expect(provisional.icon).not.toEqual(committed.icon);
      expect(provisional.cssClass).not.toEqual(committed.cssClass);
    });
  });
});
