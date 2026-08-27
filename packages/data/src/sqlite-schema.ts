/**
 * Definições canônicas de DDL e Migrations para o SQLite do Microkernel PEV-C e Supercérebro MVP.
 */

export interface Migration {
  version: number;
  name: string;
  up: string;
}

export const INITIAL_SCHEMA_SQL = `
-- 1. Tabela de controle de Migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);

-- 2. Tabela de Execuções (runs)
CREATE TABLE IF NOT EXISTS runs (
  run_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  metadata_json TEXT
);

-- 3. Tabela de Contratos Imutáveis (task_contracts)
CREATE TABLE IF NOT EXISTS task_contracts (
  task_id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  contract_hash TEXT NOT NULL,
  contract_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACCEPTED',
  created_at TEXT NOT NULL
);

-- 4. Tabela de Eventos de Rastreabilidade (trace_events)
CREATE TABLE IF NOT EXISTS trace_events (
  event_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  phase TEXT NOT NULL,
  event_type TEXT NOT NULL,
  causation_id TEXT,
  correlation_id TEXT NOT NULL,
  operational_payload_json TEXT NOT NULL,
  redacted_payload_json TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  CONSTRAINT uq_trace_run_seq UNIQUE (run_id, seq)
);

-- 5. Tabela de Observações em Staging (observations_staging)
CREATE TABLE IF NOT EXISTS observations_staging (
  observation_id TEXT PRIMARY KEY,
  tool_call_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  source TEXT NOT NULL,
  locator TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'RAW',
  captured_at TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  payload_json TEXT NOT NULL
);

-- 6. Tabela de Evidências Verificadas (evidence)
CREATE TABLE IF NOT EXISTS evidence (
  evidence_id TEXT PRIMARY KEY,
  observation_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  claim_locator TEXT NOT NULL,
  verification_score REAL NOT NULL,
  verified_at TEXT NOT NULL,
  check_ids_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'VERIFIED',
  evidence_hash TEXT NOT NULL,
  FOREIGN KEY (observation_id) REFERENCES observations_staging(observation_id)
);

-- 7. Tabela de Artefatos (artifacts)
CREATE TABLE IF NOT EXISTS artifacts (
  artifact_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  type TEXT NOT NULL,
  version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PROVISIONAL',
  claims_json TEXT NOT NULL,
  evidence_refs_json TEXT NOT NULL,
  operational_payload_json TEXT NOT NULL,
  redacted_payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  committed_at TEXT,
  CONSTRAINT uq_artifact_task_type_version UNIQUE (task_id, type, version)
);

-- 8. Tabela de Commits Atômicos (commits)
CREATE TABLE IF NOT EXISTS commits (
  commit_id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL UNIQUE,
  task_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  artifact_id TEXT NOT NULL,
  policy_ref TEXT NOT NULL,
  evidence_refs_json TEXT NOT NULL,
  state_hash TEXT NOT NULL,
  committed_at TEXT NOT NULL,
  FOREIGN KEY (artifact_id) REFERENCES artifacts(artifact_id)
);

-- 9. Tabela de Checkpoints Determinísticos (checkpoints)
CREATE TABLE IF NOT EXISTS checkpoints (
  checkpoint_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  phase TEXT NOT NULL,
  state_hash TEXT NOT NULL,
  serialized_state_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  CONSTRAINT uq_checkpoint_run_seq UNIQUE (run_id, seq)
);

-- 10. Tabela de Aprovações (approvals)
CREATE TABLE IF NOT EXISTS approvals (
  approval_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  scope TEXT NOT NULL,
  actor TEXT NOT NULL,
  decision TEXT NOT NULL,
  reason TEXT,
  requested_at TEXT NOT NULL,
  decided_at TEXT,
  expires_at TEXT NOT NULL
);

-- 11. Tabela de Manifestos de Dataset (dataset_manifests)
CREATE TABLE IF NOT EXISTS dataset_manifests (
  manifest_id TEXT PRIMARY KEY,
  dataset_version TEXT NOT NULL,
  client_id TEXT NOT NULL,
  global_hash TEXT NOT NULL,
  synthetic INTEGER NOT NULL DEFAULT 1,
  manifest_json TEXT NOT NULL,
  generated_at TEXT NOT NULL
);

-- 12. Nós do Supercérebro MVP (nodes)
CREATE TABLE IF NOT EXISTS nodes (
  node_id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  properties_json TEXT NOT NULL,
  source TEXT NOT NULL,
  locator TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

-- 13. Arestas do Supercérebro MVP (edges)
CREATE TABLE IF NOT EXISTS edges (
  edge_id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  relationship TEXT NOT NULL,
  properties_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (source_node_id) REFERENCES nodes(node_id),
  FOREIGN KEY (target_node_id) REFERENCES nodes(node_id)
);

-- 14. Timeline de Eventos do Supercérebro MVP (timeline_events)
CREATE TABLE IF NOT EXISTS timeline_events (
  event_id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  actor_ids_json TEXT,
  related_node_ids_json TEXT,
  source TEXT NOT NULL,
  locator TEXT NOT NULL,
  captured_at TEXT NOT NULL
);

-- Índices Estratégicos para Performance e Isolamento por Cliente
CREATE INDEX IF NOT EXISTS idx_runs_client ON runs(client_id);
CREATE INDEX IF NOT EXISTS idx_trace_events_run ON trace_events(run_id);
CREATE INDEX IF NOT EXISTS idx_observations_run ON observations_staging(run_id);
CREATE INDEX IF NOT EXISTS idx_evidence_task ON evidence(task_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_task ON artifacts(task_id);
CREATE INDEX IF NOT EXISTS idx_nodes_client ON nodes(client_id);
CREATE INDEX IF NOT EXISTS idx_edges_client ON edges(client_id);
CREATE INDEX IF NOT EXISTS idx_timeline_client ON timeline_events(client_id);
`;

