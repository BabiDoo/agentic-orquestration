/**
 * @adzhub/data - Dataset Quality Report Generator
 * Auditoria de integridade, contagens, cobertura, chaves órfãs, conflitos temporais e distinção de severidade.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { validateRawDatasetFiles } from './raw-schemas.js';
import { importRawDataset } from './dataset-importer.js';
import { computeAllDerivedMetrics, formatMoneyBrl } from './derived-metrics.js';
import { getCanonicalRawJsonMap } from './raw-fixtures.js';

export type QualityIssueSeverity = 'BLOCKING' | 'WARNING' | 'INFO';

export type QualityIssueCategory =
  'SCHEMA' | 'ORPHAN_KEY' | 'TEMPORAL' | 'UTM' | 'COVERAGE' | 'MULTI_TENANT';

export interface QualityIssue {
  id: string;
  category: QualityIssueCategory;
  severity: QualityIssueSeverity;
  message: string;
  file?: string;
  locator?: string;
  details?: Record<string, unknown>;
}

export type QualityReportStatus = 'PASSED' | 'PASSED_WITH_WARNINGS' | 'FAILED';

export interface QualityCountsSummary {
  graph_nodes_count: number;
  graph_edges_count: number;
  timeline_events_count: number;
  campaigns_count: number;
  ads_count: number;
  deals_count: number;
  sales_count: number;
  creatives_count: number;
  conversations_threads_count: number;
  meeting_transcripts_count: number;
}

export interface QualityCoverageSummary {
  join_coverage: number;
  join_coverage_level: string;
  join_coverage_percentage: string;
  evidence_coverage: number;
  evidence_coverage_level: string;
  evidence_coverage_percentage: string;
}

export interface QualityFinancialsSummary {
  total_spend_brl: number;
  total_revenue_brl: number;
  formatted_spend_brl: string;
  formatted_revenue_brl: string;
  roas: number | null;
  cpa_sale_brl: number | null;
}

export interface DatasetQualityReport {
  schemaVersion: '1.0.0';
  status: QualityReportStatus;
  generatedAt: string;
  hasBlockingErrors: boolean;
  blockingErrorsCount: number;
  warningsCount: number;
  infoCount: number;
  counts: QualityCountsSummary;
  coverage: QualityCoverageSummary;
  financials: QualityFinancialsSummary;
  issues: QualityIssue[];
  textSummary: string;
}

export interface QualityReportOptions {
  generatedAt?: string;
}

/**
 * Gera o relatório de qualidade formal do dataset (inspeciona schemas, chaves órfãs, tempos, UTMs e coberturas).
 */
