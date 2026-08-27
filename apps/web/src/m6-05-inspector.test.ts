import { describe, expect, it } from 'vitest';
import { MockModelAdapter } from '@adzhub/runtime';
import { RunsService } from './runs-service.js';
import { getCanonicalScenario } from './canonical-scenarios.js';
import { renderHtmlShell } from './ui-shell.js';

describe('M6-05: Inspector de Auditoria', () => {
  const runsService = new RunsService();

  it('deve gerar payloads com checks, hashes SHA-256 e EvidenceRefs inspecionáveis', async () => {
    const scenarioS0 = getCanonicalScenario('S0')!;
    const record = await runsService.startRun({
      taskContract: scenarioS0.contract,
      mode: 'GOVERNED_PEVC',
      mockAdapter: new MockModelAdapter()
    });

    expect(record.structuredAnswer).toBeDefined();
    const answer = record.structuredAnswer!;
    expect(answer.evidenceRefs.length).toBeGreaterThan(0);

    for (const ref of answer.evidenceRefs) {
      expect(ref.claimId).toBeDefined();
      expect(ref.locator).toBeDefined();
      expect(ref.checkId).toBeDefined();
      expect(ref.hash).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it('o HTML Shell deve conter alternância entre Visão Estruturada/Textual e JSON Bruto no Inspector', () => {
    const html = renderHtmlShell();

    expect(html).toContain('id="pane-inspector"');
    expect(html).toContain('id="inspector-tabs"');
    expect(html).toContain('id="inspector-tab-structured"');
    expect(html).toContain('id="inspector-tab-json"');
    expect(html).toContain('id="inspector-view-structured"');
    expect(html).toContain('id="inspector-structured-content"');
    expect(html).toContain('id="inspector-view-json"');
    expect(html).toContain('id="inspector-payload"');
    expect(html).toContain('id="btn-inspect-contract"');
  });

  it('o script do Inspector deve possuir função de redaction estrita para não exibir segredos', () => {
    const html = renderHtmlShell();

    expect(html).toContain('function redactSensitiveData');
    expect(html).toContain('[REDACTED_SECRET]');
    expect(html).toContain("lowerKey.includes('key')");
    expect(html).toContain("lowerKey.includes('token')");
    expect(html).toContain("lowerKey.includes('secret')");
    expect(html).toContain("lowerKey.includes('auth')");
  });

  it('o script do Inspector deve permitir navegação de Claim e EvidenceRef para o Inspector', () => {
    const html = renderHtmlShell();

    expect(html).toContain('window.inspectEvidence');
    expect(html).toContain('window.inspectClaim');
  });
});