export const APPEND_ONLY_TRIGGERS_SQL = `
-- Triggers de Imutabilidade Append-Only para trace_events
CREATE TRIGGER IF NOT EXISTS trg_prevent_trace_events_update
BEFORE UPDATE ON trace_events
BEGIN
  SELECT RAISE(ABORT, 'Append-only violation: trace_events cannot be updated.');
END;

CREATE TRIGGER IF NOT EXISTS trg_prevent_trace_events_delete
BEFORE DELETE ON trace_events
BEGIN
  SELECT RAISE(ABORT, 'Append-only violation: trace_events cannot be deleted.');
END;

-- Triggers de Imutabilidade Append-Only para commits
CREATE TRIGGER IF NOT EXISTS trg_prevent_commits_update
BEFORE UPDATE ON commits
BEGIN
  SELECT RAISE(ABORT, 'Append-only violation: commits cannot be updated.');
END;

CREATE TRIGGER IF NOT EXISTS trg_prevent_commits_delete
BEFORE DELETE ON commits
BEGIN
  SELECT RAISE(ABORT, 'Append-only violation: commits cannot be deleted.');
END;

-- Triggers de Imutabilidade Append-Only para checkpoints
CREATE TRIGGER IF NOT EXISTS trg_prevent_checkpoints_update
BEFORE UPDATE ON checkpoints
BEGIN
  SELECT RAISE(ABORT, 'Append-only violation: checkpoints cannot be updated.');
END;

CREATE TRIGGER IF NOT EXISTS trg_prevent_checkpoints_delete
BEFORE DELETE ON checkpoints
BEGIN
  SELECT RAISE(ABORT, 'Append-only violation: checkpoints cannot be deleted.');
END;
`;

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: '001_initial_canonical_schema',
    up: INITIAL_SCHEMA_SQL
  },
  {
    version: 2,
    name: '002_append_only_triggers',
    up: APPEND_ONLY_TRIGGERS_SQL
  }
];
