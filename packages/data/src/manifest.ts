import { createHash } from 'node:crypto';
import {
  DatasetManifest,
  DatasetFileManifest,
  DatasetManifestSchema,
  OperationalValidators,
  Timeframe
} from '@adzhub/contracts';

export type { DatasetManifest, DatasetFileManifest };

/**
 * Calcula o hash SHA-256 de um conteúdo em string ou Buffer.
 */
export function computeFileHash(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Calcula o hash global determinístico combinando os metadados do manifesto e a lista de arquivos ordenados.
 */
export function computeDatasetGlobalHash(
  files: DatasetFileManifest[],
  metadata: {
    datasetVersion: string;
    clientId: string;
    origin: string;
    timeframe: Timeframe;
  }
): string {
  const sortedFiles = [...files].sort((a, b) => a.filename.localeCompare(b.filename));

  const canonicalPayload = JSON.stringify({
    datasetVersion: metadata.datasetVersion,
    clientId: metadata.clientId,
    origin: metadata.origin,
    timeframe: {
      since: metadata.timeframe.since,
      until: metadata.timeframe.until,
      timezone: metadata.timeframe.timezone
    },
    files: sortedFiles.map((f) => ({
      filename: f.filename,
      fileHash: f.fileHash,
      byteSize: f.byteSize,
      purpose: f.purpose
    }))
  });

  return createHash('sha256').update(canonicalPayload).digest('hex');
}

export interface BuildDatasetManifestParams {
  manifestId: string;
  datasetVersion: string;
  clientId: string;
  origin?: string;
  timeframe: Timeframe;
  files: Array<{
    filename: string;
    content: string | Buffer;
    purpose: string;
  }>;
  generatedAt?: string;
}

/**
 * Constrói e valida um DatasetManifest calculando automaticamente os hashes individuais e globais.
 */
export function buildDatasetManifest(params: BuildDatasetManifestParams): DatasetManifest {
  const origin = params.origin ?? 'synthetic_generator';
  const generatedAt = params.generatedAt ?? new Date().toISOString();

  const fileManifests: DatasetFileManifest[] = params.files.map((file) => {
    const fileHash = computeFileHash(file.content);
    const byteSize = Buffer.isBuffer(file.content)
      ? file.content.length
      : Buffer.byteLength(file.content, 'utf8');

    return {
      filename: file.filename,
      fileHash,
      byteSize,
      purpose: file.purpose
    };
  });

  const globalHash = computeDatasetGlobalHash(fileManifests, {
    datasetVersion: params.datasetVersion,
    clientId: params.clientId,
    origin,
    timeframe: params.timeframe
  });

  const rawManifest: DatasetManifest = {
    schemaVersion: '1.0.0',
    manifestId: params.manifestId,
    datasetVersion: params.datasetVersion,
    globalHash,
    clientId: params.clientId,
    origin,
    synthetic: true,
    timeframe: params.timeframe,
    files: fileManifests,
    generatedAt
  };

  return OperationalValidators.validateDatasetManifest(rawManifest);
}

export interface IntegrityCheckResult {
  valid: boolean;
  errors: string[];
}

/**
 * Verifica formalmente a integridade de um DatasetManifest contra o conteúdo real dos arquivos.
 */
export function verifyDatasetManifestIntegrity(
  manifest: DatasetManifest,
  filesContent: Record<string, string | Buffer>
): IntegrityCheckResult {
  const errors: string[] = [];

  // 1. Validação de schema do próprio manifesto
  try {
    DatasetManifestSchema.parse(manifest);
  } catch (err: unknown) {
    errors.push(`Manifesto inválido perante o schema canônico: ${(err as Error).message}`);
    return { valid: false, errors };
  }

  // 2. Validação dos hashes individuais de cada arquivo
  for (const fileDef of manifest.files) {
    const content = filesContent[fileDef.filename];
    if (content === undefined) {
      errors.push(`Arquivo obrigatório ausente no payload: ${fileDef.filename}`);
      continue;
    }

    const actualHash = computeFileHash(content);
    if (actualHash !== fileDef.fileHash) {
      errors.push(
        `Hash divergente para ${fileDef.filename}. Esperado: ${fileDef.fileHash}, Calculado: ${actualHash}`
      );
    }

    const actualSize = Buffer.isBuffer(content)
      ? content.length
      : Buffer.byteLength(content, 'utf8');
    if (actualSize !== fileDef.byteSize) {
      errors.push(
        `Tamanho em bytes divergente para ${fileDef.filename}. Esperado: ${fileDef.byteSize}, Real: ${actualSize}`
      );
    }
  }

  // 3. Validação do hash global
  const recomputedGlobalHash = computeDatasetGlobalHash(manifest.files, {
    datasetVersion: manifest.datasetVersion,
    clientId: manifest.clientId,
    origin: manifest.origin,
    timeframe: manifest.timeframe
  });

  if (recomputedGlobalHash !== manifest.globalHash) {
    errors.push(
      `Hash global corrompido ou inconsistente. Esperado: ${manifest.globalHash}, Calculado: ${recomputedGlobalHash}`
    );
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

import { getCanonicalRawJsonMap } from './raw-fixtures.js';

/**
 * Definição dos 7 arquivos mínimos canônicos do dataset sintético Housewhey.
 */
export const CANONICAL_RAW_FILES_SPEC = [
  {
    filename: 'supercerebro_graph.json',
    purpose: 'Grafo de conhecimento e entidades organizacionais'
  },
  {
    filename: 'supercerebro_timeline.json',
    purpose: 'Linha do tempo de eventos e interações'
  },
  {
    filename: 'api_meta_ads.json',
    purpose: 'Métricas e performance de campanhas Meta Ads'
  },
  {
    filename: 'api_crm_leads.json',
    purpose: 'Funil de vendas e transações CRM'
  },
  {
    filename: 'app_analise_criativos.json',
    purpose: 'Metodologia e ranking de análise de criativos'
  },
  {
    filename: 'app_mapa_solucao.json',
    purpose: 'Mapa da solução e posicionamento de marca'
  },
  {
    filename: 'conversas.json',
    purpose: 'Transcrição de reuniões e conversas de alinhamento WhatsApp'
  }
] as const;

export const DEFAULT_CANONICAL_TIMEFRAME: Timeframe = {
  since: '2026-08-01T00:00:00.000Z',
  until: '2026-08-20T23:59:59.000Z',
  timezone: 'America/Sao_Paulo'
};

/**
 * Cria o manifesto canônico Housewhey S0 padrão com base nos 7 arquivos brutos.
 */
export function createDefaultHousewheyManifest(
  fileContents?: Record<string, string>
): DatasetManifest {
  const contents = fileContents ?? getCanonicalRawJsonMap();

  const files = CANONICAL_RAW_FILES_SPEC.map((spec) => ({
    filename: spec.filename,
    content: contents[spec.filename] ?? '{}',
    purpose: spec.purpose
  }));

  return buildDatasetManifest({
    manifestId: 'dsm_housewhey_s0_v1',
    datasetVersion: '1.0.0',
    clientId: 'cli_housewhey',
    origin: 'synthetic_seed',
    timeframe: DEFAULT_CANONICAL_TIMEFRAME,
    files,
    generatedAt: '2026-08-23T06:00:00.000Z'
  });
}

let activeDatasetManifest: DatasetManifest = createDefaultHousewheyManifest();

/**
 * Retorna o manifesto atualmente ativo no runtime / aplicação.
 */
export function getCurrentDatasetManifest(): DatasetManifest {
  return activeDatasetManifest;
}

/**
 * Define o manifesto atualmente ativo no runtime / aplicação.
 */
export function setCurrentDatasetManifest(manifest: DatasetManifest): void {
  activeDatasetManifest = OperationalValidators.validateDatasetManifest(manifest);
}

/**
 * Reseta o manifesto ativo para o padrão canônico.
 */
export function resetCurrentDatasetManifest(): void {
  activeDatasetManifest = createDefaultHousewheyManifest();
}
