/**
 * @adzhub/data
 * Módulos de dados, normalização de UTMs, aliases, validação de schemas, join canônico,
 * importação, métricas derivadas e quality report dos cenários S0–S5.
 */

export * from './utm-aliases.js';
export * from './utm-normalizer.js';
export * from './manifest.js';
export * from './raw-fixtures.js';
export * from './raw-schemas.js';
export * from './canonical-model.js';
export * from './canonical-join.js';
export * from './dataset-importer.js';
export * from './derived-metrics.js';
export * from './quality-report.js';
export * from './sqlite-schema.js';
export * from './sqlite-database.js';
export * from './artifact-repository.js';
export * from './atomic-commit-engine.js';
export * from './supercerebro-traversal.js';
export * from './account-context.js';
