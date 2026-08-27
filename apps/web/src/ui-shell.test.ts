import { describe, expect, it } from 'vitest';
import { handleApiRequest, handleFetchRequest } from './api.js';
import { renderHtmlShell } from './ui-shell.js';

describe('M6-01: UI Shell Responsivo Estilo Cursor', () => {
  it('renderHtmlShell deve gerar documento HTML5 válido com elementos estruturais do Cursor', () => {
    const html = renderHtmlShell();

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="pt-BR">');
    expect(html).toContain(
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
    );

    // 1. Topo & Controles
    expect(html).toContain('id="top-bar"');
    expect(html).toContain('AdzHub Harness');
    expect(html).toContain('id="chat-empty-state"');
    expect(html).toContain('PRONTO PARA O SEU TURNO');
    expect(html).toContain('window.applyQuickPrompt');
    expect(html).toContain('id="btn-compare"');
    expect(html).toContain('id="btn-reset"');
    expect(html).toContain('id="btn-chat-back"');

    // 2. Chat & Contrato
    expect(html).toContain('id="pane-chat"');
    expect(html).toContain('id="chat-messages-container"');
    expect(html).toContain('id="task-goal-input"');
    expect(html).toContain('id="chat-status-badge"');
    expect(html).toContain('id="chat-result-container"');

    // 3. Trajectory Viewer
    expect(html).toContain('id="pane-trajectory"');
    expect(html).toContain('id="trajectory-list"');
    expect(html).toContain('id="trajectory-metrics"');

    // 4. Inspector de Auditoria
    expect(html).toContain('id="pane-inspector"');
    expect(html).toContain('id="inspector-payload"');
    expect(html).toContain('id="inspector-title"');
  });

  it('deve conter estados explícitos de loading, erro, vazio e bloqueio sem optimistic truth', () => {
    const html = renderHtmlShell();

    // Estados vazios
    expect(html).toContain('id="chat-empty-state"');
    expect(html).toContain('id="trajectory-empty-state"');
    expect(html).toContain('id="inspector-empty-state"');

    // Estado loading com spinner
    expect(html).toContain('id="chat-loading-state"');
    expect(html).toContain('class="spinner"');

    // Estado de erro explícito
    expect(html).toContain('id="chat-error-state"');
    expect(html).toContain('id="chat-error-message"');

    // Estado bloqueado por política (S5)
    expect(html).toContain('id="chat-blocked-state"');
    expect(html).toContain('id="chat-blocked-message"');
    expect(html).toContain('🔒 Ação Bloqueada por Política');

    // Badges inequívocos
    expect(html).toContain('badge-provisional');
    expect(html).toContain('badge-verifying');
    expect(html).toContain('badge-committed');
    expect(html).toContain('badge-quarantined');
    expect(html).toContain('badge-blocked');
    expect(html).toContain('badge-failed');
  });

  it('deve suportar responsividade desktop (grid 3 colunas) e mobile (abas e breakpoint)', () => {
    const html = renderHtmlShell();

    // Grid no desktop
    expect(html).toContain('grid-template-columns:');
    expect(html).toContain('1fr');

    // Breakpoint mobile e navegação de abas
    expect(html).toContain('@media (max-width: 900px)');
    expect(html).toContain('id="mobile-nav"');
    expect(html).toContain('id="tab-chat"');
    expect(html).toContain('id="tab-trajectory"');
    expect(html).toContain('id="tab-inspector"');
    expect(html).toContain('prefers-reduced-motion');
  });

  it('não deve conter formulário de autenticação de usuário nem coleta de dados desnecessária', () => {
    const html = renderHtmlShell();

    expect(html.toLowerCase()).not.toContain('form action="/login');
    expect(html.toLowerCase()).not.toContain('sign in');
    expect(html.toLowerCase()).not.toContain('create account');
    expect(html.toLowerCase()).not.toContain('google-analytics');
    expect(html.toLowerCase()).not.toContain('cookie');
  });

  it('handleApiRequest deve servir GET / e GET /index.html com status 200 e text/html', async () => {
    const resRoot = await handleApiRequest({
      method: 'GET',
      path: '/'
    });

    expect(resRoot.status).toBe(200);
    expect(resRoot.headers['Content-Type']).toContain('text/html');
    expect(typeof resRoot.body).toBe('string');
    expect(resRoot.body as string).toContain('AdzHub Harness');

    const resIndex = await handleApiRequest({
      method: 'GET',
      path: '/index.html'
    });

    expect(resIndex.status).toBe(200);
    expect(resIndex.headers['Content-Type']).toContain('text/html');
  });

  it('handleFetchRequest deve retornar Response HTTP válido com HTML para GET /', async () => {
    const req = new Request('http://localhost:3000/', { method: 'GET' });
    const response = await handleFetchRequest(req);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/html');
    const text = await response.text();
    expect(text).toContain('<!DOCTYPE html>');
    expect(text).toContain('AdzHub Harness');
  });

  it('deve conter o menu dropdown no header com todos os 4 perfis de operadores do Supercérebro', () => {
    const html = renderHtmlShell();

    expect(html).toContain('id="operator-selector-wrapper"');
    expect(html).toContain('id="operator-dropdown-btn"');
    expect(html).toContain('id="operator-dropdown-menu"');
    expect(html).toContain('Aline Rocha');
    expect(html).toContain('Carolina Mendes');
    expect(html).toContain('Marcos Silva');
    expect(html).toContain('Luiza Valente');
    expect(html).toContain('data-operator-id="p_aline"');
    expect(html).toContain('data-operator-id="p_carolina"');
    expect(html).toContain('data-operator-id="p_marcos"');
    expect(html).toContain('data-operator-id="p_luiza"');
    expect(html).toContain('OPERATOR_PROFILES');
  });

  it('deve conter a fila de pendências dinâmica associada aos perfis de operador', () => {
    const html = renderHtmlShell();

    expect(html).toContain('id="task-queue-section"');
    expect(html).toContain('id="operator-pendencies-list"');
    expect(html).toContain('Pausar Criativos Fracos');
    expect(html).toContain('Submeter Proposta SPOT');
    expect(html).toContain('Aprovar Mudança de Verba');
    expect(html).toContain('Reconciliar Conversões SAC');
  });

  it('o script cliente embutido deve ser sintaticamente válido sem erros de parsing', () => {
    const html = renderHtmlShell();
    const scriptMatches = html.match(/<script[\s\S]*?>([\s\S]*?)<\/script>/gi) || [];
    expect(scriptMatches.length).toBeGreaterThan(0);

    for (const tag of scriptMatches) {
      const code = tag.replace(/<script[\s\S]*?>/i, '').replace(/<\/script>/i, '');
      expect(() => new Function(code)).not.toThrow();
    }
  });

  it('deve conter o botão do Supercérebro no Icon Rail e o modal do Grafo de Conhecimento', () => {
    const html = renderHtmlShell();

    expect(html).toContain('id="btn-rail-supercerebro"');
    expect(html).toContain('🧠');
    expect(html).toContain('id="supercerebro-modal"');
    expect(html).toContain('id="supercerebro-canvas"');
    expect(html).toContain('id="graph-filter-tabs"');
    expect(html).toContain('id="graph-node-details-panel"');
  });

  it('deve interromper o envio no chat quando o campo de entrada estiver vazio', () => {
    const html = renderHtmlShell();
    expect(html).toContain('const goalVal = (interactiveInput?.value || goalInput?.value || \'\').trim();');
    expect(html).toContain('if (!goalVal) return;');
  });
});


