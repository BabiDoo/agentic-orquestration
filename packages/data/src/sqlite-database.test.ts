import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AdzHubDatabase, createDatabase } from './sqlite-database.js';

describe('@adzhub/data - M5-04 Schema SQLite e Migrations', () => {
  let db: AdzHubDatabase;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('cria todas as tabelas requeridas pelo Microkernel PEV-C e Supercérebro MVP', () => {
    const tableNames = db.getTableNames();

    const expectedTables = [
      'schema_migrations',
      'runs',
      'task_contracts',
      'trace_events',
      'observations_staging',
      'evidence',
      'artifacts',
      'commits',
      'checkpoints',
      'approvals',
      'dataset_manifests',
      // Supercérebro MVP
      'nodes',
      'edges',
      'timeline_events'
    ];

    for (const table of expectedTables) {
      expect(tableNames, `Tabela '${table}' deve existir no banco`).toContain(table);
    }
  });

  it('migrations são reproduzíveis e idempotentes ao reexecutar em banco vazio ou existente', () => {
    const emptyDb = new AdzHubDatabase(':memory:');

    // Primeira aplicação
    const result1 = emptyDb.applyMigrations();
    expect(result1.appliedCount).toBe(2);
    expect(result1.currentVersion).toBe(2);

    // Segunda aplicação (idempotência)
    const result2 = emptyDb.applyMigrations();
    expect(result2.appliedCount).toBe(0);
    expect(result2.currentVersion).toBe(2);

    emptyDb.close();
  });

  it('impede duplicidade de seq por run_id na tabela trace_events (constraint uq_trace_run_seq)', () => {
    const insertEvent = db.prepare(`
      INSERT INTO trace_events (
        event_id, run_id, task_id, seq, phase, event_type, correlation_id,
        operational_payload_json, redacted_payload_json, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertEvent.run(
      'evt_1',
      'run_001',
      'task_001',
      1,
      'PLAN',
      'TASK_ACCEPTED',
      'corr_01',
      '{}',
      '{}',
      new Date().toISOString()
    );

    // Tentativa de inserir mesmo seq no mesmo run_id deve falhar
    expect(() => {
      insertEvent.run(
        'evt_2',
        'run_001',
        'task_001',
        1, // Duplicado!
        'PLAN',
        'PLAN_CREATED',
        'corr_01',
        '{}',
        '{}',
        new Date().toISOString()
      );
    }).toThrow(/UNIQUE constraint failed/i);
  });

  it('impede duplicidade de transaction_id na tabela commits', () => {
    // 1. Inserir artefato primeiro para respeitar foreign key
    db.prepare(
      `
      INSERT INTO artifacts (
        artifact_id, task_id, run_id, type, version, claims_json,
        evidence_refs_json, operational_payload_json, redacted_payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      'art_123456789012',
      'task_001',
      'run_001',
      'INSIGHT',
      1,
      '[]',
      '[]',
      '{}',
      '{}',
      new Date().toISOString()
    );

    const insertCommit = db.prepare(`
      INSERT INTO commits (
        commit_id, transaction_id, task_id, run_id, artifact_id, policy_ref,
        evidence_refs_json, state_hash, committed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertCommit.run(
      'cmt_01',
      'txn_tx1234567890',
      'task_001',
      'run_001',
      'art_123456789012',
      'pol_ref_01',
      '[]',
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      new Date().toISOString()
    );

    // Tentativa de duplicar transaction_id deve falhar
    expect(() => {
      insertCommit.run(
        'cmt_02',
        'txn_tx1234567890', // Mesmo transaction_id!
        'task_001',
        'run_001',
        'art_123456789012',
        'pol_ref_02',
        '[]',
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        new Date().toISOString()
      );
    }).toThrow(/UNIQUE constraint failed/i);
  });

  it('impede duplicidade de (task_id, type, version) na tabela artifacts (constraint uq_artifact_task_type_version)', () => {
    const insertArtifact = db.prepare(`
      INSERT INTO artifacts (
        artifact_id, task_id, run_id, type, version, claims_json,
        evidence_refs_json, operational_payload_json, redacted_payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertArtifact.run(
      'art_v1_00000001',
      'task_creative_audit',
      'run_001',
      'INSIGHT',
      1,
      '[]',
      '[]',
      '{}',
      '{}',
      new Date().toISOString()
    );

    // Mesma task, mesmo type e mesma version deve falhar
    expect(() => {
      insertArtifact.run(
        'art_v1_00000002',
        'task_creative_audit',
        'run_001',
        'INSIGHT',
        1, // Mesma versão!
        '[]',
        '[]',
        '{}',
        '{}',
        new Date().toISOString()
      );
    }).toThrow(/UNIQUE constraint failed/i);

    // Versão 2 na mesma task deve ser aceita normalmente
    expect(() => {
      insertArtifact.run(
        'art_v2_00000003',
        'task_creative_audit',
        'run_001',
        'INSIGHT',
        2, // Nova versão
        '[]',
        '[]',
        '{}',
        '{}',
        new Date().toISOString()
      );
    }).not.toThrow();
  });

  it('suporta transações ACID com rollback automático em caso de exceção', () => {
    const insertRun = db.prepare(`
      INSERT INTO runs (run_id, task_id, client_id, mode, status, started_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    try {
      db.transaction(() => {
        insertRun.run(
          'run_atomic_01',
          'task_001',
          'cli_housewhey',
          'GOVERNED_PEVC',
          'PLANNING',
          new Date().toISOString()
        );
        // Simulação de falha
        throw new Error('Falha simulada dentro da transação');
      });
    } catch {
      // Ignora erro intencional
    }

    const row = db.prepare('SELECT * FROM runs WHERE run_id = ?').get('run_atomic_01');
    expect(row).toBeUndefined(); // Rollback executado com sucesso!
  });

  it('permite persistir e consultar entidades do Supercérebro (nodes, edges, timeline_events)', () => {
    // Inserir Nós
    const insertNode = db.prepare(`
      INSERT INTO nodes (node_id, client_id, type, label, properties_json, source, locator, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertNode.run(
      'node_hub_01',
      'cli_housewhey',
      'hub',
      'House Whey Hub',
      '{"segment":"suplementos"}',
      'supercerebro_graph',
      'graph:node:hub_01',
      new Date().toISOString()
    );
    insertNode.run(
      'node_person_01',
      'cli_housewhey',
      'person',
      'Renato Barbieri',
      '{"role":"Owner"}',
      'supercerebro_graph',
      'graph:node:person_01',
      new Date().toISOString()
    );

    // Inserir Aresta
    db.prepare(
      `
      INSERT INTO edges (edge_id, client_id, source_node_id, target_node_id, relationship, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    ).run(
      'edge_01',
      'cli_housewhey',
      'node_person_01',
      'node_hub_01',
      'OWNS',
      new Date().toISOString()
    );

    // Inserir Evento na Timeline
    db.prepare(
      `
      INSERT INTO timeline_events (event_id, client_id, occurred_at, title, summary, source, locator, captured_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      'evt_time_01',
      'cli_housewhey',
      '2026-08-10T10:00:00Z',
      'Alinhamento Estratégico',
      'Definição de CPA meta R$ 85',
      'supercerebro_timeline',
      'timeline:evt_01',
      new Date().toISOString()
    );

    const nodes = db.prepare('SELECT * FROM nodes WHERE client_id = ?').all('cli_housewhey');
    const edges = db.prepare('SELECT * FROM edges WHERE client_id = ?').all('cli_housewhey');
    const events = db
      .prepare('SELECT * FROM timeline_events WHERE client_id = ?')
      .all('cli_housewhey');

    expect(nodes.length).toBe(2);
    expect(edges.length).toBe(1);
    expect(events.length).toBe(1);
  });
});