export function generateDatasetQualityReport(
  rawFilesInput?: Record<string, unknown>,
  options?: QualityReportOptions
): DatasetQualityReport {
  const generatedAt = options?.generatedAt ?? new Date().toISOString();
  const rawFiles = rawFilesInput ?? getCanonicalRawJsonMap();
  const issues: QualityIssue[] = [];

  // 1. Validação de Schemas Brutos
  const validation = validateRawDatasetFiles(rawFiles);
  if (!validation.valid || !validation.dataset) {
    for (const [filename, fileErrors] of Object.entries(validation.errors)) {
      for (const err of fileErrors) {
        issues.push({
          id: `schema_error_${filename}_${issues.length + 1}`,
          category: 'SCHEMA',
          severity: 'BLOCKING',
          message: `Violação de schema no arquivo ${filename}: ${err}`,
          file: filename,
          locator: filename
        });
      }
    }
  }

  // 2. Se a validação de schema falhou criticamente, retorna relatório preliminar FAILED
  if (!validation.dataset) {
    const blockingCount = issues.filter((i) => i.severity === 'BLOCKING').length;
    const dummyReport: DatasetQualityReport = {
      schemaVersion: '1.0.0',
      status: 'FAILED',
      generatedAt,
      hasBlockingErrors: true,
      blockingErrorsCount: blockingCount,
      warningsCount: 0,
      infoCount: 0,
      counts: {
        graph_nodes_count: 0,
        graph_edges_count: 0,
        timeline_events_count: 0,
        campaigns_count: 0,
        ads_count: 0,
        deals_count: 0,
        sales_count: 0,
        creatives_count: 0,
        conversations_threads_count: 0,
        meeting_transcripts_count: 0
      },
      coverage: {
        join_coverage: 0,
        join_coverage_level: 'INSUFFICIENT',
        join_coverage_percentage: '0.0%',
        evidence_coverage: 0,
        evidence_coverage_level: 'INSUFFICIENT',
        evidence_coverage_percentage: '0.0%'
      },
      financials: {
        total_spend_brl: 0,
        total_revenue_brl: 0,
        formatted_spend_brl: 'R$ 0,00',
        formatted_revenue_brl: 'R$ 0,00',
        roas: null,
        cpa_sale_brl: null
      },
      issues,
      textSummary: ''
    };
    dummyReport.textSummary = formatQualityReportSummary(dummyReport);
    return dummyReport;
  }

  const { graph, timeline, metaAds, crmLeads, analiseCriativos, conversas } = validation.dataset;

  // 3. Checagem de Isolamento Multi-tenant e Multi-cliente
  if (metaAds.tenant_id !== crmLeads.tenant_id || metaAds.tenant_id !== graph.tenant_id) {
    issues.push({
      id: 'tenant_mismatch',
      category: 'MULTI_TENANT',
      severity: 'BLOCKING',
      message: `Inconsistência de tenant_id entre os arquivos: Meta (${metaAds.tenant_id}), CRM (${crmLeads.tenant_id}), Grafo (${graph.tenant_id})`
    });
  }

  if (metaAds.client_id !== crmLeads.client_id || metaAds.client_id !== graph.client_id) {
    issues.push({
      id: 'client_mismatch',
      category: 'MULTI_TENANT',
      severity: 'BLOCKING',
      message: `Inconsistência de client_id entre os arquivos: Meta (${metaAds.client_id}), CRM (${crmLeads.client_id}), Grafo (${graph.client_id})`
    });
  }

  // 4. Checagem de Chaves Órfãs no Grafo do Supercérebro
  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.from)) {
      issues.push({
        id: `orphan_edge_from_${edge.from}_${edge.to}`,
        category: 'ORPHAN_KEY',
        severity: 'BLOCKING',
        message: `Aresta aponta para nó de origem inexistente (from: "${edge.from}")`,
        file: 'supercerebro_graph.json',
        details: { edge }
      });
    }
    if (!nodeIds.has(edge.to)) {
      issues.push({
        id: `orphan_edge_to_${edge.from}_${edge.to}`,
        category: 'ORPHAN_KEY',
        severity: 'BLOCKING',
        message: `Aresta aponta para nó de destino inexistente (to: "${edge.to}")`,
        file: 'supercerebro_graph.json',
        details: { edge }
      });
    }
  }

  // 5. Checagem de Chaves Órfãs na Timeline
  for (const event of timeline.events) {
    for (const actorId of event.actor_ids) {
      if (!nodeIds.has(actorId)) {
        issues.push({
          id: `orphan_timeline_actor_${event.event_id}_${actorId}`,
          category: 'ORPHAN_KEY',
          severity: 'WARNING',
          message: `Evento da timeline "${event.event_id}" referencia ator não listado nos nós do grafo: "${actorId}"`,
          file: 'supercerebro_timeline.json'
        });
      }
    }
    for (const relatedNodeId of event.related_node_ids) {
      if (!nodeIds.has(relatedNodeId)) {
        issues.push({
          id: `orphan_timeline_node_${event.event_id}_${relatedNodeId}`,
          category: 'ORPHAN_KEY',
          severity: 'WARNING',
          message: `Evento da timeline "${event.event_id}" referencia nó não listado no grafo: "${relatedNodeId}"`,
          file: 'supercerebro_timeline.json'
        });
      }
    }
  }

  // 6. Checagem de Conflitos Temporais (Timeframe & Datas)
  const sinceDate = new Date(metaAds.timeframe.since).getTime();
  const untilDate = new Date(metaAds.timeframe.until).getTime();

  if (sinceDate > untilDate) {
    issues.push({
      id: 'inverted_timeframe',
      category: 'TEMPORAL',
      severity: 'BLOCKING',
      message: `Período invertido: since (${metaAds.timeframe.since}) é posterior a until (${metaAds.timeframe.until})`,
      file: 'api_meta_ads.json'
    });
  }

  for (const deal of crmLeads.deals) {
    const dealTime = new Date(deal.created_at).getTime();
    if (dealTime < sinceDate || dealTime > untilDate) {
      issues.push({
        id: `deal_outside_timeframe_${deal.deal_id}`,
        category: 'TEMPORAL',
        severity: 'WARNING',
        message: `Deal "${deal.deal_id}" criado em ${deal.created_at} está fora da janela de análise [${metaAds.timeframe.since} .. ${metaAds.timeframe.until}]`,
        file: 'api_crm_leads.json',
        locator: `$.deals[?(@.deal_id == '${deal.deal_id}')]`
      });
    }
  }

  // 7. Checagem de UTMs Ausentes em Criativos e Deals
  for (const campaign of metaAds.campaigns) {
    for (const ad of campaign.ads) {
      if (!ad.utm_content || ad.utm_content.trim() === '') {
        issues.push({
          id: `missing_utm_ad_${ad.ad_id}`,
          category: 'UTM',
          severity: 'WARNING',
          message: `Anúncio "${ad.ad_id}" veiculado sem utm_content explícito`,
          file: 'api_meta_ads.json'
        });
      }
    }
  }

  for (const deal of crmLeads.deals) {
    if (!deal.utm_content || deal.utm_content.trim() === '') {
      issues.push({
        id: `missing_utm_deal_${deal.deal_id}`,
        category: 'UTM',
        severity: 'WARNING',
        message: `Transação "${deal.deal_id}" recebida sem utm_content no CRM (gera MISSING_UTM no denominador)`,
        file: 'api_crm_leads.json'
      });
    }
  }

  // 8. Execução da Importação e Métricas Normalizadas
  const importResult = importRawDataset(rawFiles);
  if (!importResult.success || !importResult.dataset) {
    issues.push({
      id: 'import_pipeline_failure',
      category: 'BUSINESS_RULE' as QualityIssueCategory,
      severity: 'BLOCKING',
      message: 'Falha ao executar pipeline canônico de importação do dataset'
    });
  }

  const normalized = importResult.dataset!;
  const derivedMetrics = computeAllDerivedMetrics(normalized);

  // 9. Auditoria de Cobertura de Join
  if (derivedMetrics.join_coverage.coverage.value !== null) {
    if (derivedMetrics.join_coverage.coverage.value < 0.5) {
      issues.push({
        id: 'low_join_coverage',
        category: 'COVERAGE',
        severity: 'WARNING',
        message: `Cobertura de join criticamente baixa (${derivedMetrics.join_coverage.percentageString}) - recomenda-se quarentena ou abstenção parcial`
      });
    }
  }

  // 10. Divergências de Atribuição
  const divergences = normalized.joinSummary.divergent_deals_count;
  if (divergences > 0) {
    issues.push({
      id: 'attribution_divergences_detected',
      category: 'BUSINESS_RULE' as QualityIssueCategory,
      severity: 'INFO',
      message: `Detectadas ${divergences} transações com divergência entre canal de mídia e origem declarada`
    });
  }

  // 11. Consolidação do Relatório
  const blockingErrorsCount = issues.filter((i) => i.severity === 'BLOCKING').length;
  const warningsCount = issues.filter((i) => i.severity === 'WARNING').length;
  const infoCount = issues.filter((i) => i.severity === 'INFO').length;

  const hasBlockingErrors = blockingErrorsCount > 0;
  const status: QualityReportStatus = hasBlockingErrors
    ? 'FAILED'
    : warningsCount > 0
      ? 'PASSED_WITH_WARNINGS'
      : 'PASSED';

  const allAds = metaAds.campaigns.flatMap((c) => c.ads);
  const salesCount = crmLeads.deals.filter((d) => d.status === 'venda').length;

  const counts: QualityCountsSummary = {
    graph_nodes_count: graph.nodes.length,
    graph_edges_count: graph.edges.length,
    timeline_events_count: timeline.events.length,
    campaigns_count: metaAds.campaigns.length,
    ads_count: allAds.length,
    deals_count: crmLeads.deals.length,
    sales_count: salesCount,
    creatives_count: analiseCriativos.creatives.length,
    conversations_threads_count: conversas.whatsapp_threads.length,
    meeting_transcripts_count: conversas.meeting_transcripts.length
  };

  const coverage: QualityCoverageSummary = {
    join_coverage: derivedMetrics.join_coverage.coverage.value ?? 0,
    join_coverage_level: derivedMetrics.join_coverage.level,
    join_coverage_percentage: derivedMetrics.join_coverage.percentageString,
    evidence_coverage: derivedMetrics.evidence_coverage.coverage.value ?? 0,
    evidence_coverage_level: derivedMetrics.evidence_coverage.level,
    evidence_coverage_percentage: derivedMetrics.evidence_coverage.percentageString
  };

  const financials: QualityFinancialsSummary = {
    total_spend_brl: derivedMetrics.total_spend_brl,
    total_revenue_brl: derivedMetrics.total_revenue_brl,
    formatted_spend_brl: formatMoneyBrl(derivedMetrics.total_spend_brl),
    formatted_revenue_brl: formatMoneyBrl(derivedMetrics.total_revenue_brl),
    roas: derivedMetrics.global_roas.value,
    cpa_sale_brl: derivedMetrics.global_cpa_sale_brl.value
  };

  const report: DatasetQualityReport = {
    schemaVersion: '1.0.0',
    status,
    generatedAt,
    hasBlockingErrors,
    blockingErrorsCount,
    warningsCount,
    infoCount,
    counts,
    coverage,
    financials,
    issues,
    textSummary: ''
  };

  report.textSummary = formatQualityReportSummary(report);

  return report;
}

