import { describe, it, expect } from 'vitest';
import {
  computeFileHash,
  buildDatasetManifest,
  verifyDatasetManifestIntegrity,
  createDefaultHousewheyManifest,
  getCurrentDatasetManifest,
  setCurrentDatasetManifest,
  resetCurrentDatasetManifest,
  CANONICAL_RAW_FILES_SPEC,
  DEFAULT_CANONICAL_TIMEFRAME
} from './manifest.js';

describe('@adzhub/data - dataset_manifest', () => {
  const sampleTimeframe = {
    since: '2026-08-01T00:00:00.000Z',
    until: '2026-08-20T23:59:59.000Z',
    timezone: 'America/Sao_Paulo'
  };

  const file1Content = JSON.stringify({ campaign: 'Housewhey_Top_Performers', spend: 12500 });
  const file2Content = JSON.stringify({ deals_count: 320, revenue: 45000 });

  const sampleFiles = [
    {
      filename: 'meta_ads_performance.json',
      content: file1Content,
      purpose: 'Métricas de mídia'
    },
    {
      filename: 'crm_deals.json',
      content: file2Content,
      purpose: 'Transações de CRM'
    }
  ];

  it('1. Deve construir manifesto com versão, hash global, período, timezone, origem e synthetic: true', () => {
    const manifest = buildDatasetManifest({
      manifestId: 'dsm_test_s0',
      datasetVersion: '1.0.0',
      clientId: 'cli_housewhey',
      origin: 'synthetic_generator',
      timeframe: sampleTimeframe,
      files: sampleFiles,
      generatedAt: '2026-08-23T06:00:00.000Z'
    });

    expect(manifest.schemaVersion).toBe('1.0.0');
    expect(manifest.manifestId).toBe('dsm_test_s0');
    expect(manifest.datasetVersion).toBe('1.0.0');
    expect(manifest.clientId).toBe('cli_housewhey');
    expect(manifest.origin).toBe('synthetic_generator');
    expect(manifest.synthetic).toBe(true);
    expect(manifest.timeframe.since).toBe('2026-08-01T00:00:00.000Z');
    expect(manifest.timeframe.until).toBe('2026-08-20T23:59:59.000Z');
    expect(manifest.timeframe.timezone).toBe('America/Sao_Paulo');
    expect(manifest.globalHash).toHaveLength(64);
    expect(manifest.files).toHaveLength(2);
  });

  it('2. Deve listar todos os arquivos com filename, fileHash SHA-256, byteSize e purpose', () => {
    const manifest = buildDatasetManifest({
      manifestId: 'dsm_test_files',
      datasetVersion: '1.0.0',
      clientId: 'cli_housewhey',
      timeframe: sampleTimeframe,
      files: sampleFiles
    });

    const metaFile = manifest.files.find((f) => f.filename === 'meta_ads_performance.json');
    expect(metaFile).toBeDefined();
    expect(metaFile?.fileHash).toBe(computeFileHash(file1Content));
    expect(metaFile?.byteSize).toBe(Buffer.byteLength(file1Content, 'utf8'));
    expect(metaFile?.purpose).toBe('Métricas de mídia');

    const crmFile = manifest.files.find((f) => f.filename === 'crm_deals.json');
    expect(crmFile).toBeDefined();
    expect(crmFile?.fileHash).toBe(computeFileHash(file2Content));
    expect(crmFile?.byteSize).toBe(Buffer.byteLength(file2Content, 'utf8'));
    expect(crmFile?.purpose).toBe('Transações de CRM');
  });

  it('3. Mudança em qualquer arquivo deve alterar o hash do arquivo e o hash global (invariante de integridade)', () => {
    const originalManifest = buildDatasetManifest({
      manifestId: 'dsm_integrity_test',
      datasetVersion: '1.0.0',
      clientId: 'cli_housewhey',
      timeframe: sampleTimeframe,
      files: sampleFiles,
      generatedAt: '2026-08-23T06:00:00.000Z'
    });

    // Modificando apenas um byte do arquivo de meta ads
    const tamperedFiles = [
      {
        filename: 'meta_ads_performance.json',
        content: JSON.stringify({ campaign: 'Housewhey_Top_Performers', spend: 12501 }), // +1
        purpose: 'Métricas de mídia'
      },
      {
        filename: 'crm_deals.json',
        content: file2Content,
        purpose: 'Transações de CRM'
      }
    ];

    const tamperedManifest = buildDatasetManifest({
      manifestId: 'dsm_integrity_test',
      datasetVersion: '1.0.0',
      clientId: 'cli_housewhey',
      timeframe: sampleTimeframe,
      files: tamperedFiles,
      generatedAt: '2026-08-23T06:00:00.000Z'
    });

    const origMeta = originalManifest.files.find((f) => f.filename === 'meta_ads_performance.json');
    const tampMeta = tamperedManifest.files.find((f) => f.filename === 'meta_ads_performance.json');

    expect(origMeta).toBeDefined();
    expect(tampMeta).toBeDefined();
    // Hashes dos arquivos devem ser diferentes
    expect(tampMeta?.fileHash).not.toBe(origMeta?.fileHash);
    // Hash global DEVE mudar
    expect(tamperedManifest.globalHash).not.toBe(originalManifest.globalHash);
  });

  it('4. Deve validar com sucesso a integridade quando arquivos coincidem', () => {
    const manifest = buildDatasetManifest({
      manifestId: 'dsm_verify_ok',
      datasetVersion: '1.0.0',
      clientId: 'cli_housewhey',
      timeframe: sampleTimeframe,
      files: sampleFiles
    });

    const fileMap: Record<string, string> = {
      'meta_ads_performance.json': file1Content,
      'crm_deals.json': file2Content
    };

    const check = verifyDatasetManifestIntegrity(manifest, fileMap);
    expect(check.valid).toBe(true);
    expect(check.errors).toHaveLength(0);
  });

  it('5. Deve detectar e reportar erros quando um arquivo foi alterado ou está ausente', () => {
    const manifest = buildDatasetManifest({
      manifestId: 'dsm_verify_tamper',
      datasetVersion: '1.0.0',
      clientId: 'cli_housewhey',
      timeframe: sampleTimeframe,
      files: sampleFiles
    });

    // Cenário A: arquivo corrompido
    const tamperedMap: Record<string, string> = {
      'meta_ads_performance.json': '{"tampered": true}',
      'crm_deals.json': file2Content
    };
    const checkTampered = verifyDatasetManifestIntegrity(manifest, tamperedMap);
    expect(checkTampered.valid).toBe(false);
    expect(checkTampered.errors.some((e) => e.includes('Hash divergente'))).toBe(true);

    // Cenário B: arquivo ausente
    const missingMap: Record<string, string> = {
      'meta_ads_performance.json': file1Content
    };
    const checkMissing = verifyDatasetManifestIntegrity(manifest, missingMap);
    expect(checkMissing.valid).toBe(false);
    expect(checkMissing.errors.some((e) => e.includes('Arquivo obrigatório ausente'))).toBe(true);
  });

  it('6. createDefaultHousewheyManifest deve cobrir os 7 arquivos mínimos canônicos', () => {
    const defaultManifest = createDefaultHousewheyManifest();

    expect(defaultManifest.manifestId).toBe('dsm_housewhey_s0_v1');
    expect(defaultManifest.clientId).toBe('cli_housewhey');
    expect(defaultManifest.synthetic).toBe(true);
    expect(defaultManifest.files).toHaveLength(7);

    const filenames = defaultManifest.files.map((f) => f.filename);
    for (const spec of CANONICAL_RAW_FILES_SPEC) {
      expect(filenames).toContain(spec.filename);
    }
  });

  it('7. Gestão de manifesto ativo: getCurrent, setCurrent e resetCurrent', () => {
    resetCurrentDatasetManifest();
    const current = getCurrentDatasetManifest();
    expect(current.manifestId).toBe('dsm_housewhey_s0_v1');

    const customManifest = buildDatasetManifest({
      manifestId: 'dsm_custom_active',
      datasetVersion: '2.0.0',
      clientId: 'cli_housewhey',
      timeframe: DEFAULT_CANONICAL_TIMEFRAME,
      files: sampleFiles
    });

    setCurrentDatasetManifest(customManifest);
    expect(getCurrentDatasetManifest().manifestId).toBe('dsm_custom_active');

    resetCurrentDatasetManifest();
    expect(getCurrentDatasetManifest().manifestId).toBe('dsm_housewhey_s0_v1');
  });
});
