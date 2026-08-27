/**
 * @adzhub/web - UI Shell HTML & CSS Generator
 * Blueprint Oficial: Palco Operacional (Esquerda) + AdzChat Agentico (Direita)
 * Preserva: Governed PEV-C vs Basic ReAct, Integração LLM em Tempo Real, Cenários S0-S5, Comparador e Auditoria.
 */

import { CONTRACTS_VERSION } from '@adzhub/contracts';
import { getSupercerebroOperatorProfiles } from '@adzhub/data';
import { ALLOWED_MODELS } from './canonical-scenarios.js';

export type HarnessStatusState =
  'PROVISIONAL' | 'VERIFYING' | 'QUARANTINED' | 'COMMITTED' | 'BLOCKED' | 'FAILED';

export interface StatusBadgeInfo {
  status: HarnessStatusState;
  label: string;
  icon: string;
  cssClass: string;
  description: string;
  missingCondition?: string;
}

export function getStatusBadgeInfo(
  status: string,
  verified?: boolean,
  missingCondition?: string
): StatusBadgeInfo {
  const normalized = status.toUpperCase();
  if (normalized === 'COMMITTED' || (normalized === 'COMPLETED' && verified)) {
    return {
      status: 'COMMITTED',
      label: 'COMMITTED',
      icon: '✓',
      cssClass: 'badge-committed',
      description: 'Auditado e verificado formalmente por pós-condições PEV-C.'
    };
  }
  if (normalized === 'VERIFYING' || normalized === 'RUNNING') {
    return {
      status: 'VERIFYING',
      label: 'VERIFYING',
      icon: '⚙',
      cssClass: 'badge-verifying',
      description: 'Executando DAG e verificações determinísticas de integridade.'
    };
  }
  if (normalized === 'QUARANTINED') {
    return {
      status: 'QUARANTINED',
      label: 'QUARANTINED',
      icon: '⚠',
      cssClass: 'badge-quarantined',
      description: 'Dados retidos em quarentena devido à baixa cobertura de evidências (<80%).'
    };
  }
  if (normalized === 'BLOCKED') {
    return {
      status: 'BLOCKED',
      label: 'BLOCKED',
      icon: '🔒',
      cssClass: 'badge-blocked',
      description: 'Ação bloqueada pelo Capability Broker por falta de aprovação ou autorização.',
      missingCondition:
        missingCondition ||
        'Aprovação humana expressa com escopo e prazo definidos para escrita externa.'
    };
  }
  if (normalized === 'FAILED') {
    return {
      status: 'FAILED',
      label: 'FAILED',
      icon: '❌',
      cssClass: 'badge-failed',
      description: 'Falha determinística na execução de ferramenta ou violação de pós-condição.'
    };
  }
  return {
    status: 'PROVISIONAL',
    label: 'PROVISIONAL',
    icon: '⏳',
    cssClass: 'badge-provisional',
    description: 'Conclusão provisória sem auditoria PEV-C ou commit formal.'
  };
}

// ==========================================
// Card Dinâmico de Governança (Task 6.2)
// ==========================================

