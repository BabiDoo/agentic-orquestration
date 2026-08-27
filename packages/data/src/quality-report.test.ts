import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  generateDatasetQualityReport,
  assertDatasetQuality,
  formatQualityReportSummary,
  exportQualityReportToDisk,
  getCanonicalRawJsonMap
} from './index.js';

describe('@adzhub/data - M1-07: Dataset Quality Report', () => {
  const canonicalRawMap = getCanonicalRawJsonMap();

  describe('1. Relatório de Qualidade do Dataset Canônico (S0)', () => {
    it('deve gerar relatório com zero erros bloqueantes no cenário S0', () => {
      const report = generateDatasetQualityReport(canonicalRawMap);

      expect(report.schemaVersion).toBe('1.0.0');
      expect(report.hasBlockingErrors).toBe(false);
      expect(report.blockingErrorsCount).toBe(0);
      // Status deve ser PASSED ou PASSED_WITH_WARNINGS (com informativos/warnings de atribuição)
      expect(['PASSED', 'PASSED_WITH_WARNINGS']).toContain(report.status);

      // Gate de asserção para CI não deve lançar erro
      expect(() => assertDatasetQuality(report)).not.toThrow();
    });

    it('deve reportar contagens corretas de entidades do dataset', () => {
      const report = generateDatasetQualityReport(canonicalRawMap);

      expect(report.counts.graph_nodes_count).toBe(16);
      expect(report.counts.graph_edges_count).toBe(21);
      expect(report.counts.timeline_events_count).toBe(7);
      expect(report.counts.campaigns_count).toBe(3);
      expect(report.counts.ads_count).toBe(4);
      expect(report.counts.deals_count).toBe(20);
      expect(report.counts.sales_count).toBe(19);
      expect(report.counts.creatives_count).toBe(4);
      expect(report.counts.conversations_threads_count).toBe(1);
      expect(report.counts.meeting_transcripts_count).toBe(1);
    });

    it('deve reportar coberturas e totais financeiros corretos', () => {
      const report = generateDatasetQualityReport(canonicalRawMap);

      expect(report.coverage.join_coverage).toBe(1.0);
      expect(report.coverage.join_coverage_level).toBe('SUFFICIENT');
      expect(report.coverage.join_coverage_percentage).toBe('100.0%');

      expect(report.financials.total_spend_brl).toBe(16000.0);
      expect(report.financials.total_revenue_brl).toBe(4040.0);
      expect(report.financials.formatted_spend_brl).toContain('16.000,00');
    });
  });

  describe('2. Detecção de Erros Bloqueantes vs Warnings', () => {
    it('deve falhar com erro bloqueante se houver violação de schema', () => {
      const corruptMap = {
        ...canonicalRawMap,
        'api_meta_ads.json': JSON.stringify({
          invalido: true
        })
      };

      const report = generateDatasetQualityReport(corruptMap);
      expect(report.hasBlockingErrors).toBe(true);
      expect(report.blockingErrorsCount).toBeGreaterThan(0);
      expect(report.status).toBe('FAILED');

      expect(() => assertDatasetQuality(report)).toThrow('Dataset Quality Gate FAILED');
    });

    it('deve falhar com erro bloqueante se o grafo contiver chave/nó órfão em aresta', () => {
      const graphData = JSON.parse(canonicalRawMap['supercerebro_graph.json']!);
      // Adiciona aresta apontando para nó inexistente
      graphData.edges.push({
        from: 'p_aline',
        to: 'no_inexistente_fantasma_999',
        rel: 'OPERATES'
      });

      const corruptMap = {
        ...canonicalRawMap,
        'supercerebro_graph.json': JSON.stringify(graphData)
      };

      const report = generateDatasetQualityReport(corruptMap);
      expect(report.hasBlockingErrors).toBe(true);
      expect(report.status).toBe('FAILED');

      const orphanIssue = report.issues.find(
        (i) => i.category === 'ORPHAN_KEY' && i.severity === 'BLOCKING'
      );
      expect(orphanIssue).toBeDefined();
      expect(orphanIssue?.message).toContain('no_inexistente_fantasma_999');
    });

    it('deve falhar com erro bloqueante se o período temporal for invertido', () => {
      const metaData = JSON.parse(canonicalRawMap['api_meta_ads.json']!);
      metaData.timeframe.since = '2026-08-25T00:00:00.000Z';
      metaData.timeframe.until = '2026-08-01T00:00:00.000Z'; // Invertido!

      const corruptMap = {
        ...canonicalRawMap,
        'api_meta_ads.json': JSON.stringify(metaData)
      };

      const report = generateDatasetQualityReport(corruptMap);
      expect(report.hasBlockingErrors).toBe(true);
      expect(report.status).toBe('FAILED');

      const blockingIssue = report.issues.find(
        (i) => i.severity === 'BLOCKING' && (i.category === 'TEMPORAL' || i.category === 'SCHEMA')
      );
      expect(blockingIssue).toBeDefined();
      expect(blockingIssue?.message).toMatch(/timeframe|since|período/i);
    });

    it('deve emitir warning não bloqueante para deals fora do período', () => {
      const crmData = JSON.parse(canonicalRawMap['api_crm_leads.json']!);
      crmData.deals[0].created_at = '2025-01-01T10:00:00.000Z'; // Fora do período

      const warnedMap = {
        ...canonicalRawMap,
        'api_crm_leads.json': JSON.stringify(crmData)
      };

      const report = generateDatasetQualityReport(warnedMap);
      // Não bloqueia CI pois é warning temporal
      expect(report.hasBlockingErrors).toBe(false);
      expect(report.warningsCount).toBeGreaterThan(0);
      expect(report.status).toBe('PASSED_WITH_WARNINGS');

      const warningIssue = report.issues.find(
        (i) => i.category === 'TEMPORAL' && i.severity === 'WARNING'
      );
      expect(warningIssue).toBeDefined();
      expect(warningIssue?.message).toContain('está fora da janela de análise');
    });
  });

  describe('3. Formatação em Texto e Exportação em Disco', () => {
    it('deve gerar resumo legível estruturado em textSummary e via formatQualityReportSummary', () => {
      const report = generateDatasetQualityReport(canonicalRawMap);
      const text = report.textSummary;
      const directText = formatQualityReportSummary(report);

      expect(text).toBe(directText);
      expect(text).toContain('DATASET QUALITY REPORT');
      expect(text).toContain('Nós do Grafo: 16');
      expect(text).toContain('Investimento Total');
      expect(text).toContain('Join Coverage: 100.0% [SUFFICIENT]');
    });

    it('deve exportar o relatório JSON para disco corretamente', () => {
      const report = generateDatasetQualityReport(canonicalRawMap);
      const outputPath = path.join(
        process.cwd(),
        'node_modules',
        '.cache',
        'test_reports',
        'dataset_quality_report.json'
      );

      exportQualityReportToDisk(report, outputPath);
      expect(fs.existsSync(outputPath)).toBe(true);

      const loaded = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      expect(loaded.schemaVersion).toBe('1.0.0');
      expect(loaded.counts.ads_count).toBe(4);

      // Limpeza
      fs.rmSync(path.dirname(outputPath), { recursive: true, force: true });
    });
  });
});
