import { describe, expect, it } from 'vitest';
import { MockModelAdapter } from '@adzhub/runtime';
import { RunsService } from './runs-service.js';
import { getCanonicalScenario } from './canonical-scenarios.js';
import { handleApiRequest } from './api.js';
import { renderHtmlShell } from './ui-shell.js';

describe('M6-04: Trajectory Viewer', () => {
  const runsService = new RunsService();

  it('deve registrar e emitir fases, eventos, duração, tokens, tool e policy com seq monotônico', async () => {
    const scenarioS0 = getCanonicalScenario('S0')!;
    const record = await runsService.startRun({
      taskContract: scenarioS0.contract,
      mode: 'GOVERNED_PEVC',
      mockAdapter: new MockModelAdapter()
    });

    expect(record.events.length).toBeGreaterThanOrEqual(6);

    // Verifica monotonicidade do seq
    let prevSeq = 0;
    for (const evt of record.events) {
      expect(evt.seq).toBeGreaterThan(prevSeq);
      expect(evt.eventId).toBe(`evt_${record.runId}_${evt.seq}`);
      expect(evt.timestamp).toBeDefined();
      prevSeq = evt.seq;
    }

    // Verifica presença de eventos com tool, tokens, duration e policy
    const stepEvents = record.events.filter((e) => e.type === 'STEP_COMPLETED');
    expect(stepEvents.length).toBeGreaterThan(0);
    for (const s of stepEvents) {
      expect(s.payload.tool).toBeDefined();
      expect(s.payload.policy).toBe('ALLOW');
      expect(s.payload.durationMs).toBeGreaterThan(0);
      expect(s.payload.tokens).toBeGreaterThan(0);
    }
  });

  it('deve evidenciar fork/join, VERIFY e COMMIT no caminho feliz (S0)', async () => {
    const scenarioS0 = getCanonicalScenario('S0')!;
    const record = await runsService.startRun({
      taskContract: scenarioS0.contract,
      mode: 'GOVERNED_PEVC',
      mockAdapter: new MockModelAdapter()
    });

    const types = record.events.map((e) => e.type);
    const phases = record.events
      .filter((e) => e.type === 'PHASE_TRANSITION')
      .map((e) => e.payload.phase || e.payload.to);

    expect(types).toContain('RUN_STARTED');
    expect(types).toContain('PHASE_TRANSITION');
    expect(types).toContain('STEP_COMPLETED');
    expect(types).toContain('EVIDENCE_SCORED');
    expect(types).toContain('ARTIFACT_COMMITTED');
    expect(types).toContain('RUN_COMPLETED');

    expect(phases).toContain('PLAN');
    expect(phases).toContain('FORK_JOIN');
    expect(phases).toContain('VERIFY');
    expect(phases).toContain('COMMIT');
  });

  it('deve evidenciar ATTRIBUTE e REPLAN no cenário de indisponibilidade de CRM (S1)', async () => {
    const scenarioS1 = getCanonicalScenario('S1')!;
    const record = await runsService.startRun({
      taskContract: scenarioS1.contract,
      mode: 'GOVERNED_PEVC',
      mockAdapter: new MockModelAdapter()
    });

    const phases = record.events
      .filter((e) => e.type === 'PHASE_TRANSITION')
      .map((e) => e.payload.phase || e.payload.to);

    expect(phases).toContain('ATTRIBUTE');
    expect(phases).toContain('REPLAN');
  });

  it('GET /api/runs/:id/events deve retornar eventos ordenados por seq monotônico para SSE', async () => {
    const scenarioS0 = getCanonicalScenario('S0')!;
    const record = await runsService.startRun({
      taskContract: scenarioS0.contract,
      mode: 'GOVERNED_PEVC',
      mockAdapter: new MockModelAdapter()
    });

    const res = await handleApiRequest({
      method: 'GET',
      path: `/api/runs/${record.runId}/events`,
      runsService
    });

    expect(res.status).toBe(200);
    const body = res.body as any;
    expect(body.runId).toBe(record.runId);
    expect(Array.isArray(body.events)).toBe(true);
    expect(body.events.length).toBe(record.events.length);

    // Ordem preservada
    for (let i = 0; i < body.events.length; i++) {
      expect(body.events[i].seq).toBe(i + 1);
    }
  });

  it('HTML Shell deve conter estrutura acessível para a Trajetória com suporte a navegação por teclado e Inspector', () => {
    const html = renderHtmlShell();

    // Container de trajetória acessível
    expect(html).toContain('id="pane-trajectory"');
    expect(html).toContain('id="trajectory-list"');
    expect(html).toContain('role="listbox"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('id="trajectory-metrics"');

    // Classes de badge de fases
    expect(html).toContain('badge-phase-fork');
    expect(html).toContain('badge-phase-attribute');
    expect(html).toContain('badge-phase-replan');
    expect(html).toContain('badge-phase-verify');
    expect(html).toContain('badge-phase-commit');

    // Lógica client-side para nós, teclado e inspector
    expect(html).toContain('appendTrajectoryNode');
    expect(html).toContain('selectTrajectoryNode');
    expect(html).toContain('inspectItem');
    expect(html).toContain('ArrowDown');
    expect(html).toContain('ArrowUp');
    expect(html).toContain('Home');
    expect(html).toContain('End');
    expect(html).toContain('Enter');
  });
});
