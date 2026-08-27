import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import {
  createDatabase,
  AdzHubDatabase,
  ArtifactRepository,
  AtomicCommitEngine
} from '@adzhub/data';
import { BudgetLedger, AppendOnlyEventLog } from '@adzhub/runtime';
import { TaskBudgets } from '@adzhub/contracts';
import { QuarantineManager } from '@adzhub/verify';

describe('M7-02 — Property-Based Tests das Invariantes Fundamentais', () => {
  describe('Invariante 1: Nunca há commit sem EvidenceRefs válidas e verificadas (unverified_memory_writes == 0)', () => {
    let db: AdzHubDatabase;
    let repository: ArtifactRepository;
    let engine: AtomicCommitEngine;

    beforeEach(() => {
      db = createDatabase(':memory:');
      repository = new ArtifactRepository(db);
      engine = new AtomicCommitEngine(db);

      db.prepare(
        `
        INSERT INTO task_contracts (task_id, client_id, tenant_id, contract_hash, contract_json, created_at)
        VALUES ('task_pbt_01', 'client_pbt', 'tenant_pbt', 'hash_01', '{}', ?)
      `
      ).run(new Date().toISOString());

      db.prepare(
        `
        INSERT INTO runs (run_id, task_id, client_id, mode, status, started_at)
        VALUES ('run_pbt_01', 'task_pbt_01', 'client_pbt', 'GOVERNED_PEVC', 'EXECUTING', ?)
      `
      ).run(new Date().toISOString());
    });

    afterEach(() => {
      db.close();
    });

    it('rejeita commits para qualquer artefato sem evidências ou com evidências inexistentes', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 100 }),
          (claimText, index) => {
            const fakeRef = `evi_unverified_${index}`;

            // Estagia artefato com refs que NÃO existem na tabela `evidence`
            const staged = repository.stageArtifact({
              taskId: 'task_pbt_01',
              runId: 'run_pbt_01',
              type: 'INSIGHT',
              version: 1,
              claims: [
                { claimId: 'c_test', text: claimText, locator: 'loc_01', evidenceRefs: [fakeRef] }
              ],
              evidenceRefs: [fakeRef]
            });

            // Tentativa de commit deve SEMPRE ser rejeitada (ok: false, errorCode: 'COMMIT_REJECTED')
            const commitResult = engine.commitArtifact({
              transactionId: `txn_${Math.random()}`,
              taskId: 'task_pbt_01',
              runId: 'run_pbt_01',
              artifactId: staged.artifact.artifactId,
              policyRef: 'pol_pbt'
            });

            expect(commitResult.ok).toBe(false);
            expect(commitResult.errorCode).toBe('COMMIT_REJECTED');

            // Verifica que o artefato NUNCA foi promovido a COMMITTED
            const check = db
              .prepare('SELECT status FROM artifacts WHERE artifact_id = ?')
              .get(staged.artifact.artifactId) as { status: string };
            expect(check.status).not.toBe('COMMITTED');
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Invariante 2: Sequência de eventos do Event Log é estritamente monotônica e única', () => {
    it('para qualquer sequência gerada, seq é 1, 2, 3... N sem duplicações nem gaps', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              eventType: fc.constantFrom(
                'TOOL_CALL_STARTED',
                'OBSERVATION_STAGED',
                'VERIFICATION_STARTED',
                'POLICY_EVALUATED'
              ),
              phase: fc.constantFrom('PLAN', 'EXECUTE', 'VERIFY', 'COMMIT')
            }),
            { minLength: 1, maxLength: 40 }
          ),
          (eventSpecs) => {
            const eventLog = new AppendOnlyEventLog();
            const runId = `run_seq_${Math.random()}`;

            for (const spec of eventSpecs) {
              eventLog.append({
                taskId: 'task_seq',
                runId,
                correlationId: 'corr_seq',
                eventType: spec.eventType,
                phase: spec.phase as any
              });
            }

            const events = eventLog.getEvents(runId);
            expect(events.length).toBe(eventSpecs.length);

            // Monotonicidade estrita: seq[i] === i + 1
            for (let i = 0; i < events.length; i++) {
              expect(events[i].seq).toBe(i + 1);
            }

            // Unicidade de eventId e de seq
            const seqSet = new Set(events.map((e) => e.seq));
            const idSet = new Set(events.map((e) => e.eventId));
            expect(seqSet.size).toBe(events.length);
            expect(idSet.size).toBe(events.length);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Invariante 3: Chave de idempotência e unicidade de versão impedem efeitos duplicados', () => {
    let db: AdzHubDatabase;
    let repository: ArtifactRepository;

    beforeEach(() => {
      db = createDatabase(':memory:');
      repository = new ArtifactRepository(db);

      db.prepare(
        `
        INSERT INTO task_contracts (task_id, client_id, tenant_id, contract_hash, contract_json, created_at)
        VALUES ('task_idemp', 'client_idemp', 'tenant_idemp', 'hash_idemp', '{}', ?)
      `
      ).run(new Date().toISOString());

      db.prepare(
        `
        INSERT INTO runs (run_id, task_id, client_id, mode, status, started_at)
        VALUES ('run_idemp', 'task_idemp', 'client_idemp', 'GOVERNED_PEVC', 'EXECUTING', ?)
      `
      ).run(new Date().toISOString());
    });

    afterEach(() => {
      db.close();
    });

    it('múltiplas chamadas de staging com mesma tupla (taskId, type, version) retornam o mesmo artifactId sem duplicar', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 2, max: 8 }),
          (version, repetitions) => {
            const results = [];
            for (let i = 0; i < repetitions; i++) {
              const res = repository.stageArtifact({
                taskId: 'task_idemp',
                runId: 'run_idemp',
                type: 'INSIGHT',
                version,
                claims: [
                  {
                    claimId: 'c1',
                    text: 'Idempotent claim',
                    locator: 'loc_01',
                    evidenceRefs: ['evi_test_01']
                  }
                ],
                evidenceRefs: ['evi_test_01']
              });
              results.push(res);
            }

            // Todos os resultados apontam para o mesmo artifactId
            const firstId = results[0].artifact.artifactId;
            for (const r of results) {
              expect(r.artifact.artifactId).toBe(firstId);
            }

            // Apenas 1 registro existe no banco para este (taskId, type, version)
            const count = db
              .prepare(
                'SELECT COUNT(*) as c FROM artifacts WHERE task_id = ? AND type = ? AND version = ?'
              )
              .get('task_idemp', 'INSIGHT', version) as { c: number };
            expect(count.c).toBe(1);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Invariante 4: Budget disponível nunca fica negativo sob qualquer sequência de débitos', () => {
    it('para qualquer fluxo de reservas e reconciliações, remaining >= 0', () => {
      fc.assert(
        fc.property(
          fc.record({
            maxTokens: fc.integer({ min: 100, max: 10000 }),
            maxCostCents: fc.integer({ min: 10, max: 5000 })
          }),
          fc.array(
            fc.record({
              tokens: fc.integer({ min: 1, max: 3000 }),
              costCents: fc.integer({ min: 1, max: 1000 })
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (limits, requests) => {
            const budgets: TaskBudgets = {
              maxSteps: 100,
              maxToolCalls: 100,
              maxTokens: limits.maxTokens,
              maxCostBrl: limits.maxCostCents / 100,
              timeoutMs: 30000
            };

            const ledger = new BudgetLedger(budgets);

            for (let i = 0; i < requests.length; i++) {
              const req = requests[i];
              const costBrl = req.costCents / 100;
              try {
                ledger.reserve(`res_${i}`, { tokens: req.tokens, costBrl });
                ledger.reconcile(`res_${i}`, { tokens: req.tokens, costBrl });
              } catch {
                // BudgetExceededError esperado quando estoura o limite
              }

              const metrics = ledger.getMetrics();
              expect(metrics.available.tokens).toBeGreaterThanOrEqual(0);
              expect(metrics.available.costBrl).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Invariante 5: Artefato em quarentena ou expirado NUNCA pode se tornar COMMITTED', () => {
    let db: AdzHubDatabase;
    let repository: ArtifactRepository;
    let engine: AtomicCommitEngine;
    let quarantine: QuarantineManager;

    beforeEach(() => {
      db = createDatabase(':memory:');
      repository = new ArtifactRepository(db);
      engine = new AtomicCommitEngine(db);
      quarantine = new QuarantineManager();

      db.prepare(
        `
        INSERT INTO task_contracts (task_id, client_id, tenant_id, contract_hash, contract_json, created_at)
        VALUES ('task_quar', 'client_quar', 'tenant_quar', 'hash_quar', '{}', ?)
      `
      ).run(new Date().toISOString());

      db.prepare(
        `
        INSERT INTO runs (run_id, task_id, client_id, mode, status, started_at)
        VALUES ('run_quar', 'task_quar', 'client_quar', 'GOVERNED_PEVC', 'EXECUTING', ?)
      `
      ).run(new Date().toISOString());
    });

    afterEach(() => {
      db.close();
    });

    it('artefatos em quarentena falham no commit atômico e permanecem fora da memória definitiva', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'LOW_COVERAGE',
            'SCHEMA_VIOLATION',
            'UNRESOLVED_CONFLICT',
            'PERIOD_MISMATCH',
            'SUSPECTED_INJECTION'
          ),
          fc.integer({ min: 1, max: 3600 }),
          (reasonCode, ttlSeconds) => {
            const staged = repository.stageArtifact({
              taskId: 'task_quar',
              runId: 'run_quar',
              type: 'INSIGHT',
              version: 1,
              claims: [
                {
                  claimId: 'c1',
                  text: 'Quarantined insight',
                  locator: 'loc_01',
                  evidenceRefs: ['evi_quar_01']
                }
              ],
              evidenceRefs: ['evi_quar_01']
            });

            // Atualiza no banco para QUARANTINED
            db.prepare('UPDATE artifacts SET status = ? WHERE artifact_id = ?').run(
              'QUARANTINED',
              staged.artifact.artifactId
            );

            quarantine.admit({
              taskId: 'task_quar',
              runId: 'run_quar',
              sourceId: staged.artifact.artifactId,
              reasonCode: reasonCode as any,
              reasonDetails: 'Detecção de irregularidade pelo Verify',
              ttlSeconds,
              requiredResolution: 'Manual verification or refresh'
            });

            // Tentativa de commit deve ser REJEITADA
            const commitResult = engine.commitArtifact({
              transactionId: `txn_quar_${Math.random()}`,
              taskId: 'task_quar',
              runId: 'run_quar',
              artifactId: staged.artifact.artifactId,
              policyRef: 'pol_quar'
            });

            expect(commitResult.ok).toBe(false);
            expect(commitResult.errorCode).toBe('COMMIT_REJECTED');

            // Status no banco continua NÃO-COMMITTED
            const check = db
              .prepare('SELECT status FROM artifacts WHERE artifact_id = ?')
              .get(staged.artifact.artifactId) as { status: string };
            expect(check.status).not.toBe('COMMITTED');
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
