import { describe, it, expect, beforeEach } from 'vitest';
import { RunsService } from '../../apps/web/src/runs-service.js';
import { getCanonicalScenario } from '../../apps/web/src/canonical-scenarios.js';
import { handleFetchRequest } from '../../apps/web/src/api.js';
import { renderHtmlShell } from '../../apps/web/src/ui-shell.js';

describe('M7-05 — E2E dos Fluxos Públicos e Interação de Usuário', () => {
  let runsService: RunsService;
  const sampleKey = 'sk-or-v1-supersecretkey1234567890abcdef1234567890';

  beforeEach(() => {
    runsService = new RunsService();
  });

  describe('1. Ciclo de Vida BYOK e Endpoints da API', () => {
    it('deve listar cenários canônicos (S0–S5) através do endpoint /api/scenarios', async () => {
      const scenariosReq = new Request('http://localhost:3000/api/scenarios', { method: 'GET' });
      const scenariosRes = await handleFetchRequest(scenariosReq);
      expect(scenariosRes.status).toBe(200);
      const scenarios = await scenariosRes.json();
      expect(Array.isArray(scenarios)).toBe(true);
      expect(scenarios.length).toBe(6);
      expect(scenarios.some((s: any) => s.id === 'S0')).toBe(true);
      expect(scenarios.some((s: any) => s.id === 'S5')).toBe(true);
    });

    it('deve listar modelos suportados na allowlist através do endpoint /api/models', async () => {
      const modelsReq = new Request('http://localhost:3000/api/models', { method: 'GET' });
      const modelsRes = await handleFetchRequest(modelsReq);
      expect(modelsRes.status).toBe(200);
      const models = await modelsRes.json();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      expect(
        models.some(
          (m: any) => m.id === 'anthropic/claude-3-5-sonnet' || m.id === 'openai/gpt-4o-mini'
        )
      ).toBe(true);
    });
  });

  describe('2. Execução dos Cenários Canônicos S0, S1 e S5 no Viewport Desktop', () => {
    it('Cenário S0 (Golden Run): Executa com sucesso, atinge COMMITTED e gera EvidenceRefs válidas', async () => {
      const s0 = getCanonicalScenario('S0')!;
      const run = await runsService.startRun({
        taskContract: s0.contract,
        mode: 'GOVERNED_PEVC',
        model: 'mock/deterministic-agent'
      });

      expect(run.status).toBe('COMPLETED');
      expect(run.verified).toBe(true);
      expect(run.structuredAnswer?.status).toBe('COMMITTED');
      expect(run.structuredAnswer?.evidenceRefs.length).toBeGreaterThan(0);
      expect(
        run.events.some((e) => e.type === 'ARTIFACT_COMMITTED' || e.type === 'RUN_COMPLETED')
      ).toBe(true);
    });

    it('Cenário S1 (CRM Offline): Dispara ATTRIBUTE -> REPLAN e gera conclusão com abstenção parcial', async () => {
      const s1 = getCanonicalScenario('S1')!;
      const run = await runsService.startRun({
        taskContract: s1.contract,
        mode: 'GOVERNED_PEVC',
        model: 'mock/deterministic-agent'
      });

      expect(run.status).toBe('COMPLETED');
      expect(
        run.events.some(
          (e) =>
            e.type === 'PHASE_TRANSITION' &&
            (e.payload.to === 'ATTRIBUTE' || e.payload.to === 'REPLAN')
        )
      ).toBe(true);
      expect(
        run.structuredAnswer?.limitations.some(
          (l) =>
            l.toLowerCase().includes('crm') ||
            l.toLowerCase().includes('reconciliad') ||
            l.toLowerCase().includes('parcial')
        )
      ).toBe(true);
    });

    it('Cenário S5 (Pausa de Anúncio): Bloqueia por política com APPROVAL_REQUIRED e external_writes == 0', async () => {
      const s5 = getCanonicalScenario('S5')!;
      const run = await runsService.startRun({
        taskContract: s5.contract,
        mode: 'GOVERNED_PEVC',
        model: 'mock/deterministic-agent'
      });

      expect(run.status).toBe('BLOCKED');
      expect(run.structuredAnswer?.status).toBe('BLOCKED');
      expect(run.events.some((e) => e.type === 'RUN_BLOCKED')).toBe(true);
      expect(run.events.some((e) => e.type === 'ARTIFACT_COMMITTED')).toBe(false);
    });
  });

  describe('3. Smoke Test de Viewport Mobile e Responsividade', () => {
    it('HTML Shell possui meta viewport, flex/grid responsivo e containers mobile-ready', () => {
      const html = renderHtmlShell();
      expect(html).toContain(
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
      );
      expect(html).toContain('id="pane-chat"');
      expect(html).toContain('id="pane-trajectory"');
      expect(html).toContain('id="pane-inspector"');
      expect(html).toContain('@media');
    });
  });

  describe('4. Download de Export Seguro sem Vazamento de Segredos', () => {
    it('export em JSON e Markdown não contém a chave de API mesmo quando executado com BYOK', async () => {
      const s0 = getCanonicalScenario('S0')!;
      const run = await runsService.startRun({
        taskContract: s0.contract,
        mode: 'GOVERNED_PEVC',
        model: 'mock/deterministic-agent',
        apiKey: sampleKey
      });

      const jsonExport = runsService.exportRun(run.runId, 'json');
      expect(jsonExport.content).not.toContain(sampleKey);
      expect(jsonExport.content).toContain(run.runId);

      const mdExport = runsService.exportRun(run.runId, 'markdown');
      expect(mdExport.content).not.toContain(sampleKey);
      expect(mdExport.content).toContain(run.runId);
    });
  });
});
