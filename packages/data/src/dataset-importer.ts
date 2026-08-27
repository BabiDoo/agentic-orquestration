/**
 * @adzhub/data - Dataset Importer & Normalization Pipeline
 * Importador canônico que valida schemas, normaliza UTMs, reconcilia dados e gera o dataset normalizado determinístico.
 */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { UtmNormalizer } from './utm-normalizer.js';
import { validateRawDatasetFiles } from './raw-schemas.js';
import { reconcileMetaAdsAndCrm } from './canonical-join.js';
import { NormalizedDataset } from './canonical-model.js';
import { createDefaultHousewheyManifest } from './manifest.js';
import { getCanonicalRawJsonMap } from './raw-fixtures.js';

export interface ImportDatasetOptions {
  normalizer?: UtmNormalizer;
  strictTenantCheck?: boolean;
  generatedAt?: string;
  datasetVersion?: string;
}

export interface ImportDatasetResult {
  success: boolean;
  dataset?: NormalizedDataset;
  errors?: Record<string, string[]>;
}

/**
 * Computa o hash determinístico SHA-256 de um dataset normalizado.
 * Ordena chaves e coleções para garantir que a reexecução com a mesma entrada produza o mesmo hash.
 */
export function computeNormalizedDatasetHash(
  dataset: Omit<NormalizedDataset, 'globalHash'> | NormalizedDataset
): string {
  const sortedJoined = [...dataset.joinedPerformance].sort((a, b) =>
    a.ad_id.localeCompare(b.ad_id)
  );

  const sortedDeals = [...dataset.crmLeads.deals].sort((a, b) =>
    a.deal_id.localeCompare(b.deal_id)
  );

  const sortedAds = [...dataset.metaAds.ads].sort((a, b) => a.ad_id.localeCompare(b.ad_id));

  const canonicalPayload = JSON.stringify({
    schemaVersion: '1.0.0',
    tenantId: dataset.tenantId,
    clientId: dataset.clientId,
    datasetVersion: dataset.datasetVersion,
    joinSummary: dataset.joinSummary,
    joinedPerformance: sortedJoined.map((j) => ({
      ad_id: j.ad_id,
      campaign_id: j.campaign_id,
      utm_content: j.utm_content,
      spend_brl: j.spend_brl,
      impressions: j.impressions,
      clicks: j.clicks,
      leads_count: j.leads_count,
      sales_count: j.sales_count,
      revenue_brl: j.revenue_brl,
      divergencesCount: j.divergences.length,
      recommendation: j.creative_evaluation?.recommendation
    })),
    dealsCount: sortedDeals.length,
    adsCount: sortedAds.length,
    manifestHash: dataset.manifest.globalHash
  });

  return createHash('sha256').update(canonicalPayload).digest('hex');
}

/**
 * Pipeline principal de importação:
 * 1. Valida schemas de todos os 7 arquivos brutos;
 * 2. Normaliza UTMs e entidades;
 * 3. Executa o join e reconciliação canônica;
 * 4. Produz o NormalizedDataset com hash estável.
 */
