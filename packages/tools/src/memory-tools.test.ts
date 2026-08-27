import { describe, expect, it } from 'vitest';
import { createMemoryTools } from './index.js';
import { createDatabase } from '@adzhub/data';

describe('Memory & Context Tools (M2-02)', () => {
  const { searchClientContextTool, getTimelineTool, searchConversationsTool } = createMemoryTools();

  describe('search_client_context', () => {
    it('retorna nós, arestas e provenance corretos para o cliente Housewhey', async () => {
      const result = await searchClientContextTool.execute({
        client_id: 'cli_housewhey',
        limit: 10
      });

      expect(result.ok).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.client_id).toBe('cli_housewhey');
      expect(result.data?.nodes.length).toBeGreaterThan(0);
      expect(result.data?.nodes.length).toBeLessThanOrEqual(10);

      // Checa formato de provenance
      const firstNode = result.data?.nodes[0];
      expect(firstNode?.provenance).toEqual({
        source: 'supercerebro_graph',
        locator: `graph:node:${firstNode?.id}`,
        capturedAt: expect.any(String)
      });

      // Checa presença do Mapa da Solução
      expect(result.data?.solution_map).toBeDefined();
      expect(result.data?.solution_map?.brand_name).toBe('Housewhey');
      expect(result.data?.solution_map?.provenance.source).toBe('app_mapa_solucao');
    });

    it('filtra nós por query textual (ex: "aline")', async () => {
      const result = await searchClientContextTool.execute({
        client_id: 'cli_housewhey',
        query: 'aline'
      });

      expect(result.ok).toBe(true);
      expect(result.data?.nodes.some((n) => n.id === 'p_aline')).toBe(true);
      expect(
        result.data?.nodes.every((n) => JSON.stringify(n).toLowerCase().includes('aline'))
      ).toBe(true);
    });

    it('filtra nós por tipos específicos (node_types)', async () => {
      const result = await searchClientContextTool.execute({
        client_id: 'cli_housewhey',
        node_types: ['person', 'campaign']
      });

      expect(result.ok).toBe(true);
      expect(result.data?.nodes.every((n) => n.type === 'person' || n.type === 'campaign')).toBe(
        true
      );
    });

    it('respeita o limite especificado sem retornar dump completo', async () => {
      const result = await searchClientContextTool.execute({
        client_id: 'cli_housewhey',
        limit: 3
      });

      expect(result.ok).toBe(true);
      expect(result.data?.nodes.length).toBe(3);
      expect(result.data?.total_matched).toBeGreaterThan(3);
    });

    it('rejeita tentativa de consulta cross-client ou cliente inexistente', async () => {
      const result = await searchClientContextTool.execute({
        client_id: 'cli_concorrente_invalido'
      });

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('TOOL_ERROR');
      expect(result.error).toContain("Cliente 'cli_concorrente_invalido' não encontrado");
    });
  });

  describe('get_timeline', () => {
    it('retorna a linha do tempo cronológica com provenance', async () => {
      const result = await getTimelineTool.execute({
        client_id: 'cli_housewhey',
        order: 'asc'
      });

      expect(result.ok).toBe(true);
      expect(result.data?.client_id).toBe('cli_housewhey');
      expect(result.data?.events.length).toBeGreaterThan(0);

      const firstEvent = result.data?.events[0];
      expect(firstEvent?.provenance).toEqual({
        source: 'supercerebro_timeline',
        locator: `timeline:event:${firstEvent?.event_id}`,
        capturedAt: expect.any(String)
      });
    });

    it('respeita filtros temporais de janela (since / until)', async () => {
      const since = '2026-08-05T00:00:00.000Z';
      const until = '2026-08-15T23:59:59.000Z';

      const result = await getTimelineTool.execute({
        client_id: 'cli_housewhey',
        since,
        until
      });

      expect(result.ok).toBe(true);
      expect(result.data?.events.length).toBeGreaterThan(0);

      for (const evt of result.data!.events) {
        const evtTime = new Date(evt.occurred_at).getTime();
        expect(evtTime).toBeGreaterThanOrEqual(new Date(since).getTime());
        expect(evtTime).toBeLessThanOrEqual(new Date(until).getTime());
      }
    });

    it('ordena eventos em ordem decrescente (desc)', async () => {
      const result = await getTimelineTool.execute({
        client_id: 'cli_housewhey',
        order: 'desc'
      });

      expect(result.ok).toBe(true);
      const events = result.data!.events;
      expect(events.length).toBeGreaterThan(1);

      for (let i = 1; i < events.length; i++) {
        const prev = new Date(events[i - 1]!.occurred_at).getTime();
        const curr = new Date(events[i]!.occurred_at).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });

    it('rejeita janela temporal invertida (since > until)', async () => {
      const result = await getTimelineTool.execute({
        client_id: 'cli_housewhey',
        since: '2026-08-20T00:00:00.000Z',
        until: '2026-08-01T00:00:00.000Z'
      });

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('TOOL_ERROR');
      expect(result.error).toContain('Janela temporal inválida');
    });

    it('rejeita tentativa de consulta cross-client na timeline', async () => {
      const result = await getTimelineTool.execute({
        client_id: 'cli_estranho'
      });

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('TOOL_ERROR');
      expect(result.error).toContain("Cliente 'cli_estranho' não encontrado");
    });
  });

  describe('search_conversations', () => {
    it('retorna mensagens de WhatsApp e atas com provenance', async () => {
      const result = await searchConversationsTool.execute({
        client_id: 'cli_housewhey',
        limit: 10
      });

      expect(result.ok).toBe(true);
      expect(result.data?.messages.length).toBeGreaterThan(0);

      const firstMsg = result.data?.messages[0];
      expect(firstMsg?.provenance.source).toBe('conversas');
      expect(firstMsg?.provenance.locator).toContain('conversas:');
    });

    it('filtra por query textual (ex: "namorados")', async () => {
      const result = await searchConversationsTool.execute({
        client_id: 'cli_housewhey',
        query: 'namorados'
      });

      expect(result.ok).toBe(true);
      expect(result.data?.messages.length).toBeGreaterThan(0);
      expect(
        result.data?.messages.every((m) =>
          (m.content + m.sender_or_title).toLowerCase().includes('namorados')
        )
      ).toBe(true);
    });

    it('filtra por canal whatsapp exclusivamente', async () => {
      const result = await searchConversationsTool.execute({
        client_id: 'cli_housewhey',
        channel: 'whatsapp'
      });

      expect(result.ok).toBe(true);
      expect(result.data?.messages.every((m) => m.channel === 'whatsapp')).toBe(true);
    });

    it('filtra por canal meeting_transcripts exclusivamente', async () => {
      const result = await searchConversationsTool.execute({
        client_id: 'cli_housewhey',
        channel: 'meeting_transcripts'
      });

      expect(result.ok).toBe(true);
      expect(result.data?.messages.every((m) => m.channel === 'meeting_transcripts')).toBe(true);
    });

    it('rejeita tentativa de consulta cross-client em conversas', async () => {
      const result = await searchConversationsTool.execute({
        client_id: 'cli_terceiro'
      });

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('TOOL_ERROR');
      expect(result.error).toContain("Cliente 'cli_terceiro' não possui conversas registradas");
    });
  });

  describe('stage_artifact', () => {
    it('estagia com sucesso um insight provisório com claims e evidências', async () => {
      const { stageArtifactTool } = createMemoryTools();
      const result = await stageArtifactTool.execute({
        taskId: 'task_creative_audit_001',
        runId: 'run_001',
        type: 'INSIGHT',
        version: 1,
        claims: [
          {
            claimId: 'clm_1',
            text: 'Anúncio ad_video_01 teve CPA de R$ 42,00',
            evidenceRefs: ['evi_meta_00000001']
          }
        ],
        evidenceRefs: ['evi_meta_00000001'],
        operationalPayload: { efficiency: 'HIGH' }
      });

      expect(result.ok).toBe(true);
      expect(result.data?.status).toBe('PROVISIONAL');
      expect(result.data?.artifactId).toMatch(/^art_[a-f0-9]+$/);
      expect(result.data?.isIdempotentReplay).toBe(false);
      expect(result.data?.claims.length).toBe(1);
    });

    it('rejeita tentativa de estagiar artefato sem claims fundamentadas', async () => {
      const { stageArtifactTool } = createMemoryTools();
      const result = await stageArtifactTool.execute({
        taskId: 'task_creative_audit_001',
        runId: 'run_001',
        type: 'INSIGHT',
        version: 1,
        claims: [], // Inválido: min(1)
        evidenceRefs: ['evi_meta_00000001']
      });

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('INVALID_SCHEMA');
    });
  });

  describe('commit_artifact', () => {
    it('efetiva commit do artefato estagiado com evidência verificada', async () => {
      const db = createDatabase(':memory:');
      const taskId = 'task_creative_audit_001';
      const runId = 'run_001';
      const evidenceId = 'evi_meta_00000001';

      // Setup dados prévios no SQLite compartilhado
      db.prepare(
        `
        INSERT INTO observations_staging (
          observation_id, tool_call_id, run_id, task_id, source, locator,
          schema_version, status, captured_at, payload_hash, payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        'obs_1',
        'tcall_1',
        runId,
        taskId,
        'meta_ads',
        'locator_1',
        '1.0.0',
        'VERIFIED',
        new Date().toISOString(),
        'hash',
        '{}'
      );

      db.prepare(
        `
        INSERT INTO evidence (
          evidence_id, observation_id, task_id, run_id, claim_locator,
          verification_score, verified_at, check_ids_json, status, evidence_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        evidenceId,
        'obs_1',
        taskId,
        runId,
        'locator_1',
        0.95,
        new Date().toISOString(),
        '[]',
        'VERIFIED',
        'hash'
      );

      const tools = createMemoryTools({ database: db });

      // 1. Estagiar
      const stageRes = await tools.stageArtifactTool.execute({
        taskId,
        runId,
        type: 'INSIGHT',
        version: 1,
        claims: [{ claimId: 'clm_1', text: 'CPA validado', evidenceRefs: [evidenceId] }],
        evidenceRefs: [evidenceId]
      });

      expect(stageRes.ok).toBe(true);
      const artifactId = stageRes.data!.artifactId;

      // 2. Commitar
      const commitRes = await tools.commitArtifactTool.execute({
        transactionId: 'txn_tool_001',
        taskId,
        runId,
        artifactId,
        policyRef: 'pol_ref_01'
      });

      expect(commitRes.ok).toBe(true);
      expect(commitRes.data?.artifact.status).toBe('COMMITTED');
      expect(commitRes.data?.commitId).toMatch(/^cmt_[a-f0-9]+$/);

      db.close();
    });
  });

  describe('OpenAI Function Schemas', () => {
    it('gera schemas de função válidos para OpenAI / OpenRouter para as cinco ferramentas de memória', () => {
      const {
        searchClientContextTool,
        getTimelineTool,
        searchConversationsTool,
        stageArtifactTool,
        commitArtifactTool
      } = createMemoryTools();

      const schemaContext = searchClientContextTool.toOpenAISchema();
      const schemaTimeline = getTimelineTool.toOpenAISchema();
      const schemaConversations = searchConversationsTool.toOpenAISchema();
      const schemaStage = stageArtifactTool.toOpenAISchema();
      const schemaCommit = commitArtifactTool.toOpenAISchema();

      expect(schemaContext.function.name).toBe('search_client_context');
      expect(schemaTimeline.function.name).toBe('get_timeline');
      expect(schemaConversations.function.name).toBe('search_conversations');
      expect(schemaStage.function.name).toBe('stage_artifact');
      expect(schemaCommit.function.name).toBe('commit_artifact');

      expect(schemaCommit.type).toBe('function');
      expect(schemaCommit.function.parameters).toBeDefined();
    });
  });

  describe('ÉPICO 6: Consulta do Traço de Execução (Task 6.1 — EXECUTION_TRACE_QUERY)', () => {
    const { queryExecutionTraceTool } = createMemoryTools();

    it('consulta o traço de execução e valida a integridade da cadeia de eventos', async () => {
      const result = await queryExecutionTraceTool.execute({
        run_id: 'run_m6_test_001',
        task_id: 'task_audit_001',
        limit: 10
      });

      expect(result.ok).toBe(true);
      expect(result.data?.run_id).toBe('run_m6_test_001');
      expect(result.data?.total_events).toBeGreaterThan(0);
      expect(result.data?.is_hash_chain_valid).toBe(true);
      expect(result.data?.governance_summary.commits_count).toBeGreaterThan(0);
      expect(result.data?.events.length).toBeGreaterThan(0);

      const firstEvent = result.data?.events[0];
      expect(firstEvent?.event_id).toBeDefined();
      expect(firstEvent?.event_hash).toHaveLength(64);
    });

    it('responde a consultas causais sobre bloqueios e evidências de governança', async () => {
      // Pergunta 1: Por que bloqueada?
      const blockQuery = await queryExecutionTraceTool.execute({
        run_id: 'run_m6_test_001',
        explanation_query: 'Por que essa ação foi bloqueada?'
      });

      expect(blockQuery.ok).toBe(true);
      expect(blockQuery.data?.governance_summary.causal_explanation).toBeDefined();

      // Pergunta 2: Quais evidências justificaram a pausa?
      const evidenceQuery = await queryExecutionTraceTool.execute({
        run_id: 'run_m6_test_001',
        explanation_query: 'Quais evidências justificaram essa pausa de criativo?'
      });

      expect(evidenceQuery.ok).toBe(true);
      expect(evidenceQuery.data?.governance_summary.causal_explanation).toContain('EvidenceRefs');
      expect(evidenceQuery.data?.governance_summary.causal_explanation).toContain('CPA elevado');
    });

    it('filtra eventos por fase do ciclo PEV-C (ex: VERIFY)', async () => {
      const result = await queryExecutionTraceTool.execute({
        run_id: 'run_m6_test_001',
        phase: 'VERIFY'
      });

      expect(result.ok).toBe(true);
      expect(result.data?.events.every((ev) => ev.phase === 'VERIFY')).toBe(true);
    });
  });
});

