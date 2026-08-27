import { describe, expect, it } from 'vitest';
import {
  ALLOWED_DATASETS,
  ALLOWED_MODELS,
  CANONICAL_SCENARIOS,
  getCanonicalScenario,
  listCanonicalScenarios
} from './canonical-scenarios.js';
import { handleApiRequest } from './api.js';
import { renderHtmlShell } from './ui-shell.js';

describe('M6-02: Controles de Execução', () => {
  describe('Allowlist de Cenários Canônicos (S0–S5)', () => {
    it('deve disponibilizar exatamente os cenários S0, S1, S2, S3, S4 e S5', () => {
      const scenarios = listCanonicalScenarios();
      const ids = scenarios.map((s) => s.id);

      expect(ids).toEqual(['S0', 'S1', 'S2', 'S3', 'S4', 'S5']);
      expect(scenarios).toHaveLength(6);
    });

    it('cada cenário canônico deve conter um TaskContract válido e determinístico', () => {
      for (const [id, scenario] of Object.entries(CANONICAL_SCENARIOS)) {
        expect(scenario.id).toBe(id);
        expect(scenario.contract).toBeDefined();
        expect(scenario.contract.taskId).toBeDefined();
        expect(scenario.contract.clientId).toBe('cli_housewhey');
        expect(scenario.contract.timeframe.since).toBeDefined();
        expect(scenario.contract.timeframe.until).toBeDefined();
        expect(scenario.contract.effects.allowed.length).toBeGreaterThan(0);
        expect(scenario.contract.budgets.maxSteps).toBeGreaterThan(0);
      }
    });

    it('getCanonicalScenario deve retornar o cenário por ID (case-insensitive) ou undefined se inexistente', () => {
      expect(getCanonicalScenario('S0')?.name).toContain('S0');
      expect(getCanonicalScenario('s5')?.name).toContain('S5');
      expect(getCanonicalScenario('S99_INVALID')).toBeUndefined();
    });
  });

  describe('Modelos e Datasets Permitidos', () => {
    it('deve listar modelos permitidos com Google Gemini Flash como default', () => {
      expect(ALLOWED_MODELS.length).toBeGreaterThanOrEqual(4);
      const geminiModel = ALLOWED_MODELS.find((m) => m.id === 'google/gemini-2.5-flash');
      expect(geminiModel).toBeDefined();
      expect(geminiModel?.default).toBe(true);

      const gptModel = ALLOWED_MODELS.find((m) => m.id === 'openai/gpt-4o-mini');
      expect(gptModel).toBeDefined();
    });

    it('deve listar o dataset sintético canônico de Housewhey', () => {
      expect(ALLOWED_DATASETS).toHaveLength(1);
      expect(ALLOWED_DATASETS[0]?.id).toBe('housewhey-canonical-v1');
    });
  });

  describe('Endpoints da API de Controles', () => {
    it('GET /api/scenarios deve retornar a lista completa de cenários canônicos', async () => {
      const res = await handleApiRequest({
        method: 'GET',
        path: '/api/scenarios'
      });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect((res.body as any[]).length).toBe(6);
    });

    it('GET /api/scenarios/:id deve retornar o cenário específico com seu TaskContract', async () => {
      const res = await handleApiRequest({
        method: 'GET',
        path: '/api/scenarios/S0'
      });

      expect(res.status).toBe(200);
      const scenario = res.body as any;
      expect(scenario.id).toBe('S0');
      expect(scenario.contract.taskId).toBe('task_s0_housewhey_analysis');
    });

    it('GET /api/scenarios/:id para ID desconhecido deve retornar 404', async () => {
      const res = await handleApiRequest({
        method: 'GET',
        path: '/api/scenarios/unknown_scenario'
      });

      expect(res.status).toBe(404);
      expect((res.body as any).error).toBe('Not Found');
    });

    it('GET /api/models deve retornar a lista de modelos permitidos', async () => {
      const res = await handleApiRequest({
        method: 'GET',
        path: '/api/models'
      });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect((res.body as any[]).length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Interface e Controles no UI Shell', () => {
    it('HTML Shell deve conter todos os seletores e controles de execução', () => {
      const html = renderHtmlShell();

      // Controles principais e auto-seleção inteligente
      expect(html).toContain('autoDetectModelFromKey');
      expect(html).toContain('google/gemini-2.5-flash');
      expect(html).toContain('anthropic/claude-3-5-sonnet');

      // Botão comparar e botão de envio
      expect(html).toContain('id="btn-compare"');
      expect(html).toContain('id="btn-chat-send"');

      // Botão voltar no chat
      expect(html).toContain('id="btn-chat-back"');

      // Barra de chave BYOK
      expect(html).toContain('id="key-bar"');
      expect(html).toContain('id="api-key-input"');
      expect(html).toContain('type="password"');
      expect(html).toContain('id="btn-forget-key"');
      expect(html).toContain('id="key-status-text"');
    });

    it('deve conter lógica client-side para validação, esquecimento de chave, reset de sessão e botão dinâmico de chat/nova conversa', () => {
      const html = renderHtmlShell();

      // Funções e listeners de controles
      expect(html).toContain('updateKeyUI');
      expect(html).toContain('validateExecution');
      expect(html).toContain('sessionStorage.getItem');
      expect(html).toContain('sessionStorage.removeItem');
      expect(html).toContain('btnForgetKey');
      expect(html).toContain('btnChatBack');
      expect(html).toContain('resetChatToMainScreen');
      expect(html).toContain('updateHeaderBackButton');
      expect(html).toContain('is-new-chat');
      expect(html).toContain('Nova Conversa');
      expect(html).toContain('Voltar ao Chat');
    });
  });
});