export interface GovernanceCardData {
  proposalId: string;
  proposalHash: string;
  operation: 'UPDATE_BUDGET' | 'PAUSE' | 'REACTIVATE' | string;
  resource: string;
  targetId: string;
  proposerId: string;
  actionSummary: string;
  blastRadius: {
    affectedCreativesCount: number;
    financialDeltaBrl: number;
    riskTier: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  rollbackWindowSeconds?: number;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXECUTED';
}

export function renderGovernanceCard(data: GovernanceCardData): string {
  const riskColor =
    data.blastRadius.riskTier === 'HIGH'
      ? 'var(--danger)'
      : data.blastRadius.riskTier === 'MEDIUM'
        ? 'var(--warning)'
        : 'var(--success)';

  return `
  <div class="governance-card" id="gov-card-${data.proposalId}" data-proposal-hash="${data.proposalHash}" style="border: 1px solid var(--adzhub-navy-border); border-radius: var(--radius-card); padding: 14px; background: var(--surface-soft); display: flex; flex-direction: column; gap: 10px; margin: 8px 0; box-shadow: var(--shadow-card);">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span style="font-family: var(--font-mono); font-size: var(--label); font-weight: 600; color: var(--navy-ink); text-transform: uppercase;">
        🛡 Card de Governança JIT · ${data.operation}
      </span>
      <span class="badge-provisional" style="font-family: var(--font-mono); font-size: var(--micro); padding: 2px 8px; border-radius: var(--radius-pill);">
        ${data.status}
      </span>
    </div>
    
    <div style="font-size: var(--body); font-weight: 500; color: var(--ink-strong); line-height: 1.5;">
      ${data.actionSummary}
    </div>

    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-family: var(--font-mono); font-size: var(--micro); background: var(--surface); padding: 8px 10px; border-radius: var(--radius-control); border: 1px solid var(--line);">
      <div>
        <span style="color: var(--ink-muted);">Recurso Alvo:</span><br/>
        <strong>${data.targetId}</strong>
      </div>
      <div>
        <span style="color: var(--ink-muted);">Impacto Financeiro:</span><br/>
        <strong>R$ ${data.blastRadius.financialDeltaBrl.toFixed(2)}</strong>
      </div>
      <div>
        <span style="color: var(--ink-muted);">Risco / Reversão:</span><br/>
        <strong style="color: ${riskColor}; font-weight: 600;">${data.blastRadius.riskTier} (${data.rollbackWindowSeconds ?? 86400}s)</strong>
      </div>
    </div>

    <div style="font-family: var(--font-mono); font-size: var(--micro); color: var(--ink-muted); word-break: break-all; background: var(--surface); padding: 6px 8px; border-radius: var(--radius-micro); border: 1px dashed var(--line);">
      <span>Proposal Hash (SHA-256): </span><code title="${data.proposalHash}" style="color: var(--navy); font-weight: 600;">${data.proposalHash}</code>
    </div>

    <div style="display: flex; gap: 8px; margin-top: 4px;">
      <button class="btn-primary" id="btn-approve-${data.proposalId}" style="flex: 1; font-size: var(--label); justify-content: center;" onclick="window.AdzHubApp?.approveProposal?.('${data.proposalId}', '${data.proposalHash}')">
        ✓ Aprovar Alteração (Assinar Hash)
      </button>
      <button class="btn-danger" id="btn-reject-${data.proposalId}" style="flex: 1; font-size: var(--label); justify-content: center;" onclick="window.AdzHubApp?.rejectProposal?.('${data.proposalId}')">
        ✕ Rejeitar Proposta
      </button>
    </div>
  </div>`;
}

export function renderHtmlShell(): string {
  const modelsOptions = ALLOWED_MODELS.map(
    (m) =>
      `<option value="${m.id}" ${'default' in m && m.default ? 'selected' : ''}>${m.name}</option>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AdzHub · Central de Operações de Mídia &amp; IA — AdzHub Harness</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Inter:ital,opsz,wght@0,14..32,400..700;1,14..32,400..700&family=Plus+Jakarta+Sans:ital,wght@0,500;0,600;0,700;1,500;1,600;1,700&display=swap" rel="stylesheet">
  <style>
    :root {
      /* ========================================================= */
      /* adzhub-command-center v1.0.0 — Tokens Oficiais de Cor     */
      /* ========================================================= */
      --page-backdrop: #F1F3F5;
      --app-canvas: #FFFFFF;
      --surface: #FFFFFF;
      --surface-soft: #F8F8F7;
      --surface-muted: #F3F4F4;
      --surface-selected: #F0F2F9;

      /* Paleta Principal Navy & Ink */
      --navy: #294A91;
      --navy-deep: #223B78;
      --navy-soft: #E9EDF8;
      --navy-ink: #263A67;

      --ink: #39404C;
      --ink-strong: #263142;
      --ink-muted: #7C8490;
      --ink-faint: #A8AFB7;

      /* Linhas & Separadores */
      --line: #E8EAEC;
      --line-strong: #D7DBDF;

      /* Acentos Semânticos: Orange (Crescimento/Upgrade), Blue (Foco), Green (Sucesso), Danger */
      --orange: #F59A19;
      --orange-hover: #E88708;
      --orange-soft: #FFF1D9;
      --orange-ink: #9A5A00;

      --blue: #6F86C4;
      --blue-soft: #EDF2FC;

      --cyan: #8AD7E4;
      --green: #53B58A;
      --green-soft: #E5F5EE;
      --yellow: #E6B94D;
      --yellow-soft: #FFF7DC;
      --danger: #D96C6C;
      --danger-soft: #FCEAEA;

      /* Aliases de Compatibilidade */
      --adzhub-navy: var(--navy);
      --adzhub-navy-deep: var(--navy-deep);
      --adzhub-navy-soft: var(--navy-soft);
      --adzhub-navy-ink: var(--navy-ink);
      --adzhub-navy-border: #B8C5E2;

      --adzhub-blue: var(--navy);
      --adzhub-blue-hover: var(--navy-deep);
      --adzhub-blue-soft: var(--navy-soft);
      --adzhub-blue-border: #B8C5E2;

      --adzhub-orange: var(--orange);
      --adzhub-orange-hover: var(--orange-hover);
      --adzhub-orange-soft: var(--orange-soft);
      --adzhub-orange-ink: var(--orange-ink);

      --success: var(--green);
      --success-soft: var(--green-soft);
      --warning: var(--orange);
      --warning-soft: var(--orange-soft);

      --border-focus: var(--navy);
      --text-bright: var(--ink-strong);
      --text-primary: var(--ink);
      --text-secondary: var(--ink-muted);
      --color-committed: var(--green);
      --color-provisional: var(--ink-muted);
      --color-verifying: var(--navy);
      --color-quarantined: var(--orange);
      --color-blocked: var(--danger);
      --color-failed: var(--danger);

      /* ========================================================= */
      /* Tipografia Inter, Plus Jakarta Sans & IBM Plex Mono       */
      /* ========================================================= */
      --font-primary: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
      --font-display: 'Plus Jakarta Sans', 'Inter', ui-sans-serif, system-ui, sans-serif;
      --font-mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace;

      /* Escala Tipográfica Operacional Compacta */
      --workspace-title: 1.125rem;
      --section-heading: 0.875rem;
      --body-large: 0.875rem;
      --body: 0.8125rem;
      --label: 0.6875rem;
      --micro: 0.625rem;

      /* ========================================================= */
      /* Forma, Profundidade e Raios (Shape & Depth)              */
      /* ========================================================= */
      --radius-micro: 4px;
      --radius-small: 6px;
      --radius-control: 7px;
      --radius-card: 10px;
      --radius-panel: 14px;
      --radius-app-window: 22px;
      --radius-pill: 999px;

      /* Sombras Frias, Difusas e Curtas */
      --shadow-app-window: 0 18px 50px rgba(31, 43, 63, 0.12);
      --shadow-card: 0 2px 10px rgba(37, 48, 66, 0.045);
      --shadow-floating: 0 8px 22px rgba(37, 48, 66, 0.10);
      --glow-navy-pulse: 0 0 0 3px rgba(41, 74, 145, 0.25);

      /* Animação & Movimento */
      --duration-default: 200ms;
      --ease-default: cubic-bezier(.22, 1, .36, 1);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    html {
      font-size: 14px;
      height: 100vh;
      max-height: 100vh;
      overflow: hidden;
    }

    @media (min-width: 1440px) {
      html { font-size: 14.5px; }
    }

    body {
      height: 100vh;
      max-height: 100vh;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background-color: var(--page-backdrop);
      background-image: radial-gradient(circle at 50% -10%, rgba(41, 74, 145, 0.04) 0%, rgba(241, 243, 245, 0.98) 60%, #E9ECEF 100%);
      color: var(--ink);
      font-family: var(--font-primary);
      font-size: var(--body);
      line-height: 1.5;
      display: flex;
      flex-direction: column;
      -webkit-font-smoothing: antialiased;
      box-sizing: border-box;
    }

    :focus-visible {
      outline: 2px solid var(--border-focus) !important;
      outline-offset: 2px !important;
    }

    @media (prefers-reduced-motion: reduce) {
      *, ::before, ::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
      }
    }

    /* ========================================================= */
    /* Região 1: Global Header (44px–56px)                       */
    /* ========================================================= */
    header#top-bar {
      height: 50px;
      flex-shrink: 0;
      background-color: var(--surface);
      border-bottom: 1px solid var(--line);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      gap: 16px;
      z-index: 10;
      color: var(--ink-strong);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: var(--font-display);
      font-weight: 700;
      color: var(--navy);
      font-size: 1.25rem;
      letter-spacing: -0.02em;
    }

    .brand-logo-wrap {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .brand .logo-badge {
      background: var(--navy-soft);
      color: var(--navy-ink);
      border: 1px solid var(--adzhub-navy-border);
      padding: 3px 9px;
      border-radius: var(--radius-pill);
      font-size: var(--micro);
      font-family: var(--font-mono);
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    .logo-glow-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--orange);
      box-shadow: 0 0 6px rgba(245, 154, 25, 0.7);
      animation: orangeActivityPulse 2.4s infinite ease-in-out;
    }

    @keyframes orangeActivityPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.18); }
    }

    .header-center-info {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: var(--label);
      color: var(--ink-muted);
      font-family: var(--font-primary);
    }

    .header-center-pill {
      background: var(--surface-soft);
      border: 1px solid var(--line);
      padding: 4px 10px;
      border-radius: var(--radius-pill);
      color: var(--ink);
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .header-center-pill strong {
      color: var(--ink-strong);
      font-weight: 600;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn-upgrade-commercial {
      background-color: var(--orange);
      color: #FFFFFF;
      border: none;
      border-radius: var(--radius-pill);
      height: 30px;
      padding: 0 14px;
      font-size: var(--label);
      font-weight: 600;
      font-family: var(--font-primary);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(245, 154, 25, 0.3);
      transition: all var(--duration-default) var(--ease-default);
    }
    .btn-upgrade-commercial:hover {
      background-color: var(--orange-hover);
      box-shadow: 0 2px 8px rgba(245, 154, 25, 0.4);
      transform: translateY(-1px);
    }

    /* Menu Dropdown de Perfis Operacionais no Header */
    .operator-selector-container {
      position: relative;
      display: inline-flex;
      align-items: center;
    }

    .operator-dropdown-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 4px 10px;
      background: var(--surface-soft);
      border: 1px solid var(--line-strong);
      border-radius: var(--radius-pill);
      color: var(--ink-strong);
      font-size: var(--body);
      font-family: var(--font-primary);
      cursor: pointer;
      transition: all var(--duration-default) var(--ease-default);
      box-shadow: 0 1px 3px rgba(37, 48, 66, 0.04);
      user-select: none;
    }

    .operator-dropdown-btn:hover, .operator-dropdown-btn:focus-visible {
      background: var(--surface-selected);
      border-color: var(--navy);
      box-shadow: 0 2px 8px rgba(41, 74, 145, 0.12);
    }

    .operator-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: var(--label);
      font-family: var(--font-mono);
      color: #FFFFFF;
      flex-shrink: 0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    }

    .operator-info-wrap {
      display: flex;
      flex-direction: column;
      text-align: left;
      line-height: 1.2;
    }

    .operator-name-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .operator-active-name {
      font-weight: 600;
      color: var(--ink-strong);
      font-size: var(--label);
    }

    .operator-company-badge {
      font-size: var(--micro);
      font-family: var(--font-mono);
      font-weight: 600;
      padding: 1px 5px;
      border-radius: var(--radius-pill);
      background: var(--navy-soft);
      color: var(--navy-ink);
      border: 1px solid var(--adzhub-navy-border);
      text-transform: uppercase;
    }

    .operator-active-role {
      font-size: var(--micro);
      color: var(--ink-muted);
      font-family: var(--font-primary);
    }

    .operator-dropdown-arrow {
      color: var(--ink-muted);
      font-size: 0.75rem;
      margin-left: 2px;
      transition: transform var(--duration-default) var(--ease-default);
    }

    .operator-selector-container.open .operator-dropdown-arrow {
      transform: rotate(180deg);
    }

    .operator-dropdown-menu {
      display: none;
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      min-width: 320px;
      background: var(--surface);
      border: 1px solid var(--line-strong);
      border-radius: var(--radius-card);
      box-shadow: var(--shadow-floating);
      z-index: 1000;
      padding: 6px;
      animation: fadeInDropdown 0.15s ease-out;
    }

    .operator-selector-container.open .operator-dropdown-menu {
      display: flex;
      flex-direction: column;
    }

    @keyframes fadeInDropdown {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .operator-menu-header {
      padding: 8px 10px;
      border-bottom: 1px solid var(--line);
      margin-bottom: 4px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .operator-menu-header span:first-child {
      font-size: var(--label);
      font-weight: 600;
      color: var(--ink-strong);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .operator-menu-header .operator-menu-sub {
      font-size: var(--micro);
      color: var(--ink-muted);
      font-family: var(--font-mono);
    }

    .operator-menu-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .operator-menu-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: var(--radius-control);
      border: 1px solid transparent;
      background: transparent;
      cursor: pointer;
      text-align: left;
      transition: all var(--duration-default) var(--ease-default);
      width: 100%;
    }

    .operator-menu-item:hover, .operator-menu-item:focus-visible {
      background: var(--surface-soft);
      border-color: var(--line);
    }

    .operator-menu-item.active {
      background: var(--surface-selected);
      border-color: var(--adzhub-navy-border);
    }

    .operator-menu-item-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .operator-menu-item-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    .operator-menu-item-name {
      font-size: var(--label);
      font-weight: 600;
      color: var(--ink-strong);
    }

    .operator-menu-item-role {
      font-size: var(--micro);
      color: var(--ink-muted);
    }

    .operator-menu-item-desc {
      font-size: 0.625rem;
      color: var(--ink-faint);
      line-height: 1.3;
    }

    .operator-check-icon {
      color: var(--green);
      font-weight: 700;
      font-size: 0.85rem;
      display: none;
    }

    .operator-menu-item.active .operator-check-icon {
      display: block;
    }

    /* ========================================================= */
    /* Componentes Globais de Form e Botões                      */
    /* ========================================================= */
    select, button, input {
      background-color: var(--surface);
      border: 1px solid var(--line);
      color: var(--ink-strong);
      padding: 6px 10px;
      border-radius: var(--radius-control);
      font-size: var(--body);
      font-family: var(--font-primary);
      outline: none;
      transition: all var(--duration-default) var(--ease-default);
    }

    select:focus, button:focus, input:focus {
      border-color: var(--navy);
      background-color: var(--surface);
      box-shadow: 0 0 0 2px rgba(41, 74, 145, 0.25);
    }

    button {
      cursor: pointer;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    button:hover:not(:disabled) {
      background-color: var(--surface-muted);
      border-color: var(--line-strong);
    }

    button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    button.btn-primary {
      background-color: var(--navy);
      border-color: var(--navy);
      color: #FFFFFF;
      font-weight: 600;
      padding: 7px 14px;
      box-shadow: 0 1px 3px rgba(41, 74, 145, 0.2);
    }
    button.btn-primary:hover:not(:disabled) {
      background-color: var(--navy-deep);
      border-color: var(--navy-deep);
      box-shadow: 0 2px 8px rgba(41, 74, 145, 0.3);
      transform: translateY(-1px);
    }

    button.btn-secondary {
      background-color: var(--surface);
      border-color: var(--line);
      color: var(--ink);
      padding: 6px 12px;
    }
    button.btn-secondary:hover:not(:disabled) {
      background-color: var(--navy-soft);
      border-color: var(--adzhub-navy-border);
      color: var(--navy-ink);
    }

    button.btn-danger {
      background-color: var(--danger-soft);
      border-color: var(--danger);
      color: #991B1B;
    }
    button.btn-danger:hover:not(:disabled) {
      background-color: var(--danger);
      color: #FFFFFF;
    }

    /* ========================================================= */
    /* Janela Central Elevada (Workspace Command Center)          */
    /* ========================================================= */
    .blueprint-outer-wrapper {
      flex: 1;
      min-height: 0;
      overflow: hidden;
      padding: 14px 20px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      box-sizing: border-box;
    }

    .blueprint-card {
      flex: 1;
      width: 100%;
      max-width: 1200px;
      min-height: 0;
      max-height: calc(100vh - 84px);
      background-color: var(--app-canvas);
      border: 1px solid var(--line);
      border-radius: var(--radius-app-window);
      box-shadow: var(--shadow-app-window);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      margin: 0 auto;
    }

    .blueprint-card-header {
      flex-shrink: 0;
      padding: 7px 18px;
      background-color: var(--surface-soft);
      border-bottom: 1px solid var(--line);
      font-size: var(--label);
      font-family: var(--font-mono);
      font-weight: 600;
      letter-spacing: 0.05em;
      color: var(--navy-ink);
      text-transform: uppercase;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    /* ========================================================= */
    /* Grid de 4 Regiões Anatômicas:                             */
    /* iconRail (56px) + taskQueue (210px) + assistant (1fr) + context (260px) */
    /* ========================================================= */
    .blueprint-grid {
      flex: 1;
      min-height: 0;
      display: grid;
      grid-template-columns: 56px minmax(190px, 220px) minmax(420px, 1fr) minmax(230px, 280px);
      overflow: hidden;
    }

    /* --------------------------------------------------------- */
    /* REGIÃO 1: ICON RAIL (Left Navigation Shortcuts)           */
    /* --------------------------------------------------------- */
    .icon-rail-column {
      flex-shrink: 0;
      width: 56px;
      min-width: 56px;
      max-width: 56px;
      box-sizing: border-box;
      background-color: var(--surface-soft);
      border-right: 1px solid var(--line);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 12px 0;
      gap: 8px;
      z-index: 5;
    }

    .rail-btn {
      width: 36px;
      height: 36px;
      margin: 0 auto;
      padding: 0;
      border-radius: var(--radius-control);
      background: transparent;
      border: 1px solid transparent;
      color: var(--ink-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      align-self: center;
      font-size: 1.05rem;
      cursor: pointer;
      position: relative;
      transition: all var(--duration-default) var(--ease-default);
      box-sizing: border-box;
    }
    .rail-btn:hover {
      background-color: var(--navy-soft);
      color: var(--navy-ink);
    }
    .rail-btn.active {
      background-color: var(--navy);
      color: #FFFFFF;
      box-shadow: 0 1px 4px rgba(41, 74, 145, 0.25);
    }
    .rail-divider {
      width: 24px;
      height: 1px;
      background-color: var(--line);
      margin: 4px auto;
      align-self: center;
    }

    /* --------------------------------------------------------- */
    /* REGIÃO 2: TASK QUEUE / MESA DE CONTROLE (Left-Center)     */
    /* --------------------------------------------------------- */
    .controls-column {
      flex: 1;
      min-height: 0;
      border-right: 1px solid var(--line);
      display: flex;
      flex-direction: column;
      background-color: var(--surface-soft);
      overflow: hidden;
    }

    .controls-header {
      flex-shrink: 0;
      height: 48px;
      min-height: 48px;
      max-height: 48px;
      box-sizing: border-box;
      padding: 0 14px;
      border-bottom: 1px solid var(--line);
      background-color: var(--surface);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 1.05rem;
      color: var(--ink-strong);
      letter-spacing: -0.01em;
      line-height: 1;
    }

    .controls-content {
      flex: 1;
      min-height: 0;
      padding: 12px 14px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
      scrollbar-width: thin;
      scrollbar-color: var(--line) transparent;
    }

    .control-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .control-label {
      font-family: var(--font-primary);
      font-size: var(--label);
      font-weight: 600;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      color: var(--ink-muted);
    }

    .control-group select {
      width: 100%;
      background-color: var(--surface);
      border: 1px solid var(--line);
      color: var(--ink-strong);
      font-size: var(--body);
      padding: 6px 10px;
      border-radius: var(--radius-control);
      font-family: var(--font-primary);
    }
    .control-group select:focus {
      border-color: var(--navy);
      box-shadow: 0 0 0 2px rgba(41, 74, 145, 0.2);
    }

    .controls-action-box {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-top: 2px;
    }

    .controls-key-box {
      background-color: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius-card);
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      box-shadow: var(--shadow-card);
    }

    .key-inputs label {
      letter-spacing: 0.02em;
      text-transform: uppercase;
      font-size: var(--label);
      color: var(--ink-muted);
      font-family: var(--font-primary);
      font-weight: 600;
    }

    .key-inputs input[type="password"] {
      background-color: var(--surface-soft);
      border: 1px solid var(--line);
      color: var(--ink-strong);
      font-family: var(--font-mono);
      font-size: var(--body);
      padding: 6px 8px;
      border-radius: var(--radius-control);
    }
    .key-inputs input[type="password"]:focus {
      border-color: var(--navy);
      background-color: var(--surface);
      box-shadow: 0 0 0 2px rgba(41, 74, 145, 0.2);
    }

    #key-status {
      font-size: var(--micro);
      font-family: var(--font-mono);
      color: var(--ink-muted);
    }

    /* Task Queue Cards (Fila Operacional) */
    .task-queue-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 4px;
    }
    .task-card-item {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius-card);
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      box-shadow: var(--shadow-card);
      transition: all var(--duration-default) var(--ease-default);
    }
    .task-card-item:hover {
      border-color: var(--adzhub-navy-border);
      background-color: var(--surface-selected);
    }
    .task-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }
    .task-card-title {
      font-weight: 600;
      font-size: var(--body);
      color: var(--ink-strong);
    }
    .task-card-meta {
      font-size: var(--micro);
      font-family: var(--font-mono);
      color: var(--ink-muted);
    }
    .task-card-btn {
      align-self: flex-start;
      background: var(--navy-soft);
      color: var(--navy-ink);
      border: 1px solid var(--adzhub-navy-border);
      border-radius: var(--radius-pill);
      padding: 3px 9px;
      font-size: var(--micro);
      font-family: var(--font-primary);
      font-weight: 600;
      cursor: pointer;
    }
    .task-card-btn:hover {
      background: var(--navy);
      color: #FFFFFF;
    }

    /* --------------------------------------------------------- */
    /* REGIÃO 3: ASSISTANT WORKSPACE (Center Conversation)       */
    /* --------------------------------------------------------- */
    .chat-column {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      background-color: var(--surface);
      overflow: hidden;
    }

    .chat-header {
      flex-shrink: 0;
      height: 48px;
      min-height: 48px;
      max-height: 48px;
      box-sizing: border-box;
      padding: 0 18px;
      border-bottom: 1px solid var(--line);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background-color: var(--surface);
      line-height: 1;
    }

    .btn-chat-back {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      font-size: var(--label);
      font-weight: 500;
      color: var(--ink-strong);
      background: var(--surface-soft);
      border: 1px solid var(--line);
      border-radius: var(--radius-pill);
      cursor: pointer;
      font-family: var(--font-primary);
      transition: all 0.15s ease-in-out;
    }
    .btn-chat-back:hover {
      background: var(--navy-soft);
      border-color: var(--navy);
      color: var(--navy);
      transform: translateX(-2px);
    }

    .chat-agent-info {
      display: flex;
      align-items: center;
      gap: 9px;
    }
    .chat-agent-avatar {
      width: 30px;
      height: 30px;
      border-radius: var(--radius-control);
      background: var(--navy);
      border: 1px solid var(--navy-deep);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 0.875rem;
    }
    .chat-agent-name {
      font-family: var(--font-display);
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--ink-strong);
      letter-spacing: -0.01em;
    }

    .chat-body {
      flex: 1;
      min-height: 0;
      padding: 14px 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
      background-color: var(--surface);
      scrollbar-width: thin;
      scrollbar-color: var(--line) transparent;
    }
    .chat-body::-webkit-scrollbar { width: 5px; }
    .chat-body::-webkit-scrollbar-thumb { background: var(--line-strong); border-radius: 4px; }

    /* Chat Empty State */
    #chat-empty-state {
      margin: auto;
      text-align: center;
      color: var(--ink-muted);
      padding: 18px 14px;
      max-width: 520px;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: stretch;
    }

    /* Quick Prompt Cards */
    .quick-prompt-btn {
      background: var(--surface-soft);
      border: 1px solid var(--line);
      border-radius: var(--radius-control);
      padding: 9px 12px;
      font-size: var(--body);
      color: var(--ink-strong);
      cursor: pointer;
      text-align: left;
      transition: all var(--duration-default) var(--ease-default);
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      font-family: var(--font-primary);
    }
    .quick-prompt-btn:hover {
      background: var(--surface-selected);
      border-color: var(--adzhub-navy-border);
      transform: translateY(-1px);
      box-shadow: var(--shadow-card);
    }

    /* User Bubble (Navy #294A91, white text, radius card) */
    .user-bubble-container {
      display: flex;
      justify-content: flex-end;
    }
    .user-bubble {
      background-color: var(--navy);
      color: #FFFFFF;
      padding: 10px 14px;
      border-radius: var(--radius-card);
      font-size: var(--body);
      font-weight: 400;
      max-width: 82%;
      box-shadow: var(--shadow-card);
      line-height: 1.5;
    }

    /* Agent Reasoning & Tool Steps */
    .agent-steps-stream {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .step-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: var(--body);
      color: var(--ink);
      background: var(--surface-soft);
      padding: 8px 10px;
      border-radius: var(--radius-control);
      border: 1px solid var(--line);
    }
    .step-icon {
      font-size: 0.95rem;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .step-text {
      flex: 1;
      line-height: 1.45;
    }
    .step-tool-tag {
      font-family: var(--font-mono);
      font-size: var(--micro);
      font-weight: 600;
      background-color: var(--surface);
      border: 1px solid var(--line);
      padding: 2px 6px;
      border-radius: var(--radius-micro);
      color: var(--navy-ink);
      display: inline-block;
      margin-right: 6px;
    }
    .step-obs {
      font-family: var(--font-mono);
      font-size: var(--micro);
      color: var(--ink-muted);
      margin-top: 2px;
    }

    /* Agent Response Box */
    .agent-response-box {
      background-color: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius-card);
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: var(--shadow-card);
    }
    .response-header-line {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: var(--font-display);
      font-weight: 600;
      color: var(--ink-strong);
      font-size: 0.95rem;
    }

    .cta-suggestions-container {
      border: 1px solid var(--line);
      border-radius: var(--radius-control);
      background: var(--surface-soft);
      overflow: hidden;
    }
    .cta-suggestion-item {
      padding: 8px 12px;
      border-bottom: 1px solid var(--line);
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: var(--body);
      color: var(--ink);
    }
    .cta-suggestion-item:last-child { border-bottom: none; }
    .cta-num {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--surface);
      border: 1px solid var(--line);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-mono);
      font-size: var(--micro);
      font-weight: 600;
      color: var(--ink-strong);
    }
    .cta-badge-ready {
      background: var(--navy-soft);
      color: var(--navy-ink);
      border: 1px solid var(--adzhub-navy-border);
      padding: 3px 10px;
      border-radius: var(--radius-pill);
      font-size: var(--label);
      font-family: var(--font-mono);
      font-weight: 600;
      letter-spacing: 0.03em;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      align-self: flex-start;
      margin-bottom: 2px;
    }

    /* Composer (Input Form) — Border lineStrong, radius panel 14px */
    .chat-input-wrapper {
      flex-shrink: 0;
      padding: 8px 18px 12px;
      background-color: var(--surface);
    }

    .chat-composer-card {
      background: var(--surface);
      border: 1px solid var(--line-strong);
      border-radius: var(--radius-panel);
      padding: 6px 8px 6px 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      box-shadow: 0 1px 3px rgba(37, 48, 66, 0.04);
      transition: all var(--duration-default) var(--ease-default);
    }
    .chat-composer-card:focus-within {
      border-color: var(--navy);
      box-shadow: 0 0 0 2px rgba(41, 74, 145, 0.2);
    }

    .chat-input-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .chat-input-row input, .chat-input-row textarea {
      flex: 1;
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      outline: none !important;
      color: var(--ink-strong);
      font-size: var(--body);
      padding: 6px 0;
      resize: none;
      font-family: var(--font-primary);
    }

    .chat-input-row input:focus, .chat-input-row textarea:focus {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      outline: none !important;
    }

    /* Botão de Envio: Navy #294A91 compacto (nunca laranja) */
    .btn-send-round {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: var(--navy);
      color: #FFFFFF;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      flex-shrink: 0;
      cursor: pointer;
      transition: all 0.16s var(--ease-default);
    }
    .btn-send-round:hover:not(:disabled) {
      background-color: var(--navy-deep);
      box-shadow: 0 2px 6px rgba(41, 74, 145, 0.35);
      transform: scale(1.04);
    }
    .btn-send-round:disabled {
      background-color: var(--surface-muted);
      color: var(--ink-faint);
      opacity: 0.8;
      cursor: not-allowed;
      transform: none;
    }
    .btn-send-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.35);
      border-top-color: #FFFFFF;
      border-radius: 50%;
      display: inline-block;
      animation: btnSpin 0.7s linear infinite;
    }
    @keyframes btnSpin { to { transform: rotate(360deg); } }

    /* --------------------------------------------------------- */
    /* REGIÃO 4: CONTEXT PANEL / PALCO OPERACIONAL (Right Panel)  */
    /* --------------------------------------------------------- */
    .stage-column {
      flex: 1;
      min-height: 0;
      border-left: 1px solid var(--line);
      display: flex;
      flex-direction: column;
      background-color: var(--surface-soft);
      overflow: hidden;
    }

    .stage-header {
      flex-shrink: 0;
      height: 48px;
      min-height: 48px;
      max-height: 48px;
      box-sizing: border-box;
      padding: 0 16px;
      border-bottom: 1px solid var(--line);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background-color: var(--surface);
      line-height: 1;
    }

    .stage-title-main {
      font-family: var(--font-display);
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--ink-strong);
      letter-spacing: -0.01em;
    }

    .stage-content {
      flex: 1;
      min-height: 0;
      padding: 10px 12px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      scrollbar-width: thin;
      scrollbar-color: var(--line) transparent;
    }

    /* Dynamic Stage Cards — Branco com sombra suave e borda */
    .stage-card {
      background-color: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius-card);
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      transition: all var(--duration-default) var(--ease-default);
      box-shadow: var(--shadow-card);
      cursor: pointer;
    }
    .stage-card:hover {
      border-color: var(--adzhub-navy-border);
      transform: translateY(-1px);
      box-shadow: var(--shadow-floating);
    }

    @keyframes cardPulseGlow {
      0% { box-shadow: 0 0 0 0px rgba(41, 74, 145, 0.4), var(--shadow-card); }
      50% { box-shadow: 0 0 0 4px rgba(41, 74, 145, 0.18), var(--shadow-card); }
      100% { box-shadow: 0 0 0 1px var(--navy), var(--shadow-card); }
    }
    .stage-card.card-active {
      border: 1.5px solid var(--navy) !important;
      background-color: var(--surface);
      box-shadow: 0 0 0 1px var(--navy), var(--shadow-card);
      animation: cardPulseGlow 0.5s ease-out;
    }
    .stage-card.card-success {
      border-color: var(--green);
      background-color: var(--surface);
    }

    .stage-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .stage-card-name {
      font-family: var(--font-display);
      font-weight: 600;
      color: var(--ink-strong);
      font-size: 0.8125rem;
      letter-spacing: -0.01em;
    }

    .stage-card-tags {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
      margin-top: 1px;
    }

    /* Dynamic Tags & Badges */
    .tag-pill {
      font-family: var(--font-mono);
      font-size: var(--micro);
      font-weight: 500;
      letter-spacing: 0.02em;
      padding: 2px 6px;
      border-radius: var(--radius-pill);
      border: 1px solid var(--line);
      background-color: var(--surface-soft);
      color: var(--ink);
    }
    .tag-hook-strong { background: var(--green-soft); color: #1E6B56; border-color: var(--green); }
    .tag-hook-weak { background: var(--danger-soft); color: #8F2D36; border-color: var(--danger); }
    .tag-cta-good { background: var(--navy-soft); color: var(--navy-ink); border-color: var(--adzhub-navy-border); }
    .tag-cta-bad { background: var(--orange-soft); color: var(--orange-ink); border-color: var(--orange); }
    .tag-status-paused { background: var(--orange-soft); color: var(--orange-ink); font-weight: 600; border-color: var(--orange); }
    .tag-status-active { background: var(--navy-soft); color: var(--navy-ink); font-weight: 600; border-color: var(--adzhub-navy-border); }

    .stage-card-metrics {
      font-family: var(--font-mono);
      font-size: var(--micro);
      color: var(--ink-muted);
      display: flex;
      gap: 10px;
      margin-top: 1px;
      padding-top: 3px;
      border-top: 1px dashed var(--line);
    }

    /* Motion Animations */
    @keyframes chatFadeSlideUp {
      0% { opacity: 0; transform: translateY(4px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    .chat-animate-in {
      animation: chatFadeSlideUp 0.2s var(--ease-default) forwards;
    }

    .card-pulse-highlight {
      animation: cardPulse 0.8s ease-in-out;
    }
    @keyframes cardPulse {
      0%, 100% { box-shadow: var(--shadow-card); }
      50% { box-shadow: 0 0 0 3px rgba(41, 74, 145, 0.25); border-color: var(--navy) !important; }
    }

    /* Flow Sequence Bar (Rodapé) */
    .flow-sequence-bar {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 4px 12px;
      flex-wrap: wrap;
      font-size: var(--label);
      font-family: var(--font-mono);
    }

    .flow-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 8px;
      border-radius: var(--radius-pill);
      background: var(--surface);
      border: 1px solid var(--line);
      color: var(--ink-muted);
      font-weight: 500;
      font-size: var(--label);
      transition: all var(--duration-default) var(--ease-default);
    }
    .flow-pill.active {
      background: var(--navy) !important;
      border-color: var(--navy) !important;
      color: #FFFFFF !important;
      font-weight: 600 !important;
      box-shadow: 0 1px 4px rgba(41, 74, 145, 0.25) !important;
    }
    .flow-pill.active-success {
      background: var(--green) !important;
      border-color: var(--green) !important;
      color: #FFFFFF !important;
      font-weight: 600 !important;
      box-shadow: 0 1px 4px rgba(83, 181, 138, 0.3) !important;
    }
    .flow-pill-arrow {
      color: var(--ink-faint);
      font-size: var(--micro);
    }

    /* Modal Comparador */
    #comparison-modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(38, 49, 66, 0.6);
      backdrop-filter: blur(6px);
      z-index: 100;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .comparison-modal-content {
      background-color: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius-app-window);
      width: 100%;
      max-width: 940px;
      max-height: 88vh;
      display: flex;
      flex-direction: column;
      box-shadow: var(--shadow-app-window);
      overflow: hidden;
    }
    .comparison-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--body);
      text-align: left;
    }
    .comparison-table th, .comparison-table td {
      padding: 9px 12px;
      border-bottom: 1px solid var(--line);
    }
    .comparison-table th {
      background-color: var(--surface-soft);
      color: var(--ink-strong);
      font-family: var(--font-primary);
      font-weight: 600;
      font-size: var(--label);
    }

    /* Badges de Estado Semafóricos com Ícone e Texto (WCAG AA) */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 8px;
      border-radius: var(--radius-pill);
      font-family: var(--font-mono);
      font-size: var(--label);
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      border: 1px solid var(--line);
      background-color: var(--surface-soft);
      color: var(--ink);
    }
    .badge-committed { border-color: var(--green); color: #1E6B56; background-color: var(--green-soft); }
    .badge-provisional { border-color: var(--line-strong); color: var(--ink-muted); background-color: var(--surface-soft); }
    .badge-verifying { border-color: var(--navy); color: var(--navy-ink); background-color: var(--navy-soft); }
    .badge-quarantined { border-color: var(--orange); color: var(--orange-ink); background-color: var(--orange-soft); }
    .badge-blocked { border-color: var(--danger); color: #8F2D36; background-color: var(--danger-soft); }
    .badge-failed { border-color: var(--danger); color: #8F2D36; background-color: var(--danger-soft); }

    .badge-phase-plan { border-color: var(--navy); color: var(--navy-ink); background-color: var(--navy-soft); }
    .badge-phase-fork { border-color: #8C75B5; color: #432E6A; background-color: #EFEBF7; }
    .badge-phase-attribute { border-color: var(--orange); color: var(--orange-ink); background-color: var(--orange-soft); }
    .badge-phase-replan { border-color: #DF7148; color: #732C10; background-color: #FCECE6; }
    .badge-phase-verify { border-color: var(--navy); color: var(--navy-ink); background-color: var(--navy-soft); }
    .badge-phase-commit { border-color: var(--green); color: #1E6B56; background-color: var(--green-soft); }

    .spinner {
      width: 22px;
      height: 22px;
      border: 2px solid var(--line);
      border-top-color: var(--navy);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .hidden-storage-panel { display: none; }

    /* Responsividade */
    @media (max-width: 1120px) {
      .blueprint-grid {
        grid-template-columns: 56px 200px 1fr 240px;
      }
    }
    @media (max-width: 900px) {
      .blueprint-outer-wrapper {
        padding: 6px 8px;
      }
      .blueprint-card {
        max-width: 100%;
        max-height: none;
      }
      nav#mobile-nav {
        display: flex;
      }
      .blueprint-grid {
        grid-template-columns: 1fr;
      }
      .icon-rail-column {
        display: none;
      }
      .controls-column, .stage-column {
        border-right: none;
        border-left: none;
        border-bottom: 1px solid var(--line);
      }
    }
  </style>
</head>
<body>

  <!-- Região 1: Top Bar — Header Global do Workspace AdzHub -->
  <header id="top-bar" role="banner">
    <div class="brand">
      <span class="brand-logo-wrap">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 17626.6 4479.68" height="26" style="height: 26px; width: auto; display: block;" aria-label="AdzHub">
          <defs>
            <linearGradient id="adzhub-grad-logo" gradientUnits="userSpaceOnUse" x1="151.81" y1="4327.69" x2="2885.33" y2="97.24">
              <stop offset="0" style="stop-opacity:1; stop-color:#F59A19"/>
              <stop offset="1" style="stop-opacity:1; stop-color:#FFA826"/>
            </linearGradient>
          </defs>
          <g id="_adzhub_logo_group">
            <path fill="#294A91" d="M6935.15 4420.12l-143.56 -347.84c-7.89,-19.11 -25.54,-30.93 -46.22,-30.93l-1054.87 0c-20.68,0 -38.33,11.81 -46.22,30.92l-143.57 347.86c-7.89,19.11 -25.54,30.92 -46.22,30.92l-458.33 0c-17.46,0 -32.48,-8.16 -41.97,-22.82 -9.49,-14.66 -10.8,-31.7 -3.65,-47.64l976.13 -2176.1c8.24,-18.38 25.47,-29.54 45.62,-29.54l504.2 0c20.19,0 37.45,11.2 45.67,29.64l969.92 2176.1c7.1,15.93 5.77,32.95 -3.73,47.58 -9.5,14.64 -24.49,22.78 -41.94,22.78l-465.04 0c-20.68,0 -38.33,-11.81 -46.22,-30.93zm-758.9 -1622.93l-298.52 716.46c-6.63,15.9 -5.01,32.63 4.55,46.97 9.56,14.33 24.37,22.26 41.6,22.26l591.86 0c17.17,0 31.94,-7.87 41.51,-22.13 9.58,-14.26 11.27,-30.91 4.76,-46.81l-293.33 -716.46c-7.83,-19.13 -25.44,-30.99 -46.12,-31.06 -20.67,-0.06 -38.36,11.69 -46.31,30.77zm3155.06 -572.24l0 2176.1c0,27.54 -22.46,50 -50,50l-349.98 0c-24.59,0 -45.19,-17.39 -49.3,-41.64l-9.63 -56.82c-3.08,-18.21 -14.82,-32.3 -32.16,-38.62 -17.35,-6.33 -35.4,-3.1 -49.48,8.85 -126.3,107.16 -282.12,160.75 -467.44,160.75 -149.57,0 -282.35,-35.23 -398.32,-105.68 -115.97,-70.45 -206.47,-169.08 -271.5,-295.89 -65.04,-126.81 -97.55,-271.51 -97.55,-434.09 0,-162.58 32.51,-307.27 97.55,-434.08 65.03,-126.81 155.53,-225.44 271.5,-295.9 115.97,-70.45 248.75,-105.67 398.32,-105.67 160.53,0 300.25,40.91 419.14,122.74 15.69,10.8 34.75,11.94 51.62,3.08 16.86,-8.87 26.73,-25.21 26.73,-44.26l0 -668.87c0,-27.54 22.46,-50 50,-50l410.5 0c27.54,0 50,22.46 50,50zm-887.68 1829.41c112.72,0 204.85,-37.39 276.38,-112.18 71.54,-74.79 107.3,-172.88 107.3,-294.27 0,-121.39 -35.76,-219.48 -107.3,-294.26 -71.53,-74.79 -163.66,-112.18 -276.38,-112.18 -112.72,0 -204.31,37.93 -274.76,113.8 -70.45,75.87 -105.68,173.42 -105.68,292.64 0,119.23 35.23,216.77 105.68,292.64 70.45,75.87 162.04,113.81 274.76,113.81zm1987.45 -48.78l563.8 0c27.54,0 50,22.46 50,50l0 345.47c0,27.54 -22.46,50 -50,50l-1337.19 0c-27.54,0 -50,-22.46 -50,-50l0 -103.58c0,-10.54 2.81,-19.59 8.77,-28.28l626.85 -913.67c10.77,-15.7 11.88,-34.74 3.01,-51.59 -8.87,-16.84 -25.2,-26.7 -44.24,-26.7l-482.61 0c-27.54,0 -50,-22.46 -50,-50l0 -332.46c0,-27.54 22.46,-50 50,-50l1252.65 0c27.54,0 50,22.46 50,50l0 97.05c0,10.56 -2.81,19.63 -8.79,28.33l-623.46 907.11c-10.79,15.7 -11.91,34.75 -3.04,51.6 8.87,16.86 25.2,26.72 44.25,26.72zm2513.94 -1830.63l430.01 0c27.54,0 50,22.46 50,50l0 2176.1c0,27.54 -22.46,50 -50,50l-430.01 0c-27.54,0 -50,-22.46 -50,-50l0 -813.69c0,-27.54 -22.46,-50 -50,-50l-865.71 0c-27.54,0 -50,22.46 -50,50l0 813.69c0,27.54 -22.46,50 -50,50l-433.26 0c-27.54,0 -50,-22.46 -50,-50l0 -2176.1c0,-27.54 22.46,-50 50,-50l433.26 0c27.54,0 50,22.46 50,50l0 781.18c0,27.54 22.46,50 50,50l865.71 0c27.54,0 50,-22.46 50,-50l0 -781.18c0,-27.54 22.46,-50 50,-50zm2518.74 719.82l0 1506.28c0,27.54 -22.46,50 -50,50l-350.22 0c-24.49,0 -45.02,-17.23 -49.25,-41.36l-8.56 -48.82c-3.2,-18.22 -15.05,-32.26 -32.48,-38.47 -17.43,-6.2 -35.49,-2.81 -49.48,9.29 -46.47,40.2 -98.98,72.94 -157.47,98.22 -87.79,37.93 -183.71,56.91 -287.76,56.91 -197.27,0 -354.43,-65.03 -471.48,-195.1 -117.06,-130.06 -175.59,-309.98 -175.59,-539.76l0 -857.19c0,-27.54 22.46,-50 50,-50l410.5 0c27.54,0 50,22.46 50,50l0 827.93c0,104.05 25.47,185.34 76.41,243.87 50.94,58.52 120.85,87.79 209.73,87.79 97.54,0 176.12,-34.14 235.74,-102.43 59.61,-68.28 89.41,-156.61 89.41,-265l0 -792.16c0,-27.54 22.46,-50 50,-50l410.5 0c27.54,0 50,22.46 50,50zm1391.67 -82.51c149.57,0 282.89,35.22 399.94,105.67 117.06,70.46 208.1,169.09 273.13,295.9 65.04,126.81 97.55,271.5 97.55,434.08 0,162.58 -32.51,307.28 -97.55,434.09 -65.03,126.81 -156.07,225.44 -273.13,295.89 -117.05,70.45 -250.37,105.68 -399.94,105.68 -185.32,0 -341.14,-53.59 -467.44,-160.75 -14.08,-11.95 -32.13,-15.18 -49.48,-8.85 -17.35,6.32 -29.08,20.41 -32.16,38.62l-9.63 56.81c-4.11,24.25 -24.7,41.65 -49.3,41.65l-349.98 0c-27.54,0 -50,-22.46 -50,-50l0 -2176.1c0,-27.54 22.46,-50 50,-50l410.5 0c27.54,0 50,22.46 50,50l0 668.87c0,19.05 9.87,35.39 26.73,44.26 16.87,8.86 35.92,7.73 51.62,-3.08 118.89,-81.83 258.61,-122.74 419.14,-122.74zm-120.31 1242.1c112.72,0 204.85,-37.39 276.38,-112.18 71.54,-74.79 107.31,-172.88 107.31,-294.27 0,-121.39 -35.77,-219.48 -107.31,-294.26 -71.53,-74.79 -163.66,-112.18 -276.38,-112.18 -112.72,0 -204.31,37.93 -274.76,113.8 -70.45,75.87 -105.67,173.42 -105.67,292.64 0,119.23 35.22,216.77 105.67,292.64 70.45,75.87 162.04,113.81 274.76,113.81z"/>
            <path fill="url(#adzhub-grad-logo)" d="M1484.65 1989.21l-285.24 385.08c-26.96,35.82 -47.2,57.84 -71.56,93.86l-939.35 1271.54c-28.01,33.54 -44.82,60.23 -70.45,95.37 -82.32,112.9 -160.54,224.81 -92.83,375.83 6.18,13.79 25.28,43.13 32.27,50.54 9.43,10 9.71,8.66 19.34,17.03 49.64,43.16 84.15,63.56 163.9,60.25 120.35,-5 759.2,-340.57 943.86,-423.52l452.01 -219.96c280.41,-125.85 653.33,-324.39 923.26,-439.84 78.82,-33.71 294.53,-129.62 364.64,-178.4 49.43,-34.39 39.13,-15.57 70.9,-67.07 48.93,-79.31 87.81,-145.43 57.95,-262.81 -21.95,-86.27 -89,-160.32 -148.98,-190.56 -106.22,-53.55 -176.46,-21.31 -272.63,16.76 -68.3,27.04 -169.62,73.04 -233.12,107.22 -159.9,86.07 -511.05,226.96 -701.97,320.79 -38.71,19.02 -198.38,104.28 -231.02,94.33 -17.15,-31.23 -4.19,-44.24 11.47,-65.33l594.51 -796.35c15.74,-20.62 27.53,-36.8 36.57,-59.3 8.67,-7.83 6.4,-5.81 15.76,-16.31l751.93 -1017.54c25.88,-38.76 60.11,-73.97 87.85,-15.65l75.46 246.74c30.92,95.1 62.83,191.02 91.64,286.41 170.77,565.49 363.78,1148.85 534.92,1712.96 56.08,184.85 113.86,389.79 177.59,568.33 40.06,112.22 91.16,343.6 146.76,405.44 13.6,15.12 32.34,28.85 47.59,43.52 83.64,80.44 245.24,89.92 358.52,39.53 84.62,-37.65 131.03,-110.57 173.09,-202.53 79.69,-174.26 151.58,-351.98 234.84,-520.72 81.24,-164.65 147.3,-353.12 229.29,-517 147.29,-294.4 315.53,-733.47 460.38,-1031.83l234.72 -520.82c40.93,-97.32 89.22,-174.5 24.27,-279.11 -46.01,-74.13 -155.48,-113.07 -268.34,-66.19 -174,72.28 -356.27,147.4 -528.82,226.91 -85.38,39.34 -173.68,75.52 -257.49,110.79 -87.33,36.75 -173.33,80.31 -261.84,115.54 -89.02,35.42 -178.82,73.68 -266.89,111.27 -329.15,140.45 -280.13,193.48 -385.96,-178.36l-275.65 -912.41c-29.11,-100.82 -59.98,-202.94 -92.99,-303.27 -60.74,-184.59 -78.53,-456.83 -337.34,-453.2 -147.79,2.07 -235.39,131.57 -326.73,261.01 -8.01,11.36 -8.93,16.11 -17.23,29.48l-149.21 200.26c-28.78,41.61 -58.99,75.77 -87.05,115.63l-80.85 112.85c-26.51,39.18 -57.89,75.54 -87.18,115.34l-801.32 1087.01c-15.16,20.71 -28.81,41.76 -43.25,60.46zm2836.55 1342.66c48.26,-18.58 235.57,-457.15 263.44,-529.59 37.2,-96.69 237.4,-492.16 226.48,-558.84 -56.36,-11.27 -305.14,116.41 -372.18,146.09 -453.47,200.72 -396.91,123.2 -327.84,359.06l120.84 404.22c17.23,57.19 25.59,168.59 89.26,179.06z"/>
          </g>
        </svg>
      </span>
    </div>

    <!-- Dropdown de Seleção de Perfil Operacional (Quem está operando) -->
    <div class="operator-selector-container" id="operator-selector-wrapper">
      <button id="operator-dropdown-btn" type="button" class="operator-dropdown-btn" aria-haspopup="true" aria-expanded="false" aria-label="Selecionar perfil do operador" title="Clique para alternar o perfil de quem está operando">
        <div class="operator-info-wrap">
          <div class="operator-name-row">
            <span class="operator-active-name" id="operator-active-name">Aline Rocha</span>
            <span class="operator-company-badge" id="operator-active-company">SPOT</span>
          </div>
          <span class="operator-active-role" id="operator-active-role">Gestora de Tráfego</span>
        </div>
        <span class="operator-dropdown-arrow" aria-hidden="true">▾</span>
      </button>

      <div id="operator-dropdown-menu" class="operator-dropdown-menu" role="menu" aria-label="Perfis de Operação da Conta">
        <div class="operator-menu-header">
          <span>OPERAR COMO:</span>
          <span class="operator-menu-sub">Supercérebro Housewhey &amp; SPOT</span>
        </div>
        <div class="operator-menu-list" role="none">
          <button type="button" class="operator-menu-item active" data-operator-id="p_aline" role="menuitem" aria-selected="true">
            <div class="operator-menu-item-info">
              <div class="operator-menu-item-top">
                <span class="operator-menu-item-name">Aline Rocha</span>
                <span class="operator-company-badge">SPOT</span>
              </div>
              <span class="operator-menu-item-role">Gestora de Tráfego</span>
            </div>
            <span class="operator-check-icon" aria-hidden="true">✓</span>
          </button>

          <button type="button" class="operator-menu-item" data-operator-id="p_carolina" role="menuitem" aria-selected="false">
            <div class="operator-menu-item-info">
              <div class="operator-menu-item-top">
                <span class="operator-menu-item-name">Carolina Mendes</span>
                <span class="operator-company-badge">SPOT</span>
              </div>
              <span class="operator-menu-item-role">Gerente de Contas</span>
            </div>
            <span class="operator-check-icon" aria-hidden="true">✓</span>
          </button>

          <button type="button" class="operator-menu-item" data-operator-id="p_marcos" role="menuitem" aria-selected="false">
            <div class="operator-menu-item-info">
              <div class="operator-menu-item-top">
                <span class="operator-menu-item-name">Marcos Silva</span>
                <span class="operator-company-badge" style="background: rgba(245, 154, 25, 0.15); color: #B36200; border-color: rgba(245, 154, 25, 0.4);">HW</span>
              </div>
              <span class="operator-menu-item-role">Head de Marketing</span>
            </div>
            <span class="operator-check-icon" aria-hidden="true">✓</span>
          </button>

          <button type="button" class="operator-menu-item" data-operator-id="p_luiza" role="menuitem" aria-selected="false">
            <div class="operator-menu-item-info">
              <div class="operator-menu-item-top">
                <span class="operator-menu-item-name">Luiza Valente</span>
                <span class="operator-company-badge" style="background: rgba(30, 107, 86, 0.15); color: #1E6B56; border-color: rgba(30, 107, 86, 0.4);">HW</span>
              </div>
              <span class="operator-menu-item-role">Atendimento &amp; Vendas</span>
            </div>
            <span class="operator-check-icon" aria-hidden="true">✓</span>
          </button>
        </div>
      </div>
    </div>

    <div class="header-actions">
      <div class="header-status">
        <div id="system-status-badge" class="status-badge" aria-live="polite">
          ● v${CONTRACTS_VERSION}
        </div>
      </div>
    </div>
  </header>

  <!-- Janela Principal Elevada — Central de Operações -->
  <div class="blueprint-outer-wrapper">
    <div class="blueprint-card">
      <div class="blueprint-card-header">
        <span>CENTRAL DE OPERAÇÕES</span>
        <span id="execution-validation-msg" role="alert" aria-live="polite" style="color: var(--warning); display: none; font-size: 0.75rem; font-family: var(--font-mono);">
          ⚠ Preencha o objetivo ou selecione um cenário para executar.
        </span>
      </div>

      <div class="blueprint-grid">

        <!-- REGIÃO 1: ICON RAIL (Left Navigation Rail) -->
        <nav class="icon-rail-column" aria-label="Navegação por Atalhos">
          <button class="rail-btn active" type="button" title="Chat Operacional &amp; IA" aria-label="Chat Operacional">
            💬
          </button>
          <button class="rail-btn" type="button" title="Fila de Tarefas &amp; Pendências" aria-label="Fila de Tarefas">
            📋
          </button>
          <button class="rail-btn" type="button" title="Palco Operacional &amp; Criativos" aria-label="Palco de Criativos">
            👁️
          </button>
          <div class="rail-divider"></div>
          <button class="rail-btn" type="button" title="Trajetória &amp; DAG Determinística" aria-label="Trajetória">
            ⚡
          </button>
          <button class="rail-btn" type="button" title="Inspector &amp; Auditoria Formal" aria-label="Inspector">
            🔍
          </button>
        </nav>

        <!-- REGIÃO 2: TASK QUEUE / MESA DE CONTROLE (Left-Center) -->
        <section class="controls-column" id="pane-controls" aria-label="Mesa de Controle e Parâmetros">
          <div class="controls-header">
            <span>Controles</span>
          </div>

          <div class="controls-content">
            <!-- Model Selection -->
            <div class="control-group">
              <label for="model-select" class="control-label">Modelo LLM</label>
              <select id="model-select" aria-label="Modelo LLM">
                ${modelsOptions}
              </select>
            </div>

            <!-- Action Buttons: Comparar & Reset -->
            <div class="controls-action-box">
              <div style="display: flex; gap: 6px; width: 100%;">
                <button id="btn-compare" class="btn-primary" type="button" aria-label="Comparar Basic vs Governed" style="flex: 1; justify-content: center; padding: 7px 10px; font-size: var(--label); font-weight: 600;">
                  <span>⚖</span> Comparar
                </button>
                <button id="btn-reset" class="btn-secondary" type="button" aria-label="Resetar Sessão" style="width: auto; min-width: 65px; justify-content: center; padding: 7px 10px; font-size: var(--label);">
                  <span>↺</span> Reset
                </button>
              </div>
            </div>

            <!-- Key Management Card (BYOK) -->
            <div id="key-bar" role="region" aria-label="Gerenciamento de chave de API em memória" class="controls-key-box">
              <div class="key-inputs" style="display: flex; flex-direction: column; gap: 5px; width: 100%;">
                <label for="api-key-input" class="control-label">Chave de API (BYOK)</label>
                <input
                  type="password"
                  id="api-key-input"
                  placeholder="Cole Gemini ou OpenRouter"
                  autocomplete="off"
                  spellcheck="false"
                  style="width: 100%;"
                />
                <div style="display: flex; gap: 5px; width: 100%;">
                  <button id="btn-save-key" type="button" class="btn-secondary" style="flex: 1; justify-content: center; font-size: var(--micro); padding: 5px 8px;">
                    Definir
                  </button>
                  <button id="btn-forget-key" type="button" class="btn-danger" style="flex: 1; justify-content: center; font-size: var(--micro); padding: 5px 8px;">
                    Esquecer
                  </button>
                </div>
              </div>
              <div id="key-status" style="margin-top: 2px;">
                <span id="key-status-text">Sem chave salva (Insira sua API Key)</span>
              </div>
            </div>

            <!-- Fila de Pendências Operacionais -->
            <div class="task-queue-section" id="task-queue-section">
              <div class="control-label">Pendências</div>
              <div id="operator-pendencies-list">
                <div class="task-card-item">
                  <div class="task-card-header">
                    <span class="task-card-title">Pausar Criativos Fracos</span>
                  </div>
                  <div class="task-card-meta">Exige proposta formal de Carolina Mendes e aprovação de Marcos Silva (S5)</div>
                  <button type="button" class="task-card-btn" disabled="disabled" style="opacity: 0.65; cursor: not-allowed;">
                    Aguardando Proposta
                  </button>
                </div>
              </div>
            </div>

          </div>
        </section>

        <!-- REGIÃO 3: ASSISTANT WORKSPACE (Center Conversation) -->
        <section class="chat-column" id="pane-chat" aria-label="AdzChat Agentico">
          <div class="chat-header">
            <div style="display: flex; align-items: center; gap: 10px;">
              <button id="btn-chat-back" class="btn-chat-back" type="button" aria-label="Voltar para a tela principal do chat" title="Voltar para a tela principal com dados limpos" style="display: none;">
                <span style="font-size: 0.9rem; line-height: 1;">←</span>
                <span>Voltar</span>
              </button>
              <div class="chat-agent-info">
                <div class="chat-agent-name">AdzHub AI</div>
              </div>
            </div>
            <span id="chat-status-badge" class="status-badge" aria-live="polite" style="display: none;"></span>
          </div>

          <div class="chat-body" id="chat-stream-body">

            <!-- Estado Vazio / Inicial Estilo Welcome Hero -->
            <div id="chat-empty-state" style="margin: auto; text-align: center; color: var(--ink-muted); padding: 32px 14px; max-width: 540px; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
              <div class="turn-status-badge" style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 16px; border-radius: 9999px; background: rgba(37, 99, 235, 0.07); border: 1px solid rgba(37, 99, 235, 0.18); color: var(--navy-ink, #1e3a8a); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(37, 99, 235, 0.06);">
                <span style="width: 7px; height: 7px; border-radius: 50%; background-color: #2563eb; display: inline-block; box-shadow: 0 0 8px rgba(37, 99, 235, 0.6);"></span>
                <span>PRONTA PARA O SEU TURNO</span>
              </div>
              <h2 id="chat-welcome-title" style="font-family: var(--font-display); font-size: 2.6rem; font-weight: 700; color: var(--ink-strong); margin-bottom: 16px; letter-spacing: -0.02em; line-height: 1.15;">
                <span id="chat-greeting-prefix">Bom dia</span>, <span id="chat-operator-name" style="color: #2563eb;">Aline</span>.
              </h2>
              <p style="font-size: 1.05rem; color: var(--ink-muted); line-height: 1.5; margin: 0; max-width: 440px;">
                Estou aqui e pronta para cuidar da operação com você.<br/>Diga o que precisa acontecer.
              </p>
            </div>

            <!-- Feed de Conversa Contínua (Chat Real com Histórico) -->
            <div id="chat-messages-container" style="display: flex; flex-direction: column; gap: 14px; width: 100%;"></div>

            <!-- Containers & Templates Estáticos (Compatibilidade de Testes) -->
            <div id="chat-static-templates" style="display: none;">
              <div id="chat-loading-state" class="spinner"><p id="chat-loading-text"></p></div>
              <div class="user-bubble-container" id="user-bubble-box"><div class="user-bubble" id="chat-user-message-text"></div></div>
              <div class="agent-steps-stream" id="agent-steps-stream-box">
                <div class="step-item" id="step-reasoning-1"><span class="step-icon">💡</span><div class="step-text" id="step-reasoning-1-text"></div></div>
                <div class="step-item" id="step-tools-1"><span class="step-icon">🔧</span><div class="step-text"><span class="step-tool-tag" id="step-tool-1-name"></span><span class="step-tool-tag" id="step-tool-2-name"></span><div class="step-obs" id="step-tools-1-obs"></div></div></div>
                <div class="step-item" id="step-reasoning-2"><span class="step-icon">💡</span><div class="step-text" id="step-reasoning-2-text"></div></div>
                <div class="step-item" id="step-tools-2"><span class="step-icon">🔧</span><div class="step-text"><span class="step-tool-tag" id="step-tool-3-name"></span><span class="step-tool-tag" id="step-tool-4-name"></span><div class="step-obs" id="step-tools-2-obs"></div></div></div>
              </div>
              <div id="chat-result-container" class="agent-response-box">
                <div id="chat-conclusion-text"></div>
                <div id="chat-ctas-action-card"><div class="cta-badge-ready" id="badge-ctas-ready">✨ 3 CTAs prontos</div><span id="chat-ctas-target"></span><div class="cta-suggestions-container" id="chat-ctas-list"><div class="cta-suggestion-item"><span class="cta-num">1</span><span id="cta-item-1"></span></div><div class="cta-suggestion-item"><span class="cta-num">2</span><span id="cta-item-2"></span></div><div class="cta-suggestion-item"><span class="cta-num">3</span><span id="cta-item-3"></span></div></div></div>
                <div id="chat-approval-card"><button id="btn-approve-action"></button><button id="btn-reject-action"></button></div>
                <div id="chat-limitations-container"><ul id="chat-limitations-list"></ul></div>
                <div id="chat-question-container"><div id="chat-question-text"></div><div id="chat-evidencerefs-list"></div></div>
              </div>
              <div id="chat-error-state"><h4 id="chat-error-title"></h4><p id="chat-error-message"></p></div>
              <div id="chat-blocked-state"><h4>🔒 Ação Bloqueada por Política</h4><p id="chat-blocked-message"></p><div id="chat-blocked-missing-condition"><span id="chat-blocked-condition-text"></span></div></div>
            </div>

          </div>

          <!-- Bottom Composer (Input Card) -->
          <div class="chat-input-wrapper">
            <div class="form-group" style="display: none;">
              <textarea id="task-goal-input"></textarea>
            </div>
            <div class="chat-composer-card">
              <div class="chat-input-row">
                <textarea
                  id="chat-interactive-input"
                  rows="1"
                  placeholder="Escreva o que precisa que eu faça..."
                  autocomplete="off"
                  style="resize: none;"
                ></textarea>
                <button id="btn-chat-send" class="btn-send-round" type="button" aria-label="Enviar / Executar Tarefa" disabled>
                  ↑
                </button>
              </div>
            </div>
            <div class="chat-composer-hint" style="text-align: center; margin-top: 8px; font-size: 0.75rem; color: var(--ink-muted); font-family: var(--font-primary);">
              Shift + Enter cria uma nova linha
            </div>
          </div>
        </section>

        <!-- REGIÃO 4: CONTEXT PANEL / PALCO OPERACIONAL (Right Panel) -->
        <section class="stage-column" id="pane-palco" aria-label="Palco Operacional da Conta">
          <div class="stage-header">
            <div class="stage-title">
              <span class="stage-title-main" id="stage-account-title">Palco Operacional</span>
            </div>
          </div>

          <div class="stage-content" id="stage-cards-container">
            <!-- Estado Inicial / Aguardando Observações -->
            <div id="stage-empty-state" style="margin: auto; text-align: center; color: var(--ink-muted); padding: 28px 14px;">
              <div style="font-size: 1.6rem; margin-bottom: 6px; opacity: 0.6;">👁️</div>
              <div style="font-weight: 600; color: var(--ink-strong); font-size: 0.875rem; margin-bottom: 3px;">Nenhuma observação ativa</div>
              <div style="font-size: var(--label); color: var(--ink-muted); max-width: 220px; margin: 0 auto; line-height: 1.4;">Execute uma ação no chat para projetar dados da conta em tempo real.</div>
            </div>

            <!-- Criativos em Observação -->
            <!-- Dynamic Card 1: UGC Oferta A -->
            <div class="stage-card" id="card-ugc-oferta" style="display: none;">
              <div class="stage-card-top">
                <span class="stage-card-name">UGC - Oferta A</span>
                <span class="tag-pill tag-status-paused" id="badge-ugc-status">Pausado</span>
              </div>
              <div class="stage-card-tags" id="tags-ugc-oferta">
                <span class="tag-pill tag-hook-strong">Hook Forte</span>
                <span class="tag-pill tag-cta-bad">CTA Ruim</span>
                <span class="tag-pill tag-cta-good">Meta Ads</span>
              </div>
              <div class="stage-card-metrics">
                <span>Spend: R$ 850</span>
                <span>CPA: R$ 94,50</span>
                <span>CTR: 1.2%</span>
              </div>
            </div>

            <!-- Dynamic Card 2: Hook Prova Social -->
            <div class="stage-card" id="card-hook-social" style="display: none;">
              <div class="stage-card-top">
                <span class="stage-card-name">Hook - Prova social</span>
                <span class="tag-pill tag-status-active" id="badge-hook-status">Ativo</span>
              </div>
              <div class="stage-card-tags" id="tags-hook-social">
                <span class="tag-pill tag-hook-strong">Hook Forte</span>
                <span class="tag-pill tag-cta-good">CTA Bom</span>
                <span class="tag-pill tag-hook-strong">Alta Conversão</span>
              </div>
              <div class="stage-card-metrics">
                <span>Spend: R$ 1.200</span>
                <span>CPA: R$ 42,10</span>
                <span>CTR: 2.8%</span>
              </div>
            </div>

            <!-- Dynamic Card 3: Carousel FAQ -->
            <div class="stage-card" id="card-carousel-faq" style="display: none;">
              <div class="stage-card-top">
                <span class="stage-card-name">Carousel - FAQ</span>
                <span class="tag-pill tag-status-paused" id="badge-faq-status">Pausado</span>
              </div>
              <div class="stage-card-tags" id="tags-carousel-faq">
                <span class="tag-pill tag-hook-weak">Hook Fraco</span>
                <span class="tag-pill tag-cta-bad">CTA Ruim</span>
                <span class="tag-pill tag-cta-bad">Fadiga</span>
              </div>
              <div class="stage-card-metrics">
                <span>Spend: R$ 430</span>
                <span>CPA: R$ 112,00</span>
                <span>CTR: 0.9%</span>
              </div>
            </div>

            <!-- Métricas Meta Ads -->
            <div class="stage-card" id="card-meta-metrics" style="display: none;">
              <div class="stage-card-top">
                <span class="stage-card-name">Meta Ads — Tráfego Pago (Agosto/2026)</span>
                <span class="tag-pill tag-status-active" id="badge-meta-status">Ativo</span>
              </div>
              <div class="stage-card-tags" id="tags-meta-metrics">
                <span class="tag-pill tag-hook-strong">Investimento: R$ 4.280,00</span>
                <span class="tag-pill tag-cta-good">ROAS: 3.48x</span>
                <span class="tag-pill tag-cta-good">184.200 Impressões</span>
              </div>
              <div class="stage-card-metrics">
                <span>Whey Isolado (CPA R$ 48,00)</span>
                <span>Creatina Creapure (CPA R$ 38,50)</span>
              </div>
            </div>

            <!-- CRM HubSpot & Vendas -->
            <div class="stage-card" id="card-crm-metrics" style="display: none;">
              <div class="stage-card-top">
                <span class="stage-card-name">HubSpot CRM — Vendas &amp; Reconciliação</span>
                <span class="tag-pill tag-status-active" id="badge-crm-status">62 Deals</span>
              </div>
              <div class="stage-card-tags" id="tags-crm-metrics">
                <span class="tag-pill tag-hook-strong">Receita: R$ 14.890,00</span>
                <span class="tag-pill tag-cta-good">Ticket Médio: R$ 240,16</span>
                <span class="tag-pill tag-cta-good" id="tag-crm-utm">Cobertura UTM: 86.4%</span>
              </div>
              <div class="stage-card-metrics" id="metrics-crm-details">
                <span>48 Vendas Aprovadas</span>
                <span>8 Abandonos</span>
                <span>6 Boletos Pendentes</span>
              </div>
            </div>

            <!-- Supercérebro Contexto -->
            <div class="stage-card" id="card-brain-context" style="display: none;">
              <div class="stage-card-top">
                <span class="stage-card-name">Supercérebro — Memória &amp; Governança</span>
                <span class="tag-pill" style="background: var(--surface-soft); color: var(--ink-strong); border-color: var(--line);" id="badge-brain-status">Mem0 Graph</span>
              </div>
              <div id="brain-card-details" style="font-size: var(--micro); color: var(--ink); margin-top: 2px; display: flex; flex-direction: column; gap: 2px; font-family: var(--font-primary); line-height: 1.35;">
                <div><strong>Aline Rocha:</strong> Gestora · <strong>Marcos Silva:</strong> Head Ops</div>
                <div><strong>Política:</strong> Escrita externa requer aprovação expressa.</div>
              </div>
            </div>

            <!-- Summary Bar no Palco (Oculto) -->
            <div style="display: none;">
              <span id="stage-summary-text">Palco sincronizado com os dados da conta</span>
              <button id="btn-inspect-contract" class="btn-secondary" type="button">
                📜 Inspecionar Contrato
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>

    <!-- Flow Sequence Pills (Rodapé) -->
    <div class="flow-sequence-bar" id="flow-sequence-container">
      <span class="flow-pill active" id="flow-pill-user">🔘 Pedido do usuário</span>
      <span class="flow-pill-arrow">→</span>
      <span class="flow-pill" id="flow-pill-reasoning-1">🔘 Raciocínio</span>
      <span class="flow-pill-arrow">→</span>
      <span class="flow-pill" id="flow-pill-tool-read">🔘 Tool - ler dados</span>
      <span class="flow-pill-arrow">→</span>
      <span class="flow-pill" id="flow-pill-reasoning-2">🔘 Raciocínio</span>
      <span class="flow-pill-arrow">→</span>
      <span class="flow-pill" id="flow-pill-tool-action">🔘 Tool - agir</span>
      <span class="flow-pill-arrow">→</span>
      <span class="flow-pill" id="flow-pill-response">🔘 Resposta</span>
    </div>
  </div>

  <!-- Hidden / Offscreen Elements for Test Suite & Invariant Compatibility -->
  <div class="hidden-storage-panel">
    <main id="app-layout" role="main">
      <nav id="mobile-nav" role="tablist">
        <button id="tab-chat" class="active" role="tab" aria-selected="true" aria-controls="pane-chat" type="button">Chat</button>
        <button id="tab-trajectory" role="tab" aria-selected="false" aria-controls="pane-trajectory" type="button">Trajetória</button>
        <button id="tab-inspector" role="tab" aria-selected="false" aria-controls="pane-inspector" type="button">Inspector</button>
      </nav>

      <section id="pane-trajectory" class="panel">
        <div id="trajectory-metrics" aria-live="polite">0 eventos</div>
        <div id="trajectory-empty-state">Nenhum evento</div>
        <ul id="trajectory-list" tabindex="0" role="listbox"></ul>
      </section>

      <section id="pane-inspector" class="panel">
        <div id="inspector-empty-state">Inspector vazio</div>
        <div id="inspector-details" style="display: none;">
          <h4 id="inspector-title"></h4>
          <span id="inspector-id-badge"></span>
          <div id="inspector-tabs">
            <button id="inspector-tab-structured" class="active">Estruturado</button>
            <button id="inspector-tab-json">JSON</button>
          </div>
          <div id="inspector-view-structured"><div id="inspector-structured-content"></div></div>
          <div id="inspector-view-json" style="display: none;"><pre id="inspector-payload"></pre></div>
        </div>
      </section>
    </main>

    <!-- Export Buttons -->
    <button id="btn-export-trace-json" type="button">Export Trace JSON</button>
    <button id="btn-export-report-md" type="button">Export Report MD</button>
    <button id="btn-export-comparison-json" type="button">Export Comparison JSON</button>
    <button id="btn-export-comparison-md" type="button">Export Comparison MD</button>
  </div>

  <!-- Modal Comparador (M6-07) -->
  <div id="comparison-modal" role="dialog" aria-modal="true" aria-labelledby="comparison-title">
    <div class="comparison-modal-content">
      <div style="padding: 14px 20px; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; background: var(--surface-soft);">
        <h3 id="comparison-title" style="color: var(--ink-strong); font-family: var(--font-display); font-size: 0.9375rem; font-weight: 600;">⚖ Comparador Científico: Basic (ReAct) × Governed (PEV-C)</h3>
        <button id="btn-close-comparison" class="btn-secondary" type="button" style="padding: 5px 12px; font-size: var(--label);">✕ Fechar</button>
      </div>
      <div style="padding: 20px; overflow-y: auto;">
        <div id="comparison-loading" style="display: none; align-items: center; justify-content: center; gap: 8px; padding: 24px;">
          <div class="spinner"></div>
          <span style="font-family: var(--font-mono); font-size: var(--label); color: var(--ink-muted);">Executando comparação determinística...</span>
        </div>
        <div id="comparison-results" style="display: none;">
          <div id="comparison-summary-card" style="padding: 14px; background: var(--surface-soft); border: 1px solid var(--line); border-radius: var(--radius-control); margin-bottom: 14px;"></div>
          <table class="comparison-table" id="comparison-table-element">
            <thead>
              <tr>
                <th>Métrica / Critério</th>
                <th>Basic (ReAct Baseline)</th>
                <th>Governed (PEV-C)</th>
                <th>Vantagem / Integridade</th>
              </tr>
            </thead>
            <tbody id="comparison-tbody"></tbody>
          </table>
          <div id="comparison-highlights-card" style="margin-top: 12px;"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Client-side Logic -->
  <script>
    window.applyQuickPrompt = function (promptText) {
      if (!promptText) return;
      const interactiveInput = document.getElementById('chat-interactive-input');
      const goalInput = document.getElementById('task-goal-input');
      const btnChatSend = document.getElementById('btn-chat-send');

      if (interactiveInput) {
        interactiveInput.value = promptText;
        try {
          interactiveInput.dispatchEvent(new Event('input', { bubbles: true }));
          interactiveInput.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (_) {}
      }
      if (goalInput) {
        goalInput.value = promptText;
        try {
          goalInput.dispatchEvent(new Event('input', { bubbles: true }));
          goalInput.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (_) {}
      }
      if (btnChatSend) {
        btnChatSend.disabled = false;
        btnChatSend.removeAttribute('disabled');
        btnChatSend.setAttribute('aria-disabled', 'false');
      }
      if (typeof window._validateExecution === 'function') {
        window._validateExecution();
      }
      if (interactiveInput) {
        interactiveInput.focus();
      }
      if (typeof window._executeCurrentRun === 'function') {
        window._executeCurrentRun();
      }
    };

    (function () {
      const modeSelect = document.getElementById('mode-select');
      const modelSelect = document.getElementById('model-select');
      const goalInput = document.getElementById('task-goal-input');
      const interactiveInput = document.getElementById('chat-interactive-input');
      const btnChatSend = document.getElementById('btn-chat-send');
      const btnCompare = document.getElementById('btn-compare');
      const btnReset = document.getElementById('btn-reset');
      const btnChatBack = document.getElementById('btn-chat-back');
      const apiKeyInput = document.getElementById('api-key-input');
      const btnSaveKey = document.getElementById('btn-save-key');
      const btnForgetKey = document.getElementById('btn-forget-key');
      const keyStatusText = document.getElementById('key-status-text');
      const validationMsg = document.getElementById('execution-validation-msg');
      const chatStatusBadge = document.getElementById('chat-status-badge');
      const comparisonModal = document.getElementById('comparison-modal');
      const btnCloseComparison = document.getElementById('btn-close-comparison');
      const comparisonLoading = document.getElementById('comparison-loading');
      const comparisonResults = document.getElementById('comparison-results');
      const comparisonSummaryCard = document.getElementById('comparison-summary-card');
      const comparisonTbody = document.getElementById('comparison-tbody');
      const comparisonHighlightsCard = document.getElementById('comparison-highlights-card');
      const trajectoryList = document.getElementById('trajectory-list');
      const trajectoryMetrics = document.getElementById('trajectory-metrics');

      window.applyQuickPrompt = function (promptText) {
        if (!promptText) return;
        if (interactiveInput) {
          interactiveInput.value = promptText;
          try {
            interactiveInput.dispatchEvent(new Event('input', { bubbles: true }));
            interactiveInput.dispatchEvent(new Event('change', { bubbles: true }));
          } catch (_) {}
        }
        if (goalInput) {
          goalInput.value = promptText;
          try {
            goalInput.dispatchEvent(new Event('input', { bubbles: true }));
            goalInput.dispatchEvent(new Event('change', { bubbles: true }));
          } catch (_) {}
        }
        if (btnChatSend) {
          btnChatSend.disabled = false;
          btnChatSend.removeAttribute('disabled');
          btnChatSend.setAttribute('aria-disabled', 'false');
        }
        validateExecution();
        if (interactiveInput) {
          interactiveInput.focus();
        }
        if (typeof window._executeCurrentRun === 'function') {
          window._executeCurrentRun();
        }
      };

      const initialKey =
        sessionStorage.getItem('adzhub_session_key') ||
        localStorage.getItem('adzhub_session_key') ||
        (apiKeyInput ? apiKeyInput.value.trim() : '');

      let OPERATOR_PROFILES = ${JSON.stringify(getSupercerebroOperatorProfiles())};

      const sessionState = {
        mode: 'GOVERNED_PEVC',
        model: modelSelect ? modelSelect.value : 'google/gemini-2.5-flash',
        dataset: 'housewhey-canonical-v1',
        scenario: '',
        apiKey: initialKey,
        activeContract: null,
        activeRunId: null,
        events: [],
        selectedEventIndex: -1,
        activeInspectorItem: null,
        inspectorViewMode: 'structured',
        isExecuting: false,
        isReactivated: false,
        isPaused: false,
        delegation: null,
        currentOperator: OPERATOR_PROFILES[0],
        chatHistory: []
      };

      // Restaura operador selecionado previamente
      try {
        const savedOpId = localStorage.getItem('adzhub_active_operator');
        if (savedOpId) {
          const found = OPERATOR_PROFILES.find(function(p) { return p.id === savedOpId; });
          if (found) sessionState.currentOperator = found;
        }
      } catch (e) {}

      function getGreetingPrefix() {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'Bom dia';
        if (hour >= 12 && hour < 18) return 'Boa tarde';
        return 'Boa noite';
      }

      function updateGreetingUI() {
        const op = sessionState.currentOperator || OPERATOR_PROFILES[0];
        const greetingPrefixEl = document.getElementById('chat-greeting-prefix');
        const operatorNameEl = document.getElementById('chat-operator-name');

        if (greetingPrefixEl) {
          greetingPrefixEl.textContent = getGreetingPrefix();
        }
        if (operatorNameEl && op && op.name) {
          const firstName = op.name.split(' ')[0];
          operatorNameEl.textContent = firstName;
        }
      }

      function updateOperatorUI() {
        const op = sessionState.currentOperator || OPERATOR_PROFILES[0];
        const nameEl = document.getElementById('operator-active-name');
        const roleEl = document.getElementById('operator-active-role');
        const compEl = document.getElementById('operator-active-company');
        if (nameEl) nameEl.textContent = op.name;
        if (roleEl) roleEl.textContent = op.role;
        if (compEl) {
          compEl.textContent = op.company;
          if (op.company === 'Housewhey') {
            compEl.style.background = 'rgba(245, 154, 25, 0.15)';
            compEl.style.color = '#B36200';
            compEl.style.borderColor = 'rgba(245, 154, 25, 0.4)';
          } else {
            compEl.style.background = 'var(--navy-soft)';
            compEl.style.color = 'var(--navy-ink)';
            compEl.style.borderColor = 'var(--adzhub-navy-border)';
          }
        }
        updateGreetingUI();

        const menuItems = document.querySelectorAll('.operator-menu-item');
        menuItems.forEach(function(item) {
          if (item.getAttribute('data-operator-id') === op.id) {
            item.classList.add('active');
            item.setAttribute('aria-selected', 'true');
          } else {
            item.classList.remove('active');
            item.setAttribute('aria-selected', 'false');
          }
        });

        // Atualiza dinamicamente as pendências do operador ativo
        const pendenciesListEl = document.getElementById('operator-pendencies-list');
        if (pendenciesListEl) {
          const pendencies = op.pendencies || [];
          if (pendencies.length === 0) {
            pendenciesListEl.innerHTML = '<div style="font-size: var(--micro); color: var(--ink-muted); padding: 8px 0; font-family: var(--font-mono);">Nenhuma pendência para este perfil.</div>';
          } else {
            pendenciesListEl.innerHTML = pendencies.map(function(task) {
              const statusClass = task.statusClass || 'tag-status-paused';
              const cleanStatus = (task.status || '').replace(/🔒/g, '').trim();
              const cleanBtnText = (task.btnText || '').replace(/🔒/g, '').trim();
              const isLocked = cleanStatus.indexOf('Aguardando') !== -1 || cleanBtnText.indexOf('Aguardando') !== -1 || (task.status || '').indexOf('🔒') !== -1 || (task.btnText || '').indexOf('🔒') !== -1;
              const disabledAttr = isLocked ? 'disabled="disabled"' : '';
              const btnStyle = isLocked ? 'style="opacity: 0.65; cursor: not-allowed;"' : '';
              const onclickAttr = isLocked ? '' : 'onclick="window.applyQuickPrompt(decodeURIComponent(this.dataset.taskPrompt))"';

              const showTopTag = Boolean(cleanStatus && cleanStatus !== cleanBtnText && !cleanStatus.startsWith('Aguardando'));

              return '<div class="task-card-item">' +
                '<div class="task-card-header">' +
                  '<span class="task-card-title">' + escapeHtml(task.title) + '</span>' +
                  (showTopTag ? '<span class="tag-pill ' + statusClass + '">' + escapeHtml(cleanStatus) + '</span>' : '') +
                '</div>' +
                '<div class="task-card-meta">' + escapeHtml(task.meta || '') + '</div>' +
                '<button type="button" class="task-card-btn" ' + disabledAttr + ' ' + btnStyle + ' data-task-prompt="' + encodeURIComponent(task.prompt || '') + '" ' + onclickAttr + '>' +
                  escapeHtml(cleanBtnText || 'Executar Tarefa →') +
                '</button>' +
              '</div>';
            }).join('');
          }
        }
      }

      updateOperatorUI();

      // Eventos do Dropdown de Operadores
      const operatorWrapper = document.getElementById('operator-selector-wrapper');
      const operatorBtn = document.getElementById('operator-dropdown-btn');

      if (operatorBtn && operatorWrapper) {
        operatorBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          const isOpen = operatorWrapper.classList.toggle('open');
          operatorBtn.setAttribute('aria-expanded', String(isOpen));
        });

        document.addEventListener('click', function(e) {
          if (!operatorWrapper.contains(e.target)) {
            operatorWrapper.classList.remove('open');
            operatorBtn.setAttribute('aria-expanded', 'false');
          }
        });

        document.addEventListener('keydown', function(e) {
          if (e.key === 'Escape') {
            operatorWrapper.classList.remove('open');
            operatorBtn.setAttribute('aria-expanded', 'false');
          }
        });

        const menuItems = document.querySelectorAll('.operator-menu-item');
        menuItems.forEach(function(btn) {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const opId = btn.getAttribute('data-operator-id');
            const chosen = OPERATOR_PROFILES.find(function(p) { return p.id === opId; });
            if (chosen) {
              sessionState.currentOperator = chosen;
              try {
                localStorage.setItem('adzhub_active_operator', chosen.id);
              } catch (err) {}
              updateOperatorUI();
              operatorWrapper.classList.remove('open');
              operatorBtn.setAttribute('aria-expanded', 'false');
            }
          });
        });
      }

      // Carrega operadores e pendências dinâmicas originárias do Supercérebro
      function loadSupercerebroPendencies() {
        fetch('/api/supercerebro/operators')
          .then(function(res) { return res.json(); })
          .then(function(data) {
            if (data && Array.isArray(data.operators) && data.operators.length > 0) {
              OPERATOR_PROFILES = data.operators;
              const savedOpId = localStorage.getItem('adzhub_active_operator');
              const found = OPERATOR_PROFILES.find(function(p) { return p.id === (savedOpId || sessionState.currentOperator?.id); });
              if (found) sessionState.currentOperator = found;
              updateOperatorUI();
            }
          })
          .catch(function() {});
      }

      loadSupercerebroPendencies();

      // Restaura estado de governança previamente commitado
      fetch('/api/governance/state')
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data && data.isReactivated) sessionState.isReactivated = true;
          if (data && data.isPaused) sessionState.isPaused = true;
          if (data && data.delegation && data.delegation.isDelegated) sessionState.delegation = data.delegation;
          loadSupercerebroPendencies();
        })
        .catch(function() {});

      function setExecutionActive(active) {
        sessionState.isExecuting = Boolean(active);
        if (active) {
          if (interactiveInput) {
            interactiveInput.disabled = true;
            interactiveInput.setAttribute('disabled', 'true');
            interactiveInput.placeholder = 'Orquestrando raciocínio...';
          }
          if (btnChatSend) {
            btnChatSend.disabled = true;
            btnChatSend.setAttribute('disabled', 'true');
            btnChatSend.innerHTML = '<span class="btn-send-spinner"></span>';
            btnChatSend.setAttribute('aria-label', 'Executando tarefa...');
          }
        } else {
          if (interactiveInput) {
            interactiveInput.disabled = false;
            interactiveInput.removeAttribute('disabled');
            interactiveInput.placeholder = 'Peça uma análise ou tarefa (ex: Pause os criativos com CTA ruim e proponha 3 variações)...';
          }
          if (btnChatSend) {
            btnChatSend.disabled = false;
            btnChatSend.removeAttribute('disabled');
            btnChatSend.innerHTML = '↑';
            btnChatSend.setAttribute('aria-label', 'Enviar / Executar Tarefa');
          }
          validateExecution();
        }
      }

      function redactSensitiveData(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(redactSensitiveData);
        const safeObj = {};
        for (const [key, val] of Object.entries(obj)) {
          const lowerKey = key.toLowerCase();
          if (
            lowerKey.includes('key') || lowerKey.includes('token') || lowerKey.includes('secret') ||
            lowerKey.includes('auth') || lowerKey.includes('credential') || lowerKey.includes('password')
          ) {
            safeObj[key] = '[REDACTED_SECRET]';
          } else if (typeof val === 'object' && val !== null) {
            safeObj[key] = redactSensitiveData(val);
          } else {
            safeObj[key] = val;
          }
        }
        return safeObj;
      }

      function updateKeyUI() {
        const key = sessionState.apiKey || (apiKeyInput ? apiKeyInput.value.trim() : '');
        if (key) {
          sessionState.apiKey = key;
          if (keyStatusText) {
            keyStatusText.textContent = 'Chave ativa';
            keyStatusText.style.color = 'var(--success)';
          }
          if (apiKeyInput && apiKeyInput.value !== key) apiKeyInput.value = key;
        } else {
          if (keyStatusText) {
            keyStatusText.textContent = 'Sem chave salva (Insira sua API Key)';
            keyStatusText.style.color = 'var(--ink-muted)';
          }
        }
        validateExecution();
      }

      function validateExecution() {
        if (sessionState.isExecuting) {
          if (btnChatSend) btnChatSend.disabled = true;
          if (interactiveInput) interactiveInput.disabled = true;
          return false;
        }

        // Auto-sincroniza a chave se já estiver digitada no campo
        if (apiKeyInput && apiKeyInput.value.trim() && !sessionState.apiKey) {
          sessionState.apiKey = apiKeyInput.value.trim();
        }

        // Garante que o botão de envio e comparação estejam sempre ativos e disponíveis
        if (btnChatSend) {
          btnChatSend.disabled = false;
          btnChatSend.removeAttribute('disabled');
          btnChatSend.setAttribute('aria-disabled', 'false');
        }
        if (interactiveInput) {
          interactiveInput.disabled = false;
          interactiveInput.removeAttribute('disabled');
        }
        if (btnCompare) {
          btnCompare.disabled = false;
          btnCompare.removeAttribute('disabled');
          btnCompare.setAttribute('aria-disabled', 'false');
        }

        if (validationMsg) {
          validationMsg.style.display = 'none';
        }

        return true;
      }

      function updateChatBadge(status, verified) {
        if (!chatStatusBadge) return;
        if (!status || status === 'IDLE') {
          chatStatusBadge.style.display = 'none';
          return;
        }
        chatStatusBadge.style.display = 'inline-flex';
        chatStatusBadge.className = 'status-badge';

        if (status === 'COMMITTED' || (status === 'COMPLETED' && verified)) {
          chatStatusBadge.className = 'status-badge badge-committed';
          chatStatusBadge.textContent = '✓ COMMITTED';
        } else if (status === 'VERIFYING' || status === 'RUNNING') {
          chatStatusBadge.className = 'status-badge badge-verifying';
          chatStatusBadge.textContent = '⚙ VERIFYING';
        } else if (status === 'QUARANTINED') {
          chatStatusBadge.className = 'status-badge badge-quarantined';
          chatStatusBadge.textContent = '⚠ QUARANTINED';
        } else if (status === 'BLOCKED') {
          chatStatusBadge.className = 'status-badge badge-blocked';
          chatStatusBadge.textContent = '🔒 BLOCKED';
        } else if (status === 'FAILED') {
          chatStatusBadge.className = 'status-badge badge-failed';
          chatStatusBadge.textContent = '❌ FAILED';
        } else if (status === 'PROVISIONAL') {
          chatStatusBadge.className = 'status-badge badge-provisional';
          chatStatusBadge.textContent = '⏳ PROVISIONAL';
        } else {
          chatStatusBadge.style.display = 'none';
        }
      }

      function updateStageActiveBadge() {
        const visibleCards = document.querySelectorAll('.stage-card[data-visible="true"]');
        const count = visibleCards.length;
        const emptyEl = document.getElementById('stage-empty-state');
        const textEl = document.getElementById('stage-live-count');
        if (emptyEl) {
          emptyEl.style.display = count > 0 ? 'none' : 'block';
        }
        if (textEl) {
          textEl.textContent = count + (count === 1 ? ' Observação Ativa' : ' Observações Ativas');
        }
      }

      function showStageCard(cardId, delay) {
        const delayMs = typeof delay === 'number' ? delay : 0;
        const c = document.getElementById(cardId);
        if (!c) return;
        setTimeout(() => {
          c.style.display = 'flex';
          c.setAttribute('data-visible', 'true');
          c.classList.remove('chat-animate-in');
          void c.offsetWidth;
          c.classList.add('chat-animate-in', 'card-pulse-highlight');
          updateStageActiveBadge();
        }, delayMs);
      }

      const ALL_STAGE_CARDS = [
        'card-ugc-oferta',
        'card-hook-social',
        'card-carousel-faq',
        'card-meta-metrics',
        'card-crm-metrics',
        'card-brain-context'
      ];

      function setStageState({ selectedCards = [], observedCards = null, isFinal = false }) {
        const visibleCardIds = isFinal ? (observedCards || selectedCards) : selectedCards;
        const emptyEl = document.getElementById('stage-empty-state');

        ALL_STAGE_CARDS.forEach((id) => {
          const cardEl = document.getElementById(id);
          if (!cardEl) return;

          const isSelected = isFinal ? false : selectedCards.includes(id);
          const isVisible = visibleCardIds.includes(id);

          if (isSelected) {
            if (!cardEl.classList.contains('card-active')) {
              cardEl.classList.add('card-active');
              cardEl.classList.remove('card-pulse-highlight', 'card-success');
              void cardEl.offsetWidth;
              cardEl.classList.add('card-pulse-highlight');
            }
          } else {
            cardEl.classList.remove('card-active', 'card-success', 'card-pulse-highlight');
          }

          if (isVisible) {
            cardEl.style.display = 'flex';
            cardEl.setAttribute('data-visible', 'true');
          } else {
            cardEl.style.display = 'none';
            cardEl.removeAttribute('data-visible');
          }
        });

        if (emptyEl) {
          emptyEl.style.display = visibleCardIds.length > 0 ? 'none' : 'block';
        }

        updateStageActiveBadge();
      }

      function getStageCardMapping(query, scenarioId) {
        function makeMapping(s1, s2, finalSel, finalObs) {
          return {
            step1Selected: s1,
            step2Selected: s2,
            t1Selected: s1,
            t1Observed: s1,
            t2Selected: s2,
            t2Observed: [...s1, ...s2],
            finalSelected: finalSel,
            finalObserved: finalObs
          };
        }

        if (scenarioId === 'S1') {
          return makeMapping(
            ['card-hook-social', 'card-meta-metrics'],
            ['card-crm-metrics'],
            ['card-crm-metrics', 'card-hook-social'],
            ['card-ugc-oferta', 'card-hook-social', 'card-meta-metrics', 'card-crm-metrics']
          );
        } else if (scenarioId === 'S2') {
          return makeMapping(
            ['card-ugc-oferta', 'card-carousel-faq'],
            ['card-crm-metrics'],
            ['card-crm-metrics', 'card-carousel-faq'],
            ['card-ugc-oferta', 'card-carousel-faq', 'card-meta-metrics', 'card-crm-metrics']
          );
        } else if (scenarioId === 'S3') {
          return makeMapping(
            ['card-meta-metrics'],
            ['card-crm-metrics'],
            ['card-meta-metrics', 'card-crm-metrics'],
            ['card-meta-metrics', 'card-crm-metrics']
          );
        } else if (scenarioId === 'S4') {
          return makeMapping(
            ['card-brain-context'],
            ['card-crm-metrics'],
            ['card-brain-context', 'card-crm-metrics'],
            ['card-crm-metrics', 'card-brain-context', 'card-ugc-oferta']
          );
        } else if (scenarioId === 'S5') {
          return makeMapping(
            ['card-ugc-oferta', 'card-hook-social'],
            ['card-brain-context'],
            ['card-brain-context', 'card-hook-social'],
            ['card-ugc-oferta', 'card-hook-social', 'card-carousel-faq', 'card-brain-context']
          );
        }

        const q = (query || '').toLowerCase().trim();

        const isSkills =
          q.includes('skill') ||
          q.includes('skills') ||
          q.includes('pode fazer') ||
          q.includes('capacidade') ||
          q.includes('capacidades') ||
          q.includes('habilidade') ||
          q.includes('habilidades') ||
          q.includes('quais sao') ||
          q.includes('quais são') ||
          q.includes('função') ||
          q.includes('funcoes') ||
          q.includes('ferramenta') ||
          q.includes('ferramentas');

        const isWhatsApp =
          q.includes('whatsapp') ||
          q.includes('whats') ||
          q.includes('zap') ||
          q.includes('conversa') ||
          q.includes('conversas') ||
          q.includes('thread') ||
          q.includes('threads') ||
          q.includes('mensagem') ||
          q.includes('mensagens');

        const isGreeting =
          q === 'oi' ||
          q === 'ola' ||
          q === 'olá' ||
          q === 'opi' ||
          q === 'opa' ||
          q.startsWith('oi ') ||
          q.startsWith('olá ') ||
          q.startsWith('ola ') ||
          q.startsWith('opa ') ||
          q.includes('bom dia') ||
          q.includes('boa tarde') ||
          q.includes('boa noite') ||
          q.includes('quem é você') ||
          q.includes('quem e voce') ||
          q.includes('ajuda') ||
          isSkills;

        if (isGreeting) {
          return makeMapping(
            ['card-brain-context', 'card-meta-metrics'],
            ['card-crm-metrics'],
            ['card-brain-context', 'card-meta-metrics', 'card-crm-metrics'],
            ['card-brain-context', 'card-meta-metrics', 'card-crm-metrics']
          );
        }

        if (isWhatsApp) {
          return makeMapping(
            ['card-brain-context'],
            ['card-crm-metrics'],
            ['card-brain-context', 'card-crm-metrics'],
            ['card-brain-context', 'card-crm-metrics', 'card-meta-metrics']
          );
        }

        const isAnomalyOrCost =
          q.includes('anomalia') ||
          q.includes('aumentou') ||
          q.includes('subiu') ||
          q.includes('cpa') ||
          q.includes('custo por') ||
          q.includes('conversão aumentou') ||
          q.includes('conversao aumentou') ||
          q.includes('investigar');

        if (isAnomalyOrCost) {
          return makeMapping(
            ['card-ugc-oferta', 'card-carousel-faq'],
            ['card-meta-metrics', 'card-crm-metrics'],
            ['card-ugc-oferta', 'card-carousel-faq', 'card-meta-metrics'],
            ['card-ugc-oferta', 'card-carousel-faq', 'card-meta-metrics', 'card-crm-metrics']
          );
        }

        const isCopyOrSuggestions =
          q.includes('sugira') ||
          q.includes('sugest') ||
          q.includes('novos anuncio') ||
          q.includes('novos anúncio') ||
          q.includes('novos criativo') ||
          q.includes('proponha') ||
          q.includes('copy') ||
          q.includes('copys') ||
          q.includes('cópias') ||
          q.includes('chamada') ||
          q.includes('headline') ||
          q.includes('gancho');

        if (isCopyOrSuggestions) {
          return makeMapping(
            ['card-brain-context', 'card-ugc-oferta'],
            ['card-hook-social', 'card-meta-metrics'],
            ['card-brain-context', 'card-hook-social', 'card-ugc-oferta'],
            ['card-brain-context', 'card-ugc-oferta', 'card-hook-social', 'card-meta-metrics']
          );
        }

        const isCtaOrPause =
          q.includes('pause') ||
          q.includes('pausar') ||
          q.includes('desativar') ||
          q.includes('reativar') ||
          q.includes('religar') ||
          q.includes('cta') ||
          q.includes('criativ') ||
          q.includes('ruim') ||
          q.includes('fadiga') ||
          q.includes('novas opç') ||
          q.includes('novas opc') ||
          q.includes('variaç') ||
          q.includes('variac');

        if (isCtaOrPause) {
          return makeMapping(
            ['card-ugc-oferta', 'card-carousel-faq'],
            ['card-hook-social', 'card-brain-context'],
            ['card-ugc-oferta', 'card-hook-social', 'card-brain-context'],
            ['card-ugc-oferta', 'card-hook-social', 'card-carousel-faq', 'card-brain-context']
          );
        }

        const isOmega = q.includes('omega') || q.includes('ômega') || q.includes('ifos');
        const isWhey = q.includes('whey') || q.includes('baunilha') || q.includes('grass');
        const isCreatine = q.includes('creatina') || q.includes('creapure');
        const isCrmOrSales = q.includes('crm') || q.includes('venda') || q.includes('fatur') || q.includes('pedid') || q.includes('deal') || q.includes('ticket') || q.includes('receita') || q.includes('cruzar') || q.includes('realmente vendeu') || q.includes('reconcili');
        const isBrain = q.includes('super') || q.includes('equipe') || q.includes('aline') || q.includes('marcos') || q.includes('governanca') || q.includes('governança') || q.includes('deleg');
        const isMeetingOrRisk = q.includes('reuniao') || q.includes('reunião') || q.includes('pauta') || q.includes('risco') || q.includes('semana') || q.includes('alinhamento');

        if (isOmega) {
          return makeMapping(
            ['card-meta-metrics'],
            ['card-crm-metrics'],
            ['card-meta-metrics', 'card-crm-metrics'],
            ['card-meta-metrics', 'card-crm-metrics']
          );
        } else if (isWhey) {
          return makeMapping(
            ['card-hook-social', 'card-meta-metrics'],
            ['card-ugc-oferta', 'card-crm-metrics'],
            ['card-hook-social', 'card-meta-metrics'],
            ['card-ugc-oferta', 'card-hook-social', 'card-meta-metrics', 'card-crm-metrics']
          );
        } else if (isCreatine) {
          return makeMapping(
            ['card-meta-metrics'],
            ['card-crm-metrics'],
            ['card-meta-metrics', 'card-crm-metrics'],
            ['card-meta-metrics', 'card-crm-metrics']
          );
        } else if (isCrmOrSales) {
          return makeMapping(
            ['card-crm-metrics'],
            ['card-meta-metrics', 'card-crm-metrics'],
            ['card-crm-metrics', 'card-meta-metrics'],
            ['card-crm-metrics', 'card-meta-metrics']
          );
        } else if (isBrain) {
          return makeMapping(
            ['card-brain-context'],
            ['card-meta-metrics'],
            ['card-brain-context', 'card-meta-metrics'],
            ['card-brain-context', 'card-meta-metrics']
          );
        } else if (isMeetingOrRisk) {
          return makeMapping(
            ['card-meta-metrics', 'card-hook-social'],
            ['card-crm-metrics', 'card-brain-context'],
            ['card-meta-metrics', 'card-crm-metrics'],
            ['card-meta-metrics', 'card-crm-metrics', 'card-brain-context']
          );
        } else {
          return makeMapping(
            ['card-brain-context', 'card-meta-metrics'],
            ['card-crm-metrics'],
            ['card-brain-context', 'card-meta-metrics', 'card-crm-metrics'],
            ['card-brain-context', 'card-meta-metrics', 'card-crm-metrics']
          );
        }
      }

      function applyStageContentUpdates(query, scenarioId) {
        const badgeUgc = document.getElementById('badge-ugc-status');
        const badgeHook = document.getElementById('badge-hook-status');
        const badgeFaq = document.getElementById('badge-faq-status');
        const tagsUgc = document.getElementById('tags-ugc-oferta');
        const tagsFaq = document.getElementById('tags-carousel-faq');
        const tagsHook = document.getElementById('tags-hook-social');
        const summary = document.getElementById('stage-summary-text');
        const badgeCrm = document.getElementById('badge-crm-status');
        const tagCrmUtm = document.getElementById('tag-crm-utm');
        const crmMetricsDetails = document.getElementById('metrics-crm-details');
        const badgeBrain = document.getElementById('badge-brain-status');
        const brainCardDetails = document.getElementById('brain-card-details');

        const q = (query || '').toLowerCase().trim();
        const isWhatsApp = q.includes('whatsapp') || q.includes('whats') || q.includes('zap') || q.includes('conversa') || q.includes('thread') || q.includes('mensagem');
        const isSkills = q.includes('skill') || q.includes('pode fazer') || q.includes('capacidade') || q.includes('habilidade') || q.includes('ferramenta');

        if (isWhatsApp) {
          if (badgeBrain) badgeBrain.textContent = 'WhatsApp Sync';
          if (brainCardDetails) {
            brainCardDetails.innerHTML =
              '<div><strong>Thread Wa:</strong> SPOT &lt;&gt; Housewhey Growth (5 msgs)</div>' +
              '<div><strong>Integrantes:</strong> Aline Rocha, Luiza Valente, Carolina Mendes</div>';
          }
        } else if (isSkills) {
          if (badgeBrain) badgeBrain.textContent = 'Skills & Governança';
          if (brainCardDetails) {
            brainCardDetails.innerHTML =
              '<div><strong>Skills:</strong> Meta Ads, CRM HubSpot, PEV-C Governance</div>' +
              '<div><strong>Operador:</strong> ' + (sessionState.currentOperator?.name || 'Aline Rocha') + ' (' + (sessionState.currentOperator?.company || 'SPOT') + ')</div>';
          }
        } else {
          if (badgeBrain) badgeBrain.textContent = 'Mem0 Graph';
          if (brainCardDetails) {
            brainCardDetails.innerHTML =
              '<div><strong>Aline Rocha:</strong> Gestora · <strong>Marcos Silva:</strong> Head Ops</div>' +
              '<div><strong>Política:</strong> Escrita externa requer aprovação expressa.</div>';
          }
        }

        if (scenarioId === 'S1') {
          if (badgeUgc) { badgeUgc.textContent = 'Indisponível (CRM)'; badgeUgc.className = 'tag-pill tag-status-paused'; }
          if (badgeHook) { badgeHook.textContent = 'Ativo (Meta)'; badgeHook.className = 'tag-pill tag-status-active'; }
          if (badgeFaq) { badgeFaq.textContent = 'Ativo (Meta)'; badgeFaq.className = 'tag-pill tag-status-active'; }
          if (tagsUgc) tagsUgc.innerHTML = '<span class="tag-pill tag-hook-strong">Hook Forte</span><span class="tag-pill" style="border-color: #ef4444; color: #f87171;">CRM 503 Outage</span>';
          if (badgeCrm) { badgeCrm.textContent = 'Indisponível (503)'; badgeCrm.className = 'tag-pill tag-status-paused'; }
          if (crmMetricsDetails) crmMetricsDetails.innerHTML = '<span style="color: #f87171;">Falha de conexão com a API de CRM (503 Service Unavailable)</span>';
          if (summary) summary.textContent = 'Aviso: API CRM retornou 503 · Replan em andamento';
        } else if (scenarioId === 'S2') {
          if (badgeUgc) { badgeUgc.textContent = 'Quarentena (UTM)'; badgeUgc.className = 'tag-pill tag-status-paused'; }
          if (badgeFaq) { badgeFaq.textContent = 'Quarentena (UTM)'; badgeFaq.className = 'tag-pill tag-status-paused'; }
          if (tagsUgc) tagsUgc.innerHTML = '<span class="tag-pill" style="border-color: #f97316; color: #fdba74;">Sem UTM (42% cov)</span><span class="tag-pill tag-cta-bad">Não Atribuível</span>';
          if (badgeCrm) { badgeCrm.textContent = 'Quarentena (42% UTM)'; badgeCrm.className = 'tag-pill tag-status-paused'; }
          if (tagCrmUtm) tagCrmUtm.textContent = 'Cobertura UTM: 42% (< 80% threshold)';
          if (crmMetricsDetails) crmMetricsDetails.innerHTML = '<span style="color: #fbbf24;">Dados retidos em quarentena de segurança (sem falsos cortes)</span>';
          if (summary) summary.textContent = 'Aviso: Cobertura UTM < 80% · Retido em Quarentena sem falso corte';
        } else if (scenarioId === 'S3') {
          if (badgeUgc) { badgeUgc.textContent = 'Rejeitado'; badgeUgc.className = 'tag-pill tag-status-paused'; }
          if (tagsUgc) tagsUgc.innerHTML = '<span class="tag-pill" style="border-color: #ef4444; color: #f87171;">Period Mismatch</span>';
          if (summary) summary.textContent = 'Incompatibilidade temporal: Pós-condição determinística rejeitou commit';
        } else if (scenarioId === 'S4') {
          if (badgeUgc) { badgeUgc.textContent = 'Sanitizado'; badgeUgc.className = 'tag-pill tag-status-active'; }
          if (tagsUgc) tagsUgc.innerHTML = '<span class="tag-pill tag-hook-strong">Hook Forte</span><span class="tag-pill" style="border-color: #22c55e; color: #4ade80;">Prompt Injection Blindado</span>';
          if (summary) summary.textContent = 'Segurança: Dados não-confiáveis do CRM tratados estritamente como texto passivo';
        } else if (scenarioId === 'S5') {
          if (badgeUgc) { badgeUgc.textContent = 'Pausa Bloqueada'; badgeUgc.className = 'tag-pill tag-status-paused'; }
          if (badgeFaq) { badgeFaq.textContent = 'Pausa Bloqueada'; badgeFaq.className = 'tag-pill tag-status-paused'; }
          if (tagsUgc) tagsUgc.innerHTML = '<span class="tag-pill tag-hook-strong">Hook Forte</span><span class="tag-pill" style="border-color: #ef4444; color: #f87171;">APPROVAL_REQUIRED</span>';
          if (summary) summary.textContent = 'Capability Broker: Escrita externa bloqueada (exige aprovação humana expressa)';
        } else if (sessionState.isReactivated) {
          if (badgeUgc) { badgeUgc.textContent = 'ATIVO (REATIVADO)'; badgeUgc.className = 'tag-pill tag-status-active'; }
          if (badgeHook) { badgeHook.textContent = 'ATIVO (CAMPEÃO)'; badgeHook.className = 'tag-pill tag-status-active'; }
          if (badgeFaq) { badgeFaq.textContent = 'ATIVO (REATIVADO)'; badgeFaq.className = 'tag-pill tag-status-active'; }
          if (tagsUgc) tagsUgc.innerHTML = '<span class="tag-pill tag-hook-strong">HOOK FORTE 8.5</span><span class="tag-pill tag-status-active">REATIVADO</span><span class="tag-pill" style="border-color: #22c55e; color: #4ade80;">CPA R$ 94,50</span>';
          if (tagsFaq) tagsFaq.innerHTML = '<span class="tag-pill tag-hook-weak">HOOK 4.2</span><span class="tag-pill tag-status-active">REATIVADO</span><span class="tag-pill" style="border-color: #22c55e; color: #4ade80;">COMMIT SQLITE</span>';
          if (tagsHook) tagsHook.innerHTML = '<span class="tag-pill tag-hook-strong">HOOK FORTE 8.8</span><span class="tag-pill tag-cta-good">CTA BOM 8.5</span><span class="tag-pill" style="border-color: #22c55e; color: #4ade80;">CPA R$ 42,10</span>';
          if (badgeCrm) { badgeCrm.textContent = '62 Deals'; badgeCrm.className = 'tag-pill tag-status-active'; }
          if (tagCrmUtm) tagCrmUtm.textContent = 'Cobertura UTM: 86.4%';
          if (crmMetricsDetails) crmMetricsDetails.innerHTML = '<span>48 Vendas Aprovadas</span><span>8 Abandonos</span><span>6 Boletos Pendentes</span>';
          if (summary) summary.textContent = 'Palco: Reativação commitada no SQLite (100% Ativos)';
        } else if (sessionState.isPaused) {
          if (badgeUgc) { badgeUgc.textContent = 'PAUSADO (COMMIT)'; badgeUgc.className = 'tag-pill tag-status-paused'; }
          if (badgeHook) { badgeHook.textContent = 'ATIVO (CAMPEÃO)'; badgeHook.className = 'tag-pill tag-status-active'; }
          if (badgeFaq) { badgeFaq.textContent = 'PAUSADO (COMMIT)'; badgeFaq.className = 'tag-pill tag-status-paused'; }
          if (tagsUgc) tagsUgc.innerHTML = '<span class="tag-pill tag-cta-weak">CTA 4.0</span><span class="tag-pill tag-status-paused">PAUSADO</span><span class="tag-pill" style="border-color: #ef4444; color: #f87171;">COMMIT SQLITE</span>';
          if (tagsFaq) tagsFaq.innerHTML = '<span class="tag-pill tag-hook-weak">HOOK 4.2</span><span class="tag-pill tag-status-paused">PAUSADO</span><span class="tag-pill" style="border-color: #ef4444; color: #f87171;">COMMIT SQLITE</span>';
          if (tagsHook) tagsHook.innerHTML = '<span class="tag-pill tag-hook-strong">HOOK FORTE 8.8</span><span class="tag-pill tag-cta-good">CTA BOM 8.5</span><span class="tag-pill" style="border-color: #22c55e; color: #4ade80;">CPA R$ 42,10</span>';
          if (badgeCrm) { badgeCrm.textContent = '62 Deals'; badgeCrm.className = 'tag-pill tag-status-active'; }
          if (tagCrmUtm) tagCrmUtm.textContent = 'Cobertura UTM: 86.4%';
          if (crmMetricsDetails) crmMetricsDetails.innerHTML = '<span>48 Vendas Aprovadas</span><span>8 Abandonos</span><span>6 Boletos Pendentes</span>';
          if (summary) summary.textContent = 'Palco: Pausa de criativos saturados commitada no SQLite';
        } else {
          const q = (query || '').toLowerCase().trim();

          const isGreeting =
            q === 'oi' ||
            q === 'ola' ||
            q === 'olá' ||
            q.startsWith('oi ') ||
            q.startsWith('olá ') ||
            q.startsWith('ola ') ||
            q.includes('bom dia') ||
            q.includes('boa tarde') ||
            q.includes('boa noite') ||
            q.includes('quem é você') ||
            q.includes('quem e voce') ||
            q.includes('ajuda');

          if (isGreeting) {
            if (summary) summary.textContent = 'AdzHub AI pronto para diagnósticos de tráfego, CRM e governança';
            return;
          }

          const isAnomalyOrCost =
            q.includes('anomalia') ||
            q.includes('aumentou') ||
            q.includes('subiu') ||
            q.includes('cpa') ||
            q.includes('custo por') ||
            q.includes('conversão aumentou') ||
            q.includes('conversao aumentou') ||
            q.includes('investigar');

          if (isAnomalyOrCost) {
            if (badgeUgc) { badgeUgc.textContent = 'CPA ALTO (R$ 94,50)'; badgeUgc.className = 'tag-pill tag-status-paused'; }
            if (badgeHook) { badgeHook.textContent = 'ATIVO (CPA R$ 42,10)'; badgeHook.className = 'tag-pill tag-status-active'; }
            if (badgeFaq) { badgeFaq.textContent = 'FADIGA (CPA R$ 112)'; badgeFaq.className = 'tag-pill tag-status-paused'; }
            if (tagsUgc) tagsUgc.innerHTML = '<span class="tag-pill tag-hook-strong">HOOK 8.5</span><span class="tag-pill tag-cta-bad">CTA RUIM 4.0</span><span class="tag-pill" style="border-color: #ef4444; color: #f87171;">CPA +125%</span>';
            if (tagsFaq) tagsFaq.innerHTML = '<span class="tag-pill tag-hook-weak">HOOK FRACO 4.2</span><span class="tag-pill tag-cta-bad">FADIGA 2.65X</span><span class="tag-pill" style="border-color: #f59e0b; color: #fbbf24;">CPA R$ 112</span>';
            if (summary) summary.textContent = 'Palco: Anomalias de CPA e fadiga criativa isoladas';
            return;
          }

          const isMeetingOrRisk =
            q.includes('reuniao') ||
            q.includes('reunião') ||
            q.includes('pauta') ||
            q.includes('risco') ||
            q.includes('semana') ||
            q.includes('alinhamento');

          if (isMeetingOrRisk) {
            if (summary) summary.textContent = 'Palco: Pauta executiva e resumo semanal sincronizados';
            return;
          }

          const isCtaOrCreative =
            q.includes('cta') ||
            q.includes('criativ') ||
            q.includes('ruim') ||
            q.includes('paus') ||
            q.includes('anunc') ||
            q.includes('hook') ||
            q.includes('copy') ||
            q.includes('ugc') ||
            q.includes('faq');

          if (badgeUgc) { badgeUgc.textContent = isCtaOrCreative ? 'PAUSADO (CTA RUIM)' : 'Pausado'; badgeUgc.className = 'tag-pill tag-status-paused'; }
          if (badgeHook) { badgeHook.textContent = 'ATIVO (CAMPEÃO)'; badgeHook.className = 'tag-pill tag-status-active'; }
          if (badgeFaq) { badgeFaq.textContent = isCtaOrCreative ? 'PAUSADO (FADIGA 2.65X)' : 'Pausado'; badgeFaq.className = 'tag-pill tag-status-paused'; }
          if (tagsUgc) tagsUgc.innerHTML = '<span class="tag-pill tag-hook-strong">HOOK FORTE 8.5</span><span class="tag-pill tag-cta-bad">CTA RUIM 4.0</span><span class="tag-pill" style="border-color: #ef4444; color: #f87171;">CPA R$ 94,50</span>';
          if (tagsFaq) tagsFaq.innerHTML = '<span class="tag-pill tag-hook-weak">HOOK FRACO 4.2</span><span class="tag-pill tag-cta-bad">CTA RUIM 3.8</span><span class="tag-pill" style="border-color: #f59e0b; color: #fbbf24;">FADIGA 2.65X</span>';
          if (tagsHook) tagsHook.innerHTML = '<span class="tag-pill tag-hook-strong">HOOK FORTE 8.8</span><span class="tag-pill tag-cta-good">CTA BOM 8.5</span><span class="tag-pill" style="border-color: #22c55e; color: #4ade80;">CPA R$ 42,10</span>';
          if (badgeCrm) { badgeCrm.textContent = '62 Deals'; badgeCrm.className = 'tag-pill tag-status-active'; }
          if (tagCrmUtm) tagCrmUtm.textContent = 'Cobertura UTM: 86.4%';
          if (crmMetricsDetails) crmMetricsDetails.innerHTML = '<span>48 Vendas Aprovadas</span><span>8 Abandonos</span><span>6 Boletos Pendentes</span>';
          if (summary) summary.textContent = 'Palco sincronizado com os dados da conta';
        }
      }

      function hideAllStageCards() {
        setStageState({ selectedCards: [], isFinal: false });
      }

      function updateStageForScenario(scenarioId) {
        const goalVal = (interactiveInput?.value || goalInput?.value || '').trim();
        applyStageContentUpdates(goalVal, scenarioId);
        const mapping = getStageCardMapping(goalVal, scenarioId);
        setStageState({ selectedCards: mapping.finalSelected, observedCards: mapping.finalObserved, isFinal: true });
      }

      function updateStageForQuery(query, scenarioId) {
        applyStageContentUpdates(query, scenarioId);
        const mapping = getStageCardMapping(query, scenarioId);
        setStageState({ selectedCards: mapping.finalSelected, observedCards: mapping.finalObserved, isFinal: true });
      }

      function inspectItem(title, payload, idBadge) {
        sessionState.activeInspectorItem = { title, payload, idBadge };
        const inspTitle = document.getElementById('inspector-title');
        const inspPayload = document.getElementById('inspector-payload');
        const inspDetails = document.getElementById('inspector-details');
        const inspEmpty = document.getElementById('inspector-empty-state');
        if (inspEmpty) inspEmpty.style.display = 'none';
        if (inspDetails) inspDetails.style.display = 'block';
        if (inspTitle) inspTitle.textContent = title;

        const safe = redactSensitiveData(payload);
        if (inspPayload) inspPayload.textContent = JSON.stringify(safe, null, 2);
      }

      window.inspectEvidence = function (claimId, payload) {
        inspectItem('EvidenceRef — ' + claimId, payload, claimId);
      };

      window.inspectClaim = function (claimId) {
        const found = sessionState.events.find(e => e.payload && (e.payload.claimId === claimId || e.payload.tool === claimId));
        inspectItem('Claim / Evidência — ' + claimId, found || { claimId }, claimId);
      };

      function formatMarkdownToHtml(raw) {
        if (!raw) return '';
        let text = String(raw).trim();

        // 1. Sanitização básica contra XSS
        text = text
          .split('&').join('&amp;')
          .split('<').join('&lt;')
          .split('>').join('&gt;');

        // 2. Negritos, itálicos e código inline
        text = text.replace(new RegExp('[*]{3}(.+?)[*]{3}', 'g'), '<strong><em>$1</em></strong>');
        text = text.replace(new RegExp('[*]{2}(.+?)[*]{2}', 'g'), '<strong style="color: var(--ink-strong); font-weight: 600;">$1</strong>');
        text = text.replace(new RegExp('(^|[^*])[*]([^*]+)[*]([^*]|$)', 'g'), '$1<em>$2</em>$3');
        const bt = String.fromCharCode(96);
        text = text.replace(new RegExp(bt + '([^' + bt + ']+)' + bt, 'g'), '<code style="background: var(--surface-soft); padding: 2px 6px; border-radius: var(--radius-small); font-family: var(--font-mono); font-size: var(--micro); color: var(--ink-strong); border: 1px solid var(--line);">$1</code>');

        // 3. Processamento linha a linha
        const lines = text.split(String.fromCharCode(10));
        const out = [];
        let inOl = false;
        let inUl = false;

        for (let i = 0; i < lines.length; i++) {
          const rawLine = lines[i];
          const line = (rawLine || '').trim();

          if (!line) {
            if (inOl) { out.push('</ol>'); inOl = false; }
            if (inUl) { out.push('</ul>'); inUl = false; }
            continue;
          }

          // Divisores horizontais (ex: ---, --, ***)
          if (/^[-*_]{2,}$/.test(line)) {
            if (inOl) { out.push('</ol>'); inOl = false; }
            if (inUl) { out.push('</ul>'); inUl = false; }
            out.push('<hr style="border: none; border-top: 1px dashed var(--line); margin: 12px 0;" />');
            continue;
          }

          // Headers (ex: #, ##, ###, ####)
          if (line.startsWith('#')) {
            if (inOl) { out.push('</ol>'); inOl = false; }
            if (inUl) { out.push('</ul>'); inUl = false; }

            if (line.startsWith('#### ')) {
              out.push('<h5 style="margin: 12px 0 4px; color: var(--ink-strong); font-family: var(--font-display); font-size: var(--body); font-weight: 600;">' + line.slice(5) + '</h5>');
            } else if (line.startsWith('### ')) {
              out.push('<h4 style="margin: 14px 0 6px; color: var(--ink-strong); font-family: var(--font-display); font-size: var(--body); font-weight: 600;">' + line.slice(4) + '</h4>');
            } else if (line.startsWith('## ')) {
              out.push('<h3 style="margin: 16px 0 8px; color: var(--ink-strong); font-family: var(--font-display); font-size: 0.9375rem; font-weight: 600; letter-spacing: -0.02em;">' + line.slice(3) + '</h3>');
            } else if (line.startsWith('# ')) {
              out.push('<h2 style="margin: 18px 0 10px; color: var(--ink-strong); font-family: var(--font-display); font-size: 1.0625rem; font-weight: 600; letter-spacing: -0.02em;">' + line.slice(2) + '</h2>');
            } else {
              out.push('<p style="margin: 6px 0; line-height: 1.6; color: var(--ink); font-family: var(--font-primary); font-size: var(--body);">' + line + '</p>');
            }
            continue;
          }

          // Match de Lista Numerada (ex: 1. Item)
          const olMatch = /^([0-9]+)\\.\\s+(.*)$/.exec(line);
          // Match de Lista de Tópicos (ex: - Item, * Item, • Item)
          const ulMatch = /^[-*•]\\s+(.*)$/.exec(line);

          if (olMatch) {
            if (inUl) { out.push('</ul>'); inUl = false; }
            if (!inOl) {
              out.push('<ol style="padding-left: 20px; margin: 8px 0; display: flex; flex-direction: column; gap: 6px;">');
              inOl = true;
            }
            out.push('<li style="line-height: 1.6; color: var(--ink); font-family: var(--font-primary); font-size: var(--body);">' + olMatch[2] + '</li>');
          } else if (ulMatch) {
            if (inOl) { out.push('</ol>'); inOl = false; }
            if (!inUl) {
              out.push('<ul style="padding-left: 20px; margin: 8px 0; display: flex; flex-direction: column; gap: 6px; list-style-type: disc;">');
              inUl = true;
            }
            out.push('<li style="line-height: 1.6; color: var(--ink); font-family: var(--font-primary); font-size: var(--body);">' + ulMatch[1] + '</li>');
          } else {
            if (inOl) { out.push('</ol>'); inOl = false; }
            if (inUl) { out.push('</ul>'); inUl = false; }
            out.push('<p style="margin: 6px 0; line-height: 1.6; color: var(--ink); font-family: var(--font-primary); font-size: var(--body);">' + line + '</p>');
          }
        }

        if (inOl) out.push('</ol>');
        if (inUl) out.push('</ul>');

        return out.join('');
      }

      let turnCounter = 0;

      function escapeHtml(str) {
        if (!str) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }

      function getClientTrace(goal, scenarioId) {
        const q = (goal || '').toLowerCase().trim();

        if (scenarioId === 'S1') {
          return {
            step1: {
              reasoningText: 'Consultar métricas de criativos no Meta Ads e dados de conversão.',
              tools: ['meta_ads:get_creatives', 'meta_ads:get_metrics'],
              observation: 'Campanhas ativas · 184.200 impressões no período'
            },
            step2: {
              reasoningText: 'Tentar conexão com API do CRM e identificar falha 503.',
              tools: ['hubspot:get_deals', 'error_attributor:diagnose'],
              observation: 'Falha 503 no CRM · Replan acionado sem falso corte'
            }
          };
        }
        if (scenarioId === 'S2') {
          return {
            step1: {
              reasoningText: 'Auditar parâmetros de rastreamento UTM e integridade dos dados.',
              tools: ['audit_utm_tags', 'meta_ads:inspect_creatives'],
              observation: 'Cobertura UTM em 42% (< 80% threshold de segurança)'
            },
            step2: {
              reasoningText: 'Reter decisões em quarentena determinística para evitar alucinação.',
              tools: ['quarantine_broker:retain', 'format_analytical_output'],
              observation: 'Dados retidos em quarentena de segurança'
            }
          };
        }

        const isSkills =
          q.includes('skill') ||
          q.includes('skills') ||
          q.includes('pode fazer') ||
          q.includes('capacidade') ||
          q.includes('capacidades') ||
          q.includes('habilidade') ||
          q.includes('habilidades') ||
          q.includes('quais sao') ||
          q.includes('quais são') ||
          q.includes('função') ||
          q.includes('funcoes') ||
          q.includes('ferramenta') ||
          q.includes('ferramentas');

        if (isSkills) {
          return {
            step1: {
              reasoningText: 'Mapear catálogo de capacidades, ferramentas e skills do Supercérebro.',
              tools: ['get_supercerebro_skills', 'read_memory_context'],
              observation: 'Capacidades de Tráfego (Meta), CRM (HubSpot), Governança (PEV-C) e Memória ativas'
            },
            step2: {
              reasoningText: 'Sincronizar manifesto de ferramentas e regras da conta Housewhey.',
              tools: ['get_dataset_manifest', 'format_analytical_output'],
              observation: 'Skills sincronizadas e prontas para uso'
            }
          };
        }

        const isWhatsApp =
          q.includes('whatsapp') ||
          q.includes('whats') ||
          q.includes('zap') ||
          q.includes('conversa') ||
          q.includes('conversas') ||
          q.includes('thread') ||
          q.includes('threads') ||
          q.includes('mensagem') ||
          q.includes('mensagens');

        if (isWhatsApp) {
          return {
            step1: {
              reasoningText: 'Consultar histórico de conversas do WhatsApp no banco de dados e memória Mem0.',
              tools: ['memory:get_whatsapp_threads', 'read_memory_context'],
              observation: 'Thread "SPOT <> Housewhey Growth Team" localizada com 5 mensagens'
            },
            step2: {
              reasoningText: 'Sincronizar diálogos operacionais entre Aline Rocha, Luiza Valente e Carolina Mendes.',
              tools: ['supercerebro:graph', 'format_conversational_output'],
              observation: '5 registros de WhatsApp recuperados e auditados com carimbo de data/hora'
            }
          };
        }

        const isGreeting =
          q === 'oi' ||
          q === 'ola' ||
          q === 'olá' ||
          q.startsWith('oi ') ||
          q.startsWith('olá ') ||
          q.startsWith('ola ') ||
          q.startsWith('opa ') ||
          q.includes('bom dia') ||
          q.includes('boa tarde') ||
          q.includes('boa noite') ||
          q.includes('quem é você') ||
          q.includes('quem e voce') ||
          q.includes('o que você faz') ||
          q.includes('o que voce faz') ||
          q.includes('ajuda');

        if (isGreeting) {
          return {
            step1: {
              reasoningText: 'Identificar contexto da conta Housewhey e perfil do operador.',
              tools: ['read_memory_context', 'get_account_profile'],
              observation: 'Conta Housewhey & Agência SPOT conectadas'
            },
            step2: {
              reasoningText: 'Formular saudação e listar capacidades operacionais disponíveis.',
              tools: ['adzhub_agent:greet', 'format_conversational_output'],
              observation: 'Pronto para executar diagnósticos de tráfego, CRM e governança'
            }
          };
        }

        const isAnomalyOrCost =
          q.includes('anomalia') ||
          q.includes('aumentou') ||
          q.includes('subiu') ||
          q.includes('cpa') ||
          q.includes('custo por') ||
          q.includes('conversão aumentou') ||
          q.includes('conversao aumentou') ||
          q.includes('investigar');

        if (isAnomalyOrCost) {
          return {
            step1: {
              reasoningText: 'Analisar histórico de campanhas e identificar picos de custo por aquisição.',
              tools: ['meta_ads:get_anomalies', 'calculate_cpa_variance'],
              observation: 'Identificado aumento no CPA dos criativos fatigados (R$ 94,50 e R$ 112,00)'
            },
            step2: {
              reasoningText: 'Isolar fatores causais entre fadiga de criativo, CTR em queda e falhas de checkout.',
              tools: ['diagnose_creative_fatigue', 'crm_dropout_analysis'],
              observation: '2 anúncios com fadiga severa (frequência > 2.5x) e 8 abandonos de carrinho'
            }
          };
        }

        const isMeetingOrRisk =
          q.includes('reuniao') ||
          q.includes('reunião') ||
          q.includes('pauta') ||
          q.includes('risco') ||
          q.includes('semana') ||
          q.includes('alinhamento');

        if (isMeetingOrRisk) {
          return {
            step1: {
              reasoningText: 'Consolidar métricas de tráfego pago, reconciliação de CRM e decisões recentes da conta.',
              tools: ['weekly_digest:aggregate', 'read_memory_context'],
              observation: 'Dados consolidados de 01 a 20 de Agosto · Reconciliação 86.4%'
            },
            step2: {
              reasoningText: 'Estruturar pauta executiva com métricas, anomalias e pontos de governança.',
              tools: ['executive_agenda_builder', 'format_analytical_output'],
              observation: 'Pauta semanal gerada com 4 blocos executivos e riscos mapeados'
            }
          };
        }

        const isCrmOrSales =
          q.includes('crm') ||
          q.includes('venda') ||
          q.includes('fatur') ||
          q.includes('deal') ||
          q.includes('pedido') ||
          q.includes('ticket') ||
          q.includes('receita') ||
          q.includes('cruzar') ||
          q.includes('realmente vendeu') ||
          q.includes('reconcili');

        if (isCrmOrSales) {
          return {
            step1: {
              reasoningText: 'Consultar base de leads, pedidos e faturamento no HubSpot CRM.',
              tools: ['read_memory:spot_context', 'crm:get_leads'],
              observation: '62 pedidos auditados · R$ 14.890 faturados · 48 vendas aprovadas'
            },
            step2: {
              reasoningText: 'Reconciliar tags UTM do Meta Ads com as vendas reais registradas no CRM.',
              tools: ['utm_normalizer', 'reconcile_meta_crm'],
              observation: 'Reconciliação concluída: 86.4% de cobertura UTM · ROAS real 3.48x'
            }
          };
        }

        const isCopyOrCreative =
          q.includes('sugira') ||
          q.includes('sugest') ||
          q.includes('novos anuncio') ||
          q.includes('novos anúncio') ||
          q.includes('novos criativo') ||
          q.includes('proponha novos') ||
          q.includes('copys') ||
          q.includes('cópias') ||
          q.includes('copy') ||
          q.includes('headline') ||
          q.includes('gancho');

        if (isCopyOrCreative) {
          return {
            step1: {
              reasoningText: 'Consultar diferenciais clean label no Supercérebro e métricas de criativos.',
              tools: ['supercerebro:get_product_specs', 'meta_ads:inspect_creatives'],
              observation: 'Diferenciais Housewhey recuperados · Análise de criativos campeões'
            },
            step2: {
              reasoningText: 'Formatar variações de copy, ganchos de conversão e chamadas para ação (CTAs).',
              tools: ['copy_generator:propose_ctas', 'format_analytical_output'],
              observation: '3 variações estratégicas formuladas (Pureza, Longevidade e Oferta)'
            }
          };
        }

        const isCtaOrPause =
          q.includes('pause') ||
          q.includes('pausar') ||
          q.includes('desativar') ||
          q.includes('reativar') ||
          q.includes('religar') ||
          q.includes('cta') ||
          q.includes('criativ') ||
          q.includes('ruim') ||
          q.includes('fadiga') ||
          q.includes('novas opç') ||
          q.includes('novas opc') ||
          q.includes('variaç') ||
          q.includes('variac');

        if (isCtaOrPause) {
          return {
            step1: {
              reasoningText: 'Inspecionar criativos no Meta Ads e scores de Hook e CTA.',
              tools: ['meta_ads:inspect_creatives', 'get_cta_diagnostics'],
              observation: '3 anúncios auditados · UGC Oferta A e FAQ com CTA fraco (nota < 4.0)'
            },
            step2: {
              reasoningText: 'Gerar 3 variações de CTA de alta conversão e preparar rascunho de pausa.',
              tools: ['copy_generator:propose_ctas', 'staging_writer:draft'],
              observation: '3 CTAs formulados · Proposta de governança estruturada'
            }
          };
        }

        const isTeam =
          !isCopyOrCreative &&
          (q.includes('equipe') ||
          q.includes('time') ||
          q.includes('membro') ||
          q.includes('colaborad') ||
          q.includes('deleg') ||
          q.includes('atribu') ||
          q.includes('aline') ||
          q.includes('marcos') ||
          q.includes('carolina') ||
          q.includes('luiza') ||
          q.includes('supercérebro') ||
          q.includes('supercerebro') ||
          q.includes('govern'));

        if (isTeam) {
          return {
            step1: {
              reasoningText: 'Consultar hierarquia da empresa, governança e memórias no Supercérebro.',
              tools: ['read_memory_context', 'get_supercerebro_hierarchy'],
              observation: 'Hierarquia SPOT/Housewhey sincronizada · Marcos Silva e Aline Rocha'
            },
            step2: {
              reasoningText: 'Orquestrar autorizações da hierarquia e formalizar fluxo de governança.',
              tools: ['governed_pevc:eval', 'delegate_task'],
              observation: 'Proposta formal de governança vinculada com permissões auditadas'
            }
          };
        }

        const isOmega = q.includes('omega') || q.includes('ômega') || q.includes('ifos');
        if (isOmega) {
          return {
            step1: {
              reasoningText: 'Consultar specs e métricas da Campanha Ômega 3 Ultra IFOS.',
              tools: ['read_memory:omega3', 'meta_ads:get_insights'],
              observation: 'Campanha ativa · R$ 3.100 spend · CPA R$ 68,00'
            },
            step2: {
              reasoningText: 'Verificar certificações de pureza e laudos IFOS no Mapa da Solução.',
              tools: ['get_mapa_solucao', 'verify_certifications'],
              observation: 'Selo IFOS 5★ validado · Retenção 7.0'
            }
          };
        }

        const isWhey = q.includes('whey') || q.includes('baunilha') || q.includes('grass');
        if (isWhey) {
          return {
            step1: {
              reasoningText: 'Consultar métricas da Linha Whey Isolado e criativos ativos.',
              tools: ['read_memory:whey', 'meta_ads:campaign_insights'],
              observation: 'R$ 2.450 spend · 51 vendas · CPA R$ 48,00'
            },
            step2: {
              reasoningText: 'Cruzar performance de criativos e matéria-prima Glanbia Grass-Fed.',
              tools: ['creative_analysis:scores', 'crm:reconcile_sales'],
              observation: 'Hook Prova Social campeão ativo (CPA R$ 42,10)'
            }
          };
        }

        const isCreatine = q.includes('creatina') || q.includes('creapure');
        if (isCreatine) {
          return {
            step1: {
              reasoningText: 'Consultar métricas e diferenciais da Creatina Creapure.',
              tools: ['read_memory:creapure', 'meta_ads:get_insights'],
              observation: 'R$ 1.830 spend · CPA R$ 38,50 · 100% Creapure'
            },
            step2: {
              reasoningText: 'Verificar rastreabilidade de laudo lote a lote no Mapa da Solução.',
              tools: ['get_mapa_solucao', 'cross_crm_orders'],
              observation: 'Matéria-prima alemã certificada'
            }
          };
        }

        return {
          step1: {
            reasoningText: 'Consultar memórias da conta e dataset canônico Housewhey.',
            tools: ['read_memory_context', 'get_dataset_manifest'],
            observation: 'Contexto Housewhey sincronizado'
          },
          step2: {
            reasoningText: 'Gerar análise técnica fundamentada com dados reconciliados.',
            tools: ['governed_pevc:eval', 'format_analytical_output'],
            observation: 'Conclusão auditada com evidências rastreáveis'
          }
        };
      }

      function createChatTurn(userGoal) {
        turnCounter++;
        const turnId = 'turn_' + turnCounter + '_' + Date.now();
        const container = document.getElementById('chat-messages-container');
        if (!container) return { turnId: 'fallback' };

        const trace = getClientTrace(userGoal, sessionState.scenario);

        const turnHtml =
          '<div class="chat-turn" id="' + turnId + '" style="display: flex; flex-direction: column; gap: 12px; width: 100%;">' +
            '<!-- Mensagem do Usuário -->' +
            '<div class="user-bubble-container chat-animate-in">' +
              '<div class="user-bubble">' +
                escapeHtml(userGoal) +
              '</div>' +
            '</div>' +
            '<!-- Stream de Raciocínio & Tools da Rodada -->' +
            '<div class="agent-steps-stream" id="steps-stream-' + turnId + '" style="display: none;">' +
              '<div class="step-item" id="step-r1-' + turnId + '" style="display: none;">' +
                '<span class="step-icon">💡</span>' +
                '<div class="step-text" id="step-r1-text-' + turnId + '">' + escapeHtml(trace.step1.reasoningText) + '</div>' +
              '</div>' +
              '<div class="step-item" id="step-t1-' + turnId + '" style="display: none;">' +
                '<span class="step-icon">🔧</span>' +
                '<div class="step-text">' +
                  '<span class="step-tool-tag" id="step-tool1-' + turnId + '">' + escapeHtml(trace.step1.tools[0] || 'read_memory_context') + '</span>' +
                  '<span class="step-tool-tag" id="step-tool2-' + turnId + '">' + escapeHtml(trace.step1.tools[1] || 'get_dataset_manifest') + '</span>' +
                  '<div class="step-obs" id="step-t1-obs-' + turnId + '">' + escapeHtml(trace.step1.observation) + '</div>' +
                '</div>' +
              '</div>' +
              '<div class="step-item" id="step-r2-' + turnId + '" style="display: none;">' +
                '<span class="step-icon">💡</span>' +
                '<div class="step-text" id="step-r2-text-' + turnId + '">' + escapeHtml(trace.step2.reasoningText) + '</div>' +
              '</div>' +
              '<div class="step-item" id="step-t2-' + turnId + '" style="display: none;">' +
                '<span class="step-icon">🔧</span>' +
                '<div class="step-text">' +
                  '<span class="step-tool-tag" id="step-tool3-' + turnId + '">' + escapeHtml(trace.step2.tools[0] || 'governed_pevc:eval') + '</span>' +
                  '<span class="step-tool-tag" id="step-tool4-' + turnId + '">' + escapeHtml(trace.step2.tools[1] || 'format_analytical_output') + '</span>' +
                  '<div class="step-obs" id="step-t2-obs-' + turnId + '">' + escapeHtml(trace.step2.observation) + '</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<!-- Loading Spinner da Rodada -->' +
            '<div id="loading-' + turnId + '" style="display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 8px; margin: 8px auto; padding: 16px;" aria-live="polite">' +
              '<div class="spinner"></div>' +
              '<h4 style="font-family: var(--font-display); color: var(--ink-strong); font-size: 1.0625rem; font-weight: 600; margin: 0;">Harness orquestrando agente...</h4>' +
              '<p id="loading-text-' + turnId + '" style="font-size: var(--label); font-family: var(--font-mono); color: var(--ink-muted); margin: 0;">Executando passos de raciocínio e verificações determinísticas...</p>' +
            '</div>' +
            '<!-- Container da Resposta Final da Rodada -->' +
            '<div id="response-' + turnId + '" class="agent-response-box chat-animate-in" style="display: none;"></div>' +
          '</div>';

        container.insertAdjacentHTML('beforeend', turnHtml);
        return { turnId: turnId };
      }

      function renderTurnStructuredAnswer(turnId, answer, queryText) {
        const loadEl = document.getElementById('loading-' + turnId);
        if (loadEl) loadEl.style.display = 'none';

        const respEl = document.getElementById('response-' + turnId);
        if (!respEl) return;
        respEl.style.display = 'flex';

        const qLower = (queryText || answer.question || '').toLowerCase();
        const concLower = (answer.conclusion || answer.error || '').toLowerCase();

        const wantsCtas =
          qLower.includes('proponha cta') ||
          qLower.includes('novos cta') ||
          qLower.includes('crie cta') ||
          qLower.includes('gere cta') ||
          qLower.includes('sugestão de cta') ||
          qLower.includes('sugira cta') ||
          qLower.includes('novas cop') ||
          qLower.includes('novos textos') ||
          (qLower.includes('cta') && (qLower.includes('proponha') || qLower.includes('crie') || qLower.includes('novo') || qLower.includes('sugira')));

        const isQueryState =
          qLower.includes('quem') ||
          qLower.includes('qual') ||
          qLower.includes('quais') ||
          qLower.includes('recebeu') ||
          qLower.includes('enviad') ||
          qLower.includes('enviou') ||
          qLower.includes('ficou') ||
          qLower.includes('como está') ||
          qLower.includes('foi enviada') ||
          qLower.includes('status') ||
          qLower.includes('saber se') ||
          qLower.includes('saber') ||
          qLower.includes('verificar') ||
          qLower.includes('aconteceu') ||
          (qLower.includes('?') && !qLower.includes('delegar') && !qLower.includes('atribuir') && !qLower.includes('pausar agora') && !qLower.includes('reativar agora'));

        const isInformationalQuery =
          isQueryState ||
          qLower.includes('me fale') ||
          qLower.includes('fale mais') ||
          qLower.includes('resumo') ||
          qLower.includes('quem é') ||
          qLower.includes('quais') ||
          qLower.includes('conte') ||
          qLower.includes('explique') ||
          qLower.includes('o que') ||
          qLower.includes('qual') ||
          qLower.includes('por que') ||
          qLower.includes('porque') ||
          qLower.includes('como está') ||
          qLower.includes('sobre o') ||
          qLower.includes('sobre a') ||
          qLower.includes('ajuda') ||
          qLower.startsWith('oi') ||
          qLower.startsWith('olá') ||
          qLower.startsWith('ola') ||
          qLower.startsWith('opi') ||
          qLower.startsWith('opa');

        const isDevolutivaAction =
          !isInformationalQuery &&
          (qLower.includes('devolutiva') ||
            qLower.includes('devolver') ||
            qLower.includes('despacho') ||
            (qLower.includes('aprova') && (qLower.includes('pausa') || qLower.includes('proposta'))));

        const isDelegationAction =
          !isInformationalQuery &&
          (isDevolutivaAction ||
            qLower.includes('deleg') ||
            qLower.includes('atribu') ||
            qLower.includes('escreva essa proposta') ||
            qLower.includes('escreva a proposta') ||
            (qLower.includes('proposta') && (qLower.includes('escreva') || qLower.includes('crie') || qLower.includes('elabore') || qLower.includes('formalize') || qLower.includes('envie') || qLower.includes('mandar'))));

        let targetPerson = 'Aline Rocha';
        if (isDevolutivaAction) {
          if (qLower.includes('aline')) targetPerson = 'Aline Rocha';
          else if (qLower.includes('luiza')) targetPerson = 'Luiza Valente';
          else targetPerson = 'Carolina Mendes';
        } else if (qLower.includes('marcos')) {
          targetPerson = 'Marcos Silva';
        } else if (qLower.includes('carolina') || qLower.includes('carol')) {
          targetPerson = 'Carolina Mendes';
        } else if (qLower.includes('luiza')) {
          targetPerson = 'Luiza Valente';
        } else if (qLower.includes('aline')) {
          targetPerson = 'Aline Rocha';
        }

        const isPauseAction = !isInformationalQuery && (qLower.includes('pause') || qLower.includes('pausar') || qLower.includes('desativar'));
        const isReactivation = !isInformationalQuery && (qLower.includes('reativar') || qLower.includes('religar') || qLower.includes('despausar') || qLower.includes('ativar'));

        const isExplicitActionRequested =
          !isInformationalQuery &&
          (isDelegationAction ||
          isPauseAction ||
          isReactivation ||
          qLower.includes('executar') ||
          qLower.includes('confirmar') ||
          qLower.includes('aprovar') ||
          qLower.includes('remanejar') ||
          qLower.includes('substituir'));

        const isActionRequired =
          !isInformationalQuery &&
          (isExplicitActionRequested ||
           concLower.includes('proposta formal de alteração operacional') ||
           concLower.includes('documento de devolutiva') ||
           concLower.includes('proposta de reativação operacional') ||
           concLower.includes('confirmar no botão') ||
           concLower.includes('card de governança') ||
           concLower.includes('painel de governança abaixo') ||
           concLower.includes('aguardando confirmação') ||
           concLower.includes('aguardando aprovação'));

        let effectiveStatus = answer.status || 'COMMITTED';
        let effectiveVerified = Boolean(answer.verified);

        if (answer.status === 'BLOCKED') {
          effectiveStatus = 'BLOCKED';
          effectiveVerified = false;
          respEl.innerHTML =
            '<div style="background: var(--danger-soft); border: 1px solid var(--danger); border-radius: var(--radius-control); padding: 14px; font-size: var(--label); width: 100%;" aria-live="assertive">' +
              '<h4 style="color: #8F2D36; margin-bottom: 4px; font-family: var(--font-display); font-weight: 600;">🔒 Ação Bloqueada por Política (Capability Broker)</h4>' +
              '<p style="color: var(--ink); margin: 0 0 8px;">' + escapeHtml(answer.error || 'Escrita externa não autorizada sem aprovação humana expressa (S5).') + '</p>' +
              '<div style="font-size: var(--micro); font-family: var(--font-mono); padding: 6px 10px; background: rgba(255,255,255,0.7); border-radius: var(--radius-small); border-left: 3px solid var(--danger);">' +
                '<strong>Condição faltante:</strong> Aprovação humana expressa com escopo e prazo definidos para escrita externa.' +
              '</div>' +
            '</div>';
          updateChatBadge(effectiveStatus, effectiveVerified);
          return;
        }

        if (answer.status === 'FAILED') {
          effectiveStatus = 'FAILED';
          effectiveVerified = false;
          respEl.innerHTML =
            '<div style="background: var(--danger-soft); border: 1px solid var(--danger); border-radius: var(--radius-control); padding: 14px; font-size: var(--label); width: 100%;" aria-live="assertive">' +
              '<h4 style="color: #8F2D36; margin-bottom: 4px; font-family: var(--font-display); font-weight: 600;">❌ Falha de Execução / Pós-condição</h4>' +
              '<p style="color: var(--ink); margin: 0;">' + escapeHtml(answer.error || 'Erro na execução da tarefa.') + '</p>' +
            '</div>';
          updateChatBadge(effectiveStatus, effectiveVerified);
          return;
        }

        let innerHtml =
          '<div class="response-header-line" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">' +
            '<div style="display: flex; align-items: center; gap: 8px;">' +
              '<span style="color: var(--success); font-weight: 700;">✓</span>' +
              '<span style="font-family: var(--font-display); font-weight: 600; color: var(--ink-strong);">Diagnóstico &amp; Resposta AdzHub AI</span>' +
            '</div>' +
          '</div>' +
          '<div style="line-height: 1.6; font-size: var(--body); color: var(--ink); margin: 6px 0;">' +
            formatMarkdownToHtml(answer.conclusion || 'Execução finalizada.') +
          '</div>';

        if (wantsCtas && answer.status !== 'QUARANTINED') {
          let ctaTargetText = 'Para: <strong>Criativos de E-commerce</strong>';
          let item1 = '<strong>CTA 1:</strong> "Garanta seu suplemento clean label com frete grátis hoje"';
          let item2 = '<strong>CTA 2:</strong> "Confira o laudo laboratorial de pureza lote a lote"';
          let item3 = '<strong>CTA 3:</strong> "Aproveite 10% OFF no PIX com envio imediato"';

          if (qLower.includes('omega') || qLower.includes('ômega') || qLower.includes('ifos')) {
            ctaTargetText = 'Foco: <strong>Ômega 3 Ultra Concentrado (IFOS 5★)</strong>';
            item1 = '<strong>Ângulo Pureza:</strong> "Garanta seu Ômega 3 Ultra Concentrado com Selo IFOS 5 Estrelas"';
            item2 = '<strong>Ângulo Longevidade:</strong> "Veja o laudo laboratorial de ausência de metais pesados em 30s"';
            item3 = '<strong>Oferta Direta:</strong> "Compre 2 potes de Ômega 3 IFOS com Frete Grátis hoje"';
          } else if (qLower.includes('whey') || qLower.includes('baunilha') || qLower.includes('grass')) {
            ctaTargetText = 'Foco: <strong>Linha Whey Isolado Baunilha Grass-Fed</strong>';
            item1 = '<strong>UGC Oferta A:</strong> "Garanta seu Whey Isolado 100% Puro com 10% OFF no PIX"';
            item2 = '<strong>Carrossel Sabores:</strong> "Experimente o sabor Baunilha Natural com 27g de proteína por dose"';
            item3 = '<strong>Refil Campeão:</strong> "Peça seu refil Whey Isolado Grass-Fed com Frete Grátis hoje"';
          } else if (qLower.includes('creatina') || qLower.includes('creapure')) {
            ctaTargetText = 'Foco: <strong>Creatina 100% Creapure Alemã</strong>';
            item1 = '<strong>Pureza Máxima:</strong> "Treine com a Creatina Creapure 100% Pura importada da Alemanha"';
            item2 = '<strong>Laudo Aberto:</strong> "Acesse o laudo de pureza lote a lote via QR code na embalagem"';
            item3 = '<strong>Combo Força:</strong> "Garanta seu pote de 300g Creapure com 10% OFF no PIX"';
          }

          innerHtml +=
            '<div style="display: flex; flex-direction: column; gap: 6px;">' +
              '<div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;">' +
                '<div class="cta-badge-ready">✨ Sugestões de Cópias &amp; CTAs</div>' +
                '<span style="font-family: var(--font-mono); font-size: var(--label); color: var(--ink-muted);">' + ctaTargetText + '</span>' +
              '</div>' +
              '<div class="cta-suggestions-container">' +
                '<div class="cta-suggestion-item">' +
                  '<span class="cta-num">1</span>' +
                  '<span>' + item1 + '</span>' +
                '</div>' +
                '<div class="cta-suggestion-item">' +
                  '<span class="cta-num">2</span>' +
                  '<span>' + item2 + '</span>' +
                '</div>' +
                '<div class="cta-suggestion-item">' +
                  '<span class="cta-num">3</span>' +
                  '<span>' + item3 + '</span>' +
                '</div>' +
              '</div>' +
            '</div>';
        }

        if (isActionRequired && answer.status !== 'QUARANTINED') {
          let actionTitle = '⚡ Governança de Tráfego: Confirmar Alteração';
          let actionSubtext = 'Ação: Executar proposta operacional e sincronizar no Meta Ads';
          let btnText = '⚡ Confirmar alteração';

          if (isDelegationAction) {
            const firstName = targetPerson.split(' ')[0] || 'Carolina';
            if (isDevolutivaAction) {
              actionTitle = '⚡ Governança &amp; Delegação: Devolutiva de Aprovação para ' + targetPerson;
              actionSubtext = 'Ação: Formalizar aprovação de Marcos Silva e delegar execução técnica a ' + targetPerson + ' (SPOT)';
              btnText = 'Delegar tarefa para ' + firstName.toLowerCase() + '?';
            } else {
              actionTitle = '⚡ Governança &amp; Delegação: Atribuir Tarefa para ' + targetPerson;
              actionSubtext = 'Ação: Formalizar proposta operacional e delegar execução técnica a ' + targetPerson;
              btnText = 'Delegar tarefa para ' + firstName.toLowerCase() + '?';
            }
          } else if (isReactivation) {
            actionTitle = '⚡ Governança de Tráfego: Confirmar Reativação de Anúncios';
            actionSubtext = 'Ação: Reativar e religar a veiculação dos anúncios selecionados no Meta Ads';
            btnText = '⚡ Confirmar Reativação';
          } else if (isPauseAction) {
            actionTitle = '⚡ Governança de Tráfego: Confirmar Pausa de Anúncios';
            actionSubtext = 'Ação: Pausar anúncios de baixa conversão e sincronizar Meta Ads';
            btnText = '⚡ Confirmar Pausa';
          }

          innerHtml +=
            '<div id="approval-card-' + turnId + '" style="background: var(--surface-soft); border: 1px solid var(--line); border-left: 3px solid var(--cyan-strong); border-radius: var(--radius-control); padding: 12px 14px; margin-top: 4px; font-size: var(--label); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">' +
              '<div style="flex: 1; min-width: 200px;">' +
                '<div style="color: var(--ink-strong); font-weight: 600; font-family: var(--font-primary); font-size: var(--body); display: flex; align-items: center; gap: 6px;">' +
                  actionTitle +
                '</div>' +
                '<div style="color: var(--adzhub-blue); margin-top: 3px; font-family: var(--font-primary); font-size: var(--label); font-weight: 500;">' +
                  actionSubtext +
                '</div>' +
              '</div>' +
              '<div style="display: flex; align-items: center; gap: 8px;">' +
                '<button id="btn-approve-' + turnId + '" class="btn-primary" type="button" style="font-size: var(--label); padding: 7px 16px; border-radius: var(--radius-pill); background-color: var(--adzhub-blue); color: #ffffff;">' +
                  btnText +
                '</button>' +
                '<button id="btn-reject-' + turnId + '" type="button" style="font-size: var(--label); padding: 7px 12px; background: transparent; border: none; color: var(--ink-muted); cursor: pointer;">' +
                  '✕ Cancelar' +
                '</button>' +
              '</div>' +
            '</div>';

          effectiveStatus = 'PROVISIONAL';
          effectiveVerified = false;
        }

        if (answer.limitations && answer.limitations.length > 0) {
          const listItems = answer.limitations.map(function(l) { return '<li>' + escapeHtml(l) + '</li>'; }).join('');
          innerHtml +=
            '<div style="background: var(--warning-soft); border: 1px solid var(--warning); border-radius: var(--radius-control); padding: 10px 12px; font-size: var(--label);">' +
              '<strong style="color: #7D631E; font-family: var(--font-mono);">⚠ Limitações e Abstenções:</strong>' +
              '<ul style="padding-left: 18px; margin-top: 4px; color: var(--ink);">' + listItems + '</ul>' +
            '</div>';
        }

        if (answer.evidenceRefs && answer.evidenceRefs.length > 0) {
          const refCards = answer.evidenceRefs.map(function(ref, idx) {
            const hashShort = (ref.hash || '').slice(0, 16);
            const safeRefJson = JSON.stringify(ref).replace(/"/g, '&quot;');
            return '<div class="evidence-ref-item" data-ref-index="' + idx + '" onclick="window.inspectEvidence(&apos;' + ref.claimId + '&apos;, ' + safeRefJson + ')" style="font-size: var(--micro); padding: 6px 10px; background: var(--surface-soft); border: 1px solid var(--line); border-radius: var(--radius-small); cursor: pointer; color: var(--ink-strong); margin-bottom: 4px; font-family: var(--font-mono);">' +
              '<strong>' + escapeHtml(ref.claimId) + '</strong> (' + escapeHtml(ref.source) + ') — Hash: <code>' + escapeHtml(hashShort) + '...</code>' +
            '</div>';
          }).join('');

          innerHtml +=
            '<div style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px;">' +
              refCards +
            '</div>';
        }

        respEl.innerHTML = innerHtml;

        // Binda os botões de ação deste turno se presentes
        if (isActionRequired && answer.status !== 'QUARANTINED') {
          const btnApp = document.getElementById('btn-approve-' + turnId);
          const btnRej = document.getElementById('btn-reject-' + turnId);
          const cardEl = document.getElementById('approval-card-' + turnId);

          let successMsg = '✓ Ação aprovada pelo operador. Alterações sincronizadas com o Meta Ads (Commit auditado no SQLite).';
          if (isDelegationAction) {
            if (isDevolutivaAction) {
              successMsg = '✓ Devolutiva de aprovação confirmada e commitada com sucesso no sistema. Decisão oficialmente delegada de volta para ' + targetPerson + ' (Commit auditado no SQLite).';
            } else {
              successMsg = '✓ Proposta aprovada e commitada com sucesso no sistema. Tarefa oficialmente delegada para ' + targetPerson + ' (Commit auditado no SQLite).';
            }
          } else if (isReactivation) {
            successMsg = '✓ Reativação aprovada pelo operador. Anúncios religados com sucesso no Meta Ads (Commit auditado no SQLite).';
          } else if (isPauseAction) {
            successMsg = '✓ Pausa aprovada pelo operador. Anúncios pausados com sucesso no Meta Ads (Commit auditado no SQLite).';
          }

          btnApp?.addEventListener('click', () => {
            updateStageForScenario('S0');
            document.querySelectorAll('.stage-card').forEach(c => {
              c.classList.remove('card-active', 'card-pulse-highlight');
            });
            updateChatBadge('COMMITTED', true);
            if (isDelegationAction) {
              sessionState.delegation = { isDelegated: true, delegatedTo: targetPerson };
              fetch('/api/governance/commit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'DELEGATE_PROPOSAL', targetPerson })
              }).then(function() { loadSupercerebroPendencies(); }).catch(() => {});
            } else if (isReactivation) {
              sessionState.isReactivated = true;
              sessionState.isPaused = false;
              fetch('/api/governance/commit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'REACTIVATE' })
              }).then(function() { loadSupercerebroPendencies(); }).catch(() => {});
            } else if (isPauseAction) {
              sessionState.isPaused = true;
              sessionState.isReactivated = false;
              fetch('/api/governance/commit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'PAUSE', pausedAds: ['ad_namorados_casal_03', 'ad_whey_sabores_04'] })
              }).then(function() { loadSupercerebroPendencies(); }).catch(() => {});
            }
            if (cardEl) {
              cardEl.innerHTML = '<div style="color: #1E6B56; font-size: var(--label); font-weight: 600; padding: 8px 12px; background: var(--success-soft); border-radius: var(--radius-small); border: 1px solid var(--success); width: 100%; font-family: var(--font-mono);">' + successMsg + '</div>';
            }
          });

          btnRej?.addEventListener('click', () => {
            updateChatBadge('PROVISIONAL', false);
            if (cardEl) {
              cardEl.innerHTML = '<div style="color: #7D631E; font-size: var(--label); font-weight: 500; padding: 8px 12px; background: var(--warning-soft); border-radius: var(--radius-small); border: 1px solid var(--warning); width: 100%; font-family: var(--font-mono);">✕ Proposta mantida como rascunho. Nenhuma alteração foi efetuada no Meta Ads.</div>';
            }
          });
        }

        // Sincroniza nós de template para compatibilidade com seletores
        const concText = document.getElementById('chat-conclusion-text');
        if (concText) concText.innerHTML = formatMarkdownToHtml(answer.conclusion || '');
        const userMsgText = document.getElementById('chat-user-message-text');
        if (userMsgText) userMsgText.textContent = queryText || '';

        updateChatBadge(effectiveStatus, effectiveVerified);
      }

      function renderStructuredAnswer(answer) {
        document.getElementById('chat-empty-state').style.display = 'none';
        if (btnChatBack) btnChatBack.style.display = 'inline-flex';

        const goalVal = (interactiveInput?.value || goalInput?.value || answer.question || '').trim();
        applyStageContentUpdates(goalVal, sessionState.scenario);
        const mapping = getStageCardMapping(goalVal, sessionState.scenario);
        setStageState({ selectedCards: mapping.finalSelected, observedCards: mapping.finalObserved, isFinal: true });

        const container = document.getElementById('chat-messages-container');
        let turnId = null;
        if (container && container.lastElementChild && container.lastElementChild.id) {
          turnId = container.lastElementChild.id;
        } else {
          const created = createChatTurn(goalVal || 'Consulta AdzHub AI');
          turnId = created.turnId;
        }

        renderTurnStructuredAnswer(turnId, answer, goalVal);
      }

      const renderStructuredAnswerTurn = renderTurnStructuredAnswer;

      function renderTrajectoryEvents(trace) {
        if (!trajectoryList) return;
        trajectoryList.innerHTML = '';
        sessionState.events = [];
        if (Array.isArray(trace)) {
          trace.forEach((event, idx) => {
            sessionState.events.push(event);
            const li = document.createElement('li');
            li.textContent = '#' + (event.seq || idx + 1) + ' ' + (event.type || 'EVENT');
            li.setAttribute('role', 'option');
            li.setAttribute('tabindex', '-1');
            li.addEventListener('click', () => selectTrajectoryNode(idx));
            trajectoryList.appendChild(li);
          });
        }
      }

      function renderTrajectoryMetrics(metrics) {
        if (!trajectoryMetrics) return;
        if (!metrics) {
          trajectoryMetrics.textContent = sessionState.events.length + ' eventos';
          return;
        }
        const parts = [];
        if (metrics.durationMs) parts.push(metrics.durationMs + 'ms');
        if (metrics.totalTokens) parts.push(metrics.totalTokens + ' tok');
        if (typeof metrics.costBrl === 'number') parts.push('R$ ' + metrics.costBrl.toFixed(4));
        trajectoryMetrics.textContent = parts.length > 0 ? parts.join(' · ') : (sessionState.events.length + ' eventos');
      }

      function appendTrajectoryNode(event) {
        sessionState.events.push(event);
        if (trajectoryList) {
          const li = document.createElement('li');
          li.textContent = '#' + (event.seq || sessionState.events.length) + ' ' + event.type;
          trajectoryList.appendChild(li);
        }
        if (trajectoryMetrics) {
          trajectoryMetrics.textContent = sessionState.events.length + ' eventos';
        }
      }

      function selectTrajectoryNode(index) {
        sessionState.selectedEventIndex = index;
        const ev = sessionState.events[index];
        if (ev) inspectItem('Evento #' + (ev.seq || index + 1), ev, ev.eventId);
      }


      // Trajectory Keyboard Navigation
      trajectoryList?.addEventListener('keydown', (e) => {
        const total = sessionState.events.length;
        if (total === 0) return;
        let cur = sessionState.selectedEventIndex;
        if (e.key === 'ArrowDown') { e.preventDefault(); cur = cur < total - 1 ? cur + 1 : 0; selectTrajectoryNode(cur); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); cur = cur > 0 ? cur - 1 : total - 1; selectTrajectoryNode(cur); }
        else if (e.key === 'Home') { e.preventDefault(); selectTrajectoryNode(0); }
        else if (e.key === 'End') { e.preventDefault(); selectTrajectoryNode(total - 1); }
        else if (e.key === 'Enter') { e.preventDefault(); if (cur >= 0) selectTrajectoryNode(cur); }
      });

      // Event Listeners
      modeSelect?.addEventListener('change', (e) => {
        sessionState.mode = e.target.value;
        validateExecution();
      });

      modelSelect?.addEventListener('change', (e) => {
        sessionState.model = e.target.value;
        validateExecution();
      });

      interactiveInput?.addEventListener('input', (e) => {
        if (goalInput) goalInput.value = e.target.value;
        validateExecution();
      });

      interactiveInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) {
            if (e.ctrlKey && e.shiftKey && interactiveInput) {
              e.preventDefault();
              const inputEl = interactiveInput;
              const start = inputEl.selectionStart || 0;
              const end = inputEl.selectionEnd || 0;
              const val = inputEl.value;
              inputEl.value = val.substring(0, start) + '\\n' + val.substring(end);
              inputEl.selectionStart = inputEl.selectionEnd = start + 1;
              inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            }
            return;
          }
          e.preventDefault();
          executeCurrentRun();
        }
      });

      goalInput?.addEventListener('input', (e) => {
        if (interactiveInput) interactiveInput.value = e.target.value;
        validateExecution();
      });

      btnChatSend?.addEventListener('click', () => {
        executeCurrentRun();
      });

      document.querySelectorAll('.quick-prompt-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const prompt = btn.getAttribute('data-prompt') || btn.querySelector('span:last-child')?.textContent?.trim();
          if (prompt) window.applyQuickPrompt(prompt);
        });
      });

      document.addEventListener('click', (e) => {
        const target = e.target;
        const btn = target && target.closest ? target.closest('.quick-prompt-btn') : null;
        if (btn) {
          const prompt = btn.getAttribute('data-prompt') || btn.querySelector('span:last-child')?.textContent?.trim();
          if (prompt) window.applyQuickPrompt(prompt);
        }
      });

      apiKeyInput?.addEventListener('input', (e) => {
        const key = e.target.value.trim();
        sessionState.apiKey = key;
        if (key) {
          sessionStorage.setItem('adzhub_session_key', key);
          localStorage.setItem('adzhub_session_key', key);
        } else {
          sessionStorage.removeItem('adzhub_session_key');
          localStorage.removeItem('adzhub_session_key');
        }
        updateKeyUI();
      });

      apiKeyInput?.addEventListener('paste', () => {
        setTimeout(() => {
          if (apiKeyInput) {
            const key = apiKeyInput.value.trim();
            sessionState.apiKey = key;
            if (key) {
              sessionStorage.setItem('adzhub_session_key', key);
              localStorage.setItem('adzhub_session_key', key);
            }
            updateKeyUI();
          }
        }, 50);
      });

      btnSaveKey?.addEventListener('click', () => {
        const key = apiKeyInput?.value.trim() || '';
        sessionState.apiKey = key;
        if (key) {
          sessionStorage.setItem('adzhub_session_key', key);
          localStorage.setItem('adzhub_session_key', key);
          alert('✓ Chave de API salva na sessão com sucesso.');
        } else {
          alert('Por favor, insira uma chave de API antes de salvar.');
        }
        updateKeyUI();
      });

      btnForgetKey?.addEventListener('click', () => {
        sessionState.apiKey = '';
        if (apiKeyInput) apiKeyInput.value = '';
        sessionStorage.removeItem('adzhub_session_key');
        localStorage.removeItem('adzhub_session_key');
        updateKeyUI();
        alert('Chave esquecida da memória com sucesso.');
      });

      function setFlowStep(stepIndex) {
        const pills = [
          { el: document.getElementById('flow-pill-user'), label: 'Pedido do usuário' },
          { el: document.getElementById('flow-pill-reasoning-1'), label: 'Raciocínio' },
          { el: document.getElementById('flow-pill-tool-read'), label: 'Tool - ler dados' },
          { el: document.getElementById('flow-pill-reasoning-2'), label: 'Raciocínio' },
          { el: document.getElementById('flow-pill-tool-action'), label: 'Tool - agir' },
          { el: document.getElementById('flow-pill-response'), label: 'Resposta' }
        ];
        pills.forEach((p, idx) => {
          if (!p.el) return;
          p.el.classList.remove('active', 'active-success');
          if (idx === stepIndex) {
            if (idx === 5) {
              p.el.classList.add('active-success');
              p.el.textContent = '🟢 ' + p.label;
            } else {
              p.el.classList.add('active');
              p.el.textContent = '🔘 ' + p.label;
            }
          } else {
            p.el.textContent = '🔘 ' + p.label;
          }
        });
      }

      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const delay = sleep;

      function resetChatToMainScreen() {
        if (sessionState.isExecuting) return;
        sessionState.scenario = '';
        sessionState.activeContract = null;
        sessionState.activeRunId = null;
        sessionState.events = [];
        sessionState.selectedEventIndex = -1;
        sessionState.chatHistory = [];

        const container = document.getElementById('chat-messages-container');
        if (container) container.innerHTML = '';
        const emptyState = document.getElementById('chat-empty-state');
        if (emptyState) {
          emptyState.style.display = 'flex';
          emptyState.style.flexDirection = 'column';
        }
        if (btnChatBack) btnChatBack.style.display = 'none';

        if (interactiveInput) interactiveInput.value = '';
        if (goalInput) goalInput.value = '';

        updateChatBadge('IDLE', false);
        setFlowStep(0);
        setStageState({ selectedCards: [], observedCards: [], isFinal: true });
        updateOperatorUI();

        if (trajectoryList) trajectoryList.innerHTML = '<div class="empty-state" id="trajectory-empty-state"><div class="empty-state-icon">⚡</div><p>Aguardando execução para capturar eventos em tempo real.</p></div>';
        if (trajectoryMetrics) trajectoryMetrics.innerHTML = '';

        const inspPayload = document.getElementById('inspector-payload');
        if (inspPayload) inspPayload.textContent = '';
        const inspEmpty = document.getElementById('inspector-empty-state');
        if (inspEmpty) inspEmpty.style.display = 'flex';
        const inspJson = document.getElementById('inspector-view-json');
        if (inspJson) inspJson.style.display = 'none';
        const inspStruct = document.getElementById('inspector-view-structured');
        if (inspStruct) inspStruct.style.display = 'none';

        validateExecution();
        if (interactiveInput) interactiveInput.focus();
      }

      btnChatBack?.addEventListener('click', resetChatToMainScreen);
      btnReset?.addEventListener('click', resetChatToMainScreen);

      async function executeCurrentRun() {
        if (sessionState.isExecuting) return;

        let goalVal = (interactiveInput?.value || goalInput?.value || '').trim();
        if (!goalVal) {
          goalVal = 'Pause os criativos com CTA ruim e proponha 3 variações';
        }

        if (interactiveInput) interactiveInput.value = '';
        if (goalInput) goalInput.value = '';

        setExecutionActive(true);

        const { turnId } = createChatTurn(goalVal);

        try {
          setFlowStep(0);
          document.getElementById('chat-empty-state').style.display = 'none';
          if (btnChatBack) btnChatBack.style.display = 'inline-flex';

          const stepR1 = document.getElementById('step-r1-' + turnId);
          const stepT1 = document.getElementById('step-t1-' + turnId);
          const stepR2 = document.getElementById('step-r2-' + turnId);
          const stepT2 = document.getElementById('step-t2-' + turnId);

          const contract = {
            schemaVersion: '1.0.0',
            taskId: 'task_custom_' + Date.now(),
            clientId: 'cli_housewhey',
            tenantId: 'hub_spot',
            goal: goalVal,
            timeframe: { since: '2026-08-01T00:00:00.000Z', until: '2026-08-20T23:59:59.000Z', timezone: 'America/Sao_Paulo' },
            effects: { allowed: ['read:memory', 'read:meta', 'read:crm', 'read:app', 'write:staging', 'write:insight'], forbidden: ['external_write'] },
            budgets: { maxSteps: 15, maxToolCalls: 10, maxTokens: 8000, maxCostBrl: 2.5, timeoutMs: 30000 },
            successCriteria: { minEvidenceCoverage: 0.8, requireVerifiedClaims: true },
            approvalPolicy: { externalWritesRequireApproval: true, autoApproveReadOnly: true },
            metadata: {
              scenario: sessionState.scenario,
              isReactivated: Boolean(sessionState.isReactivated),
              isPaused: Boolean(sessionState.isPaused),
              isDelegated: Boolean(sessionState.delegation?.isDelegated),
              delegatedTo: sessionState.delegation?.delegatedTo,
              requester: (sessionState.currentOperator?.name || 'Aline Rocha') + ' (' + (sessionState.currentOperator?.role || 'Gestora de Tráfego') + ' · ' + (sessionState.currentOperator?.company || 'SPOT') + ')',
              operatorId: sessionState.currentOperator?.id || 'p_aline',
              operatorName: sessionState.currentOperator?.name || 'Aline Rocha',
              operatorRole: sessionState.currentOperator?.role || 'Gestora de Tráfego',
              operatorCompany: sessionState.currentOperator?.company || 'SPOT'
            }
          };

          sessionState.chatHistory.push({ role: 'user', content: goalVal });

          const fetchPromise = fetch('/api/runs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(sessionState.apiKey ? { 'X-OpenRouter-Key': sessionState.apiKey } : {}) },
            body: JSON.stringify({ taskContract: contract, mode: sessionState.mode, model: sessionState.model, apiKey: sessionState.apiKey, chatHistory: sessionState.chatHistory })
          });

          const streamBody = document.getElementById('chat-stream-body');
          const scrollToBottom = () => { if (streamBody) streamBody.scrollTop = streamBody.scrollHeight; };
          scrollToBottom();

          const stepsStream = document.getElementById('steps-stream-' + turnId);
          if (stepsStream) stepsStream.style.display = 'flex';

          const mapping = getStageCardMapping(goalVal, sessionState.scenario);
          applyStageContentUpdates(goalVal, sessionState.scenario);

          await delay(300);
          setFlowStep(1);
          if (stepR1) stepR1.style.display = 'flex';
          scrollToBottom();

          await delay(450);
          setFlowStep(2);
          if (stepT1) stepT1.style.display = 'flex';
          setStageState({ selectedCards: mapping.t1Selected, observedCards: mapping.t1Observed, isFinal: false });
          scrollToBottom();

          await delay(400);
          setFlowStep(3);
          if (stepR2) stepR2.style.display = 'flex';
          scrollToBottom();

          await delay(450);
          setFlowStep(4);
          if (stepT2) stepT2.style.display = 'flex';
          setStageState({ selectedCards: mapping.t2Selected, observedCards: mapping.t2Observed, isFinal: false });
          scrollToBottom();

          const res = await fetchPromise;
          const runRecord = await res.json();
          setFlowStep(5);
          setStageState({ selectedCards: mapping.finalSelected, observedCards: mapping.finalObserved, isFinal: true });

          if (runRecord && runRecord.executionTrace) {
            const r1Text = document.getElementById('step-r1-text-' + turnId);
            if (r1Text && runRecord.executionTrace.step1?.reasoningText) {
              r1Text.textContent = runRecord.executionTrace.step1.reasoningText;
            }
            const t1Obs = document.getElementById('step-t1-obs-' + turnId);
            if (t1Obs && runRecord.executionTrace.step1?.observation) {
              t1Obs.textContent = runRecord.executionTrace.step1.observation;
            }
            const tool1 = document.getElementById('step-tool1-' + turnId);
            if (tool1 && runRecord.executionTrace.step1?.tools?.[0]) {
              tool1.textContent = runRecord.executionTrace.step1.tools[0];
            }
            const tool2 = document.getElementById('step-tool2-' + turnId);
            if (tool2 && runRecord.executionTrace.step1?.tools?.[1]) {
              tool2.textContent = runRecord.executionTrace.step1.tools[1];
            }

            const r2Text = document.getElementById('step-r2-text-' + turnId);
            if (r2Text && runRecord.executionTrace.step2?.reasoningText) {
              r2Text.textContent = runRecord.executionTrace.step2.reasoningText;
            }
            const t2Obs = document.getElementById('step-t2-obs-' + turnId);
            if (t2Obs && runRecord.executionTrace.step2?.observation) {
              t2Obs.textContent = runRecord.executionTrace.step2.observation;
            }
            const tool3 = document.getElementById('step-tool3-' + turnId);
            if (tool3 && runRecord.executionTrace.step2?.tools?.[0]) {
              tool3.textContent = runRecord.executionTrace.step2.tools[0];
            }
            const tool4 = document.getElementById('step-tool4-' + turnId);
            if (tool4 && runRecord.executionTrace.step2?.tools?.[1]) {
              tool4.textContent = runRecord.executionTrace.step2.tools[1];
            }
          }

          if (!res.ok) {
            const errAnswer = {
              question: goalVal,
              conclusion: '❌ ' + (runRecord.message || runRecord.error || 'Falha ao orquestrar a execução.'),
              limitations: ['Erro na chamada ao backend ou modelo LLM.'],
              status: 'FAILED',
              verified: false
            };
            renderTurnStructuredAnswer(turnId, errAnswer, goalVal);
            sessionState.chatHistory.push({ role: 'assistant', content: errAnswer.conclusion });
            setExecutionActive(false);
            return;
          }

          sessionState.activeRunId = runRecord.runId;
          sessionState.activeContract = contract;

          const structured = runRecord.structuredAnswer || {};
          const structuredAnswer = {
            question: structured.question || goalVal,
            conclusion: structured.conclusion || runRecord.finalOutput || 'Diagnóstico concluído com sucesso.',
            limitations: structured.limitations || [],
            evidenceRefs: structured.evidenceRefs || [],
            status: structured.status || runRecord.status || 'COMMITTED',
            verified: Boolean(runRecord.verified !== undefined ? runRecord.verified : structured.verified)
          };

          renderTurnStructuredAnswer(turnId, structuredAnswer, goalVal);
          sessionState.chatHistory.push({ role: 'assistant', content: structuredAnswer.conclusion });

          if (runRecord.trace && runRecord.trace.length > 0) {
            renderTrajectoryEvents(runRecord.trace);
            renderTrajectoryMetrics(runRecord.metrics);
          }

          inspectItem('Contrato da Tarefa (' + contract.taskId + ')', contract);
          setExecutionActive(false);
          scrollToBottom();
        } catch (err) {
          console.error('[AdzHub UI] Erro ao executar tarefa:', err);
          const errAnswer = { question: goalVal, conclusion: '❌ Falha de rede ou conexão ao orquestrar tarefa.', limitations: ['Verifique se o servidor backend está online e se a chave de API está correta.'], status: 'FAILED', verified: false };
          renderTurnStructuredAnswer(turnId, errAnswer, goalVal);
          sessionState.chatHistory.push({ role: 'assistant', content: errAnswer.conclusion });
          setExecutionActive(false);
        }
      }

      window._executeCurrentRun = executeCurrentRun;

      btnCompare?.addEventListener('click', async () => {
        if (comparisonModal) comparisonModal.style.display = 'flex';
        if (comparisonLoading) comparisonLoading.style.display = 'flex';
        if (comparisonResults) comparisonResults.style.display = 'none';

        let userGoal = '';
        if (Array.isArray(sessionState.chatHistory)) {
          for (let i = sessionState.chatHistory.length - 1; i >= 0; i--) {
            if (sessionState.chatHistory[i]?.role === 'user' && sessionState.chatHistory[i]?.content) {
              userGoal = sessionState.chatHistory[i].content.trim();
              break;
            }
          }
        }
        if (!userGoal) userGoal = (interactiveInput?.value || goalInput?.value || '').trim();
        if (!userGoal && sessionState.activeContract?.goal) userGoal = sessionState.activeContract.goal.trim();
        if (!userGoal) userGoal = 'Audite as métricas de performance da conta Housewhey cruzando Meta Ads e CRM';

        const contract = {
          schemaVersion: '1.0.0',
          taskId: 'task_compare_' + Date.now(),
          clientId: 'cli_housewhey',
          tenantId: 'hub_spot',
          goal: userGoal,
          timeframe: { since: '2026-08-01T00:00:00.000Z', until: '2026-08-20T23:59:59.000Z', timezone: 'America/Sao_Paulo' },
          effects: { allowed: ['read:memory', 'read:meta', 'read:crm', 'read:app', 'write:staging', 'write:insight'], forbidden: ['external_write'] },
          budgets: { maxSteps: 15, maxToolCalls: 10, maxTokens: 8000, maxCostBrl: 2.5, timeoutMs: 30000 },
          successCriteria: { minEvidenceCoverage: 0.8, requireVerifiedClaims: true },
          approvalPolicy: { externalWritesRequireApproval: true, autoApproveReadOnly: true },
          metadata: {
            scenario: sessionState.scenario || 'S0',
            isReactivated: Boolean(sessionState.isReactivated),
            isPaused: Boolean(sessionState.isPaused),
            isDelegated: Boolean(sessionState.delegation?.isDelegated),
            delegatedTo: sessionState.delegation?.delegatedTo,
            requester: (sessionState.currentOperator?.name || 'Aline Rocha') + ' (' + (sessionState.currentOperator?.role || 'Gestora de Tráfego') + ' · ' + (sessionState.currentOperator?.company || 'SPOT') + ')',
            operatorId: sessionState.currentOperator?.id || 'p_aline',
            operatorName: sessionState.currentOperator?.name || 'Aline Rocha',
            operatorRole: sessionState.currentOperator?.role || 'Gestora de Tráfego',
            operatorCompany: sessionState.currentOperator?.company || 'SPOT'
          }
        };

        try {
          const res = await fetch('/api/compare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(sessionState.apiKey ? { 'X-OpenRouter-Key': sessionState.apiKey } : {}) },
            body: JSON.stringify({ taskContract: contract, model: sessionState.model, apiKey: sessionState.apiKey, dataset: sessionState.dataset, scenario: sessionState.scenario || 'S0' })
          });
          const data = await res.json();
          if (comparisonLoading) comparisonLoading.style.display = 'none';
          if (!res.ok) {
            if (comparisonSummaryCard) {
              comparisonSummaryCard.innerHTML = '<div style="background: var(--danger-soft); border: 1px solid var(--danger); border-radius: var(--radius-small); padding: 12px 14px; color: #8F2D36; font-family: var(--font-mono); font-size: var(--label);"><strong>❌ Falha ao comparar:</strong> ' + escapeHtml(data.message || data.error || 'Erro desconhecido') + '</div>';
            }
            if (comparisonResults) comparisonResults.style.display = 'block';
            return;
          }
          data.evaluatedGoal = userGoal;
          renderComparisonResults(data);
        } catch {
          if (comparisonLoading) comparisonLoading.style.display = 'none';
          if (comparisonSummaryCard) {
            comparisonSummaryCard.innerHTML = '<div style="background: var(--danger-soft); border: 1px solid var(--danger); border-radius: var(--radius-small); padding: 12px 14px; color: #8F2D36; font-family: var(--font-mono); font-size: var(--label);"><strong>❌ Erro de conexão ao comparar execuções.</strong></div>';
          }
          if (comparisonResults) comparisonResults.style.display = 'block';
        }
      });

      btnCloseComparison?.addEventListener('click', () => {
        if (comparisonModal) comparisonModal.style.display = 'none';
      });

      let lastComparisonData = null;
      function renderComparisonResults(comp) {
        lastComparisonData = comp;
        if (!comparisonResults) return;
        comparisonResults.style.display = 'block';

        const evaluatedPrompt = comp.evaluatedGoal || comp.taskGoal || 'Audite as métricas de performance da conta Housewhey';

        if (comparisonSummaryCard) {
          const winnerText = comp.observedWinner === 'GOVERNED_PEVC' ? '🏆 Governed PEV-C' : comp.observedWinner === 'BASIC_REACT' ? 'Basic ReAct' : 'Empate';
          const criteriaList = (comp.winnerCriteria || []).map(function(c) { return '<li>' + escapeHtml(c) + '</li>'; }).join('');
          comparisonSummaryCard.innerHTML =
            '<div style="background: rgba(37, 99, 235, 0.08); border: 1px solid rgba(37, 99, 235, 0.22); border-radius: var(--radius-small); padding: 12px 14px; margin-bottom: 12px;">' +
              '<div style="font-family: var(--font-mono); font-size: var(--micro); color: var(--adzhub-blue); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">🎯 Prompt Avaliado na Comparação (Última Mensagem):</div>' +
              '<div style="font-size: var(--body); color: var(--ink-strong); font-weight: 600; font-family: var(--font-primary); line-height: 1.4;">&ldquo;' + escapeHtml(evaluatedPrompt) + '&rdquo;</div>' +
            '</div>' +
            '<h4 style="font-family: var(--font-display); color: var(--ink); margin-bottom: 6px; font-size: 1.0625rem; font-weight: 700;">Veredito Científico: <span style="color: var(--success);">' + winnerText + '</span></h4>' +
            '<p style="font-size: 0.8125rem; margin-bottom: 8px; color: var(--ink); font-family: var(--font-sans);">' + escapeHtml(comp.conclusionSummary || '') + '</p>' +
            '<ul style="padding-left: 18px; font-size: 0.75rem; color: var(--ink); font-family: var(--font-sans); display: flex; flex-direction: column; gap: 4px;">' + criteriaList + '</ul>';
        }

        if (comparisonTbody && comp.metrics) {
          let rowsHtml = '';
          for (const [key, m] of Object.entries(comp.metrics)) {
            const advColor = m.advantage === 'GOVERNED' ? 'var(--success)' : m.advantage === 'BASIC' ? 'var(--warning)' : 'var(--ink-muted)';
            const basicVal = typeof m.basic === 'boolean' ? (m.basic ? '✓ Sim' : '✗ Não') : m.basic;
            const governedVal = typeof m.governed === 'boolean' ? (m.governed ? '✓ Sim' : '✗ Não') : m.governed;
            const advText = m.advantage === 'GOVERNED' ? '✓ Governed' : m.advantage === 'BASIC' ? '⚠ Basic' : '--';
            rowsHtml +=
              '<tr>' +
                '<td style="font-weight: 600; color: var(--ink); font-family: var(--font-sans);">' + escapeHtml(m.metric || key) + '</td>' +
                '<td style="font-family: var(--font-mono); font-size: 0.75rem;">' + escapeHtml(String(basicVal)) + '</td>' +
                '<td style="font-weight: 600; color: var(--ink); font-family: var(--font-mono); font-size: 0.75rem;">' + escapeHtml(String(governedVal)) + '</td>' +
                '<td style="color: ' + advColor + '; font-weight: 600; font-family: var(--font-mono); font-size: 0.75rem;">' + advText + '</td>' +
              '</tr>';
          }
          comparisonTbody.innerHTML = rowsHtml;
        }

        if (comparisonHighlightsCard) {
          const basicOut = comp.basicRun?.finalOutput ? formatMarkdownToHtml(comp.basicRun.finalOutput) : '<em>Sem output registrado</em>';
          const governedOut = comp.governedRun?.finalOutput ? formatMarkdownToHtml(comp.governedRun.finalOutput) : '<em>Sem output registrado</em>';

          comparisonHighlightsCard.innerHTML =
            '<div style="margin-top: 16px; border-top: 1px solid var(--line); padding-top: 14px;">' +
              '<h4 style="font-family: var(--font-display); font-size: var(--body); font-weight: 600; color: var(--ink-strong); margin-bottom: 10px;">Diagnósticos Produzidos sob o mesmo Prompt:</h4>' +
              '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">' +
                '<div style="background: var(--surface-soft); border: 1px solid var(--line); border-left: 3px solid var(--warning); border-radius: var(--radius-small); padding: 12px; font-size: var(--micro);">' +
                  '<div style="font-weight: 700; color: #7D631E; font-family: var(--font-mono); margin-bottom: 6px;">⚡ Basic (ReAct Baseline) — Sem Verificação Formal</div>' +
                  '<div style="max-height: 180px; overflow-y: auto; color: var(--ink); line-height: 1.5;">' + basicOut + '</div>' +
                '</div>' +
                '<div style="background: var(--surface-soft); border: 1px solid var(--line); border-left: 3px solid var(--success); border-radius: var(--radius-small); padding: 12px; font-size: var(--micro);">' +
                  '<div style="font-weight: 700; color: #1E6B56; font-family: var(--font-mono); margin-bottom: 6px;">🛡️ Governed (PEV-C) — Auditado &amp; Commit SQLite</div>' +
                  '<div style="max-height: 180px; overflow-y: auto; color: var(--ink); line-height: 1.5;">' + governedOut + '</div>' +
                '</div>' +
              '</div>' +
            '</div>';
        }
      }

      function triggerDownload(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      document.getElementById('btn-export-comparison-json')?.addEventListener('click', () => {
        if (!lastComparisonData) return alert('Sem dados de comparação.');
        triggerDownload('adzhub_comparacao.json', JSON.stringify(lastComparisonData, null, 2), 'application/json');
      });

      document.getElementById('btn-export-comparison-md')?.addEventListener('click', () => {
        if (!lastComparisonData) return alert('Sem dados de comparação.');
        const lines = [
          '# Relatório Comparativo: Basic (ReAct) × Governed (PEV-C)',
          '',
          '> **ID:** ' + lastComparisonData.comparisonId,
          '',
          lastComparisonData.conclusionSummary
        ];
        triggerDownload('adzhub_comparacao.md', lines.join('\\n'), 'text/markdown');
      });

      // Interatividade de clique nos Cards do Palco -> Inspeciona no Inspector
      document.getElementById('card-ugc-oferta')?.addEventListener('click', () => {
        const isReactivated = Boolean(sessionState.isReactivated);
        const isPaused = Boolean(sessionState.isPaused);
        inspectItem('Criativo: UGC - Oferta A', {
          id: 'ad_whey_sabores_04',
          campaign: 'Whey Isolado Baunilha',
          type: 'Carrossel UGC',
          spend: 'R$ 850,00',
          cpa: 'R$ 94,50',
          ctr: '1.2%',
          hookScore: 8.5,
          retentionScore: 7.5,
          ctaScore: 4.0,
          status: isPaused ? 'Pausado (Commit auditado no SQLite)' : isReactivated ? 'Ativo (Reativado via commit)' : 'Ativo',
          diagnosis: isPaused ? 'Pausado pelo operador com commit no SQLite para reformulação de CTA.' : 'Chamada passiva sem urgência e sem desconto no PIX. Abandono no checkout.',
          recommendation: isPaused ? 'PAUSADO (SUBSTITUIR)' : isReactivated ? 'ATIVO' : 'PAUSAR / REFORMULAR'
        }, 'ad_whey_sabores_04');
      });

      document.getElementById('card-hook-social')?.addEventListener('click', () => {
        inspectItem('Criativo Campeão: Hook Prova Social', {
          id: 'ad_whey_baunilha_01',
          campaign: 'Whey Isolado Baunilha',
          type: 'Vídeo Hook 900g',
          spend: 'R$ 1.200,00',
          cpa: 'R$ 42,10',
          ctr: '2.8%',
          hookScore: 8.8,
          retentionScore: 8.0,
          ctaScore: 8.5,
          status: 'Benchmark Campeão Ativo',
          recommendation: 'ESCALAR'
        }, 'ad_whey_baunilha_01');
      });

      document.getElementById('card-carousel-faq')?.addEventListener('click', () => {
        const isReactivated = Boolean(sessionState.isReactivated);
        inspectItem('Criativo: Carousel FAQ', {
          id: 'ad_namorados_casal_03',
          campaign: 'Dia dos Namorados (Sazonal)',
          spend: 'R$ 430,00',
          cpa: 'R$ 112,00',
          ctr: '0.9%',
          frequency: '2.65x',
          hookScore: 4.2,
          ctaScore: 3.8,
          status: isReactivated ? 'Ativo (Reativado via commit auditado)' : 'Pausado',
          diagnosis: isReactivated ? 'Reativado e religado pelo operador com commit auditado no SQLite.' : 'Fadiga de público e conteúdo sem conversão direta.',
          recommendation: isReactivated ? 'ATIVO' : 'PAUSAR'
        }, 'ad_namorados_casal_03');
      });

      document.getElementById('card-meta-metrics')?.addEventListener('click', () => {
        inspectItem('Meta Ads — Insights Consolidados', {
          period: 'Agosto/2026',
          totalSpend: 'R$ 4.280,00',
          impressions: 184200,
          clicks: 3420,
          ctrAverage: '1.86%',
          cpcAverage: 'R$ 1,25',
          roas: '3.48x',
          topCampaigns: [
            { name: 'Whey Isolado Baunilha', spend: 'R$ 2.450,00', cpa: 'R$ 48,00', sales: 51 },
            { name: 'Ômega 3 Ultra IFOS', spend: 'R$ 3.100,00', cpa: 'R$ 68,00', status: 'Ativo' }
          ]
        }, 'meta_insights');
      });

      document.getElementById('card-crm-metrics')?.addEventListener('click', () => {
        inspectItem('HubSpot CRM — Vendas & Reconciliação', {
          totalOrders: 62,
          approvedSales: 48,
          totalRevenue: 'R$ 14.890,00',
          averageTicket: 'R$ 240,16',
          abandonedCheckouts: 8,
          pendingOrders: 6,
          utmCoverage: '86.4%',
          reconciliationStatus: 'RECONCILED'
        }, 'crm_orders');
      });

      document.getElementById('card-brain-context')?.addEventListener('click', () => {
        inspectItem('Supercérebro — Memória & Governança', {
          stakeholders: [
            { name: 'Aline Rocha', role: 'Gestora de Tráfego SPOT', domain: 'Meta Ads' },
            { name: 'Marcos Silva', role: 'Head de Marketing Housewhey', domain: 'Aprovações & Diretrizes' }
          ],
          governancePolicy: 'Escrita externa no Meta Ads exige aprovação formal expressa.',
          productStandards: ['100% Glanbia Grass-Fed', 'Creatina Creapure Alemã', 'Ômega 3 IFOS 5★']
        }, 'supercerebro_memory');
      });

      // Inicialização
      updateKeyUI();
      validateExecution();
    })();
  </script>
</body>
</html>`;
}
