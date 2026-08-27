import { createRequire } from 'node:module';
import { MIGRATIONS, Migration } from './sqlite-schema.js';

const require = createRequire(import.meta.url);

/**
 * Interface para Prepared Statements do SQLite.
 */
export interface SQLitePreparedStatement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  all(...params: unknown[]): Record<string, unknown>[];
  get(...params: unknown[]): Record<string, unknown> | undefined;
}

/**
 * Interface nativa do SQLite DatabaseSync.
 */
export interface RawSQLiteDatabase {
  exec(sql: string): void;
  prepare(sql: string): SQLitePreparedStatement;
  close(): void;
}

/**
 * Encapsulamento de banco de dados SQLite para o Microkernel PEV-C e Supercérebro MVP.
 */
export class AdzHubDatabase {
  private rawDb: RawSQLiteDatabase;
  public readonly location: string;

  constructor(location: string = ':memory:') {
    this.location = location;
    try {
      const sqliteModule = require('node:sqlite');
      this.rawDb = new sqliteModule.DatabaseSync(location);
    } catch (err: unknown) {
      throw new Error(
        `Falha ao inicializar o banco de dados SQLite local (${location}): ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * Executa comandos SQL diretos.
   */
  public exec(sql: string): void {
    this.rawDb.exec(sql);
  }

  /**
   * Prepara um statement SQL parametrizado contra injeções.
   */
  public prepare(sql: string): SQLitePreparedStatement {
    return this.rawDb.prepare(sql);
  }

  /**
   * Executa uma função dentro de uma transação ACID atômica com rollback automático em falhas.
   */
  public transaction<T>(callback: () => T): T {
    this.exec('BEGIN IMMEDIATE');
    try {
      const result = callback();
      this.exec('COMMIT');
      return result;
    } catch (err) {
      try {
        this.exec('ROLLBACK');
      } catch {
        // Ignora erro secundário de rollback se a conexão foi fechada
      }
      throw err;
    }
  }

  /**
   * Aplica migrations de forma idempotente e versionada.
   */
  public applyMigrations(customMigrations: Migration[] = MIGRATIONS): {
    appliedCount: number;
    currentVersion: number;
  } {
    // 1. Garante que a tabela de migrations existe
    this.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);

    // 2. Consulta versões já aplicadas
    const appliedRows = this.prepare(
      'SELECT version FROM schema_migrations ORDER BY version ASC'
    ).all() as {
      version: number;
    }[];
    const appliedVersions = new Set<number>(appliedRows.map((r) => r.version));

    let appliedCount = 0;
    const sorted = [...customMigrations].sort((a, b) => a.version - b.version);

    for (const migration of sorted) {
      if (!appliedVersions.has(migration.version)) {
        this.transaction(() => {
          this.exec(migration.up);
          const insertStmt = this.prepare(
            'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)'
          );
          insertStmt.run(migration.version, migration.name, new Date().toISOString());
        });
        appliedCount++;
      }
    }

    const latestRow = this.prepare(
      'SELECT MAX(version) as currentVersion FROM schema_migrations'
    ).get() as { currentVersion: number | null } | undefined;
    const currentVersion = latestRow?.currentVersion ?? 0;

    return { appliedCount, currentVersion };
  }

  /**
   * Retorna a lista de todas as tabelas criadas no banco de dados.
   */
  public getTableNames(): string[] {
    const rows = this.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC"
    ).all() as { name: string }[];
    return rows.map((r) => r.name);
  }

  /**
   * Fecha a conexão com o banco de dados.
   */
  public close(): void {
    this.rawDb.close();
  }
}

/**
 * Factory para instanciar e inicializar o banco já com migrations aplicadas.
 */
export function createDatabase(location: string = ':memory:'): AdzHubDatabase {
  const db = new AdzHubDatabase(location);
  db.applyMigrations();
  return db;
}
