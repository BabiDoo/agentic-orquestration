import { describe, expect, it } from 'vitest';
import { MockModelAdapter } from '@adzhub/runtime';
import { RunsService } from './runs-service.js';
import { getCanonicalScenario } from './canonical-scenarios.js';
import { handleApiRequest } from './api.js';
import { renderHtmlShell } from './ui-shell.js';

describe('M6-07: Comparador Basic (ReAct) × Governed (PEV-C)', () => {
  const runsService = new RunsService();

  it('deve comparar Basic vs Governed sob as mesmas condições (modelo, task, dataset e tools) no cenário S0', async () => {
    const scenarioS0 = getCanonicalScenario('S0')!;
    const comp = await runsService.compareRuns({
      taskContract: scenarioS0.contract,
      model: 'google/gemini-2.5-flash',
      mockAdapter: new MockModelAdapter(),
      dataset: 'housewhey-canonical-v1'
    });

    expect(comp.comparisonId).toMatch(/^comp_/);
    expect(comp.taskGoal).toBe(scenarioS0.contract.goal);
    expect(comp.model).toBe('google/gemini-2.5-flash');
    expect(comp.dataset).toBe('housewhey-canonical-v1');

    // 1. Basic Run Summary
    expect(comp.basicRun.mode).toBe('BASIC_REACT');
    expect(comp.basicRun.verified).toBe(false);
    expect(comp.basicRun.success).toBe(false);
    expect(comp.basicRun.evidenceRefsCount).toBe(0);
    expect(comp.basicRun.hasAtomicCommit).toBe(false);

    // 2. Governed Run Summary
    expect(comp.governedRun.mode).toBe('GOVERNED_PEVC');
    expect(comp.governedRun.verified).toBe(true);
    expect(comp.governedRun.success).toBe(true);
    expect(comp.governedRun.evidenceRefsCount).toBeGreaterThan(0);
    expect(comp.governedRun.hasAtomicCommit).toBe(true);

    // 3. 12 Métricas Comparadas
    expect(comp.metrics.status).toBeDefined();
    expect(comp.metrics.success.basic).toBe(false);
    expect(comp.metrics.success.governed).toBe(true);
    expect(comp.metrics.claims).toBeDefined();
    expect(comp.metrics.verifiedClaims.basic).toBe(0);
    expect(comp.metrics.verifiedClaims.governed).toBeGreaterThan(0);
    expect(comp.metrics.evidenceRefs.basic).toBe(0);
    expect(comp.metrics.evidenceRefs.governed).toBeGreaterThan(0);
    expect(comp.metrics.toolCalls).toBeDefined();
    expect(comp.metrics.replans).toBeDefined();
    expect(comp.metrics.tokens).toBeDefined();
    expect(comp.metrics.costBrl).toBeDefined();
    expect(comp.metrics.durationMs).toBeDefined();
    expect(comp.metrics.quarantined).toBeDefined();
    expect(comp.metrics.atomicCommits.basic).toBe(false);
    expect(comp.metrics.atomicCommits.governed).toBe(true);

    // 4. Vencedor e Critérios Observados
    expect(comp.observedWinner).toBe('GOVERNED_PEVC');
    expect(comp.winnerCriteria.length).toBeGreaterThan(0);
    expect(comp.winnerCriteria.some((c) => c.includes('100% de verificabilidade formal'))).toBe(
      true
    );
  });

  it('deve destacar violações de escrita e de política no cenário S5', async () => {
    const scenarioS5 = getCanonicalScenario('S5')!;
    const comp = await runsService.compareRuns({
      taskContract: scenarioS5.contract,
      model: 'google/gemini-2.5-flash',
      mockAdapter: new MockModelAdapter()
    });

    expect(comp.governedRun.status).toBe('BLOCKED');
    expect(comp.highlights.unverifiedWrites.length).toBeGreaterThan(0);
    expect(comp.highlights.policyViolations.length).toBeGreaterThan(0);
    expect(comp.winnerCriteria.some((c) => c.includes('Capability Broker'))).toBe(true);
  });

  it('deve destacar violação de período e ausência de compromisso no cenário S3', async () => {
    const scenarioS3 = getCanonicalScenario('S3')!;
    const comp = await runsService.compareRuns({
      taskContract: scenarioS3.contract,
      model: 'google/gemini-2.5-flash',
      mockAdapter: new MockModelAdapter()
    });

    expect(comp.governedRun.status).toBe('FAILED');
    expect(comp.highlights.postconditionViolations.length).toBeGreaterThan(0);
    expect(comp.winnerCriteria.some((c) => c.includes('divergência temporal'))).toBe(true);
  });

  it('endpoint POST /api/compare deve responder com o payload completo de comparação', async () => {
    const scenarioS0 = getCanonicalScenario('S0')!;
    const res = await handleApiRequest({
      method: 'POST',
      path: '/api/compare',
      body: {
        taskContract: scenarioS0.contract,
        model: 'google/gemini-2.5-flash',
        mockAdapter: new MockModelAdapter(),
        dataset: 'housewhey-canonical-v1'
      },
      runsService
    });

    expect(res.status).toBe(200);
    const body = res.body as any;
    expect(body.comparisonId).toBeDefined();
    expect(body.basicRun).toBeDefined();
    expect(body.governedRun).toBeDefined();
    expect(body.metrics).toBeDefined();
    expect(body.highlights).toBeDefined();
    expect(body.observedWinner).toBe('GOVERNED_PEVC');
  });

  it('o HTML Shell deve conter controles e tabela para exibição do comparador', () => {
    const html = renderHtmlShell();

    expect(html).toContain('id="btn-compare"');
    expect(html).toContain('id="comparison-modal"');
    expect(html).toContain('id="comparison-table-element"');
    expect(html).toContain('id="comparison-tbody"');
    expect(html).toContain('id="comparison-summary-card"');
    expect(html).toContain('id="comparison-highlights-card"');
    expect(html).toContain('renderComparisonResults');
  });
});
