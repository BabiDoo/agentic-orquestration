import { describe, expect, it } from 'vitest';
import { MockModelAdapter } from '@adzhub/runtime';
import { RunsService, EXPORT_SCHEMA_VERSION, BUILD_SHA } from './runs-service.js';
import { getCanonicalScenario } from './canonical-scenarios.js';
import { handleApiRequest } from './api.js';
import { renderHtmlShell } from './ui-shell.js';

describe('M6-08: Export de Trace e Summary', () => {
  const runsService = new RunsService();

  it('deve exportar trace versionado em JSON válido com metadados reproduzíveis', async () => {
    const scenarioS0 = getCanonicalScenario('S0')!;
    const run = await runsService.startRun({
      taskContract: scenarioS0.contract,
      mode: 'GOVERNED_PEVC',
      model: 'google/gemini-2.5-flash',
      mockAdapter: new MockModelAdapter()
    });

    const exportResult = runsService.exportRun(run.runId, 'json');

    expect(exportResult.filename).toBe(`adzhub_trace_${run.runId}.json`);
    expect(exportResult.contentType).toContain('application/json');

    const parsed = JSON.parse(exportResult.content);
    expect(parsed.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
    expect(parsed.schemaVersion).toBe('1.0.0');
    expect(parsed.exportId).toMatch(/^export_/);
    expect(parsed.exportedAt).toBeDefined();
    expect(parsed.buildSha).toBe(BUILD_SHA);
    expect(parsed.datasetManifestHash).toBeDefined();
    expect(parsed.runId).toBe(run.runId);
    expect(parsed.mode).toBe('GOVERNED_PEVC');
    expect(parsed.model).toBe('google/gemini-2.5-flash');
    expect(parsed.status).toBe('COMPLETED');
    expect(parsed.verified).toBe(true);
    expect(parsed.taskContract).toBeDefined();
    expect(parsed.structuredAnswer).toBeDefined();
    expect(parsed.events.length).toBeGreaterThan(0);
    expect(parsed.events[0].seq).toBe(1);
  });

  it('deve exportar relatório legível de auditoria em Markdown', async () => {
    const scenarioS0 = getCanonicalScenario('S0')!;
    const run = await runsService.startRun({
      taskContract: scenarioS0.contract,
      mode: 'GOVERNED_PEVC',
      model: 'google/gemini-2.5-flash',
      mockAdapter: new MockModelAdapter()
    });

    const exportResult = runsService.exportRun(run.runId, 'markdown');

    expect(exportResult.filename).toBe(`adzhub_relatorio_${run.runId}.md`);
    expect(exportResult.contentType).toContain('text/markdown');
    expect(exportResult.content).toContain('# Relatório de Auditoria de Execução — AdzHub Harness');
    expect(exportResult.content).toContain(`Run ID:** \`${run.runId}\``);
    expect(exportResult.content).toContain('Build SHA');
    expect(exportResult.content).toContain('Dataset Manifest SHA');
    expect(exportResult.content).toContain('EvidenceRefs & Proveniência Criptográfica');
    expect(exportResult.content).toContain('SHA-256 Hash');
    expect(exportResult.content).toContain('Linha do Tempo da Trajetória');
  });

  it('deve redigir rigorosamente chaves de API, segredos e tokens sensíveis no export', async () => {
    const sensitiveKey = 'sk-or-v1-supersecret-token-998877';
    const scenarioS0 = getCanonicalScenario('S0')!;
    const run = await runsService.startRun({
      taskContract: {
        ...scenarioS0.contract,
        metadata: {
          apiKey: sensitiveKey,
          authHeader: 'Bearer ' + sensitiveKey
        }
      },
      mode: 'GOVERNED_PEVC',
      model: 'google/gemini-2.5-flash',
      mockAdapter: new MockModelAdapter(),
      apiKey: sensitiveKey
    });

    const jsonExport = runsService.exportRun(run.runId, 'json', sensitiveKey);
    const mdExport = runsService.exportRun(run.runId, 'markdown', sensitiveKey);

    expect(jsonExport.content).not.toContain(sensitiveKey);
    expect(mdExport.content).not.toContain(sensitiveKey);
    expect(jsonExport.content).toContain('[REDACTED');
  });

  it('deve exportar comparação Basic vs Governed em JSON e Markdown', async () => {
    const scenarioS0 = getCanonicalScenario('S0')!;
    const comp = await runsService.compareRuns({
      taskContract: scenarioS0.contract,
      model: 'google/gemini-2.5-flash',
      mockAdapter: new MockModelAdapter()
    });

    const compJson = runsService.exportComparison(comp, 'json');
    const compMd = runsService.exportComparison(comp, 'markdown');

    expect(compJson.filename).toBe(`adzhub_comparacao_${comp.comparisonId}.json`);
    const parsedComp = JSON.parse(compJson.content);
    expect(parsedComp.schemaVersion).toBe('1.0.0');
    expect(parsedComp.comparison.comparisonId).toBe(comp.comparisonId);

    expect(compMd.filename).toBe(`adzhub_comparacao_${comp.comparisonId}.md`);
    expect(compMd.content).toContain('# Relatório Comparativo: Basic (ReAct) × Governed (PEV-C)');
    expect(compMd.content).toContain('Tabela Comparativa de Métricas (12 Dimensões)');
    expect(compMd.content).toContain('Veredito Baseado em Evidências');
  });

  it('endpoints de exportação na API devem responder com arquivos e headers de download', async () => {
    const scenarioS0 = getCanonicalScenario('S0')!;
    const run = await runsService.startRun({
      taskContract: scenarioS0.contract,
      mode: 'GOVERNED_PEVC',
      model: 'google/gemini-2.5-flash',
      mockAdapter: new MockModelAdapter()
    });

    // 1. GET /api/runs/:id/export?format=json
    const resJson = await handleApiRequest({
      method: 'GET',
      path: `/api/runs/${run.runId}/export`,
      query: { format: 'json' },
      runsService
    });

    expect(resJson.status).toBe(200);
    expect(resJson.headers['Content-Type']).toContain('application/json');
    expect(resJson.headers['Content-Disposition']).toContain(`adzhub_trace_${run.runId}.json`);

    // 2. GET /api/runs/:id/export?format=markdown
    const resMd = await handleApiRequest({
      method: 'GET',
      path: `/api/runs/${run.runId}/export`,
      query: { format: 'markdown' },
      runsService
    } as any);

    expect(resMd.status).toBe(200);
    expect(resMd.headers['Content-Type']).toContain('text/markdown');
    expect(resMd.headers['Content-Disposition']).toContain(`adzhub_relatorio_${run.runId}.md`);

    // 3. POST /api/compare/export
    const resComp = await handleApiRequest({
      method: 'POST',
      path: '/api/compare/export',
      query: { format: 'markdown' },
      body: {
        taskContract: scenarioS0.contract,
        model: 'google/gemini-2.5-flash',
        mockAdapter: new MockModelAdapter()
      },
      runsService
    });

    expect(resComp.status).toBe(200);
    expect(resComp.headers['Content-Type']).toContain('text/markdown');
    expect(resComp.headers['Content-Disposition']).toContain('adzhub_comparacao_');
  });

  it('o HTML Shell deve incluir os botões de exportação para JSON e Markdown no Comparador', () => {
    const html = renderHtmlShell();
    expect(html).toContain('id="btn-export-comparison-json"');
    expect(html).toContain('id="btn-export-comparison-md"');
  });
});
