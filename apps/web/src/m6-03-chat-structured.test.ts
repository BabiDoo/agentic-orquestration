import { describe, expect, it } from 'vitest';
import { MockModelAdapter } from '@adzhub/runtime';
import { RunsService, processLLMOutput } from './runs-service.js';
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

  it('respostas genéricas (oi) e consultas de tarefas pendentes NÃO devem gerar status COMMITTED nem card de commit', async () => {
    const greetingRun = await runsService.startRun({
      taskContract: {
        schemaVersion: '1.0.0',
        taskId: 'task_greeting_test',
        clientId: 'cli_housewhey',
        tenantId: 'hub_spot',
        goal: 'oi',
        timeframe: { since: '2026-08-01T00:00:00.000Z', until: '2026-08-20T23:59:59.000Z', timezone: 'America/Sao_Paulo' },
        effects: { allowed: ['read:memory', 'read:meta', 'read:crm', 'read:app', 'write:staging', 'write:insight'], forbidden: ['external_write'] },
        budgets: { maxSteps: 15, maxToolCalls: 10, maxTokens: 8000, maxCostBrl: 2.5, timeoutMs: 30000 },
        successCriteria: { minEvidenceCoverage: 0.8, requireVerifiedClaims: true },
        approvalPolicy: { externalWritesRequireApproval: true, autoApproveReadOnly: true },
        metadata: { isPaused: true } // Simula sessão em que uma pausa já ocorreu anteriormente
      },
      mode: 'GOVERNED_PEVC',
      mockAdapter: new MockModelAdapter()
    });

    expect(greetingRun.status).toBe('COMPLETED');
    expect(greetingRun.structuredAnswer?.status).toBe('COMPLETED');
    expect(greetingRun.structuredAnswer?.isAtomicCommit).toBe(false);

    const taskInquiryRun = await runsService.startRun({
      taskContract: {
        schemaVersion: '1.0.0',
        taskId: 'task_inquiry_test',
        clientId: 'cli_housewhey',
        tenantId: 'hub_spot',
        goal: 'o que eu tenho de tarefas pendentes?',
        timeframe: { since: '2026-08-01T00:00:00.000Z', until: '2026-08-20T23:59:59.000Z', timezone: 'America/Sao_Paulo' },
        effects: { allowed: ['read:memory', 'read:meta', 'read:crm', 'read:app', 'write:staging', 'write:insight'], forbidden: ['external_write'] },
        budgets: { maxSteps: 15, maxToolCalls: 10, maxTokens: 8000, maxCostBrl: 2.5, timeoutMs: 30000 },
        successCriteria: { minEvidenceCoverage: 0.8, requireVerifiedClaims: true },
        approvalPolicy: { externalWritesRequireApproval: true, autoApproveReadOnly: true },
        metadata: { isApproved: true } // Simula sessão em que aprovação já ocorreu
      },
      mode: 'GOVERNED_PEVC',
      mockAdapter: new MockModelAdapter()
    });

    expect(taskInquiryRun.status).toBe('COMPLETED');
    expect(taskInquiryRun.structuredAnswer?.status).toBe('COMPLETED');
    expect(taskInquiryRun.structuredAnswer?.isAtomicCommit).toBe(false);
  });

  it('processLLMOutput não deve truncar textos contendo Conclusão: nem truncar após dois pontos ou quebras de parágrafo', () => {
    const rawProposal = `Prezado Marcos Silva,

Assunto: Proposta Executiva de Remanejamento Orçamentário - Meta Ads

Conclusão:

Propomos a realocação da verba diária do anúncio "Vídeo Namorados Casal Suplementação" ( ad_namorados_casal_03 ), que apresentou alta queima orçamentária e CPA elevado de R$ 112,00.`;

    const res = processLLMOutput(rawProposal, 'stop');
    expect(res.conclusionText).toContain('Propomos a realocação da verba diária do anúncio');
    expect(res.conclusionText).toContain('CPA elevado de R$ 112,00.');
    expect(res.isTruncatedFlag).toBe(false);
  });
});
