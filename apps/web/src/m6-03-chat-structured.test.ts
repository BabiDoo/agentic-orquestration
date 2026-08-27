import { describe, expect, it } from 'vitest';
import { MockModelAdapter } from '@adzhub/runtime';
import { RunsService } from './runs-service.js';
import { getCanonicalScenario } from './canonical-scenarios.js';
import { renderHtmlShell } from './ui-shell.js';

describe('M6-03: Chat e Resposta Estruturada', () => {
  const runsService = new RunsService();

  it('deve gerar resposta estruturada com Pergunta, Conclusão, Limitações e EvidenceRefs no modo Governed (S0)', async () => {
    const scenarioS0 = getCanonicalScenario('S0')!;
    const record = await runsService.startRun({
      taskContract: scenarioS0.contract,
      mode: 'GOVERNED_PEVC',
      mockAdapter: new MockModelAdapter()
    });

    expect(record.status).toBe('COMPLETED');
    expect(record.verified).toBe(true);
    expect(record.evidenceCoverage).toBeGreaterThanOrEqual(0.8);
    expect(record.structuredAnswer).toBeDefined();

    const answer = record.structuredAnswer!;
    expect(answer.question).toBe(scenarioS0.contract.goal);
    expect(answer.conclusion).toContain('Housewhey');
    expect(answer.status).toBe('COMMITTED');
    expect(answer.verified).toBe(true);
    expect(answer.commitId).toBeDefined();

    // EvidenceRefs
    expect(answer.evidenceRefs.length).toBeGreaterThan(0);
    for (const ref of answer.evidenceRefs) {
      expect(ref.claimId).toBeDefined();
      expect(ref.source).toBeDefined();
      expect(ref.locator).toBeDefined();
      expect(ref.checkId).toBeDefined();
      expect(ref.hash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 válido
      expect(ref.status).toBe('COMMITTED');
    }
  });

  it('no modo Basic ReAct a conclusão deve nascer PROVISIONAL e sem confirmação formal', async () => {
    const scenarioS0 = getCanonicalScenario('S0')!;
    const record = await runsService.startRun({
      taskContract: scenarioS0.contract,
      mode: 'BASIC_REACT',
      mockAdapter: new MockModelAdapter()
    });

    expect(record.status).toBe('COMPLETED');
    expect(record.verified).toBe(false);
    expect(record.evidenceCoverage).toBeNull();
    expect(record.structuredAnswer).toBeDefined();

    const answer = record.structuredAnswer!;
    expect(answer.status).toBe('PROVISIONAL');
    expect(answer.verified).toBe(false);
    expect(answer.commitId).toBeUndefined();
    expect(answer.limitations).toContain(
      'Resultado provisório gerado sem verificação formal PEV-C ou commit auditável.'
    );
  });

  it('cenário S2 com baixa cobertura deve entrar em QUARANTINED ou abstenção com limitações explícitas', async () => {
    const scenarioS2 = getCanonicalScenario('S2')!;
    const record = await runsService.startRun({
      taskContract: scenarioS2.contract,
      mode: 'GOVERNED_PEVC',
      mockAdapter: new MockModelAdapter()
    });

    expect(record.status).toBe('COMPLETED');
    expect(record.verified).toBe(false);
    expect(record.evidenceCoverage).toBeLessThan(0.8);
    expect(record.structuredAnswer).toBeDefined();

    const answer = record.structuredAnswer!;
    expect(answer.status).toBe('QUARANTINED');
    expect(answer.conclusion).toContain('Abstenção');
    expect(answer.limitations.length).toBeGreaterThan(0);
  });

  it('cenário S5 de escrita externa deve ser bloqueado por política e NÃO apresentado como conclusão de negócio', async () => {
    const scenarioS5 = getCanonicalScenario('S5')!;
    const record = await runsService.startRun({
      taskContract: scenarioS5.contract,
      mode: 'GOVERNED_PEVC',
      mockAdapter: new MockModelAdapter()
    });

    expect(record.status).toBe('BLOCKED');
    expect(record.verified).toBe(false);
    expect(record.error).toContain('APPROVAL_REQUIRED');
    expect(record.structuredAnswer?.status).toBe('BLOCKED');
  });

  it('cenário S3 com período divergente deve falhar na pós-condição determinística e registrar erro explícito', async () => {
    const scenarioS3 = getCanonicalScenario('S3')!;
    const record = await runsService.startRun({
      taskContract: scenarioS3.contract,
      mode: 'GOVERNED_PEVC',
      mockAdapter: new MockModelAdapter()
    });

    expect(record.status).toBe('FAILED');
    expect(record.verified).toBe(false);
    expect(record.error).toContain('PERIOD_MISMATCH');
    expect(record.structuredAnswer?.status).toBe('FAILED');
  });

  it('o HTML Shell deve conter a estrutura para exibir pergunta, conclusão, limitações, evidências e estados de erro separados', () => {
    const html = renderHtmlShell();

    // Elementos estruturais da resposta no Chat
    expect(html).toContain('id="chat-question-container"');
    expect(html).toContain('id="chat-question-text"');
    expect(html).toContain('id="chat-conclusion-text"');
    expect(html).toContain('id="chat-limitations-container"');
    expect(html).toContain('id="chat-limitations-list"');
    expect(html).toContain('id="chat-evidencerefs-list"');

    // Badges inequívocos
    expect(html).toContain('badge-provisional');
    expect(html).toContain('badge-committed');
    expect(html).toContain('badge-quarantined');
    expect(html).toContain('badge-blocked');

    // Container de erro isolado da conclusão de negócio
    expect(html).toContain('id="chat-error-state"');
    expect(html).toContain('id="chat-error-title"');
    expect(html).toContain('id="chat-error-message"');

    // Script de renderização estruturada
    expect(html).toContain('renderStructuredAnswer');
    expect(html).toContain('updateChatBadge');
  });
});
