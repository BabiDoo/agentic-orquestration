import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SupercerebroTraversalEngine } from './supercerebro-traversal.js';
import { AdzHubDatabase, createDatabase } from './sqlite-database.js';

describe('@adzhub/data - M5-08 Traversal limitado do Supercérebro', () => {
  let db: AdzHubDatabase;
  let engine: SupercerebroTraversalEngine;

  beforeEach(() => {
    db = createDatabase(':memory:');
    engine = new SupercerebroTraversalEngine(db);
  });

  afterEach(() => {
    db.close();
  });

  it('restringe estritamente a consulta por client_id e preserva provenance', () => {
    const result = engine.traverse({
      clientId: 'cli_housewhey',
      limit: 10
    });

    expect(result.clientId).toBe('cli_housewhey');
    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.nodes.length).toBeLessThanOrEqual(10);

    // Todos os nós devem ter provenance com locator e timestamp
    for (const node of result.nodes) {
      expect(node.provenance.source).toBe('supercerebro_graph');
      expect(node.provenance.locator).toBe(`graph:node:${node.id}`);
      expect(node.provenance.capturedAt).toBeDefined();
    }

    // Consulta para outro cliente não deve vazar dados da Housewhey
    const otherResult = engine.traverse({
      clientId: 'cli_other_client'
    });
    expect(otherResult.nodes.length).toBe(0);
    expect(otherResult.edges.length).toBe(0);
    expect(otherResult.events.length).toBe(0);
  });

  it('filtra nós por tipos específicos (nodeTypes) e query textual', () => {
    // Filtro por tipo
    const personNodes = engine.traverse({
      clientId: 'cli_housewhey',
      nodeTypes: ['person']
    });

    expect(personNodes.nodes.length).toBeGreaterThan(0);
    expect(personNodes.nodes.every((n) => n.type === 'person')).toBe(true);

    // Filtro por busca textual
    const queryResult = engine.traverse({
      clientId: 'cli_housewhey',
      query: 'Aline'
    });

    expect(queryResult.nodes.some((n) => n.id === 'p_aline')).toBe(true);
    expect(queryResult.nodes.every((n) => JSON.stringify(n).toLowerCase().includes('aline'))).toBe(
      true
    );
  });

  it('filtra eventos da timeline por janela temporal (since/until)', () => {
    const timeResult = engine.traverse({
      clientId: 'cli_housewhey',
      since: '2026-08-10T00:00:00.000Z',
      until: '2026-08-20T23:59:59.000Z'
    });

    expect(timeResult.events.length).toBeGreaterThan(0);
    for (const evt of timeResult.events) {
      const evtMs = new Date(evt.occurredAt).getTime();
      expect(evtMs).toBeGreaterThanOrEqual(new Date('2026-08-10T00:00:00.000Z').getTime());
      expect(evtMs).toBeLessThanOrEqual(new Date('2026-08-20T23:59:59.000Z').getTime());
      expect(evt.provenance.source).toBe('supercerebro_timeline');
    }
  });

  it('não carrega grafo integral por padrão (bounded traversal com limite e saltos)', () => {
    const limited = engine.traverse({
      clientId: 'cli_housewhey',
      limit: 3,
      maxHops: 1
    });

    expect(limited.nodes.length).toBeLessThanOrEqual(3);
    expect(limited.isTruncated).toBe(true);
  });
});