/**
 * Formata o relatório de qualidade em formato de texto estruturado / legível para logs e CI.
 */
export function formatQualityReportSummary(report: DatasetQualityReport): string {
  const lines: string[] = [
    '=================================================================',
    `  DATASET QUALITY REPORT — STATUS: [${report.status}]`,
    '=================================================================',
    `Data de Geração: ${report.generatedAt}`,
    `Erros Bloqueantes: ${report.blockingErrorsCount}`,
    `Avisos (Warnings): ${report.warningsCount}`,
    `Informativos: ${report.infoCount}`,
    '',
    '--- CONTAGENS E ENTIDADES ---',
    `• Nós do Grafo: ${report.counts.graph_nodes_count} | Arestas: ${report.counts.graph_edges_count}`,
    `• Eventos da Timeline: ${report.counts.timeline_events_count}`,
    `• Campanhas: ${report.counts.campaigns_count} | Anúncios: ${report.counts.ads_count}`,
    `• Deals no CRM: ${report.counts.deals_count} (Vendas: ${report.counts.sales_count})`,
    `• Criativos Avaliados: ${report.counts.creatives_count}`,
    `• Conversas / Reuniões: ${report.counts.conversations_threads_count} threads / ${report.counts.meeting_transcripts_count} atas`,
    '',
    '--- COBERTURAS E GOVERNANÇA ---',
    `• Join Coverage: ${report.coverage.join_coverage_percentage} [${report.coverage.join_coverage_level}]`,
    `• Evidence Coverage: ${report.coverage.evidence_coverage_percentage} [${report.coverage.evidence_coverage_level}]`,
    '',
    '--- FINANCEIRO E PERFORMANCE ---',
    `• Investimento Total (Spend): ${report.financials.formatted_spend_brl}`,
    `• Receita Total: ${report.financials.formatted_revenue_brl}`,
    `• ROAS Global: ${report.financials.roas !== null ? report.financials.roas.toFixed(2) : 'N/A'}`,
    `• CPA Médio por Venda: ${report.financials.cpa_sale_brl !== null ? formatMoneyBrl(report.financials.cpa_sale_brl) : 'N/A'}`
  ];

  if (report.issues.length > 0) {
    lines.push('');
    lines.push('--- DIAGNÓSTICOS E APONTAMENTOS ---');
    for (const issue of report.issues) {
      const tag = `[${issue.severity}] [${issue.category}]`;
      lines.push(`• ${tag} ${issue.message}`);
    }
  }

  lines.push('=================================================================');
  return lines.join('\n');
}

/**
 * Asserção de qualidade para CI e pipelines automatizados.
 * Lança exceção se houver qualquer erro bloqueante no relatório.
 */
export function assertDatasetQuality(report: DatasetQualityReport): void {
  if (report.hasBlockingErrors) {
    const blockingMsgs = report.issues
      .filter((i) => i.severity === 'BLOCKING')
      .map((i) => `[${i.category}] ${i.message}`)
      .join('\n  - ');

    throw new Error(
      `Dataset Quality Gate FAILED com ${report.blockingErrorsCount} erro(s) bloqueante(s):\n  - ${blockingMsgs}`
    );
  }
}

/**
 * Exporta o Quality Report para disco em formato JSON no caminho especificado.
 */
export function exportQualityReportToDisk(report: DatasetQualityReport, outputPath: string): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
}