export function importRawDataset(
  rawFiles: Record<string, unknown>,
  options?: ImportDatasetOptions
): ImportDatasetResult {
  // 1. Validação de Schemas
  const validation = validateRawDatasetFiles(rawFiles);
  if (!validation.valid || !validation.dataset) {
    return {
      success: false,
      errors: validation.errors
    };
  }

  const { graph, timeline, metaAds, crmLeads, analiseCriativos, mapaSolucao, conversas } =
    validation.dataset;

  const normalizer = options?.normalizer ?? new UtmNormalizer();
  const generatedAt = options?.generatedAt ?? '2026-08-23T06:00:00.000Z';
  const datasetVersion = options?.datasetVersion ?? metaAds.version ?? '1.0.0';

  // 2. Reconciliação e Join Canônico
  const reconcile = reconcileMetaAdsAndCrm(metaAds, crmLeads, analiseCriativos, {
    normalizer,
    strictTenantCheck: options?.strictTenantCheck ?? true
  });

  // 3. Manifesto do Dataset
  const stringifiedFiles: Record<string, string> = {};
  for (const [filename, content] of Object.entries(rawFiles)) {
    stringifiedFiles[filename] =
      typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  }
  const manifest = createDefaultHousewheyManifest(stringifiedFiles);

  // 4. Construção do Dataset Normalizado preliminar (sem globalHash)
  const provisionalDataset: Omit<NormalizedDataset, 'globalHash'> = {
    schemaVersion: '1.0.0',
    tenantId: metaAds.tenant_id,
    clientId: metaAds.client_id,
    datasetVersion,
    generatedAt,
    manifest,
    graph,
    timeline,
    metaAds: {
      account_id: metaAds.account_id,
      currency: metaAds.currency,
      timeframe: metaAds.timeframe,
      summary: metaAds.summary,
      ads: reconcile.normalizedAds
    },
    crmLeads: {
      currency: crmLeads.currency,
      timeframe: crmLeads.timeframe,
      summary: crmLeads.summary,
      deals: reconcile.normalizedDeals
    },
    analiseCriativos,
    mapaSolucao,
    conversas,
    joinedPerformance: reconcile.joinedPerformance,
    joinSummary: reconcile.summary
  };

  // 5. Cálculo do Hash Determinístico do Dataset Normalizado
  const globalHash = computeNormalizedDatasetHash(provisionalDataset);

  const normalizedDataset: NormalizedDataset = {
    ...provisionalDataset,
    globalHash
  };

  return {
    success: true,
    dataset: normalizedDataset
  };
}

/**
 * Exporta o dataset normalizado para arquivos JSON em disco no diretório data/normalized.
 */
export function exportNormalizedDatasetToDisk(
  dataset: NormalizedDataset,
  outputDir: string
): Record<string, string> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const exportMap: Record<string, string> = {
    'normalized_dataset.json': JSON.stringify(dataset, null, 2),
    'joined_performance.json': JSON.stringify(dataset.joinedPerformance, null, 2),
    'join_summary.json': JSON.stringify(dataset.joinSummary, null, 2),
    'normalized_meta_ads.json': JSON.stringify(dataset.metaAds, null, 2),
    'normalized_crm_leads.json': JSON.stringify(dataset.crmLeads, null, 2)
  };

  for (const [filename, content] of Object.entries(exportMap)) {
    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, content, 'utf8');
  }

  return exportMap;
}

/**
 * Carrega e normaliza os arquivos brutos diretamente do disco (data/raw).
 */
export function loadAndNormalizeDatasetFromDisk(
  rawDir: string,
  normalizedOutputDir?: string,
  options?: ImportDatasetOptions
): ImportDatasetResult {
  const canonicalFilenames = [
    'supercerebro_graph.json',
    'supercerebro_timeline.json',
    'api_meta_ads.json',
    'api_crm_leads.json',
    'app_analise_criativos.json',
    'app_mapa_solucao.json',
    'conversas.json'
  ];

  const rawFiles: Record<string, string> = {};
  for (const filename of canonicalFilenames) {
    const filePath = path.join(rawDir, filename);
    if (fs.existsSync(filePath)) {
      rawFiles[filename] = fs.readFileSync(filePath, 'utf8');
    }
  }

  const result = importRawDataset(rawFiles, options);

  if (result.success && result.dataset && normalizedOutputDir) {
    exportNormalizedDatasetToDisk(result.dataset, normalizedOutputDir);
  }

  return result;
}

let canonicalNormalizedCache: NormalizedDataset | null = null;

/**
 * Retorna a instância canônica e em memória do NormalizedDataset Housewhey S0.
 */
export function getCanonicalNormalizedDataset(): NormalizedDataset {
  if (!canonicalNormalizedCache) {
    const rawMap = getCanonicalRawJsonMap();
    const result = importRawDataset(rawMap);
    if (!result.success || !result.dataset) {
      throw new Error(
        `Falha ao inicializar o dataset canônico normalizado: ${JSON.stringify(result.errors)}`
      );
    }
    canonicalNormalizedCache = result.dataset;
  }
  return canonicalNormalizedCache;
}
