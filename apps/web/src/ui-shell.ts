/**
 * @adzhub/web - UI Shell HTML & CSS Generator
 * Blueprint Oficial: Palco Operacional (Esquerda) + AdzChat Agentico (Direita)
 * Preserva: Governed PEV-C vs Basic ReAct, Integração LLM em Tempo Real, Cenários S0-S5, Comparador e Auditoria.
 */

import { CONTRACTS_VERSION } from '@adzhub/contracts';
import { getSupercerebroOperatorProfiles } from '@adzhub/data';

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
  _verified?: boolean,
  missingCondition?: string
): StatusBadgeInfo {
  const normalized = status.toUpperCase();
  if (normalized === 'COMMITTED') {
    return {
      status: 'COMMITTED',
      label: 'SALVO NO SUPERCÉREBRO',
      icon: '✓',
      cssClass: 'badge-committed',
      description: 'Aprovado pelo operador responsável e registrado com commit atômico no Supercérebro.'
    };
  }
  if (normalized === 'VERIFYING' || normalized === 'RUNNING') {
    return {
      status: 'VERIFYING',
      label: 'VERIFYING',
      icon: '⚙',
      cssClass: 'badge-verifying',
      description: 'Processando validações e checagem de integridade no Supercérebro.'
    };
  }
  if (normalized === 'QUARANTINED') {
    return {
      status: 'QUARANTINED',
      label: 'QUARANTINED',
      icon: '⚠',
      cssClass: 'badge-quarantined',
      description: 'Dados em análise por cobertura insuficiente de evidências (<80%).'
    };
  }
  if (normalized === 'BLOCKED') {
    return {
      status: 'BLOCKED',
      label: 'BLOCKED',
      icon: '🔒',
      cssClass: 'badge-blocked',
      description: 'Ação pendente de aprovação humana com autorização explícita.',
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
      description: 'Falha na execução de ferramenta ou não conformidade com regras da conta.'
    };
  }
  return {
    status: 'PROVISIONAL',
    label: 'PROVISIONAL',
    icon: '⏳',
    cssClass: 'badge-provisional',
    description: 'Conclusão preliminar pendente de confirmação final.'
  };
}

// ==========================================
// AdzHub Official Logo SVG
// ==========================================

export const ADZHUB_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 17626.6 4479.68" fill-rule="evenodd" clip-rule="evenodd" style="height: 32px; width: auto; display: block;" aria-label="AdzHub Logo">
 <defs>
  <linearGradient id="adzhub-logo-grad" gradientUnits="userSpaceOnUse" x1="151.81" y1="4327.69" x2="2885.33" y2="97.24">
   <stop offset="0" style="stop-opacity:1; stop-color:#F68934"/>
   <stop offset="1" style="stop-opacity:1; stop-color:#FFB32B"/>
  </linearGradient>
 </defs>
 <g id="Camada_x0020_1">
  <g id="_2943086959024">
   <path fill="#294A91" fill-rule="nonzero" d="M6935.15 4420.12l-143.56 -347.84c-7.89,-19.11 -25.54,-30.93 -46.22,-30.93l-1054.87 0c-20.68,0 -38.33,11.81 -46.22,30.92l-143.57 347.86c-7.89,19.11 -25.54,30.92 -46.22,30.92l-458.33 0c-17.46,0 -32.48,-8.16 -41.97,-22.82 -9.49,-14.66 -10.8,-31.7 -3.65,-47.64l976.13 -2176.1c8.24,-18.38 25.47,-29.54 45.62,-29.54l504.2 0c20.19,0 37.45,11.2 45.67,29.64l969.92 2176.1c7.1,15.93 5.77,32.95 -3.73,47.58 -9.5,14.64 -24.49,22.78 -41.94,22.78l-465.04 0c-20.68,0 -38.33,-11.81 -46.22,-30.93zm-758.9 -1622.93l-298.52 716.46c-6.63,15.9 -5.01,32.63 4.55,46.97 9.56,14.33 24.37,22.26 41.6,22.26l591.86 0c17.17,0 31.94,-7.87 41.51,-22.13 9.58,-14.26 11.27,-30.91 4.76,-46.81l-293.33 -716.46c-7.83,-19.13 -25.44,-30.99 -46.12,-31.06 -20.67,-0.06 -38.36,11.69 -46.31,30.77zm3155.06 -572.24l0 2176.1c0,27.54 -22.46,50 -50,50l-349.98 0c-24.59,0 -45.19,-17.39 -49.3,-41.64l-9.63 -56.82c-3.08,-18.21 -14.82,-32.3 -32.16,-38.62 -17.35,-6.33 -35.4,-3.1 -49.48,8.85 -126.3,107.16 -282.12,160.75 -467.44,160.75 -149.57,0 -282.35,-35.23 -398.32,-105.68 -115.97,-70.45 -206.47,-169.08 -271.5,-295.89 -65.04,-126.81 -97.55,-271.51 -97.55,-434.09 0,-162.58 32.51,-307.27 97.55,-434.08 65.03,-126.81 155.53,-225.44 271.5,-295.9 115.97,-70.45 248.75,-105.67 398.32,-105.67 160.53,0 300.25,40.91 419.14,122.74 15.69,10.8 34.75,11.94 51.62,3.08 16.86,-8.87 26.73,-25.21 26.73,-44.26l0 -668.87c0,-27.54 22.46,-50 50,-50l410.5 0c27.54,0 50,22.46 50,50zm-887.68 1829.41c112.72,0 204.85,-37.39 276.38,-112.18 71.54,-74.79 107.3,-172.88 107.3,-294.27 0,-121.39 -35.76,-219.48 -107.3,-294.26 -71.53,-74.79 -163.66,-112.18 -276.38,-112.18 -112.72,0 -204.31,37.93 -274.76,113.8 -70.45,75.87 -105.68,173.42 -105.68,292.64 0,119.23 35.23,216.77 105.68,292.64 70.45,75.87 162.04,113.81 274.76,113.81zm1987.45 -48.78l563.8 0c27.54,0 50,22.46 50,50l0 345.47c0,27.54 -22.46,50 -50,50l-1337.19 0c-27.54,0 -50,-22.46 -50,-50l0 -103.58c0,-10.54 2.81,-19.59 8.77,-28.28l626.85 -913.67c10.77,-15.7 11.88,-34.74 3.01,-51.59 -8.87,-16.84 -25.2,-26.7 -44.24,-26.7l-482.61 0c-27.54,0 -50,-22.46 -50,-50l0 -332.46c0,-27.54 22.46,-50 50,-50l1252.65 0c27.54,0 50,22.46 50,50l0 97.05c0,10.56 -2.81,19.63 -8.79,28.33l-623.46 907.11c-10.79,15.7 -11.91,34.75 -3.04,51.6 8.87,16.86 25.2,26.72 44.25,26.72zm2513.94 -1830.63l430.01 0c27.54,0 50,22.46 50,50l0 2176.1c0,27.54 -22.46,50 -50,50l-430.01 0c-27.54,0 -50,-22.46 -50,-50l0 -813.69c0,-27.54 -22.46,-50 -50,-50l-865.71 0c-27.54,0 -50,22.46 -50,50l0 813.69c0,27.54 -22.46,50 -50,50l-433.26 0c-27.54,0 -50,-22.46 -50,-50l0 -2176.1c0,-27.54 22.46,-50 50,-50l433.26 0c27.54,0 50,22.46 50,50l0 781.18c0,27.54 22.46,50 50,50l865.71 0c27.54,0 50,-22.46 50,-50l0 -781.18c0,-27.54 22.46,-50 50,-50zm2518.74 719.82l0 1506.28c0,27.54 -22.46,50 -50,50l-350.22 0c-24.49,0 -45.02,-17.23 -49.25,-41.36l-8.56 -48.82c-3.2,-18.22 -15.05,-32.26 -32.48,-38.47 -17.43,-6.2 -35.49,-2.81 -49.48,9.29 -46.47,40.2 -98.98,72.94 -157.47,98.22 -87.79,37.93 -183.71,56.91 -287.76,56.91 -197.27,0 -354.43,-65.03 -471.48,-195.1 -117.06,-130.06 -175.59,-309.98 -175.59,-539.76l0 -857.19c0,-27.54 22.46,-50 50,-50l410.5 0c27.54,0 50,22.46 50,50l0 827.93c0,104.05 25.47,185.34 76.41,243.87 50.94,58.52 120.85,87.79 209.73,87.79 97.54,0 176.12,-34.14 235.74,-102.43 59.61,-68.28 89.41,-156.61 89.41,-265l0 -792.16c0,-27.54 22.46,-50 50,-50l410.5 0c27.54,0 50,22.46 50,50zm1391.67 -82.51c149.57,0 282.89,35.22 399.94,105.67 117.06,70.46 208.1,169.09 273.13,295.9 65.04,126.81 97.55,271.5 97.55,434.08 0,162.58 -32.51,307.28 -97.55,434.09 -65.03,126.81 -156.07,225.44 -273.13,295.89 -117.05,70.45 -250.37,105.68 -399.94,105.68 -185.32,0 -341.14,-53.59 -467.44,-160.75 -14.08,-11.95 -32.13,-15.18 -49.48,-8.85 -17.35,6.32 -29.08,20.41 -32.16,38.62l-9.63 56.81c-4.11,24.25 -24.7,41.65 -49.3,41.65l-349.98 0c-27.54,0 -50,-22.46 -50,-50l0 -2176.1c0,-27.54 22.46,-50 50,-50l410.5 0c27.54,0 50,22.46 50,50l0 668.87c0,19.05 9.87,35.39 26.73,44.26 16.87,8.86 35.92,7.73 51.62,-3.08 118.89,-81.83 258.61,-122.74 419.14,-122.74zm-120.31 1242.1c112.72,0 204.85,-37.39 276.38,-112.18 71.54,-74.79 107.31,-172.88 107.31,-294.27 0,-121.39 -35.77,-219.48 -107.31,-294.26 -71.53,-74.79 -163.66,-112.18 -276.38,-112.18 -112.72,0 -204.31,37.93 -274.76,113.8 -70.45,75.87 -105.67,173.42 -105.67,292.64 0,119.23 35.22,216.77 105.67,292.64 70.45,75.87 162.04,113.81 274.76,113.81z"/>
   <path fill="url(#adzhub-logo-grad)" d="M1484.65 1989.21l-285.24 385.08c-26.96,35.82 -47.2,57.84 -71.56,93.86l-939.35 1271.54c-28.01,33.54 -44.82,60.23 -70.45,95.37 -82.32,112.9 -160.54,224.81 -92.83,375.83 6.18,13.79 25.28,43.13 32.27,50.54 9.43,10 9.71,8.66 19.34,17.03 49.64,43.16 84.15,63.56 163.9,60.25 120.35,-5 759.2,-340.57 943.86,-423.52l452.01 -219.96c280.41,-125.85 653.33,-324.39 923.26,-439.84 78.82,-33.71 294.53,-129.62 364.64,-178.4 49.43,-34.39 39.13,-15.57 70.9,-67.07 48.93,-79.31 87.81,-145.43 57.95,-262.81 -21.95,-86.27 -89,-160.32 -148.98,-190.56 -106.22,-53.55 -176.46,-21.31 -272.63,16.76 -68.3,27.04 -169.62,73.04 -233.12,107.22 -159.9,86.07 -511.05,226.96 -701.97,320.79 -38.71,19.02 -198.38,104.28 -231.02,94.33 -17.15,-31.23 -4.19,-44.24 11.47,-65.33l594.51 -796.35c15.74,-20.62 27.53,-36.8 36.57,-59.3 8.67,-7.83 6.4,-5.81 15.76,-16.31l751.93 -1017.54c25.88,-38.76 60.11,-73.97 87.85,-15.65l75.46 246.74c30.92,95.1 62.83,191.02 91.64,286.41 170.77,565.49 363.78,1148.85 534.92,1712.96 56.08,184.85 113.86,389.79 177.59,568.33 40.06,112.22 91.16,343.6 146.76,405.44 13.6,15.12 32.34,28.85 47.59,43.52 83.64,80.44 245.24,89.92 358.52,39.53 84.62,-37.65 131.03,-110.57 173.09,-202.53 79.69,-174.26 151.58,-351.98 234.84,-520.72 81.24,-164.65 147.3,-353.12 229.29,-517 147.29,-294.4 315.53,-733.47 460.38,-1031.83l234.72 -520.82c40.93,-97.32 89.22,-174.5 24.27,-279.11 -46.01,-74.13 -155.48,-113.07 -268.34,-66.19 -174,72.28 -356.27,147.4 -528.82,226.91 -85.38,39.34 -173.68,75.52 -257.49,110.79 -87.33,36.75 -173.33,80.31 -261.84,115.54 -89.02,35.42 -178.82,73.68 -266.89,111.27 -329.15,140.45 -280.13,193.48 -385.96,-178.36l-275.65 -912.41c-29.11,-100.82 -59.98,-202.94 -92.99,-303.27 -60.74,-184.59 -78.53,-456.83 -337.34,-453.2 -147.79,2.07 -235.39,131.57 -326.73,261.01 -8.01,11.36 -8.93,16.11 -17.23,29.48l-149.21 200.26c-28.78,41.61 -58.99,75.77 -87.05,115.63l-80.85 112.85c-26.51,39.18 -57.89,75.54 -87.18,115.34l-801.32 1087.01c-15.16,20.71 -28.81,41.76 -43.25,60.46zm2836.55 1342.66c48.26,-18.58 235.57,-457.15 263.44,-529.59 37.2,-96.69 237.4,-492.16 226.48,-558.84 -56.36,-11.27 -305.14,116.41 -372.18,146.09 -453.47,200.72 -396.91,123.2 -327.84,359.06l120.84 404.22c17.23,57.19 25.59,168.59 89.26,179.06z"/>
  </g>
 </g>
</svg>`;

// ==========================================
// Material Design 3 (M3) Symbols Helper
// ==========================================

export function getMaterialIcon(
  name: string,
  options: {
    size?: number;
    fill?: number;
    weight?: number;
    grade?: number;
    opticalSize?: number;
    className?: string;
    style?: string;
  } = {}
): string {
  const size = options.size || 18;
  const fill = options.fill ?? 0;
  const weight = options.weight ?? 400;
  const grad = options.grade ?? 0;
  const opsz = options.opticalSize ?? 24;
  const cls = options.className
    ? `material-symbols-rounded md3-icon md3-icon-${name} ${options.className}`
    : `material-symbols-rounded md3-icon md3-icon-${name}`;
  const customStyle = options.style ? `${options.style}; ` : '';
  const fontVar = `font-variation-settings: 'FILL' ${fill}, 'wght' ${weight}, 'GRAD' ${grad}, 'opsz' ${opsz}; font-size: ${size}px; width: ${size}px; height: ${size}px; display: inline-flex; align-items: center; justify-content: center; line-height: 1; user-select: none; vertical-align: middle;`;
  return `<span class="${cls}" style="${customStyle}${fontVar}" aria-hidden="true">${name}</span>`;
}

// ==========================================
// Lucide Icons Vector Helper
// ==========================================

export function getLucideSvg(
  name: string,
  options: { size?: number; className?: string; strokeWidth?: number; style?: string } = {}
): string {
  const size = options.size || 16;
  const strokeWidth = options.strokeWidth || 2;
  const cls = options.className ? ` class="lucide-icon lucide-${name} ${options.className}"` : ` class="lucide-icon lucide-${name}"`;
  const style = options.style ? ` style="${options.style}"` : '';
  const baseAttr = `xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"${cls}${style}`;

  switch (name) {
    case 'message-square':
      return `<svg ${baseAttr}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
    case 'folder':
      return `<svg ${baseAttr}><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>`;
    case 'folder-open':
      return `<svg ${baseAttr}><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></svg>`;
    case 'folder-kanban':
      return `<svg ${baseAttr}><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/><path d="M8 10v4"/><path d="M12 10v2"/><path d="M16 10v6"/></svg>`;
    case 'file-text':
    case 'description':
      return `<svg ${baseAttr}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`;
    case 'brain':
      return `<svg ${baseAttr}><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M12 5v13"/><path d="M12 10a2.5 2.5 0 0 0 2.5 2.5"/><path d="M12 14.5a2.5 2.5 0 0 1-2.5-2.5"/></svg>`;
    case 'history':
      return `<svg ${baseAttr}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>`;
    case 'clock':
      return `<svg ${baseAttr}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    case 'crosshair':
    case 'target':
      return `<svg ${baseAttr}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`;
    case 'zap':
      return `<svg ${baseAttr}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
    case 'user':
    case 'person':
      return `<svg ${baseAttr}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    case 'users':
      return `<svg ${baseAttr}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
    case 'search':
      return `<svg ${baseAttr}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;
    case 'calendar':
      return `<svg ${baseAttr}><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>`;
    case 'bar-chart-3':
      return `<svg ${baseAttr}><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>`;
    case 'lightbulb':
      return `<svg ${baseAttr}><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`;
    case 'rocket':
      return `<svg ${baseAttr}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>`;
    case 'scale':
      return `<svg ${baseAttr}><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>`;
    case 'rotate-ccw':
      return `<svg ${baseAttr}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`;
    case 'copy':
      return `<svg ${baseAttr}><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
    case 'download':
      return `<svg ${baseAttr}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`;
    case 'shield':
    case 'security':
      return `<svg ${baseAttr}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
    case 'shield-check':
      return `<svg ${baseAttr}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>`;
    case 'check':
      return `<svg ${baseAttr}><polyline points="20 6 9 17 4 12"/></svg>`;
    case 'check-circle-2':
    case 'verified':
      return `<svg ${baseAttr}><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>`;
    case 'x':
      return `<svg ${baseAttr}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
    case 'alert-triangle':
      return `<svg ${baseAttr}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>`;
    case 'lock':
      return `<svg ${baseAttr}><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
    case 'wrench':
      return `<svg ${baseAttr}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;
    case 'sparkles':
      return `<svg ${baseAttr}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>`;
    case 'eye':
      return `<svg ${baseAttr}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
    case 'arrow-right':
      return `<svg ${baseAttr}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;
    case 'arrow-up':
      return `<svg ${baseAttr}><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>`;
    case 'menu':
      return `<svg ${baseAttr}><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>`;
    case 'network':
    case 'hub':
    case 'share-2':
      return `<svg ${baseAttr}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>`;
    case 'building-2':
    case 'building':
    case 'corporate_fare':
      return `<svg ${baseAttr}><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`;
    case 'megaphone':
    case 'campaign':
      return `<svg ${baseAttr}><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>`;
    case 'tag':
    case 'tags':
    case 'sell':
      return `<svg ${baseAttr}><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>`;
    case 'clipboard-list':
    case 'pending_actions':
      return `<svg ${baseAttr}><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>`;
    case 'info':
      return `<svg ${baseAttr}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`;
    case 'timeline':
    case 'activity':
      return `<svg ${baseAttr}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`;
    default:
      return `<svg ${baseAttr}><circle cx="12" cy="12" r="10"/></svg>`;
  }
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
        🛡 Card de Governança · ${data.operation}
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
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AdzHub · Central de Operações de Mídia &amp; IA — AdzHub Harness</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Inter:ital,opsz,wght@0,14..32,400..700;1,14..32,400..700&family=Plus+Jakarta+Sans:ital,wght@0,500;0,600;0,700;1,500;1,600;1,700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    :root {
      /* ========================================================= */
      /* Material Design 3 (M3) — Tokens Oficiais de Cor & Tema   */
      /* ========================================================= */
      --md-sys-color-primary: #294A91;
      --md-sys-color-on-primary: #FFFFFF;
      --md-sys-color-primary-container: #E2E8F8;
      --md-sys-color-on-primary-container: #102657;

      --md-sys-color-secondary: #F68934;
      --md-sys-color-on-secondary: #FFFFFF;
      --md-sys-color-secondary-container: #FFEAD8;
      --md-sys-color-on-secondary-container: #542500;

      --md-sys-color-tertiary: #0284C7;
      --md-sys-color-on-tertiary: #FFFFFF;
      --md-sys-color-tertiary-container: #E0F2FE;
      --md-sys-color-on-tertiary-container: #002244;

      --md-sys-color-error: #BA1A1A;
      --md-sys-color-on-error: #FFFFFF;
      --md-sys-color-error-container: #FFDAD6;
      --md-sys-color-on-error-container: #410002;

      --md-sys-color-success: #15803D;
      --md-sys-color-on-success: #FFFFFF;
      --md-sys-color-success-container: #DCFCE7;
      --md-sys-color-on-success-container: #052E16;

      --md-sys-color-warning: #B45309;
      --md-sys-color-on-warning: #FFFFFF;
      --md-sys-color-warning-container: #FEF3C7;
      --md-sys-color-on-warning-container: #451A03;

      --md-sys-color-surface: #FFFFFF;
      --md-sys-color-surface-dim: #D9DFE8;
      --md-sys-color-surface-bright: #F8FAFD;
      --md-sys-color-surface-container-lowest: #FFFFFF;
      --md-sys-color-surface-container-low: #F6F8FB;
      --md-sys-color-surface-container: #EEF2F8;
      --md-sys-color-surface-container-high: #E6ECF4;
      --md-sys-color-surface-container-highest: #DEE5EF;
      --md-sys-color-on-surface: #1E293B;
      --md-sys-color-on-surface-variant: #475569;
      --md-sys-color-outline: #CBD5E1;
      --md-sys-color-outline-variant: #E2E8F0;
      --md-sys-color-inverse-surface: #1E293B;
      --md-sys-color-inverse-on-surface: #F8FAFC;
      --md-sys-color-inverse-primary: #ADC6FF;

      /* ========================================================= */
      /* Material Design 3 — Shape Scale (Formas e Raios)          */
      /* ========================================================= */
      --md-sys-shape-corner-none: 0px;
      --md-sys-shape-corner-extra-small: 4px;
      --md-sys-shape-corner-small: 8px;
      --md-sys-shape-corner-medium: 12px;
      --md-sys-shape-corner-large: 16px;
      --md-sys-shape-corner-extra-large: 28px;
      --md-sys-shape-corner-full: 9999px;

      /* ========================================================= */
      /* Material Design 3 — Elevation Scale (Sombreamento Duplo)  */
      /* ========================================================= */
      --md-sys-elevation-0: none;
      --md-sys-elevation-1: 0px 1px 2px rgba(15, 23, 42, 0.08), 0px 1px 3px 1px rgba(15, 23, 42, 0.05);
      --md-sys-elevation-2: 0px 1px 2px rgba(15, 23, 42, 0.08), 0px 2px 6px 2px rgba(15, 23, 42, 0.06);
      --md-sys-elevation-3: 0px 1px 3px rgba(15, 23, 42, 0.10), 0px 4px 12px 3px rgba(15, 23, 42, 0.08);
      --md-sys-elevation-4: 0px 2px 3px rgba(15, 23, 42, 0.10), 0px 6px 16px 4px rgba(15, 23, 42, 0.10);
      --md-sys-elevation-5: 0px 4px 4px rgba(15, 23, 42, 0.12), 0px 8px 24px 6px rgba(15, 23, 42, 0.12);

      /* ========================================================= */
      /* Material Design 3 — Motion System (Curvas e Durações)     */
      /* ========================================================= */
      --md-sys-motion-easing-emphasized: cubic-bezier(0.2, 0, 0, 1.0);
      --md-sys-motion-easing-emphasized-decelerate: cubic-bezier(0.05, 0.7, 0.1, 1.0);
      --md-sys-motion-easing-emphasized-accelerate: cubic-bezier(0.3, 0, 0.8, 0.15);
      --md-sys-motion-easing-standard: cubic-bezier(0.2, 0, 0, 1);
      --md-sys-motion-easing-standard-decelerate: cubic-bezier(0, 0, 0.2, 1);
      --md-sys-motion-easing-standard-accelerate: cubic-bezier(0.4, 0, 1, 1);

      --md-sys-motion-duration-short1: 50ms;
      --md-sys-motion-duration-short2: 100ms;
      --md-sys-motion-duration-short3: 150ms;
      --md-sys-motion-duration-short4: 200ms;
      --md-sys-motion-duration-medium1: 250ms;
      --md-sys-motion-duration-medium2: 300ms;
      --md-sys-motion-duration-medium3: 350ms;
      --md-sys-motion-duration-medium4: 400ms;
      --md-sys-motion-duration-long1: 450ms;
      --md-sys-motion-duration-long2: 500ms;
      --md-sys-motion-duration-long3: 550ms;
      --md-sys-motion-duration-long4: 600ms;
      --md-sys-motion-duration-extra-long1: 700ms;
      --md-sys-motion-duration-extra-long2: 800ms;
      --md-sys-motion-duration-extra-long3: 900ms;
      --md-sys-motion-duration-extra-long4: 1000ms;

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
      --cyan-strong: #0284C7;
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

      /* Sistema de Tags Tone-on-Tone Refinado */
      --tag-neutral-bg: #F1F5F9;
      --tag-neutral-border: #E2E8F0;
      --tag-neutral-ink: #334155;

      --tag-success-bg: #F0FDF4;
      --tag-success-border: #DCFCE7;
      --tag-success-ink: #15803D;

      --tag-warning-bg: #FFFBEB;
      --tag-warning-border: #FEF3C7;
      --tag-warning-ink: #B45309;

      --tag-danger-bg: #FEF2F2;
      --tag-danger-border: #FEE2E2;
      --tag-danger-ink: #B91C1C;

      --tag-info-bg: #EFF6FF;
      --tag-info-border: #DBEAFE;
      --tag-info-ink: #1D4ED8;

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
      --label: 0.78125rem;
      --micro: 0.72rem;

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

      /* Sombras Frias, Difusas e Flutuantes (Profundidade Multi-camadas) */
      --shadow-app-window: 
        0 0 0 1px rgba(203, 213, 225, 0.75),
        0 4px 6px -2px rgba(15, 23, 42, 0.05),
        0 12px 24px -4px rgba(15, 23, 42, 0.12),
        0 25px 50px -12px rgba(15, 23, 42, 0.18),
        0 45px 80px -20px rgba(15, 23, 42, 0.14);
      --shadow-card: 0 2px 8px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04);
      --shadow-floating: 
        0 10px 25px -4px rgba(15, 23, 42, 0.12),
        0 4px 10px -2px rgba(15, 23, 42, 0.06),
        0 0 0 1px rgba(203, 213, 225, 0.8);
      --glow-navy-pulse: 0 0 0 3px rgba(41, 74, 145, 0.25);

      /* Animação & Movimento */
      --duration-default: 200ms;
      --ease-default: var(--md-sys-motion-easing-standard, cubic-bezier(.22, 1, .36, 1));
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    html {
      font-size: 14px;
      height: 100vh;
      height: 100dvh;
      max-height: 100vh;
      max-height: 100dvh;
      overflow: hidden;
    }

    @media (min-width: 1440px) {
      html { font-size: 14.5px; }
    }

    body {
      height: 100vh;
      height: 100dvh;
      max-height: 100vh;
      max-height: 100dvh;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background-color: #EDF2F7;
      background-image: 
        radial-gradient(ellipse at 50% 0%, rgba(41, 74, 145, 0.06) 0%, transparent 65%),
        radial-gradient(ellipse at 85% 100%, rgba(245, 154, 25, 0.04) 0%, transparent 50%),
        linear-gradient(180deg, #F8FAFC 0%, #EDF2F7 100%);
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
    .brand-logo-wrap svg {
      height: 32px;
      width: auto;
      display: block;
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
      gap: 6px;
      padding: 5px 12px;
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
      display: none !important;
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
    /* Material Symbols M3 & Icon Typography                     */
    /* ========================================================= */
    .material-symbols-rounded, .material-symbols-outlined {
      font-family: 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif;
      font-weight: normal;
      font-style: normal;
      font-size: 18px;
      line-height: 1;
      letter-spacing: normal;
      text-transform: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      word-wrap: normal;
      direction: ltr;
      -webkit-font-feature-settings: 'liga';
      -webkit-font-smoothing: antialiased;
      user-select: none;
      vertical-align: middle;
      flex-shrink: 0;
      transition: transform var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-standard);
    }

    /* ========================================================= */
    /* Material Design 3 — Ripple Effect & Interactive States    */
    /* ========================================================= */
    .md3-ripple, button, .rail-btn, .doc-tab-btn, .timeline-tab-btn, .graph-tab-btn, .task-card-item, .operator-menu-item, .turn-suggestion-chip {
      position: relative;
      overflow: hidden;
      -webkit-tap-highlight-color: transparent;
    }

    .md3-ripple-wave {
      position: absolute;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(41, 74, 145, 0.28) 0%, rgba(41, 74, 145, 0.10) 60%, transparent 80%);
      transform: scale(0);
      animation: md3-ripple-animation 0.55s var(--md-sys-motion-easing-standard-decelerate) forwards;
      pointer-events: none;
      z-index: 1;
    }

    @keyframes md3-ripple-animation {
      0% { transform: scale(0); opacity: 1; }
      100% { transform: scale(2.8); opacity: 0; }
    }

    /* ========================================================= */
    /* Componentes Globais de Form e Botões Material Design 3    */
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
      transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
    }

    select:focus, button:focus, input:focus {
      border-color: var(--md-sys-color-primary);
      background-color: var(--surface);
      box-shadow: 0 0 0 3px rgba(41, 74, 145, 0.18);
    }

    button {
      cursor: pointer;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      user-select: none;
      transition: all var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-standard);
    }

    button:hover:not(:disabled) {
      background-color: var(--surface-muted);
      border-color: var(--line-strong);
    }

    button:active:not(:disabled) {
      transform: scale(0.985);
    }

    button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    /* M3 Filled Button (btn-primary) */
    button.btn-primary, .md3-btn-filled {
      background-color: var(--md-sys-color-primary);
      border: 1px solid var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
      font-weight: 600;
      padding: 7px 15px;
      border-radius: var(--md-sys-shape-corner-full);
      box-shadow: var(--md-sys-elevation-1);
      letter-spacing: 0.01em;
    }
    button.btn-primary:hover:not(:disabled), .md3-btn-filled:hover:not(:disabled) {
      background-color: var(--navy-deep);
      border-color: var(--navy-deep);
      box-shadow: var(--md-sys-elevation-2);
      transform: translateY(-1px);
    }
    button.btn-primary:active:not(:disabled), .md3-btn-filled:active:not(:disabled) {
      box-shadow: var(--md-sys-elevation-1);
      transform: translateY(0) scale(0.985);
    }

    /* M3 Tonal / Outlined Button (btn-secondary) */
    button.btn-secondary, .md3-btn-tonal {
      background-color: var(--md-sys-color-surface-container-high);
      border: 1px solid var(--md-sys-color-outline-variant);
      color: var(--md-sys-color-primary);
      padding: 6px 14px;
      border-radius: var(--md-sys-shape-corner-full);
      font-weight: 600;
    }
    button.btn-secondary:hover:not(:disabled), .md3-btn-tonal:hover:not(:disabled) {
      background-color: var(--md-sys-color-primary-container);
      border-color: var(--adzhub-navy-border);
      color: var(--md-sys-color-on-primary-container);
      box-shadow: var(--md-sys-elevation-1);
      transform: translateY(-1px);
    }
    button.btn-secondary:active:not(:disabled), .md3-btn-tonal:active:not(:disabled) {
      transform: translateY(0) scale(0.985);
    }

    /* M3 Danger Button */
    button.btn-danger {
      background-color: var(--md-sys-color-error-container);
      border: 1px solid rgba(186, 26, 26, 0.2);
      color: var(--md-sys-color-error);
      border-radius: var(--md-sys-shape-corner-full);
      font-weight: 600;
    }
    button.btn-danger:hover:not(:disabled) {
      background-color: var(--md-sys-color-error);
      color: #FFFFFF;
      box-shadow: var(--md-sys-elevation-1);
      transform: translateY(-1px);
    }

    /* M3 Icon Button */
    .md3-icon-button {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      background: transparent;
      border: 1px solid transparent;
      color: var(--ink-muted);
      cursor: pointer;
      transition: all var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-standard);
    }
    .md3-icon-button:hover {
      background-color: var(--md-sys-color-surface-container-high);
      color: var(--md-sys-color-primary);
    }
    .md3-icon-button:active {
      transform: scale(0.94);
    }

    /* M3 Filter Chips */
    .md3-chip, .md3-filter-chip, .doc-tab-btn, .timeline-tab-btn, .graph-tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 30px;
      padding: 0 12px;
      border-radius: var(--md-sys-shape-corner-full);
      font-size: var(--label);
      font-weight: 600;
      font-family: var(--font-primary);
      cursor: pointer;
      border: 1px solid var(--md-sys-color-outline-variant);
      background-color: var(--md-sys-color-surface-container-lowest);
      color: var(--ink);
      transition: all var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-standard);
      white-space: nowrap;
      user-select: none;
    }
    .md3-chip:hover, .md3-filter-chip:hover, .doc-tab-btn:hover, .timeline-tab-btn:hover, .graph-tab-btn:hover {
      background-color: var(--md-sys-color-surface-container-high);
      border-color: var(--adzhub-navy-border);
      color: var(--md-sys-color-primary);
      box-shadow: var(--md-sys-elevation-1);
      transform: translateY(-1px);
    }
    .md3-chip.active, .md3-filter-chip.active, .doc-tab-btn.active, .timeline-tab-btn.active, .graph-tab-btn.active {
      background-color: var(--md-sys-color-primary);
      border-color: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary) !important;
      box-shadow: var(--md-sys-elevation-1);
    }
    .md3-chip.active .material-symbols-rounded, .md3-chip.active svg {
      color: var(--md-sys-color-on-primary) !important;
      stroke: var(--md-sys-color-on-primary) !important;
    }

    /* M3 Suggestion Chips */
    .turn-suggestion-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      background: var(--surface);
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: var(--md-sys-shape-corner-large);
      color: var(--ink-strong);
      font-size: var(--label);
      font-weight: 500;
      cursor: pointer;
      box-shadow: var(--md-sys-elevation-1);
      transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
      text-align: left;
    }
    .turn-suggestion-chip:hover {
      background: var(--md-sys-color-surface-container-low);
      border-color: var(--adzhub-navy-border);
      color: var(--md-sys-color-primary);
      box-shadow: var(--md-sys-elevation-2);
      transform: translateY(-2px);
    }

    /* ========================================================= */
    /* Janela Central Elevada (Workspace Command Center)          */
    /* ========================================================= */
    .blueprint-outer-wrapper {
      flex: 1;
      min-height: 0;
      overflow: hidden;
      padding: 12px 20px 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: calc(100vh - 50px);
      height: calc(100dvh - 50px);
      box-sizing: border-box;
      gap: 12px;
    }

    .blueprint-card {
      flex: 1;
      width: 100%;
      max-width: 1200px;
      min-height: 0;
      max-height: calc(100vh - 78px);
      max-height: calc(100dvh - 78px);
      height: 100%;
      background-color: var(--app-canvas);
      border: 1px solid rgba(226, 232, 240, 0.9);
      border-radius: var(--radius-app-window);
      box-shadow: var(--shadow-app-window);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      margin: 0 auto;
      position: relative;
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
    /* Grid de 4 Regiões Anatômicas (Desktop):                   */
    /* iconRail (56px) + Mesa de Controles (220px) + Chat (1fr) + Palco (270px) */
    /* ========================================================= */
    .blueprint-grid {
      flex: 1;
      min-height: 0;
      display: grid;
      grid-template-columns: 56px minmax(210px, 240px) minmax(400px, 1fr) minmax(240px, 280px);
      overflow: hidden;
      width: 100%;
    }
    .blueprint-grid.view-chat,
    .blueprint-grid:not(.view-documents):not(.view-supercerebro):not(.view-timeline):not(.view-controls):not(.view-palco) {
      grid-template-columns: 56px minmax(210px, 240px) minmax(400px, 1fr) minmax(240px, 280px);
    }
    .blueprint-grid.view-documents,
    .blueprint-grid.view-supercerebro,
    .blueprint-grid.view-timeline,
    .blueprint-grid.view-full,
    .blueprint-grid.hide-palco,
    .blueprint-grid.hide-controls-and-palco {
      grid-template-columns: 56px 1fr !important;
    }

    /* Ocultar Controles e Palco no Desktop quando em views de tela cheia */
    .blueprint-grid.view-documents #pane-controls,
    .blueprint-grid.view-documents #pane-palco,
    .blueprint-grid.view-supercerebro #pane-controls,
    .blueprint-grid.view-supercerebro #pane-palco,
    .blueprint-grid.view-timeline #pane-controls,
    .blueprint-grid.view-timeline #pane-palco,
    .blueprint-grid.hide-palco #pane-controls,
    .blueprint-grid.hide-palco #pane-palco,
    .blueprint-grid.hide-controls-and-palco #pane-controls,
    .blueprint-grid.hide-controls-and-palco #pane-palco {
      display: none !important;
    }

    /* --------------------------------------------------------- */
    /* REGIÃO 1: ICON RAIL (Left Navigation Shortcuts M3)        */
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
      width: 40px;
      height: 40px;
      margin: 0 auto;
      padding: 0;
      border-radius: var(--md-sys-shape-corner-full);
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
      transition: all var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-standard);
      box-sizing: border-box;
    }
    .rail-btn:hover {
      background-color: var(--md-sys-color-surface-container-high);
      color: var(--md-sys-color-primary);
      transform: scale(1.06);
    }
    .rail-btn.active {
      background-color: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-primary);
      box-shadow: var(--md-sys-elevation-1);
    }
    .rail-btn.active .material-symbols-rounded, .rail-btn.active svg {
      color: var(--md-sys-color-primary);
      stroke: var(--md-sys-color-primary);
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
      font-size: 0.8125rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      color: var(--ink-muted);
    }

    .control-group select {
      width: 100%;
      background-color: var(--surface);
      border: 1px solid var(--line);
      color: var(--ink-strong);
      font-size: 0.875rem;
      padding: 7px 10px;
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
      font-size: 0.8125rem;
      color: var(--ink-muted);
      font-family: var(--font-primary);
      font-weight: 700;
    }

    .key-inputs input[type="password"] {
      background-color: var(--surface-soft);
      border: 1px solid var(--line);
      color: var(--ink-strong);
      font-family: var(--font-mono);
      font-size: 0.875rem;
      padding: 7px 10px;
      border-radius: var(--radius-control);
    }
    .key-inputs input[type="password"]:focus {
      border-color: var(--navy);
      background-color: var(--surface);
      box-shadow: 0 0 0 2px rgba(41, 74, 145, 0.2);
    }

    #key-status {
      font-size: 0.78125rem;
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
      font-weight: 700;
      font-size: 0.9375rem;
      color: var(--ink-strong);
    }
    .task-card-meta {
      font-size: 0.8125rem;
      font-family: var(--font-mono);
      color: var(--ink-muted);
      line-height: 1.4;
    }
    .task-card-btn {
      align-self: flex-start;
      background: var(--navy-soft);
      color: var(--navy-ink);
      border: 1px solid var(--adzhub-navy-border);
      border-radius: var(--radius-pill);
      padding: 4px 11px;
      font-size: 0.8125rem;
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
      padding: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background-color: var(--surface);
      position: relative;
    }
    #chat-messages-wrapper {
      flex: 1;
      min-height: 0;
      padding: 14px 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
      scrollbar-width: thin;
      scrollbar-color: var(--line) transparent;
      scroll-behavior: smooth;
    }
    #chat-messages-wrapper::-webkit-scrollbar { width: 5px; }
    #chat-messages-wrapper::-webkit-scrollbar-thumb { background: var(--line-strong); border-radius: 4px; }

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
      padding: 10px 16px;
      border-radius: var(--radius-card);
      font-size: 0.9375rem;
      font-weight: 400;
      max-width: 82%;
      box-shadow: var(--shadow-card);
      line-height: 1.55;
      letter-spacing: 0.01em;
    }

    /* ========================================================= */
    /* Card Accordion de Raciocínio Colapsável                   */
    /* ========================================================= */
    .reasoning-accordion-card {
      border: 1px solid var(--line);
      border-radius: var(--radius-card);
      background-color: var(--surface-soft);
      overflow: hidden;
      transition: all var(--duration-default) var(--ease-default);
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    }
    .reasoning-accordion-card:hover {
      border-color: var(--adzhub-navy-border);
    }
    .reasoning-accordion-header {
      width: 100%;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: transparent;
      border: none;
      color: var(--ink-strong);
      font-size: var(--body);
      font-weight: 600;
      cursor: pointer;
      text-align: left;
      user-select: none;
      font-family: var(--font-primary);
      transition: background-color var(--duration-default) var(--ease-default);
    }
    .reasoning-accordion-header:hover {
      background-color: var(--surface-selected);
    }
    .reasoning-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .reasoning-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 5px;
      background: var(--navy-soft);
      color: var(--navy);
    }
    .reasoning-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--ink-strong);
      letter-spacing: -0.01em;
    }
    .reasoning-chevron {
      color: var(--ink-muted);
      font-size: 0.85rem;
      transition: transform var(--duration-default) var(--ease-default);
      display: inline-flex;
      align-items: center;
    }
    .reasoning-accordion-card.open .reasoning-chevron {
      transform: rotate(180deg);
    }
    .reasoning-accordion-content {
      padding: 8px 12px 12px;
      border-top: 1px dashed var(--line);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    /* Agent Reasoning & Tool Steps (Cards de raciocínio mantidos intactos) */
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
      background: var(--surface);
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
      background-color: var(--surface-soft);
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

    /* Agent Response Box (Mensagens Recebidas com fonte aumentada) */
    .agent-response-box {
      background-color: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius-card);
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: var(--shadow-card);
      font-size: 0.9375rem;
      line-height: 1.6;
      color: var(--ink);
    }
    .agent-response-content {
      font-size: 0.9375rem;
      line-height: 1.6;
      color: var(--ink);
    }
    .agent-response-content p {
      font-size: 0.9375rem;
      line-height: 1.6;
      color: var(--ink);
      margin: 6px 0;
    }
    .agent-response-content ul, .agent-response-content ol {
      font-size: 0.9375rem;
      line-height: 1.6;
      color: var(--ink);
    }
    .agent-response-content li {
      font-size: 0.9375rem;
      line-height: 1.55;
      color: var(--ink);
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
      font-size: 0.9375rem;
      padding: 6px 0;
      resize: none !important;
      overflow: hidden !important;
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
      font-family: var(--font-primary);
      line-height: 1.4;
      min-height: 24px;
      max-height: 120px;
    }
    .chat-input-row textarea::-webkit-scrollbar,
    #chat-interactive-input::-webkit-scrollbar {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
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
      display: block;
      margin-bottom: 5px;
    }
    .stage-card-name {
      font-family: var(--font-display);
      font-weight: 600;
      color: var(--ink-strong);
      font-size: 0.8125rem;
      letter-spacing: -0.01em;
      line-height: 1.35;
      white-space: normal;
      word-break: break-word;
      display: block;
    }

    .stage-card-tags {
      display: flex;
      align-items: center;
      gap: 5px;
      flex-wrap: wrap;
      margin-top: 4px;
    }

    /* Dynamic Tags & Badges - Refinados, Sem Poluição Visual */
    .tag-pill {
      font-family: var(--font-mono);
      font-size: var(--micro);
      font-weight: 500;
      letter-spacing: 0.02em;
      padding: 2px 7px;
      border-radius: var(--radius-pill);
      border: 1px solid var(--tag-neutral-border);
      background-color: var(--tag-neutral-bg);
      color: var(--tag-neutral-ink);
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      line-height: 1.25;
      transition: all var(--duration-default) var(--ease-default);
    }
    .tag-hook-strong { background: var(--tag-success-bg); color: var(--tag-success-ink); border-color: var(--tag-success-border); }
    .tag-hook-weak { background: var(--tag-danger-bg); color: var(--tag-danger-ink); border-color: var(--tag-danger-border); }
    .tag-cta-good { background: var(--tag-neutral-bg); color: var(--tag-neutral-ink); border-color: var(--tag-neutral-border); }
    .tag-cta-bad { background: var(--tag-warning-bg); color: var(--tag-warning-ink); border-color: var(--tag-warning-border); }
    .tag-status-paused { background: var(--tag-warning-bg); color: var(--tag-warning-ink); font-weight: 600; border-color: var(--tag-warning-border); }
    .tag-status-active { background: var(--tag-success-bg); color: var(--tag-success-ink); font-weight: 600; border-color: var(--tag-success-border); }

    .stage-card-metrics {
      font-family: var(--font-mono);
      font-size: var(--micro);
      color: var(--ink-muted);
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      align-items: center;
      margin-top: 1px;
      padding-top: 4px;
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

    /* Flow Sequence Bar (Rodapé Flutuante) */
    .flow-sequence-bar {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 6px 18px;
      flex-wrap: wrap;
      font-size: var(--label);
      font-family: var(--font-mono);
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(203, 213, 225, 0.85);
      border-radius: var(--radius-pill);
      box-shadow: 
        0 4px 6px -1px rgba(15, 23, 42, 0.06),
        0 10px 24px -3px rgba(15, 23, 42, 0.12),
        0 0 0 1px rgba(255, 255, 255, 0.9) inset;
      z-index: 10;
      transition: all var(--duration-default) var(--ease-default);
    }
    .flow-sequence-bar:hover {
      box-shadow: 
        0 6px 12px -2px rgba(15, 23, 42, 0.08),
        0 14px 28px -4px rgba(15, 23, 42, 0.15),
        0 0 0 1px rgba(255, 255, 255, 0.9) inset;
      transform: translateY(-1px);
    }

    .flow-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border-radius: var(--radius-pill);
      background: #FFFFFF;
      border: 1px solid rgba(226, 232, 240, 0.95);
      color: var(--ink-muted);
      font-weight: 500;
      font-size: var(--label);
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
      transition: all var(--duration-default) var(--ease-default);
    }
    .flow-pill:hover {
      border-color: var(--adzhub-navy-border);
      color: var(--navy-ink);
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
      transform: translateY(-1px);
    }
    .flow-pill.active {
      background: var(--navy) !important;
      border-color: var(--navy) !important;
      color: #FFFFFF !important;
      font-weight: 600 !important;
      box-shadow: 0 3px 10px rgba(41, 74, 145, 0.35), 0 0 0 1px rgba(41, 74, 145, 0.4) !important;
      transform: translateY(-1px);
    }
    .flow-pill.active-success {
      background: var(--green) !important;
      border-color: var(--green) !important;
      color: #FFFFFF !important;
      font-weight: 600 !important;
      box-shadow: 0 3px 10px rgba(83, 181, 138, 0.35), 0 0 0 1px rgba(83, 181, 138, 0.4) !important;
      transform: translateY(-1px);
    }
    .flow-pill-arrow {
      color: #94A3B8;
      font-size: 0.72rem;
      font-weight: 600;
      opacity: 0.85;
      user-select: none;
    }
    .flow-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      display: inline-block;
      opacity: 0.85;
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
      gap: 6px;
      padding: 3px 10px;
      border-radius: var(--radius-pill);
      font-family: var(--font-mono);
      font-size: var(--label);
      font-weight: 600;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      border: 1px solid var(--line);
      background-color: var(--surface-soft);
      color: var(--ink);
    }
    .badge-committed { border-color: var(--tag-success-border); color: var(--tag-success-ink); background-color: var(--tag-success-bg); }
    .badge-provisional { border-color: var(--line-strong); color: var(--ink-muted); background-color: var(--surface-soft); }
    .badge-verifying { border-color: var(--tag-info-border); color: var(--tag-info-ink); background-color: var(--tag-info-bg); }
    .badge-quarantined { border-color: var(--tag-warning-border); color: var(--tag-warning-ink); background-color: var(--tag-warning-bg); }
    .badge-blocked { border-color: var(--tag-danger-border); color: var(--tag-danger-ink); background-color: var(--tag-danger-bg); }
    .badge-failed { border-color: var(--tag-danger-border); color: var(--tag-danger-ink); background-color: var(--tag-danger-bg); }

    .badge-phase-plan { border-color: var(--tag-info-border); color: var(--tag-info-ink); background-color: var(--tag-info-bg); }
    .badge-phase-fork { border-color: #E2E8F0; color: #475569; background-color: #F8FAFC; }
    .badge-phase-attribute { border-color: var(--tag-warning-border); color: var(--tag-warning-ink); background-color: var(--tag-warning-bg); }
    .badge-phase-replan { border-color: var(--tag-danger-border); color: var(--tag-danger-ink); background-color: var(--tag-danger-bg); }
    .badge-phase-verify { border-color: var(--tag-info-border); color: var(--tag-info-ink); background-color: var(--tag-info-bg); }
    .badge-phase-commit { border-color: var(--tag-success-border); color: var(--tag-success-ink); background-color: var(--tag-success-bg); }

    .spinner {
      width: 22px;
      height: 22px;
      border: 2px solid var(--line);
      border-top-color: var(--navy);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Keyframes e Estilos do HumanLoading */
    @keyframes loading-float-slow {
      0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
      50% { transform: translate3d(12px, -10px, 0) scale(1.04); }
    }
    @keyframes loading-float-reverse {
      0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
      50% { transform: translate3d(-14px, 10px, 0) scale(.96); }
    }
    @keyframes loading-breathe {
      0%, 100% { transform: scale(.94); opacity: .72; }
      50% { transform: scale(1.06); opacity: 1; }
    }
    @keyframes loading-shimmer {
      0% { transform: translateX(-120%); }
      55%, 100% { transform: translateX(260%); }
    }
    @keyframes loading-dot-pulse {
      0%, 70%, 100% { transform: translateY(0); opacity: .38; }
      35% { transform: translateY(-3px); opacity: 1; }
    }
    .loading-shimmer-bar { animation: loading-shimmer 2.8s cubic-bezier(.4,0,.2,1) infinite; }
    .loading-breathe-circle { animation: loading-breathe 3.8s ease-in-out infinite; }
    .loading-float-slow-bg { animation: loading-float-slow 8s ease-in-out infinite; }
    .loading-float-reverse-bg { animation: loading-float-reverse 9s ease-in-out infinite; }
    .loading-dot-pulse { animation: loading-dot-pulse 1.2s ease-in-out infinite; }
    .loading-dot-pulse:nth-child(2) { animation-delay: .15s; }
    .loading-dot-pulse:nth-child(3) { animation-delay: .3s; }

    .human-loading-card-container {
      position: relative;
      width: 100%;
      max-width: 590px;
      margin: 16px auto;
      padding: 8px 12px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .human-loading-glow-1 {
      pointer-events: none;
      position: absolute;
      left: -20px;
      top: -30px;
      width: 280px;
      height: 280px;
      border-radius: 50%;
      background: var(--navy-soft, #dfe4ff);
      opacity: 0.65;
      filter: blur(48px);
    }
    .human-loading-glow-2 {
      pointer-events: none;
      position: absolute;
      right: -20px;
      bottom: -30px;
      width: 300px;
      height: 300px;
      border-radius: 50%;
      background: #e8ddff;
      opacity: 0.55;
      filter: blur(48px);
    }
    .human-loading-card {
      position: relative;
      width: 100%;
      overflow: hidden;
      border-radius: 28px;
      border: 1px solid rgba(255, 255, 255, 0.9);
      background: rgba(255, 255, 255, 0.85);
      padding: 18px 22px;
      box-shadow: 0 24px 70px rgba(41, 74, 145, 0.1);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-sizing: border-box;
    }
    .human-loading-card-inner {
      position: relative;
      overflow: hidden;
      border-radius: 20px;
      background: linear-gradient(135deg, #f5f7ff 0%, #faf8ff 100%);
      padding: 24px 20px;
      border: 1px solid rgba(41, 74, 145, 0.05);
    }
    .human-loading-glow-top {
      pointer-events: none;
      position: absolute;
      right: -30px;
      top: -30px;
      width: 130px;
      height: 130px;
      border-radius: 50%;
      background: rgba(223, 229, 255, 0.7);
      filter: blur(28px);
    }
    .human-loading-content {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .human-loading-icon-badge {
      position: relative;
      display: flex;
      width: 56px;
      height: 56px;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: #ffffff;
      box-shadow: 0 7px 20px rgba(41, 74, 145, 0.14);
    }
    .human-loading-breathe-bg {
      position: absolute;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--navy-soft, #dfe4ff);
    }
    .human-loading-dots {
      position: relative;
      display: flex;
      align-items: center;
      gap: 4px;
      z-index: 1;
    }
    .loading-dot-pulse {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .loading-dot-pulse.dot-1 { background-color: var(--navy, #294a91); }
    .loading-dot-pulse.dot-2 { background-color: #5962be; }
    .loading-dot-pulse.dot-3 { background-color: #7b70dd; }

    .human-loading-text-group {
      margin-top: 18px;
    }
    .human-loading-title {
      font-family: var(--font-display, sans-serif);
      font-size: 1.1875rem;
      font-weight: 600;
      color: var(--ink-strong, #1b2540);
      margin: 0;
      letter-spacing: -0.025em;
    }
    .human-loading-subtitle {
      font-size: 0.8125rem;
      font-family: var(--font-mono, monospace);
      color: var(--ink-muted, #64748b);
      margin: 6px 0 0 0;
      line-height: 1.4;
    }
    .human-loading-progress-track {
      position: relative;
      margin-top: 22px;
      height: 4px;
      overflow: hidden;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.85);
    }
    .human-loading-shimmer {
      position: absolute;
      height: 100%;
      width: 35%;
      border-radius: 9999px;
      background: linear-gradient(90deg, transparent, var(--navy, #294a91), transparent);
    }

    .hidden-storage-panel { display: none; }

    /* Responsividade */
    /* ========================================================= */
    /* Mobile Hamburger & Drawer Styles                          */
    /* ========================================================= */
    .btn-mobile-menu {
      display: none;
      width: 36px;
      height: 36px;
      border-radius: var(--radius-control);
      background: var(--surface-soft);
      border: 1px solid var(--line-strong);
      color: var(--navy);
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;
      flex-shrink: 0;
      transition: all var(--duration-default) var(--ease-default);
    }
    .btn-mobile-menu:hover, .btn-mobile-menu:focus-visible {
      background: var(--surface-selected);
      border-color: var(--navy);
    }

    .mobile-drawer-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 9998;
      opacity: 0;
      transition: opacity 0.25s ease;
    }
    .mobile-drawer-backdrop.open {
      display: block;
      opacity: 1;
    }

    .mobile-drawer {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      width: 310px;
      max-width: 86vw;
      background: var(--surface);
      border-right: 1px solid var(--line);
      z-index: 9999;
      box-shadow: var(--shadow-app-window);
      display: flex;
      flex-direction: column;
      transform: translateX(-100%);
      transition: transform 0.28s var(--md-sys-motion-easing-emphasized);
      overflow-y: auto;
    }
    .mobile-drawer.open {
      transform: translateX(0);
    }

    .mobile-drawer-header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--line);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--surface-soft);
    }
    .btn-close-drawer {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1px solid var(--line);
      background: var(--surface);
      color: var(--ink-muted);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;
    }
    .btn-close-drawer:hover {
      background: var(--surface-muted);
      color: var(--ink-strong);
    }

    .mobile-drawer-body {
      flex: 1;
      padding: 14px 12px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .mobile-drawer-section-title {
      font-family: var(--font-mono);
      font-size: var(--micro);
      font-weight: 700;
      color: var(--ink-muted);
      letter-spacing: 0.05em;
      margin-bottom: 8px;
      padding-left: 4px;
    }

    .mobile-drawer-nav-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .mobile-nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: var(--radius-card);
      border: 1px solid var(--line);
      background: var(--surface);
      color: var(--ink-strong);
      cursor: pointer;
      text-align: left;
      transition: all var(--duration-default) var(--ease-default);
      width: 100%;
    }
    .mobile-nav-item:hover, .mobile-nav-item:focus-visible {
      background: var(--surface-soft);
      border-color: var(--adzhub-navy-border);
      transform: translateX(2px);
    }
    .mobile-nav-item.active {
      background: var(--surface-selected);
      border-color: var(--navy);
      box-shadow: 0 1px 3px rgba(41, 74, 145, 0.1);
    }
    .mobile-nav-icon {
      width: 34px;
      height: 34px;
      border-radius: var(--radius-control);
      background: var(--navy-soft);
      color: var(--navy);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .mobile-nav-item.active .mobile-nav-icon {
      background: var(--navy);
      color: #FFFFFF;
    }
    .mobile-nav-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .mobile-nav-title {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: var(--label);
      color: var(--ink-strong);
    }
    .mobile-nav-desc {
      font-size: var(--micro);
      color: var(--ink-muted);
      line-height: 1.25;
    }

    .mobile-drawer-operators {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .mobile-drawer-footer {
      padding: 12px 16px;
      border-top: 1px solid var(--line);
      background: var(--surface-soft);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    #doc-search-input:focus {
      border-color: var(--navy) !important;
      background: var(--surface) !important;
      box-shadow: 0 0 0 2px rgba(41, 74, 145, 0.15) !important;
    }

    /* Responsividade Detalhada (Tablet e Celular) */
    @media (max-width: 1120px) {
      .blueprint-grid.view-chat,
      .blueprint-grid:not(.view-documents):not(.view-supercerebro):not(.view-timeline):not(.view-controls):not(.view-palco) {
        grid-template-columns: 56px 200px 1fr 240px;
      }
    }
    @media (max-width: 900px) {
      html, body {
        height: 100dvh;
        max-height: 100dvh;
        overflow: hidden;
      }
      .btn-mobile-menu {
        display: inline-flex !important;
      }
      .icon-rail-column {
        display: none !important;
      }
      nav#mobile-nav {
        display: flex;
      }
      .blueprint-outer-wrapper {
        padding: 4px 6px;
        height: calc(100dvh - 50px);
        min-height: 0;
      }
      .blueprint-card {
        max-width: 100%;
        max-height: 100%;
        border-radius: 14px;
        height: 100%;
      }
      .blueprint-grid {
        display: flex !important;
        flex-direction: column !important;
        grid-template-columns: 1fr !important;
        width: 100% !important;
        height: 100% !important;
        min-height: 0 !important;
        flex: 1 !important;
      }

      /* View-specific rules for mobile */
      /* Chat View: Only show #pane-chat */
      .blueprint-grid.view-chat #pane-controls,
      .blueprint-grid.view-chat #pane-palco,
      .blueprint-grid:not(.view-documents):not(.view-supercerebro):not(.view-timeline):not(.view-controls):not(.view-palco) #pane-controls,
      .blueprint-grid:not(.view-documents):not(.view-supercerebro):not(.view-timeline):not(.view-controls):not(.view-palco) #pane-palco {
        display: none !important;
      }
      .blueprint-grid.view-chat #pane-chat,
      .blueprint-grid:not(.view-documents):not(.view-supercerebro):not(.view-timeline):not(.view-controls):not(.view-palco) #pane-chat {
        display: flex !important;
        flex: 1;
        width: 100%;
        height: 100%;
        min-height: 0;
      }

      /* Controls View on mobile (opened via drawer) */
      .blueprint-grid.view-controls #pane-controls {
        display: flex !important;
        flex: 1;
        width: 100%;
        height: 100%;
        min-height: 0;
        border-right: none;
      }
      .blueprint-grid.view-controls #pane-chat,
      .blueprint-grid.view-controls #pane-palco {
        display: none !important;
      }

      /* Palco View on mobile (opened via drawer) */
      .blueprint-grid.view-palco #pane-palco {
        display: flex !important;
        flex: 1;
        width: 100%;
        height: 100%;
        min-height: 0;
        border-left: none;
      }
      .blueprint-grid.view-palco #pane-chat,
      .blueprint-grid.view-palco #pane-controls {
        display: none !important;
      }

      .chat-column {
        display: flex;
        flex: 1;
        width: 100%;
        height: 100%;
        min-height: 0;
      }
      #top-bar {
        padding: 0 12px;
        gap: 8px;
      }
      .brand-logo-wrap svg {
        height: 26px;
      }
      #operator-active-role {
        display: none;
      }
      #operator-dropdown-btn {
        padding: 4px 8px;
      }
      #chat-welcome-title {
        font-size: 1.75rem !important;
        line-height: 1.2 !important;
      }
      #chat-empty-state {
        padding: 18px 10px !important;
      }
      .chat-composer-card {
        padding: 6px 8px !important;
      }
      .chat-composer-hint {
        display: none;
      }
      .flow-sequence-bar {
        display: none;
      }

      /* Central de Documentos Responsiva */
      #documents-modal {
        height: 100% !important;
        width: 100% !important;
      }
      #documents-modal > div:last-child {
        display: flex !important;
        flex-direction: column !important;
        flex: 1 !important;
        width: 100% !important;
        min-height: 0 !important;
        position: relative !important;
      }
      #doc-cards-container {
        width: 100% !important;
        min-width: 100% !important;
        max-width: 100% !important;
        border-right: none !important;
        flex: 1 !important;
        min-height: 0 !important;
        padding: 10px !important;
        display: flex !important;
      }
      #doc-cards-container.doc-cards-mobile-hidden {
        display: none !important;
      }
      #doc-reader-panel {
        display: none !important;
        width: 100% !important;
        min-width: 100% !important;
        max-width: 100% !important;
        flex: 1 !important;
        min-height: 0 !important;
      }
      #doc-reader-panel.doc-reader-mobile-active {
        display: flex !important;
      }
      #doc-filter-tabs {
        overflow-x: auto;
        flex-wrap: nowrap !important;
        padding-bottom: 4px;
        max-width: 100%;
        scrollbar-width: thin;
      }

      /* Supercérebro Grafo Responsivo */
      #supercerebro-modal {
        height: 100% !important;
        width: 100% !important;
      }
      #graph-filter-tabs {
        overflow-x: auto;
        flex-wrap: nowrap !important;
        padding-bottom: 4px;
        max-width: 100%;
        scrollbar-width: thin;
      }
      #supercerebro-modal > div:last-child {
        flex-direction: column !important;
      }
      #graph-node-details-panel {
        width: 100% !important;
        min-width: 100% !important;
        max-height: 180px !important;
        border-left: none !important;
        border-top: 1px solid var(--line) !important;
        flex-shrink: 0;
      }

      /* Linha do Tempo Responsiva */
      #timeline-modal {
        height: 100% !important;
        width: 100% !important;
      }
      #timeline-filter-tabs {
        overflow-x: auto;
        flex-wrap: nowrap !important;
        padding-bottom: 4px;
        max-width: 100%;
        scrollbar-width: thin;
      }
      #timeline-feed-container {
        padding: 10px 8px !important;
      }
    }

    @media (max-width: 600px) {
      #system-status-badge {
        display: none;
      }
      #top-bar {
        padding: 0 8px;
      }
      .operator-dropdown-menu {
        min-width: 260px;
        right: 0;
        left: auto;
      }
      .comparison-modal-content {
        max-height: 94vh;
      }
      .comparison-table th, .comparison-table td {
        padding: 6px 8px;
        font-size: 0.75rem;
      }
      #doc-view-body {
        padding: 14px 16px !important;
      }
    }
  </style>
</head>
<body>

  <!-- Região 1: Top Bar — Header Global do Workspace AdzHub -->
  <header id="top-bar" role="banner">
    <div style="display: flex; align-items: center; gap: 8px;">
      <!-- Botão Menu Sanduíche (Mobile) -->
      <button id="btn-mobile-menu" type="button" class="btn-mobile-menu" aria-label="Abrir Menu de Navegação" title="Abrir menu de navegação">
        ${getLucideSvg('menu', { size: 20 })}
      </button>
      <div class="brand">
        <span class="brand-logo-wrap" title="AdzHub · Central de Operações de Mídia &amp; IA">
          ${ADZHUB_LOGO_SVG}
        </span>
      </div>
    </div>

    <!-- Dropdown de Seleção de Perfil Operacional (Quem está operando) -->
    <div class="operator-selector-container" id="operator-selector-wrapper">
      <button id="operator-dropdown-btn" type="button" class="operator-dropdown-btn" aria-haspopup="true" aria-expanded="false" aria-label="Selecionar perfil do operador" title="Clique para alternar o perfil de quem está operando">
        <span class="operator-active-name" id="operator-active-name">Aline Rocha</span>
        <span class="operator-dropdown-arrow" aria-hidden="true">▾</span>
      </button>

      <div id="operator-dropdown-menu" class="operator-dropdown-menu" role="menu" aria-label="Perfis de Operação da Conta">
        <div class="operator-menu-header">
          <span>OPERAR COMO:</span>
        </div>
        <div class="operator-menu-list" role="none">
          <button type="button" class="operator-menu-item active" data-operator-id="p_aline" role="menuitem" aria-selected="true">
            <div class="operator-menu-item-info">
              <div class="operator-menu-item-top">
                <span class="operator-menu-item-name">Aline Rocha</span>
              </div>
              <span class="operator-menu-item-role">Gestora de Tráfego</span>
            </div>
            <span class="operator-check-icon" aria-hidden="true">✓</span>
          </button>

          <button type="button" class="operator-menu-item" data-operator-id="p_carolina" role="menuitem" aria-selected="false">
            <div class="operator-menu-item-info">
              <div class="operator-menu-item-top">
                <span class="operator-menu-item-name">Carolina Mendes</span>
              </div>
              <span class="operator-menu-item-role">Gerente de Contas</span>
            </div>
            <span class="operator-check-icon" aria-hidden="true">✓</span>
          </button>

          <button type="button" class="operator-menu-item" data-operator-id="p_marcos" role="menuitem" aria-selected="false">
            <div class="operator-menu-item-info">
              <div class="operator-menu-item-top">
                <span class="operator-menu-item-name">Marcos Silva</span>
              </div>
              <span class="operator-menu-item-role">Head de Marketing</span>
            </div>
            <span class="operator-check-icon" aria-hidden="true">✓</span>
          </button>

          <button type="button" class="operator-menu-item" data-operator-id="p_luiza" role="menuitem" aria-selected="false">
            <div class="operator-menu-item-info">
              <div class="operator-menu-item-top">
                <span class="operator-menu-item-name">Luiza Valente</span>
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

  <!-- Backdrop do Menu Sanduíche Mobile -->
  <div id="mobile-drawer-backdrop" class="mobile-drawer-backdrop" aria-hidden="true"></div>

  <!-- Gaveta Lateral Mobile (Drawer Sanduíche) -->
  <aside id="mobile-drawer-menu" class="mobile-drawer" role="dialog" aria-modal="true" aria-label="Menu de Navegação Principal">
    <div class="mobile-drawer-header">
      <div class="brand">
        <span class="brand-logo-wrap">
          ${ADZHUB_LOGO_SVG}
        </span>
      </div>
      <button id="btn-close-mobile-drawer" type="button" class="btn-close-drawer" aria-label="Fechar menu">
        ${getLucideSvg('x', { size: 18 })}
      </button>
    </div>

    <div class="mobile-drawer-body">
      <!-- Seção 1: Navegação Principal -->
      <div class="mobile-drawer-section">
        <div class="mobile-drawer-section-title">NAVEGAÇÃO</div>
        <div class="mobile-drawer-nav-list">
          <button type="button" class="mobile-nav-item active" id="btn-mobile-nav-chat">
            <span class="mobile-nav-icon">${getLucideSvg('message-square', { size: 18 })}</span>
            <div class="mobile-nav-info">
              <span class="mobile-nav-title">Chat Operacional &amp; IA</span>
              <span class="mobile-nav-desc">Central de conversação e execução</span>
            </div>
          </button>

          <button type="button" class="mobile-nav-item" id="btn-mobile-nav-tasks">
            <span class="mobile-nav-icon">${getLucideSvg('folder-kanban', { size: 18 })}</span>
            <div class="mobile-nav-info">
              <span class="mobile-nav-title">Central de Documentos</span>
              <span class="mobile-nav-desc">Briefings, Pautas, Relatórios e Propostas</span>
            </div>
          </button>

          <button type="button" class="mobile-nav-item" id="btn-mobile-nav-supercerebro">
            <span class="mobile-nav-icon">${getLucideSvg('brain', { size: 18 })}</span>
            <div class="mobile-nav-info">
              <span class="mobile-nav-title">Supercérebro (Grafo)</span>
              <span class="mobile-nav-desc">Grafo de conhecimento e relacionamentos</span>
            </div>
          </button>

          <button type="button" class="mobile-nav-item" id="btn-mobile-nav-timeline">
            <span class="mobile-nav-icon">${getLucideSvg('history', { size: 18 })}</span>
            <div class="mobile-nav-info">
              <span class="mobile-nav-title">Histórico &amp; Linha do Tempo</span>
              <span class="mobile-nav-desc">Auditoria e ações em tempo real</span>
            </div>
          </button>
        </div>
      </div>

      <!-- Seção 2: Painéis Operacionais -->
      <div class="mobile-drawer-section">
        <div class="mobile-drawer-section-title">PAINÉIS OPERACIONAIS</div>
        <div class="mobile-drawer-nav-list">
          <button type="button" class="mobile-nav-item" id="btn-mobile-nav-controls">
            <span class="mobile-nav-icon">${getLucideSvg('sliders', { size: 18 })}</span>
            <div class="mobile-nav-info">
              <span class="mobile-nav-title">Mesa de Controles &amp; BYOK</span>
              <span class="mobile-nav-desc">Chave de API e fila de pendências</span>
            </div>
          </button>

          <button type="button" class="mobile-nav-item" id="btn-mobile-nav-palco">
            <span class="mobile-nav-icon">${getLucideSvg('eye', { size: 18 })}</span>
            <div class="mobile-nav-info">
              <span class="mobile-nav-title">Palco Operacional da Conta</span>
              <span class="mobile-nav-desc">Criativos, métricas e observações</span>
            </div>
          </button>
        </div>
      </div>

      <!-- Seção 3: Ferramentas & Ações -->
      <div class="mobile-drawer-section">
        <div class="mobile-drawer-section-title">AÇÕES RÁPIDAS</div>
        <div class="mobile-drawer-actions">
          <button type="button" class="btn-primary" id="btn-mobile-compare" style="width: 100%; justify-content: center; padding: 9px 14px; font-size: var(--label); font-weight: 600;">
            ${getLucideSvg('scale', { size: 15 })} Comparar Basic × Governed
          </button>
        </div>
      </div>

      <!-- Seção 4: Operar Como (Seleção de Operador no Mobile) -->
      <div class="mobile-drawer-section">
        <div class="mobile-drawer-section-title">OPERAR COMO</div>
        <div class="mobile-drawer-operators" id="mobile-drawer-operators-list"></div>
      </div>
    </div>

    <div class="mobile-drawer-footer">
      <span class="status-badge badge-provisional" style="font-size: var(--micro); padding: 2px 8px;">
        ● v${CONTRACTS_VERSION}
      </span>
    </div>
  </aside>

  <!-- Janela Principal Elevada — Central de Operações -->
  <div class="blueprint-outer-wrapper">
    <div class="blueprint-card">
      <div class="blueprint-card-header">
        <span>CENTRAL DE OPERAÇÕES</span>
        <span id="execution-validation-msg" role="alert" aria-live="polite" style="color: var(--warning); display: none; font-size: 0.75rem; font-family: var(--font-mono);">
          ⚠ Digite o que você precisa que o agente faça.
        </span>
      </div>

      <div class="blueprint-grid">

        <!-- REGIÃO 1: ICON RAIL (Left Navigation Rail) -->
        <nav class="icon-rail-column" aria-label="Navegação por Atalhos">
          <button class="rail-btn active" id="btn-rail-chat" type="button" title="Chat Operacional &amp; IA" aria-label="Chat Operacional">
            ${getLucideSvg('message-square', { size: 18 })}
          </button>
          <button class="rail-btn" id="btn-rail-tasks" type="button" title="Central de Documentos &amp; Artefatos Gerados (Briefings, Pautas, Relatórios, Propostas)" aria-label="Central de Documentos">
            ${getLucideSvg('folder-kanban', { size: 18 })}
          </button>
          <div class="rail-divider"></div>
          <button class="rail-btn" id="btn-rail-supercerebro" type="button" title="Supercérebro &amp; Grafo de Conhecimento — Visualização de Nós, Relacionamentos e Linha do Tempo da Conta." aria-label="Supercérebro Grafo">
            ${getLucideSvg('brain', { size: 18 })}
          </button>
          <button class="rail-btn" id="btn-rail-inspector" type="button" title="Histórico &amp; Linha do Tempo do Supercérebro — Acompanhe ações de mídia, trocas de documentos e aprovações dos operadores em tempo real." aria-label="Histórico da Timeline do Supercérebro">
            ${getLucideSvg('history', { size: 18 })}
          </button>
        </nav>

        <!-- REGIÃO 2: TASK QUEUE / MESA DE CONTROLE (Left-Center) -->
        <section class="controls-column" id="pane-controls" aria-label="Mesa de Controle e Parâmetros">
          <div class="controls-header">
            <span>Controles</span>
          </div>

          <div class="controls-content">
            <!-- Key Management Card (BYOK) -->
            <div id="key-bar" role="region" aria-label="Gerenciamento de chave de API em memória" class="controls-key-box">
              <div class="key-inputs" style="display: flex; flex-direction: column; gap: 5px; width: 100%;">
                <label for="api-key-input" class="control-label">Chave de API</label>
                <input
                  type="password"
                  id="api-key-input"
                  placeholder="Cole Gemini ou OpenRouter"
                  autocomplete="off"
                  spellcheck="false"
                  style="width: 100%;"
                />
                <div style="display: flex; width: 100%;">
                  <button id="btn-forget-key" type="button" class="btn-danger" style="width: 100%; justify-content: center; font-size: var(--micro); padding: 5px 8px;">
                    Esquecer Chave
                  </button>
                </div>
              </div>
              <div id="key-status" style="margin-top: 2px;">
                <span id="key-status-text">Sem chave salva (Insira sua API Key)</span>
              </div>
            </div>

            <!-- Action Buttons: Comparar -->
            <div class="controls-action-box">
              <div style="display: flex; width: 100%;">
                <button id="btn-compare" class="btn-primary" type="button" aria-label="Comparar Basic vs Governed" style="width: 100%; justify-content: center; padding: 7px 10px; font-size: var(--label); font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                  ${getLucideSvg('scale', { size: 14 })} Comparar
                </button>
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
                  <div class="task-card-meta">Exige proposta formal de Carolina Mendes e aprovação de Marcos Silva</div>
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
              <button id="btn-chat-back" class="btn-chat-back" type="button" aria-label="Voltar para o chat" title="Voltar ao Chat do Agente AdzHub" style="display: none;">
                <span style="font-size: 0.9rem; line-height: 1;">←</span>
                <span>Voltar ao Chat</span>
              </button>
              <div class="chat-agent-info">
                <div class="chat-agent-name" id="center-pane-title">Agente AdzHub</div>
              </div>
            </div>
            <span id="chat-status-badge" class="status-badge" aria-live="polite" style="display: none;"></span>
          </div>

          <div class="chat-body" id="chat-stream-body">

            <!-- View 1: Chat Feed Wrapper -->
            <div id="chat-messages-wrapper" style="display: flex; flex-direction: column; width: 100%; height: 100%;">
              <!-- Estado Vazio / Inicial Estilo Welcome Hero -->
              <div id="chat-empty-state" style="margin: auto; text-align: center; color: var(--ink-muted); padding: 32px 14px; max-width: 540px; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div class="turn-status-badge" style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 16px; border-radius: 9999px; background: rgba(37, 99, 235, 0.07); border: 1px solid rgba(37, 99, 235, 0.18); color: var(--navy-ink, #1e3a8a); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(37, 99, 235, 0.06);">
                  <span style="width: 7px; height: 7px; border-radius: 50%; background-color: #2563eb; display: inline-block; box-shadow: 0 0 8px rgba(37, 99, 235, 0.6);"></span>
                  <span>PRONTO PARA O SEU TURNO</span>
                </div>
                <h2 id="chat-welcome-title" style="font-family: var(--font-display); font-size: 2.6rem; font-weight: 700; color: var(--ink-strong); margin-bottom: 16px; letter-spacing: -0.02em; line-height: 1.15;">
                  <span id="chat-greeting-prefix">Bom dia</span>, <span id="chat-operator-name" style="color: #2563eb;">Aline</span>.
                </h2>
                <p style="font-size: 1.05rem; color: var(--ink-muted); line-height: 1.5; margin: 0; max-width: 440px;">
                  Estou aqui e pronto para cuidar da operação com você.<br/>Diga o que precisa.
                </p>
              </div>

              <!-- Feed de Conversa Contínua (Chat Real com Histórico) -->
              <div id="chat-messages-container" style="display: flex; flex-direction: column; gap: 14px; width: 100%;"></div>

              <!-- Containers & Templates Estáticos (Compatibilidade de Testes) -->
              <div id="chat-static-templates" style="display: none;">
                <div class="user-bubble-container" id="user-bubble-box"><div class="user-bubble" id="chat-user-message-text"></div></div>
                <div id="chat-loading-state" class="human-loading-card-container spinner">
                  <div class="human-loading-card">
                    <div class="human-loading-card-inner">
                      <div class="human-loading-content">
                        <div class="human-loading-icon-badge">
                          <div class="human-loading-breathe-bg loading-breathe-circle"></div>
                          <div class="human-loading-dots">
                            <span class="loading-dot-pulse dot-1"></span>
                            <span class="loading-dot-pulse dot-2"></span>
                            <span class="loading-dot-pulse dot-3"></span>
                          </div>
                        </div>
                        <div class="human-loading-text-group">
                          <h4 class="human-loading-title">Estou pensando</h4>
                        </div>
                      </div>
                      <div class="human-loading-progress-track">
                        <div class="human-loading-shimmer loading-shimmer-bar"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="agent-steps-stream" id="agent-steps-stream-box">
                  <div class="step-item" id="step-reasoning-1"><span class="step-icon">${getLucideSvg('brain', { size: 14, style: 'color: var(--navy);' })}</span><div class="step-text" id="step-reasoning-1-text"></div></div>
                  <div class="step-item" id="step-tools-1"><span class="step-icon">${getLucideSvg('wrench', { size: 14, style: 'color: var(--navy);' })}</span><div class="step-text"><span class="step-tool-tag" id="step-tool-1-name"></span><span class="step-tool-tag" id="step-tool-2-name"></span><div class="step-obs" id="step-tools-1-obs"></div></div></div>
                  <div class="step-item" id="step-reasoning-2"><span class="step-icon">${getLucideSvg('brain', { size: 14, style: 'color: var(--navy);' })}</span><div class="step-text" id="step-reasoning-2-text"></div></div>
                  <div class="step-item" id="step-tools-2"><span class="step-icon">${getLucideSvg('wrench', { size: 14, style: 'color: var(--navy);' })}</span><div class="step-text"><span class="step-tool-tag" id="step-tool-3-name"></span><span class="step-tool-tag" id="step-tool-4-name"></span><div class="step-obs" id="step-tools-2-obs"></div></div></div>
                </div>
                <div id="chat-result-container" class="agent-response-box">
                  <div id="chat-conclusion-text"></div>
                  <div id="chat-ctas-action-card"><div class="cta-badge-ready" id="badge-ctas-ready">${getLucideSvg('lightbulb', { size: 13, style: 'color: var(--navy);' })} 3 CTAs prontos</div><span id="chat-ctas-target"></span><div class="cta-suggestions-container" id="chat-ctas-list"><div class="cta-suggestion-item"><span class="cta-num">1</span><span id="cta-item-1"></span></div><div class="cta-suggestion-item"><span class="cta-num">2</span><span id="cta-item-2"></span></div><div class="cta-suggestion-item"><span class="cta-num">3</span><span id="cta-item-3"></span></div></div></div>
                  <div id="chat-approval-card"><button id="btn-approve-action"></button><button id="btn-reject-action"></button></div>
                  <div id="chat-limitations-container"><ul id="chat-limitations-list"></ul></div>
                  <div id="chat-question-container"><div id="chat-question-text"></div><div id="chat-evidencerefs-list"></div></div>
                </div>
                <div id="chat-error-state"><h4 id="chat-error-title"></h4><p id="chat-error-message"></p></div>
                <div id="chat-blocked-state"><h4>🔒 Ação Bloqueada por Política</h4><p id="chat-blocked-message"></p><div id="chat-blocked-missing-condition"><span id="chat-blocked-condition-text"></span></div></div>
              </div>
            </div>

            <!-- View 2: Grafo do Supercérebro (Inline Workspace View) -->
            <div id="supercerebro-modal" style="display: none; width: 100%; height: 100%; flex-direction: column; overflow: hidden; background: var(--surface);">
              <!-- Toolbar: Filter Tabs & Stats -->
              <div id="graph-header-controls" style="padding: 6px 12px; border-bottom: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; background: var(--surface); gap: 6px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;" id="graph-filter-tabs">
                  <button type="button" class="btn-primary graph-tab-btn active md3-chip md3-filter-chip" data-graph-filter="all" style="padding: 4px 8px; font-size: 0.75rem; font-weight: 600; border-radius: var(--radius-pill); white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;">${getLucideSvg('share-2', { size: 12 })} Todos os Nós</button>
                  <button type="button" class="btn-secondary graph-tab-btn md3-chip md3-filter-chip" data-graph-filter="organizations" style="padding: 4px 8px; font-size: 0.75rem; font-weight: 600; border-radius: var(--radius-pill); white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;">${getLucideSvg('building-2', { size: 12 })} Organizações</button>
                  <button type="button" class="btn-secondary graph-tab-btn md3-chip md3-filter-chip" data-graph-filter="meta_ads" style="padding: 4px 8px; font-size: 0.75rem; font-weight: 600; border-radius: var(--radius-pill); white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;">${getLucideSvg('megaphone', { size: 12 })} Meta Ads</button>
                  <button type="button" class="btn-secondary graph-tab-btn md3-chip md3-filter-chip" data-graph-filter="creatives" style="padding: 4px 8px; font-size: 0.75rem; font-weight: 600; border-radius: var(--radius-pill); white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;">${getLucideSvg('tag', { size: 12 })} Ofertas &amp; Criativos</button>
                  <button type="button" class="btn-secondary graph-tab-btn md3-chip md3-filter-chip" data-graph-filter="operators" style="padding: 4px 8px; font-size: 0.75rem; font-weight: 600; border-radius: var(--radius-pill); white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;">${getLucideSvg('user', { size: 12 })} Operadores</button>
                  <button type="button" class="btn-secondary graph-tab-btn md3-chip md3-filter-chip" data-graph-filter="pendencies" style="padding: 4px 8px; font-size: 0.75rem; font-weight: 600; border-radius: var(--radius-pill); white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;">${getLucideSvg('clipboard-list', { size: 12 })} Pendências</button>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: 0.75rem; color: var(--ink-muted);">
                  <span id="graph-node-count">Nós: 0</span>
                  <span id="graph-edge-count">Conexões: 0</span>
                  <button id="btn-refresh-graph" class="btn-secondary" type="button" style="padding: 4px 8px; font-size: 0.75rem; font-weight: 600; border-radius: var(--radius-pill); display: inline-flex; align-items: center; gap: 4px;" title="Atualizar Grafo">${getLucideSvg('rotate-ccw', { size: 12 })} Recarregar</button>
                  <button id="btn-close-supercerebro" class="btn-secondary" type="button" style="display: none;">✕ Fechar</button>
                </div>
              </div>

              <!-- Main Content Area: Canvas + Inspector Sidebar -->
              <div style="flex: 1; min-height: 0; display: flex; background: var(--surface-soft); position: relative; overflow: hidden;">
                <!-- Canvas Container -->
                <div style="flex: 1; min-height: 0; position: relative; cursor: grab;" id="graph-canvas-wrapper">
                  <canvas id="supercerebro-canvas" style="width: 100%; height: 100%; display: block;"></canvas>

                  <!-- Canvas Controls (Zoom / Center) -->
                  <div style="position: absolute; bottom: 12px; left: 12px; display: flex; gap: 4px; z-index: 10;">
                    <button id="btn-graph-zoom-in" type="button" class="btn-secondary" style="padding: 4px 10px; font-weight: 600; font-size: 0.875rem;">+</button>
                    <button id="btn-graph-zoom-out" type="button" class="btn-secondary" style="padding: 4px 10px; font-weight: 600; font-size: 0.875rem;">-</button>
                    <button id="btn-graph-reset-view" type="button" class="btn-secondary" style="padding: 4px 10px; font-size: 0.8125rem;">Centralizar</button>
                  </div>

                  <!-- Legend Overlay -->
                  <div style="position: absolute; top: 12px; left: 12px; background: rgba(255, 255, 255, 0.94); backdrop-filter: blur(4px); border: 1px solid var(--line); padding: 8px 12px; border-radius: var(--radius-card); display: flex; flex-direction: column; gap: 4px; font-family: var(--font-mono); font-size: 0.78125rem; color: var(--ink-muted); pointer-events: none; box-shadow: var(--shadow-card);">
                    <div style="font-weight: 700; font-size: 0.84rem; color: var(--ink-strong); margin-bottom: 2px;">Legenda do Grafo</div>
                    <div style="display: flex; align-items: center; gap: 6px;"><span style="width: 9px; height: 9px; border-radius: 50%; background: #294A91; display: inline-block;"></span> Cliente / Organização</div>
                    <div style="display: flex; align-items: center; gap: 6px;"><span style="width: 9px; height: 9px; border-radius: 50%; background: #F59A19; display: inline-block;"></span> Meta Ads / Conta</div>
                    <div style="display: flex; align-items: center; gap: 6px;"><span style="width: 9px; height: 9px; border-radius: 50%; background: #53B58A; display: inline-block;"></span> Ofertas &amp; Criativos</div>
                    <div style="display: flex; align-items: center; gap: 6px;"><span style="width: 9px; height: 9px; border-radius: 50%; background: #8C75B5; display: inline-block;"></span> Operadores</div>
                    <div style="display: flex; align-items: center; gap: 6px;"><span style="width: 9px; height: 9px; border-radius: 50%; background: #D96C6C; display: inline-block;"></span> Pendências</div>
                  </div>
                </div>

                <!-- Node Detail Panel -->
                <div id="graph-node-details-panel" style="width: 320px; min-width: 300px; max-width: 360px; border-left: 1px solid var(--line); background: var(--surface); color: var(--ink-strong); padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto;">
                  <div style="font-family: var(--font-display); font-weight: 700; font-size: 0.85rem; border-bottom: 1px solid var(--line); padding-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
                    <span>Detalhes do Nó</span>
                    <span id="detail-node-type-badge" style="font-family: var(--font-mono); font-size: 0.65rem; background: var(--surface-soft); color: var(--navy-ink); border: 1px solid var(--line); padding: 2px 6px; border-radius: var(--radius-pill); text-transform: uppercase;">Clique em um Nó</span>
                  </div>
                  <div id="detail-node-content" style="font-size: 0.78rem; line-height: 1.4; color: var(--ink);">
                    Selecione um nó no grafo à esquerda para examinar suas conexões e detalhes.
                  </div>
                </div>
              </div>
            </div>

            <!-- View 3: Central de Documentos (Inline Workspace View) -->
            <div id="documents-modal" style="display: none; width: 100%; height: 100%; flex-direction: column; overflow: hidden; background: var(--surface);">
              <!-- Controls: Tabs + Search (Sem scroll, cabe 100% no header) -->
              <div id="documents-header-controls" style="padding: 6px 12px; border-bottom: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; background: var(--surface); gap: 6px; flex-wrap: wrap; overflow: hidden;">
                <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;" id="doc-filter-tabs">
                  <button type="button" class="btn-primary doc-tab-btn active md3-chip md3-filter-chip" data-doc-filter="all" style="padding: 4px 8px; font-size: 0.75rem; font-weight: 600; border-radius: var(--radius-pill); white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;">${getLucideSvg('folder', { size: 12 })} Todos</button>
                  <button type="button" class="btn-secondary doc-tab-btn md3-chip md3-filter-chip" data-doc-filter="briefing" style="padding: 4px 8px; font-size: 0.75rem; font-weight: 600; border-radius: var(--radius-pill); white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;">${getLucideSvg('file-text', { size: 12 })} Briefings</button>
                  <button type="button" class="btn-secondary doc-tab-btn md3-chip md3-filter-chip" data-doc-filter="pauta" style="padding: 4px 8px; font-size: 0.75rem; font-weight: 600; border-radius: var(--radius-pill); white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;">${getLucideSvg('calendar', { size: 12 })} Pautas</button>
                  <button type="button" class="btn-secondary doc-tab-btn md3-chip md3-filter-chip" data-doc-filter="relatorio" style="padding: 4px 8px; font-size: 0.75rem; font-weight: 600; border-radius: var(--radius-pill); white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;">${getLucideSvg('bar-chart-3', { size: 12 })} Relatórios</button>
                  <button type="button" class="btn-secondary doc-tab-btn md3-chip md3-filter-chip" data-doc-filter="proposta" style="padding: 4px 8px; font-size: 0.75rem; font-weight: 600; border-radius: var(--radius-pill); white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;">${getLucideSvg('lightbulb', { size: 12 })} Propostas</button>
                  <button type="button" class="btn-secondary doc-tab-btn md3-chip md3-filter-chip" data-doc-filter="plano" style="padding: 4px 8px; font-size: 0.75rem; font-weight: 600; border-radius: var(--radius-pill); white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;">${getLucideSvg('rocket', { size: 12 })} Planos</button>
                </div>
                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                  <div style="display: inline-flex; align-items: center; gap: 4px; background: var(--surface-soft); border: 1px solid var(--line); border-radius: var(--radius-pill); padding: 3px 8px; font-size: 0.75rem; height: 30px; box-sizing: border-box;">
                    <span style="color: var(--ink-muted); font-size: 0.75rem; font-weight: 500; display: inline-flex; align-items: center; gap: 3px;">${getLucideSvg('calendar', { size: 12, style: 'color: var(--ink-muted);' })} Data:</span>
                    <input type="date" id="doc-date-input" style="border: none; background: transparent; font-size: 0.75rem; color: var(--ink-strong); outline: none; font-family: var(--font-mono); cursor: pointer; max-width: 105px;" title="Filtrar por data específica">
                    <select id="doc-date-preset" style="border: none; background: transparent; font-size: 0.75rem; color: var(--ink-strong); outline: none; font-family: var(--font-sans); cursor: pointer;">
                      <option value="all">Todas</option>
                      <option value="today">Hoje</option>
                      <option value="7days">7 dias</option>
                      <option value="30days">Mês</option>
                    </select>
                  </div>
                  <div style="position: relative; width: 180px; min-width: 130px; display: flex; align-items: center;">
                    <span style="position: absolute; left: 8px; pointer-events: none; display: flex; align-items: center; color: var(--ink-muted);">${getLucideSvg('search', { size: 13 })}</span>
                    <input type="text" id="doc-search-input" placeholder="Buscar docs..." style="width: 100%; height: 30px; padding: 3px 8px 3px 26px; border-radius: var(--radius-pill); border: 1px solid var(--line); font-size: 0.75rem; background: var(--surface-soft); color: var(--ink-strong); outline: none; box-sizing: border-box; transition: all var(--duration-default) var(--ease-default);">
                    <button id="btn-close-documents" class="btn-secondary" type="button" style="display: none;">✕ Fechar</button>
                  </div>
                </div>
              </div>

              <!-- Main Content Container: Left Master Cards Sidebar + Right Expansive Reader -->
              <div style="flex: 1; min-height: 0; display: flex; background: var(--surface-soft); overflow: hidden;">
                <!-- Left Column: Master Cards Sidebar (Fixed Compact Width ~320px) -->
                <div id="doc-cards-container" style="width: 320px; min-width: 320px; max-width: 320px; border-right: 1px solid var(--line); padding: 12px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; background: var(--surface-soft);">
                </div>

                <!-- Right Column: Expansive Document Reader Panel (Takes 100% remaining width: flex: 1) -->
                <div id="doc-reader-panel" style="flex: 1; min-width: 0; background: var(--surface); color: var(--ink-strong); display: flex; flex-direction: column; overflow: hidden;">
                  <div id="doc-reader-empty" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px; text-align: center; color: var(--ink-muted);">
                    <div style="margin-bottom: 12px; opacity: 0.45; color: var(--navy);">${getLucideSvg('file-text', { size: 42 })}</div>
                    <p style="margin: 0; font-size: 0.9rem; font-weight: 600; color: var(--ink-strong);">Nenhum documento selecionado</p>
                    <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: var(--ink-muted);">Selecione um documento da lista ao lado para visualizar os detalhes completos.</p>
                  </div>
                  
                  <div id="doc-reader-content" style="display: none; flex: 1; flex-direction: column; height: 100%; overflow: hidden;">
                    <div style="padding: 14px 24px; border-bottom: 1px solid var(--line); background: var(--surface-soft); display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                      <div>
                        <button id="btn-doc-back-list" type="button" class="btn-secondary" style="display: none; padding: 4px 10px; font-size: var(--micro); margin-bottom: 6px; align-items: center; gap: 4px;">
                          ← Voltar para lista
                        </button>
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                          <span id="doc-view-date" style="font-size: 0.75rem; color: var(--ink-muted); font-family: var(--font-mono);"></span>
                        </div>
                        <h3 id="doc-view-title" style="margin: 0; font-family: var(--font-display); font-size: 1.15rem; font-weight: 700; color: var(--ink-strong); line-height: 1.3;"></h3>
                        <div id="doc-view-meta" style="font-size: 0.8rem; color: var(--ink-muted); margin-top: 6px;"></div>
                      </div>
                    </div>
                    
                    <div id="doc-view-body" style="flex: 1; padding: 24px 32px; overflow-y: auto; font-size: 0.9rem; line-height: 1.65; color: var(--ink); white-space: pre-wrap; font-family: var(--font-sans); max-width: 900px; width: 100%; margin: 0 auto; box-sizing: border-box;">
                    </div>
                    
                    <div style="padding: 12px 24px; border-top: 1px solid var(--line); background: var(--surface-soft); display: flex; justify-content: flex-end; gap: 8px;">
                      <button id="btn-copy-doc" class="btn-secondary" type="button" style="padding: 6px 14px; font-size: 0.8125rem; display: inline-flex; align-items: center; gap: 6px;">${getLucideSvg('copy', { size: 14 })} Copiar Texto</button>
                      <button id="btn-download-doc" class="btn-primary" type="button" style="padding: 6px 14px; font-size: 0.8125rem; display: inline-flex; align-items: center; gap: 6px;">${getLucideSvg('download', { size: 14 })} Baixar MD</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- View 4: Histórico & Linha do Tempo (Inline Workspace View) -->
            <div id="timeline-modal" style="display: none; width: 100%; height: 100%; flex-direction: column; overflow: hidden; background: var(--surface);">
              <!-- Controls: Filter Tabs + Search -->
              <div id="timeline-header-controls" style="padding: 6px 12px; border-bottom: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; background: var(--surface); gap: 6px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;" id="timeline-filter-tabs">
                  <button type="button" class="btn-primary timeline-tab-btn active md3-chip md3-filter-chip" data-timeline-filter="all" style="padding: 4px 8px; font-size: 0.75rem; font-weight: 600; border-radius: var(--radius-pill); white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;">${getLucideSvg('history', { size: 12 })} Todas</button>
                  <button type="button" class="btn-secondary timeline-tab-btn md3-chip md3-filter-chip" data-timeline-filter="media" style="padding: 4px 8px; font-size: 0.75rem; font-weight: 600; border-radius: var(--radius-pill); white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;">${getLucideSvg('megaphone', { size: 12 })} Mídia</button>
                  <button type="button" class="btn-secondary timeline-tab-btn md3-chip md3-filter-chip" data-timeline-filter="documents" style="padding: 4px 8px; font-size: 0.75rem; font-weight: 600; border-radius: var(--radius-pill); white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;">${getLucideSvg('file-text', { size: 12 })} Documentos</button>
                  <button type="button" class="btn-secondary timeline-tab-btn md3-chip md3-filter-chip" data-timeline-filter="governance" style="padding: 4px 8px; font-size: 0.75rem; font-weight: 600; border-radius: var(--radius-pill); white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;">${getLucideSvg('shield-check', { size: 12 })} Governança</button>
                  <button type="button" class="btn-secondary timeline-tab-btn md3-chip md3-filter-chip" data-timeline-filter="audit" style="padding: 4px 8px; font-size: 0.75rem; font-weight: 600; border-radius: var(--radius-pill); white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;">${getLucideSvg('check-circle-2', { size: 12 })} Auditoria</button>
                </div>
                <div style="position: relative; width: 180px; min-width: 130px; display: flex; align-items: center;">
                  <span style="position: absolute; left: 8px; pointer-events: none; display: flex; align-items: center; color: var(--ink-muted);">${getLucideSvg('search', { size: 13 })}</span>
                  <input type="text" id="timeline-search-input" placeholder="Buscar eventos..." style="width: 100%; height: 30px; padding: 3px 8px 3px 26px; border-radius: var(--radius-pill); border: 1px solid var(--line); font-size: 0.75rem; background: var(--surface-soft); color: var(--ink-strong); outline: none; box-sizing: border-box; transition: all var(--duration-default) var(--ease-default);">
                  <button id="btn-close-timeline" class="btn-secondary" type="button" style="display: none;">✕ Fechar</button>
                </div>
              </div>

              <!-- Main Feed -->
              <div style="flex: 1; min-height: 0; padding: 14px; overflow-y: auto; background: var(--surface-soft);" id="timeline-feed-container">
                <!-- Renderizado dinamicamente via JS -->
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
            <div id="stage-empty-state" style="margin: auto; text-align: center; color: var(--ink-muted); padding: 28px 14px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
              <div style="margin-bottom: 8px; opacity: 0.45; color: var(--navy);">${getLucideSvg('eye', { size: 28 })}</div>
              <div style="font-weight: 600; color: var(--ink-strong); font-size: 0.875rem; margin-bottom: 3px;">Nenhuma observação ativa</div>
              <div style="font-size: var(--label); color: var(--ink-muted); max-width: 220px; margin: 0 auto; line-height: 1.4;">Execute uma ação no chat para projetar dados da conta em tempo real.</div>
            </div>

            <!-- Criativos em Observação -->
            <!-- Dynamic Card 1: UGC Oferta A -->
            <div class="stage-card" id="card-ugc-oferta" style="display: none;">
              <div class="stage-card-top">
                <span class="stage-card-name">UGC - Oferta A</span>
              </div>
              <div class="stage-card-tags" id="tags-ugc-oferta">
                <span class="tag-pill tag-status-paused" id="badge-ugc-status">Pausado</span>
                <span class="tag-pill tag-hook-strong">Hook Forte 8.5</span>
                <span class="tag-pill tag-cta-bad">CTA Ruim 4.0</span>
                <span class="tag-pill tag-cta-good">Meta Ads</span>
              </div>
              <div class="stage-card-metrics">
                <span>Investimento: R$ 850</span>
                <span>CPA: R$ 94,50</span>
                <span>CTR: 1.2%</span>
              </div>
            </div>

            <!-- Dynamic Card 2: Hook Prova Social -->
            <div class="stage-card" id="card-hook-social" style="display: none;">
              <div class="stage-card-top">
                <span class="stage-card-name">Hook - Prova Social</span>
              </div>
              <div class="stage-card-tags" id="tags-hook-social">
                <span class="tag-pill tag-status-active" id="badge-hook-status">Ativo</span>
                <span class="tag-pill tag-hook-strong">Hook Forte 8.8</span>
                <span class="tag-pill tag-cta-good">CTA Bom 8.5</span>
                <span class="tag-pill tag-hook-strong">Alta Conversão</span>
              </div>
              <div class="stage-card-metrics">
                <span>Investimento: R$ 1.200</span>
                <span>CPA: R$ 42,10</span>
                <span>CTR: 2.8%</span>
              </div>
            </div>

            <!-- Dynamic Card 3: Carrossel FAQ -->
            <div class="stage-card" id="card-carousel-faq" style="display: none;">
              <div class="stage-card-top">
                <span class="stage-card-name">Carrossel - FAQ</span>
              </div>
              <div class="stage-card-tags" id="tags-carousel-faq">
                <span class="tag-pill tag-status-paused" id="badge-faq-status">Pausado</span>
                <span class="tag-pill tag-hook-weak">Hook Fraco 4.2</span>
                <span class="tag-pill tag-cta-bad">CTA Ruim 3.8</span>
                <span class="tag-pill tag-cta-bad">Fadiga 2.65x</span>
              </div>
              <div class="stage-card-metrics">
                <span>Investimento: R$ 430</span>
                <span>CPA: R$ 112,00</span>
                <span>CTR: 0.9%</span>
              </div>
            </div>

            <!-- Métricas Meta Ads -->
            <div class="stage-card" id="card-meta-metrics" style="display: none;">
              <div class="stage-card-top">
                <span class="stage-card-name">Meta Ads — Tráfego Pago (Agosto/2026)</span>
              </div>
              <div class="stage-card-tags" id="tags-meta-metrics">
                <span class="tag-pill tag-status-active" id="badge-meta-status">Ativo</span>
                <span class="tag-pill tag-hook-strong">Investimento: R$ 4.280,00</span>
                <span class="tag-pill tag-cta-good">ROAS: 3,48x</span>
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
              </div>
              <div class="stage-card-tags" id="tags-crm-metrics">
                <span class="tag-pill tag-status-active" id="badge-crm-status">62 Vendas Auditadas</span>
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
              </div>
              <div id="brain-card-details" style="font-size: var(--micro); color: var(--ink); margin-top: 2px; display: flex; flex-direction: column; gap: 2px; font-family: var(--font-primary); line-height: 1.35;">
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
      <span class="flow-pill active" id="flow-pill-user"><span class="flow-dot"></span> Pedido do usuário</span>
      <span class="flow-pill-arrow">→</span>
      <span class="flow-pill" id="flow-pill-reasoning-1"><span class="flow-dot"></span> Raciocínio</span>
      <span class="flow-pill-arrow">→</span>
      <span class="flow-pill" id="flow-pill-tool-read"><span class="flow-dot"></span> Tool - ler dados</span>
      <span class="flow-pill-arrow">→</span>
      <span class="flow-pill" id="flow-pill-reasoning-2"><span class="flow-dot"></span> Raciocínio</span>
      <span class="flow-pill-arrow">→</span>
      <span class="flow-pill" id="flow-pill-tool-action"><span class="flow-dot"></span> Tool - agir</span>
      <span class="flow-pill-arrow">→</span>
      <span class="flow-pill" id="flow-pill-response"><span class="flow-dot"></span> Resposta</span>
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
        <h3 id="comparison-title" style="color: var(--ink-strong); font-family: var(--font-display); font-size: 0.9375rem; font-weight: 600; display: inline-flex; align-items: center; gap: 7px;">${getLucideSvg('scale', { size: 16, style: 'color: var(--navy);' })} Comparador Científico: Basic (ReAct) × Governed (PEV-C)</h3>
        <button id="btn-close-comparison" class="btn-secondary" type="button" style="padding: 5px 12px; font-size: var(--label);">✕ Fechar</button>
      </div>
      <div style="padding: 20px; overflow-y: auto;">
        <!-- Etapa 1: Solicitação de Prompt quando não há mensagem no chat -->
        <div id="comparison-prompt-step" style="display: none;">
          <div style="background: rgba(37, 99, 235, 0.06); border: 1px solid rgba(37, 99, 235, 0.18); border-radius: var(--radius-card); padding: 16px 18px; margin-bottom: 18px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <span style="display: inline-flex; align-items: center; color: var(--adzhub-blue);">${getLucideSvg('info', { size: 20 })}</span>
              <h4 style="font-family: var(--font-display); font-size: 0.9375rem; font-weight: 700; color: var(--ink-strong); margin: 0;">Nenhuma mensagem anterior no chat</h4>
            </div>
            <p style="font-size: var(--body); color: var(--ink); line-height: 1.45; margin: 0;">
              Para realizar o benchmark científico entre <strong>Basic (ReAct Baseline)</strong> e <strong>Governed (PEV-C)</strong>, informe qual prompt ou instrução você deseja comparar:
            </p>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
            <label for="comparison-prompt-input" style="font-family: var(--font-primary); font-size: var(--label); font-weight: 600; color: var(--ink-strong);">
              Prompt para Comparação:
            </label>
            <textarea id="comparison-prompt-input" rows="3" placeholder="Digite a instrução a ser comparada (ex: Audite as métricas de performance da conta Housewhey cruzando Meta Ads e CRM)..." style="width: 100%; box-sizing: border-box; padding: 10px 14px; border: 1px solid var(--line); border-radius: var(--radius-control); font-family: var(--font-primary); font-size: var(--body); background: var(--surface); color: var(--ink-strong); resize: vertical; outline: none; transition: border-color 0.2s;"></textarea>
          </div>

          <div style="margin-bottom: 20px;">
            <div style="font-family: var(--font-mono); font-size: var(--micro); text-transform: uppercase; color: var(--ink-muted); font-weight: 700; letter-spacing: 0.5px; margin-bottom: 8px;">Sugestões de Prompts Rápidos:</div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              <button type="button" class="turn-suggestion-chip comparison-suggestion-chip" data-prompt="Audite as métricas de performance da conta Housewhey cruzando Meta Ads e CRM">
                📊 Auditar Housewhey (Meta Ads × CRM)
              </button>
              <button type="button" class="turn-suggestion-chip comparison-suggestion-chip" data-prompt="Verifique divergências de atribuição e subnotificação de conversões">
                🔍 Divergências de Atribuição &amp; Conversões
              </button>
              <button type="button" class="turn-suggestion-chip comparison-suggestion-chip" data-prompt="Identifique criativos com ROAS abaixo de 2.0 e sugira ações">
                ⚡ Identificar Criativos Baixo ROAS
              </button>
              <button type="button" class="turn-suggestion-chip comparison-suggestion-chip" data-prompt="Pausar campanha de baixa performance sem confirmação do operador">
                🛑 Teste de Governança e Capability Broker (S3)
              </button>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--line); padding-top: 14px;">
            <button id="btn-cancel-comparison-prompt" type="button" class="btn-secondary" style="padding: 7px 16px; font-size: var(--label);">Cancelar</button>
            <button id="btn-start-comparison-prompt" type="button" class="btn-primary" style="padding: 7px 18px; font-size: var(--label); font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
              ${getLucideSvg('scale', { size: 15 })} Iniciar Comparação
            </button>
          </div>
        </div>

        <div id="comparison-loading" style="display: none; align-items: center; justify-content: center; gap: 8px; padding: 24px;">
          <div class="spinner"></div>
          <span style="font-family: var(--font-mono); font-size: var(--label); color: var(--ink-muted);">Executando comparação determinística...</span>
        </div>
        <div id="comparison-results" style="display: none;">
          <div style="display: flex; justify-content: flex-end; margin-bottom: 10px;">
            <button id="btn-recompare" class="btn-secondary" type="button" style="padding: 5px 12px; font-size: var(--label); display: inline-flex; align-items: center; gap: 6px;">
              ${getLucideSvg('rotate-ccw', { size: 14 })} Comparar outro prompt
            </button>
          </div>
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
    function getLucideSvg(name, options) {
      options = options || {};
      var size = options.size || 16;
      var strokeWidth = options.strokeWidth || 2;
      var cls = options.className ? ' class="lucide-icon lucide-' + name + ' ' + options.className + '"' : ' class="lucide-icon lucide-' + name + '"';
      var style = options.style ? ' style="' + options.style + '"' : '';
      var baseAttr = 'xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + strokeWidth + '" stroke-linecap="round" stroke-linejoin="round"' + cls + style;

      switch (name) {
        case 'message-square':
          return '<svg ' + baseAttr + '><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
        case 'folder':
          return '<svg ' + baseAttr + '><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>';
        case 'folder-open':
          return '<svg ' + baseAttr + '><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></svg>';
        case 'folder-kanban':
          return '<svg ' + baseAttr + '><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/><path d="M8 10v4"/><path d="M12 10v2"/><path d="M16 10v6"/></svg>';
        case 'file-text':
        case 'description':
          return '<svg ' + baseAttr + '><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>';
        case 'brain':
          return '<svg ' + baseAttr + '><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M12 5v13"/><path d="M12 10a2.5 2.5 0 0 0 2.5 2.5"/><path d="M12 14.5a2.5 2.5 0 0 1-2.5-2.5"/></svg>';
        case 'history':
          return '<svg ' + baseAttr + '><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>';
        case 'clock':
          return '<svg ' + baseAttr + '><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
        case 'crosshair':
        case 'target':
          return '<svg ' + baseAttr + '><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>';
        case 'zap':
          return '<svg ' + baseAttr + '><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
        case 'user':
        case 'person':
          return '<svg ' + baseAttr + '><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
        case 'users':
          return '<svg ' + baseAttr + '><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
        case 'search':
          return '<svg ' + baseAttr + '><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';
        case 'calendar':
          return '<svg ' + baseAttr + '><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>';
        case 'bar-chart-3':
          return '<svg ' + baseAttr + '><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>';
        case 'lightbulb':
          return '<svg ' + baseAttr + '><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>';
        case 'rocket':
          return '<svg ' + baseAttr + '><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>';
        case 'scale':
          return '<svg ' + baseAttr + '><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>';
        case 'rotate-ccw':
          return '<svg ' + baseAttr + '><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';
        case 'copy':
          return '<svg ' + baseAttr + '><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
        case 'download':
          return '<svg ' + baseAttr + '><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>';
        case 'shield':
        case 'security':
          return '<svg ' + baseAttr + '><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
        case 'shield-check':
          return '<svg ' + baseAttr + '><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>';
        case 'check':
          return '<svg ' + baseAttr + '><polyline points="20 6 9 17 4 12"/></svg>';
        case 'check-circle-2':
        case 'verified':
          return '<svg ' + baseAttr + '><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>';
        case 'x':
          return '<svg ' + baseAttr + '><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
        case 'alert-triangle':
          return '<svg ' + baseAttr + '><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>';
        case 'lock':
          return '<svg ' + baseAttr + '><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
        case 'wrench':
          return '<svg ' + baseAttr + '><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>';
        case 'sparkles':
          return '<svg ' + baseAttr + '><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>';
        case 'eye':
          return '<svg ' + baseAttr + '><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
        case 'arrow-right':
          return '<svg ' + baseAttr + '><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';
        case 'arrow-up':
          return '<svg ' + baseAttr + '><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>';
        case 'menu':
          return '<svg ' + baseAttr + '><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>';
        case 'network':
        case 'hub':
        case 'share-2':
          return '<svg ' + baseAttr + '><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>';
        case 'building-2':
        case 'building':
        case 'corporate_fare':
          return '<svg ' + baseAttr + '><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>';
        case 'megaphone':
        case 'campaign':
          return '<svg ' + baseAttr + '><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>';
        case 'tag':
        case 'tags':
        case 'sell':
          return '<svg ' + baseAttr + '><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>';
        case 'clipboard-list':
        case 'pending_actions':
          return '<svg ' + baseAttr + '><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>';
        case 'info':
          return '<svg ' + baseAttr + '><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';
        case 'timeline':
        case 'activity':
          return '<svg ' + baseAttr + '><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>';
        default:
          return '<svg ' + baseAttr + '><circle cx="12" cy="12" r="10"/></svg>';
      }
    }
    window.getLucideSvg = getLucideSvg;

    function getMaterialIcon(name, options) {
      options = options || {};
      var size = options.size || 18;
      var fill = options.fill !== undefined ? options.fill : 0;
      var weight = options.weight || 400;
      var grad = options.grade || 0;
      var opsz = options.opticalSize || 24;
      var cls = options.className ? 'material-symbols-rounded md3-icon md3-icon-' + name + ' ' + options.className : 'material-symbols-rounded md3-icon md3-icon-' + name;
      var customStyle = options.style ? options.style + '; ' : '';
      var fontVar = "font-variation-settings: 'FILL' " + fill + ", 'wght' " + weight + ", 'GRAD' " + grad + ", 'opsz' " + opsz + "; font-size: " + size + "px; width: " + size + "px; height: " + size + "px; display: inline-flex; align-items: center; justify-content: center; line-height: 1; user-select: none; vertical-align: middle;";
      return '<span class="' + cls + '" style="' + customStyle + fontVar + '" aria-hidden="true">' + name + '</span>';
    }
    window.getMaterialIcon = getMaterialIcon;

    // Material Design 3 Dynamic Ripple Effect
    document.addEventListener('pointerdown', function(e) {
      var target = e.target && e.target.closest ? e.target.closest('.md3-ripple, button, .rail-btn, .doc-tab-btn, .timeline-tab-btn, .graph-tab-btn, .task-card-item, .operator-menu-item, .turn-suggestion-chip, .btn-primary, .btn-secondary, .btn-danger') : null;
      if (!target || target.disabled || target.getAttribute('disabled')) return;
      var rect = target.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height) * 2;
      var x = e.clientX - rect.left - size / 2;
      var y = e.clientY - rect.top - size / 2;
      var ripple = document.createElement('span');
      ripple.className = 'md3-ripple-wave';
      ripple.style.width = size + 'px';
      ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      target.appendChild(ripple);
      setTimeout(function() {
        if (ripple && ripple.parentNode) {
          ripple.parentNode.removeChild(ripple);
        }
      }, 600);
    });

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
      const goalInput = document.getElementById('task-goal-input');
      const interactiveInput = document.getElementById('chat-interactive-input');
      const btnChatSend = document.getElementById('btn-chat-send');
      const btnCompare = document.getElementById('btn-compare');
      const btnChatBack = document.getElementById('btn-chat-back');
      const apiKeyInput = document.getElementById('api-key-input');
      const btnForgetKey = document.getElementById('btn-forget-key');
      const keyStatusText = document.getElementById('key-status-text');
      const validationMsg = document.getElementById('execution-validation-msg');
      const chatStatusBadge = document.getElementById('chat-status-badge');
      const comparisonModal = document.getElementById('comparison-modal');
      const btnCloseComparison = document.getElementById('btn-close-comparison');
      const comparisonPromptStep = document.getElementById('comparison-prompt-step');
      const comparisonPromptInput = document.getElementById('comparison-prompt-input');
      const btnStartComparisonPrompt = document.getElementById('btn-start-comparison-prompt');
      const btnCancelComparisonPrompt = document.getElementById('btn-cancel-comparison-prompt');
      const btnRecompare = document.getElementById('btn-recompare');
      const comparisonLoading = document.getElementById('comparison-loading');
      const comparisonResults = document.getElementById('comparison-results');
      const comparisonSummaryCard = document.getElementById('comparison-summary-card');
      const comparisonTbody = document.getElementById('comparison-tbody');
      const comparisonHighlightsCard = document.getElementById('comparison-highlights-card');
      const trajectoryList = document.getElementById('trajectory-list');
      const trajectoryMetrics = document.getElementById('trajectory-metrics');

      function autoDetectModelFromKey(rawKey) {
        const key = (rawKey || '').trim();
        if (!key) {
          return {
            provider: 'none',
            model: 'google/gemini-2.5-flash',
            statusText: 'Sem chave salva (Insira sua API Key)',
            color: 'var(--ink-muted)'
          };
        }
        if (key.startsWith('AIza')) {
          return {
            provider: 'google',
            model: 'google/gemini-2.5-flash',
            statusText: '✓ Gemini 2.5 Flash',
            color: 'var(--success)'
          };
        }
        if (key.startsWith('sk-or') || key.startsWith('sk-')) {
          return {
            provider: 'openrouter',
            model: 'anthropic/claude-3-5-sonnet',
            statusText: '✓ Claude 3.5 Sonnet',
            color: 'var(--success)'
          };
        }
        return {
          provider: 'custom',
          model: 'google/gemini-2.5-flash',
          statusText: '✓ Gemini 2.5 Flash',
          color: 'var(--success)'
        };
      }

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

      const initialDetection = autoDetectModelFromKey(initialKey);

      let OPERATOR_PROFILES = ${JSON.stringify(getSupercerebroOperatorProfiles())};

      const sessionState = {
        mode: 'GOVERNED_PEVC',
        model: initialDetection.model,
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
        if (nameEl && op) nameEl.textContent = op.name;
        if (roleEl && op) roleEl.textContent = op.role;
        if (compEl) compEl.style.display = 'none';
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

        // Sincroniza lista de operadores na gaveta mobile
        const mobileOpListEl = document.getElementById('mobile-drawer-operators-list');
        if (mobileOpListEl) {
          mobileOpListEl.innerHTML = OPERATOR_PROFILES.map(function(p) {
            const isActive = p.id === op.id;
            return '<button type="button" class="operator-menu-item ' + (isActive ? 'active' : '') + '" data-operator-id="' + p.id + '">' +
              '<div class="operator-menu-item-info">' +
                '<div class="operator-menu-item-top">' +
                  '<span class="operator-menu-item-name">' + escapeHtml(p.name) + '</span>' +
                '</div>' +
                '<span class="operator-menu-item-role">' + escapeHtml(p.role) + '</span>' +
              '</div>' +
              '<span class="operator-check-icon" aria-hidden="true" style="display: ' + (isActive ? 'block' : 'none') + '">✓</span>' +
            '</button>';
          }).join('');

          mobileOpListEl.querySelectorAll('.operator-menu-item').forEach(function(btn) {
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
                closeMobileDrawer();
              }
            });
          });
        }

        // Atualiza dinamicamente as pendências do operador ativo
        const pendenciesListEl = document.getElementById('operator-pendencies-list');
        if (pendenciesListEl) {
          const pendencies = op.pendencies || [];
          const activePendencies = pendencies.filter(function(t) { return (t.status || '').indexOf('Concluído') === -1; });

          if (activePendencies.length === 0) {
            pendenciesListEl.innerHTML =
              '<div style="font-size: var(--micro); color: #1E6B56; padding: 10px 12px; font-family: var(--font-mono); background: var(--success-soft); border: 1px solid var(--green); border-radius: var(--radius-small); display: flex; flex-direction: column; gap: 6px;">' +
                '<div style="font-weight: 600; display: flex; align-items: center; gap: 4px;">✓ Nenhuma pendência em aberto</div>' +
                '<div style="font-size: var(--micro); color: var(--ink-muted); line-height: 1.35;">Todas as suas tarefas foram concluídas e salvas no Supercérebro.</div>' +
                '<button type="button" class="btn-secondary" style="font-size: var(--micro); padding: 4px 10px; border-radius: var(--radius-pill); cursor: pointer; align-self: flex-start; margin-top: 2px;" onclick="if(window.switchView) window.switchView(&quot;timeline&quot;)">Ver Linha do Tempo &amp; Auditoria</button>' +
              '</div>';
          } else {
            pendenciesListEl.innerHTML = activePendencies.map(function(task) {
              const statusClass = task.statusClass || 'tag-status-paused';
              const cleanStatus = (task.status || '').replace(/🔒/g, '').trim();
              const cleanBtnText = (task.btnText || '').replace(/🔒/g, '').trim();
              const isLocked = cleanStatus.indexOf('Aguardando') !== -1 || cleanBtnText.indexOf('Aguardando') !== -1 || (task.status || '').indexOf('🔒') !== -1 || (task.btnText || '').indexOf('🔒') !== -1;
              const disabledAttr = isLocked ? 'disabled="disabled"' : '';
              const btnStyle = isLocked ? 'style="opacity: 0.65; cursor: not-allowed;"' : '';
              const isDoneTask = cleanStatus === 'Concluído' || cleanBtnText.startsWith('Ver ');
              const viewTarget = (cleanBtnText.indexOf('Despacho') !== -1 || cleanBtnText.indexOf('Documento') !== -1) ? 'documents' : 'timeline';

              const onclickAttr = isLocked
                ? ''
                : (isDoneTask
                    ? 'onclick="if(window.switchView) window.switchView(&quot;' + viewTarget + '&quot;)"'
                    : 'onclick="window.applyQuickPrompt(decodeURIComponent(this.dataset.taskPrompt))"');

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

      function openMobileDrawer() {
        const drawer = document.getElementById('mobile-drawer-menu');
        const backdrop = document.getElementById('mobile-drawer-backdrop');
        if (drawer) drawer.classList.add('open');
        if (backdrop) backdrop.classList.add('open');
      }

      function closeMobileDrawer() {
        const drawer = document.getElementById('mobile-drawer-menu');
        const backdrop = document.getElementById('mobile-drawer-backdrop');
        if (drawer) drawer.classList.remove('open');
        if (backdrop) backdrop.classList.remove('open');
      }

      document.getElementById('btn-mobile-menu')?.addEventListener('click', openMobileDrawer);
      document.getElementById('btn-close-mobile-drawer')?.addEventListener('click', closeMobileDrawer);
      document.getElementById('mobile-drawer-backdrop')?.addEventListener('click', closeMobileDrawer);

      document.getElementById('btn-mobile-nav-chat')?.addEventListener('click', () => {
        switchView('chat');
        closeMobileDrawer();
      });
      document.getElementById('btn-mobile-nav-tasks')?.addEventListener('click', () => {
        switchView('documents');
        closeMobileDrawer();
      });
      document.getElementById('btn-mobile-nav-supercerebro')?.addEventListener('click', () => {
        switchView('supercerebro');
        closeMobileDrawer();
      });
      document.getElementById('btn-mobile-nav-timeline')?.addEventListener('click', () => {
        switchView('timeline');
        closeMobileDrawer();
      });
      document.getElementById('btn-mobile-nav-controls')?.addEventListener('click', () => {
        switchView('controls');
        closeMobileDrawer();
      });
      document.getElementById('btn-mobile-nav-palco')?.addEventListener('click', () => {
        switchView('palco');
        closeMobileDrawer();
      });
      document.getElementById('btn-mobile-compare')?.addEventListener('click', () => {
        closeMobileDrawer();
        document.getElementById('btn-compare')?.click();
      });

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
            closeMobileDrawer();
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
          if (data && data.isSacReconciled) sessionState.isSacReconciled = true;
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
            interactiveInput.placeholder = 'Escreva o que precisa que eu faça...';
            interactiveInput.style.height = '';
            interactiveInput.style.overflowY = 'hidden';
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
        const detection = autoDetectModelFromKey(key);

        if (key) {
          sessionState.apiKey = key;
          sessionState.model = detection.model;
          if (keyStatusText) {
            keyStatusText.textContent = detection.statusText;
            keyStatusText.style.color = detection.color;
          }
          if (apiKeyInput && apiKeyInput.value !== key) apiKeyInput.value = key;
        } else {
          sessionState.apiKey = '';
          sessionState.model = 'google/gemini-2.5-flash';
          if (keyStatusText) {
            keyStatusText.textContent = detection.statusText;
            keyStatusText.style.color = detection.color;
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

      function updateChatBadge(status, verified, isAtomicCommit) {
        if (!chatStatusBadge) return;
        if (!status || status === 'IDLE') {
          chatStatusBadge.style.display = 'none';
          return;
        }

        const norm = (status || '').toUpperCase();
        if (norm === 'COMMITTED' || isAtomicCommit === true) {
          chatStatusBadge.style.display = 'inline-flex';
          chatStatusBadge.className = 'status-badge badge-committed';
          chatStatusBadge.textContent = '✓ SALVO NO SUPERCÉREBRO';
        } else if (norm === 'VERIFYING' || norm === 'RUNNING') {
          chatStatusBadge.style.display = 'inline-flex';
          chatStatusBadge.className = 'status-badge badge-verifying';
          chatStatusBadge.textContent = '⚙ VERIFYING';
        } else if (norm === 'QUARANTINED') {
          chatStatusBadge.style.display = 'inline-flex';
          chatStatusBadge.className = 'status-badge badge-quarantined';
          chatStatusBadge.textContent = '⚠ QUARANTINED';
        } else if (norm === 'BLOCKED') {
          chatStatusBadge.style.display = 'inline-flex';
          chatStatusBadge.className = 'status-badge badge-blocked';
          chatStatusBadge.textContent = '🔒 BLOCKED';
        } else if (norm === 'FAILED') {
          chatStatusBadge.style.display = 'inline-flex';
          chatStatusBadge.className = 'status-badge badge-failed';
          chatStatusBadge.textContent = '❌ FAILED';
        } else if (norm === 'PROVISIONAL') {
          chatStatusBadge.style.display = 'inline-flex';
          chatStatusBadge.className = 'status-badge badge-provisional';
          chatStatusBadge.textContent = '⏳ PROVISIONAL';
        } else {
          // Consultas informacionais/leitura (COMPLETED, SUCCESS) sem commit atômico real não exibem a tag
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

        if (brainCardDetails) {
          brainCardDetails.innerHTML =
            '<div><strong>Política:</strong> Escrita externa requer aprovação expressa.</div>';
        }

        if (scenarioId === 'S1') {
          if (badgeUgc) { badgeUgc.textContent = 'Indisponível (CRM)'; badgeUgc.className = 'tag-pill tag-status-paused'; }
          if (badgeHook) { badgeHook.textContent = 'Ativo (Meta)'; badgeHook.className = 'tag-pill tag-status-active'; }
          if (badgeFaq) { badgeFaq.textContent = 'Ativo (Meta)'; badgeFaq.className = 'tag-pill tag-status-active'; }
          if (tagsUgc) tagsUgc.innerHTML = '<span class="tag-pill tag-hook-strong">Hook Forte</span><span class="tag-pill" style="border-color: #ef4444; color: #f87171;">CRM Indisponível (503)</span>';
          if (badgeCrm) { badgeCrm.textContent = 'Indisponível (503)'; badgeCrm.className = 'tag-pill tag-status-paused'; }
          if (crmMetricsDetails) crmMetricsDetails.innerHTML = '<span style="color: #f87171;">Falha de conexão com a API de CRM (503 Service Unavailable)</span>';
          if (summary) summary.textContent = 'Aviso: API CRM retornou 503 · Replan em andamento';
        } else if (scenarioId === 'S2') {
          if (badgeUgc) { badgeUgc.textContent = 'Quarentena (UTM)'; badgeUgc.className = 'tag-pill tag-status-paused'; }
          if (badgeFaq) { badgeFaq.textContent = 'Quarentena (UTM)'; badgeFaq.className = 'tag-pill tag-status-paused'; }
          if (tagsUgc) tagsUgc.innerHTML = '<span class="tag-pill" style="border-color: #f97316; color: #fdba74;">Sem UTM (42% cov)</span><span class="tag-pill tag-cta-bad">Não Atribuível</span>';
          if (badgeCrm) { badgeCrm.textContent = 'Quarentena (42% UTM)'; badgeCrm.className = 'tag-pill tag-status-paused'; }
          if (tagCrmUtm) tagCrmUtm.textContent = 'Cobertura UTM: 42% (Mínimo: 80%)';
          if (crmMetricsDetails) crmMetricsDetails.innerHTML = '<span style="color: #fbbf24;">Dados retidos em quarentena de segurança (sem falsos cortes)</span>';
          if (summary) summary.textContent = 'Aviso: Cobertura UTM < 80% · Retido em Quarentena sem falso corte';
        } else if (scenarioId === 'S3') {
          if (badgeUgc) { badgeUgc.textContent = 'Rejeitado'; badgeUgc.className = 'tag-pill tag-status-paused'; }
          if (tagsUgc) tagsUgc.innerHTML = '<span class="tag-pill" style="border-color: #ef4444; color: #f87171;">Incompatibilidade Temporal</span>';
          if (summary) summary.textContent = 'Incompatibilidade temporal: Pós-condição determinística rejeitou commit';
        } else if (scenarioId === 'S4') {
          if (badgeUgc) { badgeUgc.textContent = 'Sanitizado'; badgeUgc.className = 'tag-pill tag-status-active'; }
          if (tagsUgc) tagsUgc.innerHTML = '<span class="tag-pill tag-hook-strong">Hook Forte</span><span class="tag-pill" style="border-color: #22c55e; color: #4ade80;">Prompt Injection Protegido</span>';
          if (summary) summary.textContent = 'Segurança: Dados não-confiáveis do CRM tratados estritamente como texto passivo';
        } else if (scenarioId === 'S5') {
          if (badgeUgc) { badgeUgc.textContent = 'Pausa Bloqueada'; badgeUgc.className = 'tag-pill tag-status-paused'; }
          if (badgeFaq) { badgeFaq.textContent = 'Pausa Bloqueada'; badgeFaq.className = 'tag-pill tag-status-paused'; }
          if (tagsUgc) tagsUgc.innerHTML = '<span class="tag-pill tag-hook-strong">Hook Forte</span><span class="tag-pill" style="border-color: #ef4444; color: #f87171;">Aprovação Necessária</span>';
          if (summary) summary.textContent = 'Capability Broker: Escrita externa bloqueada (exige aprovação humana expressa)';
        } else if (sessionState.isReactivated) {
          if (badgeUgc) { badgeUgc.textContent = 'ATIVO (REATIVADO)'; badgeUgc.className = 'tag-pill tag-status-active'; }
          if (badgeHook) { badgeHook.textContent = 'ATIVO (CAMPEÃO)'; badgeHook.className = 'tag-pill tag-status-active'; }
          if (badgeFaq) { badgeFaq.textContent = 'ATIVO (REATIVADO)'; badgeFaq.className = 'tag-pill tag-status-active'; }
          if (tagsUgc) tagsUgc.innerHTML = '<span class="tag-pill tag-hook-strong">HOOK FORTE 8.5</span><span class="tag-pill tag-status-active">REATIVADO</span><span class="tag-pill" style="border-color: #22c55e; color: #4ade80;">CPA R$ 94,50</span>';
          if (tagsFaq) tagsFaq.innerHTML = '<span class="tag-pill tag-hook-weak">HOOK 4.2</span><span class="tag-pill tag-status-active">REATIVADO</span><span class="tag-pill" style="border-color: #22c55e; color: #4ade80;">COMMIT SQLITE</span>';
          if (tagsHook) tagsHook.innerHTML = '<span class="tag-pill tag-hook-strong">HOOK FORTE 8.8</span><span class="tag-pill tag-cta-good">CTA BOM 8.5</span><span class="tag-pill" style="border-color: #22c55e; color: #4ade80;">CPA R$ 42,10</span>';
          if (badgeCrm) { badgeCrm.textContent = '62 Vendas Auditadas'; badgeCrm.className = 'tag-pill tag-status-active'; }
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
          if (badgeCrm) { badgeCrm.textContent = '62 Vendas Auditadas'; badgeCrm.className = 'tag-pill tag-status-active'; }
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
          if (badgeCrm) { badgeCrm.textContent = '62 Vendas Auditadas'; badgeCrm.className = 'tag-pill tag-status-active'; }
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

        const isProposal =
          q.includes('proposta') ||
          q.includes('submeter') ||
          q.includes('despachar') ||
          q.includes('pode enviar') ||
          q.includes('pode mandar') ||
          q.includes('confirmar envio') ||
          q.includes('enviar proposta');

        if (isProposal) {
          const isDirectDispatch =
            q.includes('pode enviar') ||
            q.includes('pode mandar') ||
            q.includes('confirmar envio') ||
            q.includes('despachar proposta') ||
            (q.includes('enviar') && q.includes('proposta')) ||
            (q.includes('submeter') && q.includes('proposta'));

          if (isDirectDispatch) {
            return {
              step1: {
                reasoningText: 'Validar integridade da proposta e autorizações de alçada no Capability Broker.',
                tools: ['staging_writer:draft', 'capability_broker:check_approval'],
                observation: 'Proposta executiva validada · Alçada de Carolina Mendes (SPOT) confirmada'
              },
              step2: {
                reasoningText: 'Executar commit atômico no SQLite e despachar proposta para Marcos Silva no Supercérebro.',
                tools: ['governed_pevc:eval', 'delegate_task'],
                observation: 'Proposta despachada para Marcos Silva · Commit atômico gravado no Supercérebro'
              }
            };
          }

          const isDevolutiva =
            q.includes('devolutiva') ||
            q.includes('devolver') ||
            (q.includes('aprova') && (q.includes('pausa') || q.includes('proposta')));

          if (isDevolutiva) {
            return {
              step1: {
                reasoningText: 'Consultar proposta formal da SPOT e registrar parecer de aprovação de Marcos Silva.',
                tools: ['read_memory_context', 'supercerebro:get_proposal'],
                observation: 'Proposta formal de pausa da SPOT localizada · Parecer favorável de Marcos Silva (Housewhey)'
              },
              step2: {
                reasoningText: 'Gerar documento formal de devolutiva autorizando a pausa e delegando execução.',
                tools: ['governed_pevc:eval', 'delegate_task'],
                observation: 'Devolutiva de aprovação estruturada com solicitação de delegação formal para Carolina Mendes (SPOT)'
              }
            };
          }

          return {
            step1: {
              reasoningText: 'Inspecionar criativos saturados e métricas operacionais no Meta Ads.',
              tools: ['meta_ads:inspect_creatives', 'get_cta_diagnostics'],
              observation: 'Criativos saturados mapeados (ad_namorados_casal_03 e ad_whey_sabores_04) · Métricas de CPA auditadas'
            },
            step2: {
              reasoningText: 'Preparar proposta formal de governança e requisição de despacho para Marcos Silva.',
              tools: ['capability_broker:check_approval', 'staging_writer:draft'],
              observation: 'Proposta executiva em rascunho aguardando confirmação de despacho'
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

      function scrollChatToBottom(smooth = true) {
        const wrapper = document.getElementById('chat-messages-wrapper');
        const streamBody = document.getElementById('chat-stream-body');

        const doScroll = () => {
          if (wrapper) {
            if (smooth) {
              wrapper.scrollTo({ top: wrapper.scrollHeight, behavior: 'smooth' });
            } else {
              wrapper.scrollTop = wrapper.scrollHeight;
            }
          }
          if (streamBody) {
            streamBody.scrollTop = streamBody.scrollHeight;
          }
          const lastTurn = document.querySelector('#chat-messages-container .chat-turn:last-child') ||
                           document.getElementById('chat-messages-container')?.lastElementChild;
          if (lastTurn && typeof lastTurn.scrollIntoView === 'function') {
            try {
              lastTurn.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
            } catch (err) {}
          }
        };

        doScroll();
        requestAnimationFrame(doScroll);
        setTimeout(doScroll, 40);
        setTimeout(doScroll, 120);
        setTimeout(doScroll, 280);
      }

      function toggleReasoningCard(turnId) {
        const card = document.getElementById('reasoning-card-' + turnId);
        const content = document.getElementById('reasoning-content-' + turnId);
        const toggleBtn = document.getElementById('reasoning-toggle-' + turnId);
        if (!card || !content) return;

        const isCurrentlyOpen = card.classList.contains('open') || content.style.display === 'flex' || content.style.display === 'block';
        if (isCurrentlyOpen) {
          card.classList.remove('open');
          content.style.display = 'none';
          if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
        } else {
          card.classList.add('open');
          content.style.display = 'flex';
          if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
        }
      }
      window.toggleReasoningCard = toggleReasoningCard;

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
            '<!-- HumanLoading Card da Rodada (Pensamento) -->' +
            '<div id="loading-' + turnId + '" class="human-loading-card-container" aria-live="polite">' +
              '<div class="human-loading-glow-1 loading-float-slow-bg"></div>' +
              '<div class="human-loading-glow-2 loading-float-reverse-bg"></div>' +
              '<section class="human-loading-card">' +
                '<div class="human-loading-card-inner">' +
                  '<div class="human-loading-glow-top"></div>' +
                  '<div class="human-loading-content">' +
                    '<div class="human-loading-icon-badge">' +
                      '<div class="human-loading-breathe-bg loading-breathe-circle"></div>' +
                      '<div class="spinner" style="display: none;"></div>' +
                      '<div class="human-loading-dots">' +
                        '<span class="loading-dot-pulse dot-1"></span>' +
                        '<span class="loading-dot-pulse dot-2"></span>' +
                        '<span class="loading-dot-pulse dot-3"></span>' +
                      '</div>' +
                    '</div>' +
                    '<div class="human-loading-text-group">' +
                      '<h4 class="human-loading-title">Estou pensando</h4>' +
                    '</div>' +
                  '</div>' +
                  '<div class="human-loading-progress-track">' +
                    '<div class="human-loading-shimmer loading-shimmer-bar"></div>' +
                  '</div>' +
                '</div>' +
              '</section>' +
            '</div>' +
            '<!-- Card Accordion Único de Raciocínio -->' +
            '<div class="reasoning-accordion-card open" id="reasoning-card-' + turnId + '" style="display: none;">' +
              '<button type="button" class="reasoning-accordion-header" id="reasoning-toggle-' + turnId + '" data-turn-id="' + turnId + '" aria-expanded="true" onclick="window.toggleReasoningCard(this.dataset.turnId)">' +
                '<div class="reasoning-header-left">' +
                  '<span class="reasoning-icon">' + getLucideSvg('brain', { size: 14, style: 'color: var(--navy);' }) + '</span>' +
                  '<span class="reasoning-title" id="reasoning-title-' + turnId + '">Raciocínio</span>' +
                '</div>' +
                '<span class="reasoning-chevron" id="reasoning-chevron-' + turnId + '">▾</span>' +
              '</button>' +
              '<div class="reasoning-accordion-content" id="reasoning-content-' + turnId + '">' +
                '<div class="agent-steps-stream" id="steps-stream-' + turnId + '">' +
                  '<div class="step-item" id="step-r1-' + turnId + '" style="display: none;">' +
                    '<span class="step-icon" style="display: flex; align-items: center;">' + getLucideSvg('brain', { size: 14, style: 'color: var(--navy);' }) + '</span>' +
                    '<div class="step-text" id="step-r1-text-' + turnId + '">' + escapeHtml(trace.step1.reasoningText) + '</div>' +
                  '</div>' +
                  '<div class="step-item" id="step-t1-' + turnId + '" style="display: none;">' +
                    '<span class="step-icon" style="display: flex; align-items: center;">' + getLucideSvg('wrench', { size: 14, style: 'color: var(--navy);' }) + '</span>' +
                    '<div class="step-text">' +
                      '<span class="step-tool-tag" id="step-tool1-' + turnId + '">' + escapeHtml(trace.step1.tools[0] || 'read_memory_context') + '</span>' +
                      '<span class="step-tool-tag" id="step-tool2-' + turnId + '">' + escapeHtml(trace.step1.tools[1] || 'get_dataset_manifest') + '</span>' +
                      '<div class="step-obs" id="step-t1-obs-' + turnId + '">' + escapeHtml(trace.step1.observation) + '</div>' +
                    '</div>' +
                  '</div>' +
                  '<div class="step-item" id="step-r2-' + turnId + '" style="display: none;">' +
                    '<span class="step-icon" style="display: flex; align-items: center;">' + getLucideSvg('brain', { size: 14, style: 'color: var(--navy);' }) + '</span>' +
                    '<div class="step-text" id="step-r2-text-' + turnId + '">' + escapeHtml(trace.step2.reasoningText) + '</div>' +
                  '</div>' +
                  '<div class="step-item" id="step-t2-' + turnId + '" style="display: none;">' +
                    '<span class="step-icon" style="display: flex; align-items: center;">' + getLucideSvg('wrench', { size: 14, style: 'color: var(--navy);' }) + '</span>' +
                    '<div class="step-text">' +
                      '<span class="step-tool-tag" id="step-tool3-' + turnId + '">' + escapeHtml(trace.step2.tools[0] || 'governed_pevc:eval') + '</span>' +
                      '<span class="step-tool-tag" id="step-tool4-' + turnId + '">' + escapeHtml(trace.step2.tools[1] || 'format_analytical_output') + '</span>' +
                      '<div class="step-obs" id="step-t2-obs-' + turnId + '">' + escapeHtml(trace.step2.observation) + '</div>' +
                    '</div>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<!-- Container da Resposta Final da Rodada -->' +
            '<div id="response-' + turnId + '" class="agent-response-box chat-animate-in" style="display: none;"></div>' +
          '</div>';

        container.insertAdjacentHTML('beforeend', turnHtml);
        scrollChatToBottom(false);
        return { turnId: turnId };
      }

      function renderTurnStructuredAnswer(turnId, answer, queryText) {
        const loadEl = document.getElementById('loading-' + turnId);
        if (loadEl) loadEl.style.display = 'none';

        // Quando o chat recebe a resposta, os cards de raciocínio viram um único card colapsado chamado Raciocínio
        const reasoningCard = document.getElementById('reasoning-card-' + turnId);
        const reasoningContent = document.getElementById('reasoning-content-' + turnId);
        const reasoningToggle = document.getElementById('reasoning-toggle-' + turnId);
        if (reasoningCard && reasoningContent) {
          reasoningCard.classList.remove('open');
          reasoningContent.style.display = 'none';
          if (reasoningToggle) reasoningToggle.setAttribute('aria-expanded', 'false');
        }

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

        const isSubmissionOrProposalAction =
          !isInformationalQuery &&
          (qLower.includes('submeter proposta') ||
            qLower.includes('submeta a proposta') ||
            qLower.includes('submeter a proposta') ||
            qLower.includes('gerar proposta') ||
            qLower.includes('gerar a proposta') ||
            qLower.includes('crie a proposta') ||
            qLower.includes('elabore a proposta') ||
            qLower.includes('formalize a proposta') ||
            qLower.includes('formalizar proposta') ||
            qLower.includes('despachar proposta') ||
            qLower.includes('despache a proposta') ||
            qLower.includes('enviar proposta') ||
            qLower.includes('envie a proposta') ||
            qLower.includes('pode enviar') ||
            qLower.includes('pode mandar') ||
            qLower.includes('confirmar envio') ||
            qLower.includes('proposta executiva'));

        const isDirectDispatch =
          !isInformationalQuery &&
          (qLower.includes('pode enviar') ||
            qLower.includes('pode mandar') ||
            qLower.includes('confirmar envio') ||
            qLower.includes('despachar proposta') ||
            (qLower.includes('enviar') && qLower.includes('proposta')) ||
            (qLower.includes('submeter') && qLower.includes('proposta')));

        const isDevolutivaAction =
          !isInformationalQuery &&
          (qLower.includes('devolutiva') ||
            qLower.includes('devolver') ||
            qLower.includes('despacho') ||
            (qLower.includes('aprova') && (qLower.includes('pausa') || qLower.includes('proposta'))));

        const isDelegationAction =
          !isInformationalQuery &&
          (isDevolutivaAction ||
            isSubmissionOrProposalAction ||
            qLower.includes('deleg') ||
            qLower.includes('atribu') ||
            qLower.includes('escreva essa proposta') ||
            qLower.includes('escreva a proposta') ||
            (qLower.includes('proposta') && (
              qLower.includes('escreva') ||
              qLower.includes('crie') ||
              qLower.includes('elabore') ||
              qLower.includes('formalize') ||
              qLower.includes('envie') ||
              qLower.includes('mandar') ||
              qLower.includes('gerar') ||
              qLower.includes('submeter') ||
              qLower.includes('despachar')
            )));

        let targetPerson = 'Marcos Silva';
        if (isDevolutivaAction) {
          if (qLower.includes('aline')) targetPerson = 'Aline Rocha';
          else if (qLower.includes('luiza')) targetPerson = 'Luiza Valente';
          else targetPerson = 'Carolina Mendes';
        } else if (qLower.includes('carolina') || qLower.includes('carol')) {
          targetPerson = 'Carolina Mendes';
        } else if (qLower.includes('luiza')) {
          targetPerson = 'Luiza Valente';
        } else if (qLower.includes('aline')) {
          targetPerson = 'Aline Rocha';
        } else if (qLower.includes('marcos') || qLower.includes('head') || qLower.includes('marketing') || isSubmissionOrProposalAction) {
          targetPerson = 'Marcos Silva';
        }

        const isPauseAction = !isInformationalQuery && (qLower.includes('pause') || qLower.includes('pausar') || qLower.includes('desativar'));
        const isReactivation = !isInformationalQuery && (qLower.includes('reativar') || qLower.includes('religar') || qLower.includes('despausar') || qLower.includes('ativar'));
        const isSacReconcileAction = !isInformationalQuery && (qLower.includes('reconciliar') || (qLower.includes('sac') && qLower.includes('conversões')) || qLower.includes('atendimentos whatsapp'));

        const isExplicitActionRequested =
          !isInformationalQuery &&
          (isDelegationAction ||
          isPauseAction ||
          isReactivation ||
          isSacReconcileAction ||
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
           concLower.includes('salvar no supercérebro') ||
           concLower.includes('confirmar no botão') ||
           concLower.includes('card de governança') ||
           concLower.includes('painel de governança abaixo') ||
           concLower.includes('aguardando confirmação') ||
           concLower.includes('aguardando aprovação'));

        let isAtomicCommit = Boolean(
          answer.isAtomicCommit ||
          answer.hasMemoryCommit ||
          answer.isCommitted ||
          isDirectDispatch ||
          (answer.status === 'COMMITTED' && !isInformationalQuery && (isExplicitActionRequested || concLower.includes('commit auditado') || concLower.includes('salvo no supercérebro')))
        );

        let effectiveStatus = answer.status;
        if (!effectiveStatus) {
          if (isAtomicCommit) {
            effectiveStatus = 'COMMITTED';
          } else if (isActionRequired) {
            effectiveStatus = 'PROVISIONAL';
          } else {
            effectiveStatus = 'COMPLETED';
          }
        } else if (effectiveStatus === 'COMMITTED' && !isAtomicCommit) {
          effectiveStatus = isActionRequired ? 'PROVISIONAL' : 'COMPLETED';
        }

        let effectiveVerified = Boolean(answer.verified);

        if (answer.status === 'BLOCKED') {
          effectiveStatus = 'BLOCKED';
          effectiveVerified = false;
          respEl.innerHTML =
            '<div style="background: var(--danger-soft); border: 1px solid var(--danger); border-radius: var(--radius-control); padding: 14px; font-size: var(--label); width: 100%;" aria-live="assertive">' +
              '<h4 style="color: #8F2D36; margin-bottom: 4px; font-family: var(--font-display); font-weight: 600;">🔒 Ação Bloqueada por Política (Capability Broker)</h4>' +
              '<p style="color: var(--ink); margin: 0 0 8px;">' + escapeHtml(answer.error || 'Escrita externa não autorizada sem aprovação humana expressa.') + '</p>' +
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
          '<div class="agent-response-content" style="line-height: 1.6; font-size: 0.9375rem; color: var(--ink);">' +
            formatMarkdownToHtml(answer.conclusion || 'Execução finalizada.') +
          '</div>';

        if (isDirectDispatch) {
          innerHtml +=
            '<div style="margin-top: 8px; color: #1E6B56; font-size: var(--label); font-weight: 600; padding: 10px 14px; background: var(--success-soft); border-radius: var(--radius-control); border: 1px solid var(--green); width: 100%; font-family: var(--font-mono); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">' +
              '<span>✓ Proposta executiva despachada para Marcos Silva e commitada no SQLite (Supercérebro atualizado).</span>' +
              '<button type="button" class="btn-secondary" style="font-size: var(--micro); padding: 4px 10px; border-radius: var(--radius-pill); cursor: pointer;" onclick="if(window.switchView) window.switchView(&quot;timeline&quot;)">Ver na Linha do Tempo →</button>' +
            '</div>';
        }

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
                '<div class="cta-badge-ready" style="display: inline-flex; align-items: center; gap: 5px;">' + getLucideSvg('lightbulb', { size: 13, style: 'color: var(--navy);' }) + ' Sugestões de Cópias &amp; CTAs</div>' +
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

        const activeOpId = sessionState.currentOperator?.id || 'p_aline';
        const activeOpRole = sessionState.currentOperator?.role || 'Gestora de Tráfego';
        const isUnauthorizedForDirectWrite = activeOpId === 'p_luiza' || activeOpRole.includes('Atendimento') || activeOpRole.includes('Vendas');

        if (isActionRequired && !isDirectDispatch && answer.status !== 'QUARANTINED') {
          let actionTitle = getLucideSvg('shield-check', { size: 16, style: 'color: var(--navy); vertical-align: middle; margin-right: 4px;' }) + ' Governança de Tráfego: Confirmar Alteração';
          let actionSubtext = 'Ação: Executar proposta operacional e sincronizar no Meta Ads';
          let btnText = 'Confirmar alteração';

          if (isDelegationAction) {
            const firstName = targetPerson.split(' ')[0] || 'Marcos';
            if (isDevolutivaAction) {
              actionTitle = getLucideSvg('shield-check', { size: 16, style: 'color: var(--navy); vertical-align: middle; margin-right: 4px;' }) + ' Governança &amp; Devolutiva: Confirmar Devolutiva de Aprovação para ' + targetPerson;
              actionSubtext = 'Ação: Formalizar aprovação de Marcos Silva e delegar execução técnica a ' + targetPerson + ' (SPOT)';
              btnText = 'Confirmar Devolutiva de Aprovação';
            } else if (isSubmissionOrProposalAction || targetPerson === 'Marcos Silva') {
              actionTitle = getLucideSvg('shield-check', { size: 16, style: 'color: var(--navy); vertical-align: middle; margin-right: 4px;' }) + ' Governança &amp; Submissão: Enviar Proposta para Marcos Silva (Head de Marketing)';
              actionSubtext = 'Ação: Formalizar proposta executiva de realocação e despachar para validação de Marcos Silva';
              btnText = 'Enviar Proposta para Marcos Silva';
            } else {
              actionTitle = getLucideSvg('shield-check', { size: 16, style: 'color: var(--navy); vertical-align: middle; margin-right: 4px;' }) + ' Governança &amp; Delegação: Atribuir Tarefa para ' + targetPerson;
              actionSubtext = 'Ação: Formalizar proposta operacional e delegar execução técnica a ' + targetPerson;
              btnText = 'Delegar tarefa para ' + firstName.toLowerCase() + '?';
            }
          } else if (isReactivation) {
            actionTitle = getLucideSvg('shield-check', { size: 16, style: 'color: var(--navy); vertical-align: middle; margin-right: 4px;' }) + ' Governança de Tráfego: Confirmar Reativação de Anúncios';
            actionSubtext = 'Ação: Reativar e religar a veiculação dos anúncios selecionados no Meta Ads';
            btnText = 'Confirmar Reativação';
          } else if (isPauseAction) {
            if (isUnauthorizedForDirectWrite) {
              actionTitle = getLucideSvg('shield-check', { size: 16, style: 'color: var(--navy); vertical-align: middle; margin-right: 4px;' }) + ' Governança &amp; Solicitação: Pedido de Pausa de Anúncios';
              actionSubtext = 'Ação: Encaminhar proposta de pausa de anúncios para Aline Rocha (Gestora de Tráfego SPOT)';
              btnText = 'Enviar Proposta de Pausa para Aline Rocha';
            } else {
              actionTitle = getLucideSvg('shield-check', { size: 16, style: 'color: var(--navy); vertical-align: middle; margin-right: 4px;' }) + ' Governança de Tráfego: Confirmar Pausa de Anúncios';
              actionSubtext = 'Ação: Pausar anúncios de baixa conversão e sincronizar Meta Ads';
              btnText = 'Confirmar Pausa';
            }
          } else if (isSacReconcileAction) {
            actionTitle = getLucideSvg('shield-check', { size: 16, style: 'color: var(--navy); vertical-align: middle; margin-right: 4px;' }) + ' Governança &amp; SAC: Commit de Reconciliação do WhatsApp';
            actionSubtext = 'Ação: Salvar reconciliação de atendimentos e conversões do WhatsApp no Supercérebro';
            btnText = 'Salvar no Supercérebro';
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
                '<button id="btn-approve-' + turnId + '" class="btn-primary" type="button" style="font-size: var(--label); padding: 7px 16px; border-radius: var(--radius-pill); background-color: var(--adzhub-blue); color: #ffffff; display: inline-flex; align-items: center; gap: 5px;">' +
                  getLucideSvg('check', { size: 14 }) + ' ' + btnText +
                '</button>' +
                '<button id="btn-reject-' + turnId + '" type="button" style="font-size: var(--label); padding: 7px 12px; background: transparent; border: none; color: var(--ink-muted); cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">' +
                  getLucideSvg('x', { size: 13 }) + ' Cancelar' +
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

        respEl.innerHTML = innerHtml;

        // Binda os botões de ação deste turno se presentes
        if (isActionRequired && !isDirectDispatch && answer.status !== 'QUARANTINED') {
          const btnApp = document.getElementById('btn-approve-' + turnId);
          const btnRej = document.getElementById('btn-reject-' + turnId);
          const cardEl = document.getElementById('approval-card-' + turnId);

          let successMsg = '✓ Ação aprovada pelo operador. Alterações sincronizadas com o Meta Ads (Commit auditado no SQLite).';
          if (isDelegationAction) {
            if (isDevolutivaAction) {
              successMsg = '✓ Devolutiva de aprovação confirmada e commitada com sucesso no sistema. Decisão oficialmente delegada de volta para ' + targetPerson + ' (Commit auditado no SQLite).';
            } else if (isSubmissionOrProposalAction || targetPerson === 'Marcos Silva') {
              successMsg = '✓ Proposta formalmente enviada para Marcos Silva (Head de Marketing) e registrada no Supercérebro (Commit auditado no SQLite). O status das pendências foi atualizado.';
            } else {
              successMsg = '✓ Proposta aprovada e commitada com sucesso no sistema. Tarefa oficialmente delegada para ' + targetPerson + ' (Commit auditado no SQLite).';
            }
          } else if (isReactivation) {
            successMsg = '✓ Reativação aprovada pelo operador. Anúncios religados com sucesso no Meta Ads (Commit auditado no SQLite).';
          } else if (isPauseAction) {
            if (isUnauthorizedForDirectWrite) {
              successMsg = '✓ Proposta de pausa enviada com sucesso por ' + (sessionState.currentOperator?.name || 'Luiza Valente') + ' para Aline Rocha (Gestora de Tráfego SPOT). Registro auditado no SQLite.';
            } else {
              successMsg = '✓ Pausa aprovada pelo operador. Anúncios pausados com sucesso no Meta Ads (Commit auditado no SQLite).';
            }
          } else if (isSacReconcileAction) {
            successMsg = '✓ Reconciliação de conversões SAC do WhatsApp Business auditada e salva com sucesso no Supercérebro (Commit registrado no SQLite).';
          }

          btnApp?.addEventListener('click', () => {
            updateStageForScenario('S0');
            document.querySelectorAll('.stage-card').forEach(c => {
              c.classList.remove('card-active', 'card-pulse-highlight');
            });
            updateChatBadge('COMMITTED', true, true);

            const op = sessionState.currentOperator || {
              name: 'Aline Rocha',
              role: 'Gestora de Tráfego',
              company: 'SPOT',
              initials: 'AR',
              avatarBg: 'var(--tag-info-bg)',
              avatarColor: 'var(--tag-info-ink)'
            };
            const nowStr = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            if (isDelegationAction) {
              sessionState.delegation = { isDelegated: true, delegatedTo: targetPerson };
              fetch('/api/governance/commit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'DELEGATE_PROPOSAL',
                  targetPerson: targetPerson,
                  proposalTitle: 'Proposta de Realocação de Verba Meta Ads',
                  proposalDetails: isDevolutivaAction
                    ? 'Devolutiva de aprovação expressa emitida por Marcos Silva autorizando a pausa de anúncios.'
                    : 'Proposta formal de pausa de criativos e realocação orçamentária despachada para Marcos Silva.'
                })
              }).then(function() { loadSupercerebroPendencies(); }).catch(() => {});

              if (typeof window.addTimelineEvent === 'function') {
                window.addTimelineEvent({
                  category: 'governance',
                  actor: {
                    name: op.name,
                    role: op.role + (op.company ? ' (' + op.company + ')' : ''),
                    avatarBg: op.avatarBg || 'var(--tag-info-bg)',
                    avatarColor: op.avatarColor || 'var(--tag-info-ink)',
                    avatarInitials: op.initials || 'OP'
                  },
                  actionTitle: isDevolutivaAction ? 'Devolutiva de Aprovação para ' + targetPerson : 'Submissão de Proposta para ' + targetPerson,
                  badgeText: isDevolutivaAction ? 'Aprovação Confirmada' : 'Proposta Submetida',
                  badgeBg: 'var(--tag-success-bg)',
                  badgeBorder: 'var(--tag-success-border)',
                  badgeColor: 'var(--tag-success-ink)',
                  summary: isDevolutivaAction 
                    ? (op.name + ' confirmou a devolutiva de aprovação da proposta de realocação para ' + targetPerson + ' com commit auditado no SQLite.')
                    : (op.name + ' despachou formalmente a proposta executiva de realocação para ' + targetPerson + ' com commit auditado no SQLite.'),
                  target: 'Proposta Operacional · ' + targetPerson,
                  timestamp: nowStr,
                  provenance: 'Governança da Conta'
                });
              }
            } else if (isReactivation) {
              sessionState.isReactivated = true;
              sessionState.isPaused = false;
              fetch('/api/governance/commit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'REACTIVATE' })
              }).then(function() { loadSupercerebroPendencies(); }).catch(() => {});

              if (typeof window.addTimelineEvent === 'function') {
                window.addTimelineEvent({
                  category: 'media',
                  actor: {
                    name: op.name,
                    role: op.role + (op.company ? ' (' + op.company + ')' : ''),
                    avatarBg: op.avatarBg || 'var(--tag-info-bg)',
                    avatarColor: op.avatarColor || 'var(--tag-info-ink)',
                    avatarInitials: op.initials || 'AR'
                  },
                  actionTitle: 'Reativação de Anúncios no Meta Ads',
                  badgeText: 'Reativação Aprovada',
                  badgeBg: 'var(--tag-success-bg)',
                  badgeBorder: 'var(--tag-success-border)',
                  badgeColor: 'var(--tag-success-ink)',
                  summary: op.name + ' aprovou a reativação dos anúncios de alta conversão. Operação sincronizada com Meta Ads e registrada no Supercérebro.',
                  target: 'Campanha Whey Isolar · Meta Ads',
                  timestamp: nowStr,
                  provenance: 'Painel da Conta'
                });
              }
            } else if (isPauseAction) {
              if (isUnauthorizedForDirectWrite) {
                sessionState.delegation = { isDelegated: true, delegatedTo: 'Aline Rocha' };
                fetch('/api/governance/commit', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'DELEGATE_PROPOSAL', targetPerson: 'Aline Rocha' })
                }).then(function() { loadSupercerebroPendencies(); }).catch(() => {});

                if (typeof window.addTimelineEvent === 'function') {
                  window.addTimelineEvent({
                    category: 'governance',
                    actor: {
                      name: op.name,
                      role: op.role + (op.company ? ' (' + op.company + ')' : ''),
                      avatarBg: op.avatarBg || 'var(--tag-warning-bg)',
                      avatarColor: op.avatarColor || 'var(--tag-warning-ink)',
                      avatarInitials: op.initials || 'LV'
                    },
                    actionTitle: 'Submissão de Proposta de Pausa para Aline Rocha',
                    badgeText: 'Proposta Submetida',
                    badgeBg: 'var(--tag-warning-bg)',
                    badgeBorder: 'var(--tag-warning-border)',
                    badgeColor: 'var(--tag-warning-ink)',
                    summary: op.name + ' registrou e encaminhou proposta de pausa dos criativos saturados (ad_namorados_casal_03) para validação de Aline Rocha (Gestora de Tráfego SPOT).',
                    target: 'Proposta #prop-pausa-01 · Aline Rocha',
                    timestamp: nowStr,
                    provenance: 'Painel de Governança'
                  });
                }
              } else {
                sessionState.isPaused = true;
                sessionState.isReactivated = false;
                fetch('/api/governance/commit', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'PAUSE', pausedAds: ['ad_namorados_casal_03', 'ad_whey_sabores_04'] })
                }).then(function() { loadSupercerebroPendencies(); }).catch(() => {});

                if (typeof window.addTimelineEvent === 'function') {
                  window.addTimelineEvent({
                    category: 'media',
                    actor: {
                      name: op.name,
                      role: op.role + (op.company ? ' (' + op.company + ')' : ''),
                      avatarBg: op.avatarBg || 'var(--tag-danger-bg)',
                      avatarColor: op.avatarColor || 'var(--tag-danger-ink)',
                      avatarInitials: op.initials || 'AR'
                    },
                    actionTitle: 'Pausa de Anúncios de Baixa Conversão',
                    badgeText: 'Pausa de Anúncio',
                    badgeBg: 'var(--tag-danger-bg)',
                    badgeBorder: 'var(--tag-danger-border)',
                    badgeColor: 'var(--tag-danger-ink)',
                    summary: op.name + ' aprovou a pausa dos anúncios saturados (ad_namorados_casal_03 e ad_whey_sabores_04) no Meta Ads com commit auditado no SQLite.',
                    target: 'Anúncios: ad_namorados_casal_03, ad_whey_sabores_04 · Meta Ads',
                    timestamp: nowStr,
                    provenance: 'Meta Ads'
                  });
                }
              }
            } else if (isSacReconcileAction) {
              sessionState.isSacReconciled = true;
              fetch('/api/governance/commit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'RECONCILE_SAC' })
              }).then(function() { loadSupercerebroPendencies(); }).catch(() => {});

              if (typeof window.addTimelineEvent === 'function') {
                window.addTimelineEvent({
                  category: 'audit',
                  actor: {
                    name: op.name,
                    role: op.role + (op.company ? ' (' + op.company + ')' : ''),
                    avatarBg: op.avatarBg || 'var(--tag-neutral-bg)',
                    avatarColor: op.avatarColor || 'var(--tag-neutral-ink)',
                    avatarInitials: op.initials || 'LV'
                  },
                  actionTitle: 'Reconciliação de Atendimentos WhatsApp com CRM',
                  badgeText: 'Reconciliação Auditada',
                  badgeBg: 'var(--tag-info-bg)',
                  badgeBorder: 'var(--tag-info-border)',
                  badgeColor: 'var(--tag-info-ink)',
                  summary: op.name + ' auditou e confirmou a reconciliação das conversões do WhatsApp Business com os registros de vendas no CRM, gravando no Supercérebro.',
                  target: 'SAC WhatsApp & CRM · Supercérebro',
                  timestamp: nowStr,
                  provenance: 'Motor de Auditoria'
                });
              }
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

        updateChatBadge(effectiveStatus, effectiveVerified, isAtomicCommit);
        scrollChatToBottom(true);
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

      function autoResizeChatInput() {
        if (!interactiveInput) return;
        interactiveInput.style.height = 'auto';
        if (interactiveInput.value) {
          interactiveInput.style.height = Math.min(interactiveInput.scrollHeight, 120) + 'px';
          interactiveInput.style.overflowY = interactiveInput.scrollHeight > 120 ? 'auto' : 'hidden';
        } else {
          interactiveInput.style.height = '';
          interactiveInput.style.overflowY = 'hidden';
        }
      }

      interactiveInput?.addEventListener('input', (e) => {
        if (goalInput) goalInput.value = e.target.value;
        autoResizeChatInput();
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
        currentSelectedDocId = null;

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

      async function executeCurrentRun() {
        if (sessionState.isExecuting) return;

        const goalVal = (interactiveInput?.value || goalInput?.value || '').trim();
        if (!goalVal) return;

        if (interactiveInput) {
          interactiveInput.value = '';
          interactiveInput.style.height = '';
          interactiveInput.style.overflowY = 'hidden';
        }
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

          const goalLower = goalVal.toLowerCase();
          const isDirectDispatch =
            goalLower.includes('pode enviar') ||
            goalLower.includes('pode mandar') ||
            goalLower.includes('confirmar envio') ||
            goalLower.includes('despachar proposta') ||
            (goalLower.includes('enviar') && goalLower.includes('proposta')) ||
            (goalLower.includes('submeter') && goalLower.includes('proposta'));

          if (isDirectDispatch) {
            sessionState.delegation = { isDelegated: true, delegatedTo: 'Marcos Silva' };
            fetch('/api/governance/commit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'DELEGATE_PROPOSAL',
                targetPerson: 'Marcos Silva',
                proposalTitle: 'Proposta de Realocação de Verba Meta Ads',
                proposalDetails: 'Proposta formal de pausa de criativos e realocação orçamentária despachada para Marcos Silva.'
              })
            }).then(function() {
              loadSupercerebroPendencies();
            }).catch(() => {});

            if (typeof window.addTimelineEvent === 'function') {
              const op = sessionState.currentOperator || {
                name: 'Carolina Mendes',
                role: 'Gerente de Contas',
                company: 'SPOT',
                initials: 'CM',
                avatarBg: 'var(--tag-info-bg)',
                avatarColor: 'var(--tag-info-ink)'
              };
              const nowStr = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              window.addTimelineEvent({
                category: 'governance',
                actor: {
                  name: op.name,
                  role: op.role + (op.company ? ' (' + op.company + ')' : ''),
                  avatarBg: op.avatarBg || 'var(--tag-info-bg)',
                  avatarColor: op.avatarColor || 'var(--tag-info-ink)',
                  avatarInitials: op.initials || 'CM'
                },
                actionTitle: 'Submissão de Proposta para Marcos Silva',
                badgeText: 'Proposta Submetida',
                badgeBg: 'var(--tag-success-bg)',
                badgeBorder: 'var(--tag-success-border)',
                badgeColor: 'var(--tag-success-ink)',
                summary: op.name + ' despachou formalmente a proposta executiva de realocação de verba para Marcos Silva com commit auditado no SQLite.',
                target: 'Proposta Operacional · Marcos Silva',
                timestamp: nowStr,
                provenance: 'Governança da Conta'
              });
            }
          }

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
              isDelegated: Boolean(sessionState.delegation?.isDelegated || isDirectDispatch),
              delegatedTo: sessionState.delegation?.delegatedTo || (isDirectDispatch ? 'Marcos Silva' : undefined),
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

          scrollChatToBottom(true);

          const reasoningCard = document.getElementById('reasoning-card-' + turnId);
          if (reasoningCard) reasoningCard.style.display = 'block';
          const reasoningContent = document.getElementById('reasoning-content-' + turnId);
          if (reasoningContent) reasoningContent.style.display = 'flex';
          const stepsStream = document.getElementById('steps-stream-' + turnId);
          if (stepsStream) stepsStream.style.display = 'flex';

          const mapping = getStageCardMapping(goalVal, sessionState.scenario);
          applyStageContentUpdates(goalVal, sessionState.scenario);

          await delay(300);
          setFlowStep(1);
          if (stepR1) stepR1.style.display = 'flex';
          scrollChatToBottom(true);

          await delay(450);
          setFlowStep(2);
          if (stepT1) stepT1.style.display = 'flex';
          setStageState({ selectedCards: mapping.t1Selected, observedCards: mapping.t1Observed, isFinal: false });
          scrollChatToBottom(true);

          await delay(400);
          setFlowStep(3);
          if (stepR2) stepR2.style.display = 'flex';
          scrollChatToBottom(true);

          await delay(450);
          setFlowStep(4);
          if (stepT2) stepT2.style.display = 'flex';
          setStageState({ selectedCards: mapping.t2Selected, observedCards: mapping.t2Observed, isFinal: false });
          scrollChatToBottom(true);

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
            scrollChatToBottom(true);
            return;
          }

          sessionState.activeRunId = runRecord.runId;
          sessionState.activeContract = contract;

          const structured = runRecord.structuredAnswer || {};
          const isRealCommit = Boolean(runRecord.isAtomicCommit || structured.isAtomicCommit || isDirectDispatch);
          const structuredAnswer = {
            question: structured.question || goalVal,
            conclusion: structured.conclusion || runRecord.finalOutput || 'Diagnóstico concluído com sucesso.',
            limitations: structured.limitations || [],
            evidenceRefs: structured.evidenceRefs || [],
            status: structured.status || (isRealCommit ? 'COMMITTED' : (runRecord.status || 'COMPLETED')),
            verified: Boolean(runRecord.verified !== undefined ? runRecord.verified : structured.verified),
            isAtomicCommit: isRealCommit
          };

          renderTurnStructuredAnswer(turnId, structuredAnswer, goalVal);
          sessionState.chatHistory.push({ role: 'assistant', content: structuredAnswer.conclusion });

          if (runRecord.trace && runRecord.trace.length > 0) {
            renderTrajectoryEvents(runRecord.trace);
            renderTrajectoryMetrics(runRecord.metrics);
          }

          inspectItem('Contrato da Tarefa (' + contract.taskId + ')', contract);

          setExecutionActive(false);
          scrollChatToBottom(true);
        } catch (err) {
          console.error('[AdzHub UI] Erro ao executar tarefa:', err);
          const errAnswer = { question: goalVal, conclusion: '❌ Falha de rede ou conexão ao orquestrar tarefa.', limitations: ['Verifique se o servidor backend está online e se a chave de API está correta.'], status: 'FAILED', verified: false };
          renderTurnStructuredAnswer(turnId, errAnswer, goalVal);
          sessionState.chatHistory.push({ role: 'assistant', content: errAnswer.conclusion });
          setExecutionActive(false);
          scrollChatToBottom(true);
        }
      }

      window._executeCurrentRun = executeCurrentRun;

      async function executeComparison(userGoal) {
        if (!userGoal) return;
        if (comparisonPromptStep) comparisonPromptStep.style.display = 'none';
        if (comparisonLoading) comparisonLoading.style.display = 'flex';
        if (comparisonResults) comparisonResults.style.display = 'none';

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
      }

      btnCompare?.addEventListener('click', () => {
        if (comparisonModal) comparisonModal.style.display = 'flex';

        let userGoal = '';
        if (Array.isArray(sessionState.chatHistory)) {
          for (let i = sessionState.chatHistory.length - 1; i >= 0; i--) {
            if (sessionState.chatHistory[i]?.role === 'user' && sessionState.chatHistory[i]?.content) {
              const c = sessionState.chatHistory[i].content.trim();
              if (c) {
                userGoal = c;
                break;
              }
            }
          }
        }
        if (!userGoal) userGoal = (interactiveInput?.value || goalInput?.value || '').trim();

        if (userGoal) {
          executeComparison(userGoal);
        } else {
          // Nenhum prompt no chat nem no input: exibe a etapa de solicitação de prompt no modal
          if (comparisonLoading) comparisonLoading.style.display = 'none';
          if (comparisonResults) comparisonResults.style.display = 'none';
          if (comparisonPromptStep) comparisonPromptStep.style.display = 'block';
          if (comparisonPromptInput) {
            comparisonPromptInput.value = '';
            comparisonPromptInput.style.borderColor = 'var(--line)';
            setTimeout(() => comparisonPromptInput.focus(), 60);
          }
        }
      });

      btnStartComparisonPrompt?.addEventListener('click', () => {
        const customPrompt = (comparisonPromptInput?.value || '').trim();
        if (!customPrompt) {
          if (comparisonPromptInput) {
            comparisonPromptInput.style.borderColor = 'var(--danger)';
            comparisonPromptInput.focus();
          }
          return;
        }
        executeComparison(customPrompt);
      });

      btnCancelComparisonPrompt?.addEventListener('click', () => {
        if (comparisonModal) comparisonModal.style.display = 'none';
      });

      btnRecompare?.addEventListener('click', () => {
        if (comparisonResults) comparisonResults.style.display = 'none';
        if (comparisonLoading) comparisonLoading.style.display = 'none';
        if (comparisonPromptStep) comparisonPromptStep.style.display = 'block';
        if (comparisonPromptInput) {
          comparisonPromptInput.style.borderColor = 'var(--line)';
          setTimeout(() => comparisonPromptInput.focus(), 60);
        }
      });

      document.querySelectorAll('.comparison-suggestion-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
          const prompt = chip.getAttribute('data-prompt');
          if (prompt && comparisonPromptInput) {
            comparisonPromptInput.value = prompt;
            comparisonPromptInput.style.borderColor = 'var(--adzhub-blue)';
            comparisonPromptInput.focus();
          }
        });
      });

      comparisonPromptInput?.addEventListener('input', () => {
        if (comparisonPromptInput.value.trim()) {
          comparisonPromptInput.style.borderColor = 'var(--line)';
        }
      });

      comparisonPromptInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          btnStartComparisonPrompt?.click();
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
              '<div style="font-family: var(--font-mono); font-size: var(--micro); color: var(--adzhub-blue); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Prompt Avaliado na Comparação (Última Mensagem):</div>' +
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
        openSupercerebroModal();
        inspectItem('Supercérebro — Memória & Governança', {
          stakeholders: [
            { name: 'Aline Rocha', role: 'Gestora de Tráfego SPOT', domain: 'Meta Ads' },
            { name: 'Marcos Silva', role: 'Head de Marketing Housewhey', domain: 'Aprovações & Diretrizes' }
          ],
          governancePolicy: 'Escrita externa no Meta Ads exige aprovação formal expressa.',
          productStandards: ['100% Glanbia Grass-Fed', 'Creatina Creapure Alemã', 'Ômega 3 IFOS 5★']
        }, 'supercerebro_memory');
      });

      // ==========================================
      // Supercérebro Graph Visualizer Engine (HTML5 Canvas)
      // ==========================================
      const supercerebroModal = document.getElementById('supercerebro-modal');
      const btnRailSupercerebro = document.getElementById('btn-rail-supercerebro');
      const btnCloseSupercerebro = document.getElementById('btn-close-supercerebro');
      const btnRefreshGraph = document.getElementById('btn-refresh-graph');
      const graphCanvas = document.getElementById('supercerebro-canvas');
      const graphWrapper = document.getElementById('graph-canvas-wrapper');
      const graphNodeCountEl = document.getElementById('graph-node-count');
      const graphEdgeCountEl = document.getElementById('graph-edge-count');
      const graphEventCountEl = document.getElementById('graph-event-count');
      const detailNodeTypeBadge = document.getElementById('detail-node-type-badge');
      const detailNodeContent = document.getElementById('detail-node-content');

      const DEFAULT_SUPERCEREBRO_NODES = [
        { id: 'client_housewhey_spot', type: 'organization', label: 'Housewhey & SPOT', props: { marketSegment: 'Suplementos Premium', coreOffer: 'Whey Isolado Grass-Fed' } },
        { id: 'meta_ad_acc_spot_01', type: 'meta_ad_account', label: 'Meta Ads Account (SPOT)', props: { currency: 'BRL', status: 'ACTIVE' } },
        { id: 'cmp_whey_baunilha_01', type: 'campaign', label: 'Whey Isolado Baunilha (CPA R$ 48)', props: { budget: 2450, cpa: 48.0 } },
        { id: 'ad_whey_sabores_04', type: 'ad', label: 'UGC - Oferta A (Whey)', props: { cpa: 94.5, ctr: 1.2, recommendation: 'PAUSAR' } },
        { id: 'ad_whey_baunilha_01', type: 'ad', label: 'Hook Prova Social (Campeão)', props: { cpa: 42.1, ctr: 2.8, recommendation: 'ESCALAR' } },
        { id: 'offer_whey_isolado', type: 'offer', label: 'Whey Isolado 900g Glanbia', props: { price: 240.0 } },
        { id: 'p_aline', type: 'operator', label: 'Aline Rocha (SPOT)', props: { role: 'Gestora de Tráfego' } },
        { id: 'p_marcos', type: 'operator', label: 'Marcos Silva (Housewhey)', props: { role: 'Head de Marketing' } },
        { id: 'p_carolina', type: 'operator', label: 'Carolina Mendes (SPOT)', props: { role: 'Gerente de Contas' } },
        {
          id: 'pendency_pause_ad',
          type: 'pendency',
          label: 'Pendência: Pausar Criativos Fracos',
          props: {
            operador_responsavel: 'Carolina Mendes (SPOT)',
            motivo_pendencia: 'Aguardando proposta formal de outro operador (Carolina Mendes)',
            status: 'Aguardando Aprovação de Proposta',
            target_ad: 'ad_whey_sabores_04',
            cpa_brl: 'R$ 94,50'
          }
        }
      ];

      const DEFAULT_SUPERCEREBRO_EDGES = [
        { id: 'e1', source: 'client_housewhey_spot', target: 'meta_ad_acc_spot_01', relationship: 'POSSUI' },
        { id: 'e2', source: 'meta_ad_acc_spot_01', target: 'cmp_whey_baunilha_01', relationship: 'RODA' },
        { id: 'e3', source: 'cmp_whey_baunilha_01', target: 'ad_whey_sabores_04', relationship: 'CONTÉM' },
        { id: 'e4', source: 'cmp_whey_baunilha_01', target: 'ad_whey_baunilha_01', relationship: 'CONTÉM' },
        { id: 'e5', source: 'client_housewhey_spot', target: 'offer_whey_isolado', relationship: 'OFERECE' },
        { id: 'e6', source: 'p_aline', target: 'client_housewhey_spot', relationship: 'GERENCIA' },
        { id: 'e7', source: 'p_marcos', target: 'client_housewhey_spot', relationship: 'APROVA' },
        { id: 'e9', source: 'ad_whey_sabores_04', target: 'pendency_pause_ad', relationship: 'GEROU_PENDENCIA' },
        { id: 'e10', source: 'p_carolina', target: 'pendency_pause_ad', relationship: 'PROPOS' }
      ];

      const DEFAULT_SUPERCEREBRO_EVENTS = [
        { id: 'ev1', title: 'Auditoria de Criativos', summary: 'UGC Oferta A com CPA elevado de R$ 94,50.', relatedNodeIds: ['ad_whey_sabores_04', 'pendency_pause_ad'] },
        { id: 'ev2', title: 'Aprovação de Proposta', summary: 'Carolina Mendes enviou proposta formal de pausa.', relatedNodeIds: ['p_carolina', 'pendency_pause_ad'] }
      ];

      let graphState = {
        nodes: JSON.parse(JSON.stringify(DEFAULT_SUPERCEREBRO_NODES)),
        edges: JSON.parse(JSON.stringify(DEFAULT_SUPERCEREBRO_EDGES)),
        events: JSON.parse(JSON.stringify(DEFAULT_SUPERCEREBRO_EVENTS)),
        filter: 'all',
        selectedNodeId: null,
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
        isDraggingCanvas: false,
        dragStartX: 0,
        dragStartY: 0,
        draggedNode: null
      };

      const NODE_TYPE_STYLES = {
        organization: { color: '#294A91', label: 'Cliente / Organização', radius: 22 },
        client: { color: '#294A91', label: 'Cliente / Organização', radius: 22 },
        hub: { color: '#294A91', label: 'Cliente / Organização', radius: 22 },

        meta_ad_account: { color: '#F59A19', label: 'Conta Meta Ads', radius: 20 },
        channel: { color: '#F59A19', label: 'Canal / Plataforma', radius: 20 },

        campaign: { color: '#53B58A', label: 'Campanha', radius: 18 },
        adset: { color: '#53B58A', label: 'Conjunto de Anúncios', radius: 16 },
        ad: { color: '#53B58A', label: 'Anúncio', radius: 14 },
        offer: { color: '#53B58A', label: 'Oferta / Produto', radius: 18 },
        creative: { color: '#53B58A', label: 'Criativo', radius: 16 },
        metric: { color: '#53B58A', label: 'Métrica', radius: 14 },
        asset: { color: '#53B58A', label: 'Ativo de Mídia', radius: 15 },

        operator: { color: '#8C75B5', label: 'Operador', radius: 18 },
        person: { color: '#8C75B5', label: 'Operador', radius: 18 },

        rule: { color: '#D96C6C', label: 'Regra de Governança', radius: 16 },
        pendency: { color: '#D96C6C', label: 'Pendência', radius: 18 },
        event: { color: '#D96C6C', label: 'Evento', radius: 16 },
        proposal: { color: '#D96C6C', label: 'Proposta', radius: 16 },
        task: { color: '#D96C6C', label: 'Tarefa Pendente', radius: 16 }
      };

      const EDGE_RELATIONSHIP_LABELS_PT = {
        PUBLISHED_ON: 'VEICULADO EM',
        EXECUTES: 'EXECUTA',
        OPERATES: 'OPERA',
        MEMBER_OF: 'MEMBRO DE',
        APPROVES: 'APROVA',
        MANAGES: 'GERENCIA',
        HAS: 'POSSUI',
        CONTAINS: 'CONTÉM',
        RUNS: 'RODA',
        OFFERS: 'OFERECE',
        APPLIES: 'APLICA',
        GENERATED_PENDENCY: 'GEROU PENDÊNCIA',
        GEROU_PENDENCIA: 'GEROU PENDÊNCIA'
      };

      function getPtRelationshipLabel(rel) {
        if (!rel) return '';
        const key = String(rel).trim().toUpperCase();
        return EDGE_RELATIONSHIP_LABELS_PT[key] || String(rel).replace(/_/g, ' ');
      }

      function getNodeStyle(type) {
        return NODE_TYPE_STYLES[type] || { color: '#53B58A', label: type, radius: 15 };
      }

      function initGraphPositions(nodes, force = false) {
        if (!Array.isArray(nodes)) return;
        nodes.forEach((node, idx) => {
          if (force || node.relX === undefined || node.relY === undefined) {
            if (node.type === 'organization' || node.type === 'client' || idx === 0) {
              node.relX = 0;
              node.relY = 0;
            } else {
              const angle = (idx / (nodes.length - 1 || 1)) * Math.PI * 2;
              const radius = 150 + (idx % 3) * 45;
              node.relX = Math.cos(angle) * radius;
              node.relY = Math.sin(angle) * radius;
            }
          }
        });
      }

      function renderCanvasGraph() {
        if (!graphCanvas || !graphWrapper) return;
        const ctx = graphCanvas.getContext('2d');
        if (!ctx) return;

        const rect = graphWrapper.getBoundingClientRect();
        const width = rect.width > 50 ? rect.width : (graphWrapper.clientWidth || 800);
        const height = rect.height > 50 ? rect.height : (graphWrapper.clientHeight || 550);
        const dpr = window.devicePixelRatio || 1;

        if (graphCanvas.width !== Math.round(width * dpr) || graphCanvas.height !== Math.round(height * dpr)) {
          graphCanvas.width = Math.round(width * dpr);
          graphCanvas.height = Math.round(height * dpr);
          graphCanvas.style.width = width + 'px';
          graphCanvas.style.height = height + 'px';
        }

        const centerX = width / 2;
        const centerY = height / 2;

        ctx.save();
        ctx.scale(dpr, dpr);

        ctx.fillStyle = '#F8F8F7';
        ctx.fillRect(0, 0, width, height);

        ctx.translate(graphState.offsetX, graphState.offsetY);
        ctx.scale(graphState.zoom, graphState.zoom);

        // Posiciona nós de forma dinâmica em torno do centro real do canvas
        graphState.nodes.forEach(node => {
          if (!node.isUserDragged) {
            node.x = centerX + (node.relX !== undefined ? node.relX : 0);
            node.y = centerY + (node.relY !== undefined ? node.relY : 0);
          }
        });

        const nodeMap = new Map();
        graphState.nodes.forEach(n => nodeMap.set(n.id, n));

        const filter = graphState.filter;
        const selId = graphState.selectedNodeId;

        const matchesCategoryFilter = (n) => {
          if (n.type === 'rule' || n.id === 'rule_governance_jit') return false; // Regras de governança ocultadas do grafo
          if (filter === 'all') return true;
          if (filter === 'organizations') return ['organization', 'client', 'hub'].includes(n.type);
          if (filter === 'meta_ads') return ['meta_ad_account', 'channel'].includes(n.type);
          if (filter === 'creatives') return ['campaign', 'adset', 'ad', 'offer', 'creative', 'metric', 'asset'].includes(n.type);
          if (filter === 'operators') return ['operator', 'person'].includes(n.type);
          if (filter === 'pendencies') {
            if (['pendency', 'event', 'proposal', 'task'].includes(n.type)) return true;
            if (n.id === 'pendency_pause_ad') return true;
            if (n.props && (n.props.status === 'PENDING_PROPOSAL' || n.props.recommendation === 'PAUSAR' || n.props.status === 'PENDING')) return true;
            const hasPendencyConn = graphState.edges.some(e =>
              (e.source === n.id || e.target === n.id) &&
              (e.relationship === 'GEROU_PENDENCIA' || e.relationship === 'GENERATED_PENDENCY' || e.relationship === 'PROPOS')
            );
            return hasPendencyConn;
          }
          return true;
        };

        const isNodeVisible = (n) => {
          if (n.type === 'rule' || n.id === 'rule_governance_jit') return false;
          const isCategoryMatch = matchesCategoryFilter(n);
          if (!selId) return isCategoryMatch;
          if (n.id === selId) return true;
          const isNeighbor = graphState.edges.some(
            e => (e.source === selId && e.target === n.id) || (e.target === selId && e.source === n.id)
          );
          return isCategoryMatch || isNeighbor;
        };

        graphState.edges.forEach(edge => {
          const source = nodeMap.get(edge.source);
          const target = nodeMap.get(edge.target);
          if (source && target && isNodeVisible(source) && isNodeVisible(target)) {
            const isSelected = graphState.selectedNodeId === source.id || graphState.selectedNodeId === target.id;

            ctx.beginPath();
            ctx.moveTo(source.x, source.y);
            ctx.lineTo(target.x, target.y);
            ctx.strokeStyle = isSelected ? '#294A91' : 'rgba(124, 132, 144, 0.5)';
            ctx.lineWidth = isSelected ? 2.5 : 1.5;
            ctx.stroke();

            const midX = (source.x + target.x) / 2;
            const midY = (source.y + target.y) / 2;
            ctx.font = '600 10px IBM Plex Mono, monospace';
            ctx.fillStyle = isSelected ? '#223B78' : '#5A6372';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(getPtRelationshipLabel(edge.relationship), midX, midY - 6);
          }
        });

        graphState.nodes.forEach(node => {
          if (!isNodeVisible(node)) return;

          const style = getNodeStyle(node.type);
          const isSelected = graphState.selectedNodeId === node.id;
          const r = style.radius;

          if (isSelected) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, r + 6, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(41, 74, 145, 0.2)';
            ctx.fill();
            ctx.strokeStyle = '#294A91';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
          ctx.fillStyle = style.color;
          ctx.fill();
          ctx.strokeStyle = isSelected ? '#263142' : '#FFFFFF';
          ctx.lineWidth = isSelected ? 3 : 2;
          ctx.stroke();

          ctx.font = (isSelected ? '700' : '600') + ' 11px Inter, sans-serif';
          ctx.fillStyle = isSelected ? '#1E293B' : '#39404C';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(node.label, node.x, node.y + r + 5);
        });

        ctx.restore();
      }

      function updateGraphStats() {
        if (graphNodeCountEl) graphNodeCountEl.textContent = 'Nós: ' + graphState.nodes.filter(n => n.type !== 'rule').length;
        if (graphEdgeCountEl) graphEdgeCountEl.textContent = 'Conexões: ' + graphState.edges.length;
        if (graphEventCountEl) graphEventCountEl.textContent = 'Linha do Tempo: ' + graphState.events.length;
      }

      function selectGraphNode(node) {
        graphState.selectedNodeId = node ? node.id : null;
        renderCanvasGraph();

        if (!detailNodeContent) return;

        if (!node) {
          if (detailNodeTypeBadge) detailNodeTypeBadge.textContent = 'Clique em um Nó';
          detailNodeContent.innerHTML = 'Selecione um nó no grafo à esquerda para examinar suas conexões, propriedades e eventos da linha do tempo.';
          return;
        }

        const style = getNodeStyle(node.type);
        if (detailNodeTypeBadge) detailNodeTypeBadge.textContent = style.label;

        const relatedEdges = graphState.edges.filter(e => e.source === node.id || e.target === node.id);
        const relatedEvents = graphState.events.filter(ev => ev.relatedNodeIds && ev.relatedNodeIds.includes(node.id));

        let pendencyBox = '';
        if (node.type === 'pendency' || node.props?.motivo_pendencia) {
          const resp = node.props?.operador_responsavel || 'Carolina Mendes (SPOT)';
          const motivo = node.props?.motivo_pendencia || 'Aguardando proposta formal de outro operador (Carolina Mendes)';
          pendencyBox =
            '<div style="background: var(--surface-soft); border: 1px solid var(--warning); border-left: 3px solid var(--warning); border-radius: var(--radius-control); padding: 10px 12px; margin-top: 8px; font-size: var(--micro);">' +
              '<div style="margin-bottom: 6px;"><strong style="color: #7D631E;">👤 Operador Responsável:</strong><br/><span style="color: var(--ink-strong); font-weight: 600; font-size: var(--body); display: block; margin-top: 2px;">' + escapeHtml(resp) + '</span></div>' +
              '<div><strong style="color: #7D631E;">⚠️ Motivo da Pendência:</strong><br/><span style="color: var(--ink-strong); font-size: var(--body); line-height: 1.4; display: block; margin-top: 2px;">' + escapeHtml(motivo) + '</span></div>' +
            '</div>';
        }

        let propsHtml = '';
        if (node.props && Object.keys(node.props).length > 0) {
          propsHtml = '<div style="background: var(--surface-soft); border: 1px solid var(--line); border-radius: var(--radius-control); padding: 8px 10px; font-family: var(--font-mono); font-size: var(--micro); margin-top: 6px; max-height: 140px; overflow-y: auto; color: var(--ink-strong);">' +
            Object.entries(node.props).map(([k, v]) => '<div><strong style="color: var(--navy-ink);">' + k + ':</strong> ' + (typeof v === 'object' ? JSON.stringify(v) : v) + '</div>').join('') +
          '</div>';
        }

        let edgesHtml = '';
        if (relatedEdges.length > 0) {
          edgesHtml = '<div style="margin-top: 8px;"><strong style="font-size: var(--micro); color: var(--ink-muted); text-transform: uppercase; font-family: var(--font-mono);">Conexões (' + relatedEdges.length + '):</strong><ul style="padding-left: 16px; margin-top: 4px; font-size: var(--body); color: var(--ink-strong);">' +
            relatedEdges.map(e => '<li><span style="color: var(--navy); font-weight: 600;">' + e.relationship + '</span> → ' + (e.source === node.id ? e.target : e.source) + '</li>').join('') +
          '</ul></div>';
        }

        let eventsHtml = '';
        if (relatedEvents.length > 0) {
          eventsHtml = '<div style="margin-top: 8px;"><strong style="font-size: var(--micro); color: var(--ink-muted); text-transform: uppercase; font-family: var(--font-mono);">Linha do Tempo (' + relatedEvents.length + '):</strong><div style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px;">' +
            relatedEvents.map(ev => '<div style="background: var(--surface-soft); border-left: 3px solid var(--green); padding: 6px 8px; font-size: var(--micro); border-radius: var(--radius-micro); border: 1px solid var(--line);"><strong style="color: var(--ink-strong);">' + ev.title + '</strong><br/><span style="color: var(--ink-muted);">' + ev.summary + '</span></div>').join('') +
          '</div></div>';
        }

        const sourceStr = node.provenance ? node.provenance.source : 'supercerebro_graph';
        detailNodeContent.innerHTML =
          '<div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 14px; color: var(--ink-strong); font-family: var(--font-display);">' +
            '<span style="width: 10px; height: 10px; border-radius: 50%; background: ' + style.color + '; display: inline-block; flex-shrink: 0;"></span>' +
            '<span>' + escapeHtml(node.label) + '</span>' +
          '</div>' +
          '<div style="font-family: var(--font-mono); font-size: var(--micro); color: var(--ink-muted); margin-top: 2px;">ID: ' + node.id + '</div>' +
          '<div style="margin-top: 6px; font-size: var(--body); color: var(--ink);">Proveniência: <code style="color: var(--green); font-weight: 600;">' + sourceStr + '</code></div>' +
          pendencyBox +
          propsHtml +
          edgesHtml +
          eventsHtml;
      }

      async function fetchAndRenderSupercerebroGraph() {
        try {
          const res = await fetch('/api/supercerebro/graph');
          if (res.ok) {
            const data = await res.json();
            const newNodes = data.nodes || [];
            const newEdges = data.edges || [];
            const newEvents = data.events || [];

            const prevMap = new Map();
            graphState.nodes.forEach(n => prevMap.set(n.id, n));

            newNodes.forEach(n => {
              const prev = prevMap.get(n.id);
              if (prev && prev.isUserDragged) {
                n.isUserDragged = true;
                n.relX = prev.relX;
                n.relY = prev.relY;
              }
            });

            graphState.nodes = newNodes;
            graphState.edges = newEdges;
            graphState.events = newEvents;

            const hasPendencyNode = graphState.nodes.some(n => n.type === 'pendency' || n.id === 'pendency_pause_ad');
            if (!hasPendencyNode) {
              graphState.nodes.push(
                {
                  id: 'pendency_pause_ad',
                  type: 'pendency',
                  label: 'Pendência: Pausar Criativos Fracos',
                  props: {
                    operador_responsavel: 'Carolina Mendes (SPOT)',
                    motivo_pendencia: 'Aguardando proposta formal de outro operador (Carolina Mendes)',
                    status: 'Aguardando Aprovação de Proposta',
                    target_ad: 'ad_whey_sabores_04',
                    cpa_brl: 'R$ 94,50'
                  }
                }
              );
              const targetNode = graphState.nodes.find(n => n.id === 'asset_ad_04' || n.id === 'ad_whey_sabores_04' || n.type === 'asset' || n.type === 'ad');
              const targetId = targetNode ? targetNode.id : 'cli_housewhey';
              graphState.edges.push(
                { id: 'edge_pendency_pause', source: targetId, target: 'pendency_pause_ad', relationship: 'GEROU_PENDENCIA' },
                { id: 'edge_propos_pendency', source: 'p_carolina', target: 'pendency_pause_ad', relationship: 'PROPOS' }
              );
            } else {
              const pendNode = graphState.nodes.find(n => n.type === 'pendency' || n.id === 'pendency_pause_ad');
              if (pendNode) {
                pendNode.props = pendNode.props || {};
                pendNode.props.operador_responsavel = pendNode.props.operador_responsavel || 'Carolina Mendes (SPOT)';
                pendNode.props.motivo_pendencia = pendNode.props.motivo_pendencia || 'Aguardando proposta formal de outro operador (Carolina Mendes)';
              }
            }

            if (!graphState.events || graphState.events.length === 0) {
              graphState.events = [
                { id: 'ev1', title: 'Auditoria de Criativos', summary: 'UGC Oferta A com CPA elevado de R$ 94,50.', relatedNodeIds: ['asset_ad_04', 'ad_whey_sabores_04', 'pendency_pause_ad'] },
                { id: 'ev2', title: 'Aprovação de Proposta', summary: 'Carolina Mendes enviou proposta formal de pausa.', relatedNodeIds: ['p_carolina', 'pendency_pause_ad'] }
              ];
            }

            initGraphPositions(graphState.nodes);
            updateGraphStats();
            renderCanvasGraph();
            return;
          }
        } catch (e) {
          console.warn('[Supercerebro] API fetch fallback to embedded dataset', e);
        }

        initGraphPositions(graphState.nodes);
        updateGraphStats();
        renderCanvasGraph();
      }

      function openSupercerebroModal() {
        switchView('supercerebro');
      }

      function closeSupercerebroModal() {
        switchView('chat');
      }

      // ==========================================
      // Central de Documentos & Artefatos Gerados
      // ==========================================
      const documentsModal = document.getElementById('documents-modal');
      const btnCloseDocuments = document.getElementById('btn-close-documents');

      let currentDocFilter = 'all';
      let currentSelectedDocId = null;

      const INITIAL_DOCUMENTS = [
        {
          id: 'doc-briefing-q3',
          type: 'briefing',
          typeName: 'Briefing',
          badgeBg: 'var(--tag-info-bg)',
          badgeBorder: 'var(--tag-info-border)',
          badgeColor: 'var(--tag-info-ink)',
          title: 'Briefing de Campanha: Lançamento Whey Isolar HouseWhey Q3',
          date: '27/08/2026 09:30',
          author: 'Aline Santos & Agente AdzHub',
          status: 'Aprovado por: Marcos Silva',
          summary: 'Briefing estratégico de mídia para expansão da linha Whey Isolate no público Fitness Premium. Definição de público, budget e metas de CPA.',
          content: [
            '# Briefing de Campanha: Lançamento Whey Isolar HouseWhey Q3',
            '',
            '**Cliente:** HouseWhey (SPOT Mídia & Governança)',
            '**Data de Criação:** 27/08/2026 09:30',
            '**Responsável Operacional:** Aline Santos & Agente AdzHub',
            '**Status:** Aprovado por: Marcos Silva (Head de Marketing)',
            '',
            '---',
            '',
            '### 1. Visão Geral & Objetivos',
            '- **Objetivo Primário:** Aquisição de novos clientes e escala de vendas diretas e-commerce.',
            '- **Linha de Produto:** Whey Protein Isolado (Sabores Baunilha, Chocolate Belga e Morango).',
            '- **Meta de CPA:** R$ 35,00 por compra.',
            '- **Orçamento Diário de Mídia:** R$ 1.500,00/dia.',
            '',
            '### 2. Público-Alvo & Persona',
            '- **Faixa Etária:** 25 a 45 anos (Homens e Mulheres).',
            '- **Interesses:** Musculação, Crossfit, Nutrição Esportiva, Vida Saudável.',
            '- **Comportamento:** Compradores frequentes e-commerce via smartphone (iOS/Android).',
            '',
            '### 3. Diretrizes de Mensagem & Copys',
            '- **Hook Principal:** "O sabor e a pureza que seu treino de alta performance exige."',
            '- **Pilares de Comunicação:** Zero lactose, 27g de proteína por dose, adoçado naturally com estévia.',
            '- **Chamada para Ação (CTA):** Garanta o seu com Frete Grátis acima de R$ 199.',
            '',
            '### 4. Canais & Formatos',
            '- **Meta Ads:** Feed Reels, Instagram Stories (Vídeos UGC 9:16)',
            '- **TikTok Ads:** In-Feed Native Video (Foco em entretenimento educativo)'
          ].join(String.fromCharCode(10))
        },
        {
          id: 'doc-pauta-ugc-01',
          type: 'pauta',
          typeName: 'Pauta & UGC',
          badgeBg: 'var(--tag-neutral-bg)',
          badgeBorder: 'var(--tag-neutral-border)',
          badgeColor: 'var(--tag-neutral-ink)',
          title: 'Pauta UGC Criativos TikTok/Reels: 5 Variações de Hook Alta Conversão',
          date: '27/08/2026 10:15',
          author: 'Luiza Valente (Atendimento & Vendas)',
          status: 'Em Produção',
          summary: 'Roteiros práticos para gravação de criativos UGC. Contém 5 hooks de atração, roteiro de prova social e estrutura de encerramento com oferta.',
          content: [
            '# Pauta de Conteúdo UGC & Roteiros de Vídeo',
            '',
            '**Projeto:** HouseWhey Fitness',
            '**Elaborado por:** Luiza Valente',
            '**Foco:** Anúncios de Vídeo Curto (Reels / TikTok / Shorts)',
            '',
            '---',
            '',
            '### Roteiro 1: "O Maior Erro no Pós-Treino" (Hook Curiosidade)',
            '- **00s - 03s (Hook):** "Se você toma Whey depois do treino e sente estufamento, você está cometendo ESSE erro aqui..."',
            '- **03s - 12s (Problema/Solução):** "A maioria dos wheys usa adoçante artificial barato. O Whey Isolar da HouseWhey usa pureza máxima e adoçantes naturais."',
            '- **12s - 20s (Demonstração):** Gravação do pó misturando instantaneamente na coqueteleira sem empelotar.',
            '- **20s - 30s (CTA):** "Clique no link e use o cupom BEMVINDO10 na sua primeira compra!"',
            '',
            '---',
            '',
            '### Roteiro 2: "Taste Test Blind Test" (Hook Desafio)',
            '- **00s - 04s (Hook):** "Coloquei meu namorado pra adivinhar qual Whey era de R$ 300 e qual era da HouseWhey..."',
            '- **04s - 18s (Reação):** Reação espontânea ao provar o sabor Chocolate Belga.',
            '- **18s - 30s (CTA):** "Acesse o site e descubra porque é o mais elogiado do Brasil."'
          ].join(String.fromCharCode(10))
        },
        {
          id: 'doc-relatorio-cpa-01',
          type: 'relatorio',
          typeName: 'Relatório',
          badgeBg: 'var(--tag-success-bg)',
          badgeBorder: 'var(--tag-success-border)',
          badgeColor: 'var(--tag-success-ink)',
          title: 'Relatório de Auditoria: Performance CPA & Atribuição no Meta Ads',
          date: '27/08/2026 11:00',
          author: 'Marcos Silva (Head de Marketing)',
          status: 'Auditado por: Marcos Silva',
          summary: 'Relatório analítico de performance das campanhas ativas. Destaque para variação de CPA e identificação de criativos fora de tolerância.',
          content: [
            '# Relatório de Auditoria Operacional de Mídia',
            '',
            '**Conta:** HouseWhey SPOT Mídia',
            '**Período de Análise:** Últimos 7 dias',
            '**Auditor:** Marcos Silva (Head de Marketing)',
            '',
            '---',
            '',
            '### Métricas Consolidadas da Conta',
            '- **Investimento Total:** R$ 10.500,00',
            '- **Retorno Geral (ROAS):** 3.82x',
            '- **CPA Médio da Conta:** R$ 38,40 (Meta: R$ 35,00)',
            '',
            '### Diagnóstico por Conjunto de Anúncios',
            '1. **AdSet_Whey_Baunilha_01:**',
            '   - Investimento: R$ 4.200,00 | Vendas: 132 | CPA: R$ 31,80 (Aprovado)',
            '2. **AdSet_Whey_Sabores_04 (ad_04):**',
            '   - Investimento: R$ 2.835,00 | Vendas: 30 | CPA: R$ 94,50 (Alerta Crítico)',
            '',
            '### Recomendação',
            '- Recomenda-se a **pausa imediata do criativo ad_04** e reatribuição da verba excedente (R$ 450,00/dia) para os anúncios campeões.'
          ].join(String.fromCharCode(10))
        },
        {
          id: 'doc-proposta-jit-01',
          type: 'proposta',
          typeName: 'Proposta',
          badgeBg: 'var(--tag-warning-bg)',
          badgeBorder: 'var(--tag-warning-border)',
          badgeColor: 'var(--tag-warning-ink)',
          title: 'Proposta: Pausa do Anúncio ad_04 e Realocação para Criativo Campeão',
          date: '27/08/2026 11:45',
          author: 'Carolina Mendes (Mídia & Governança)',
          status: 'Aguardando Aprovação: Marcos Silva',
          summary: 'Proposta formal de alteração operacional para controle de desperdício em anúncios de baixo rendimento.',
          content: [
            '# Proposta Operacional de Mídia',
            '',
            '**ID da Proposta:** PROP-2026-0827-04',
            '**Solicitante:** Carolina Mendes',
            '**Aprovação Esperada:** Marcos Silva (Head de Marketing)',
            '',
            '---',
            '',
            '### Ação Solicitada',
            '1. Pausar status do anúncio ID asset_ad_04 na API Meta Ads.',
            '2. Migrar orçamento diário de R$ 450,00 para ad_whey_baunilha_01.',
            '',
            '### Justificativa Técnica',
            'O anúncio asset_ad_04 acumulou CPA de R$ 94,50 nas últimas 48h, ultrapassando a margem de tolerância estabelecida para a conta.'
          ].join(String.fromCharCode(10))
        },
        {
          id: 'doc-plano-escala-01',
          type: 'plano',
          typeName: 'Plano de Ação',
          badgeBg: 'var(--tag-neutral-bg)',
          badgeBorder: 'var(--tag-neutral-border)',
          badgeColor: 'var(--tag-neutral-ink)',
          title: 'Plano de Escala de Mídia: Distribuição Regional H2',
          date: '26/08/2026 16:20',
          author: 'Agente AdzHub',
          status: 'Aprovado por: Marcos Silva',
          summary: 'Planejamento de expansão orçamentária por fases com travas de segurança de CPA e limites automáticos de gasto diário.',
          content: [
            '# Plano de Ação & Escala Governada H2',
            '',
            '**Escopo:** Expansão de Vendas Região Sul e Sudeste',
            '**Orquestrador:** Supercérebro IA',
            '',
            '---',
            '',
            '### Fase 1: Validação de Públicos (Semanas 1-2)',
            '- Testes A/B de criativos de alta velocidade.',
            '- Budget máximo por teste: R$ 200,00.',
            '',
            '### Fase 2: Escala Vertical (Semanas 3-4)',
            '- Aumento progressivo de +20% a cada 48h condicionada ao ROAS >= 3.5x.'
          ].join(String.fromCharCode(10))
        }
      ];

      const documentsList = [...INITIAL_DOCUMENTS];

      function updateDocCounts() {
        const counts = { all: documentsList.length, briefing: 0, pauta: 0, relatorio: 0, proposta: 0, plano: 0 };
        documentsList.forEach(d => { if (counts[d.type] !== undefined) counts[d.type]++; });
        for (const k in counts) {
          const el = document.getElementById('doc-count-' + k);
          if (el) el.textContent = String(counts[k]);
        }
      }

      function renderDocumentsList() {
        const container = document.getElementById('doc-cards-container');
        const searchInput = document.getElementById('doc-search-input');
        const dateInput = document.getElementById('doc-date-input');
        const datePreset = document.getElementById('doc-date-preset');
        if (!container) return;

        const query = (searchInput && searchInput.value || '').toLowerCase().trim();
        const selectedDate = (dateInput && dateInput.value || '').trim();
        const presetVal = (datePreset && datePreset.value || 'all').trim();

        const filtered = documentsList.filter(d => {
          const matchFilter = currentDocFilter === 'all' || d.type === currentDocFilter;
          const matchQuery = !query || d.title.toLowerCase().includes(query) || d.summary.toLowerCase().includes(query) || d.author.toLowerCase().includes(query);

          let matchDate = true;
          if (selectedDate) {
            const parts = d.date ? d.date.split(' ')[0].split('/') : [];
            if (parts.length === 3) {
              const formattedDocDate = parts[2] + '-' + parts[1].padStart(2, '0') + '-' + parts[0].padStart(2, '0');
              matchDate = formattedDocDate === selectedDate;
            }
          } else if (presetVal === 'today') {
            const parts = d.date ? d.date.split(' ')[0] : '';
            matchDate = parts === '27/08/2026' || parts === new Date().toLocaleDateString('pt-BR');
          } else if (presetVal === '7days') {
            const parts = d.date ? d.date.split(' ')[0].split('/') : [];
            if (parts.length === 3) {
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1;
              const year = parseInt(parts[2], 10);
              const docTime = new Date(year, month, day).getTime();
              const nowTime = new Date(2026, 7, 27).getTime();
              const diffDays = (nowTime - docTime) / (1000 * 3600 * 24);
              matchDate = diffDays >= 0 && diffDays <= 7;
            }
          } else if (presetVal === '30days') {
            const parts = d.date ? d.date.split(' ')[0].split('/') : [];
            if (parts.length === 3) {
              matchDate = parts[1] === '08' && parts[2] === '2026';
            }
          }

          return matchFilter && matchQuery && matchDate;
        });

        updateDocCounts();

        if (filtered.length === 0) {
          container.innerHTML =
            '<div style="grid-column: 1 / -1; padding: 40px 20px; text-align: center; color: var(--ink-muted); display: flex; flex-direction: column; align-items: center;">' +
              '<div style="margin-bottom: 8px; opacity: 0.45; color: var(--navy);">' + getLucideSvg('search', { size: 32 }) + '</div>' +
              '<p style="margin: 0; font-size: 0.9rem;">Nenhum documento encontrado para o filtro/busca atual.</p>' +
            '</div>';
          return;
        }

        container.innerHTML = filtered.map(doc => {
          const isSelected = doc.id === currentSelectedDocId;
          return (
            '<div class="doc-card-item ' + (isSelected ? 'selected' : '') + '" data-doc-id="' + doc.id + '" style="background: var(--surface); border: 1px solid ' + (isSelected ? 'var(--navy)' : 'var(--line)') + '; border-radius: var(--radius-card); padding: 14px; cursor: pointer; transition: all 0.15s ease; box-shadow: ' + (isSelected ? '0 0 0 2px rgba(41,74,145,0.18)' : 'none') + '; display: flex; flex-direction: column; justify-content: space-between; gap: 10px;">' +
              '<div>' +
                '<div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 8px;">' +
                  '<span style="font-size: 0.68rem; font-weight: 600; background: ' + (doc.badgeBg || 'var(--tag-neutral-bg)') + '; color: ' + (doc.badgeColor || 'var(--tag-neutral-ink)') + '; border: 1px solid ' + (doc.badgeBorder || 'var(--tag-neutral-border)') + '; padding: 2px 8px; border-radius: var(--radius-pill); text-transform: uppercase;">' +
                    doc.typeName +
                  '</span>' +
                  '<span style="font-size: 0.72rem; color: var(--ink-muted); font-family: var(--font-mono);">' + doc.date + '</span>' +
                '</div>' +
                '<h4 style="margin: 0 0 6px 0; font-family: var(--font-display); font-size: 0.92rem; font-weight: 700; color: var(--ink-strong); line-height: 1.35;">' +
                  doc.title +
                '</h4>' +
                '<p style="margin: 0; font-size: 0.78rem; color: var(--ink-muted); line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">' +
                  doc.summary +
                '</p>' +
              '</div>' +
              '<div style="border-top: 1px dashed var(--line); padding-top: 8px; margin-top: 4px; font-size: 0.72rem; color: var(--ink-muted); display: flex; align-items: center;">' +
                '<span style="display: inline-flex; align-items: center; gap: 4px;">' + getLucideSvg('user', { size: 12, style: 'color: var(--ink-muted);' }) + ' ' + doc.author + '</span>' +
              '</div>' +
            '</div>'
          );
        }).join('');

        container.querySelectorAll('.doc-card-item').forEach(card => {
          card.addEventListener('click', () => {
            const docId = card.getAttribute('data-doc-id');
            if (docId) selectDocument(docId);
          });
        });
      }

      function formatMarkdownToHtml(md) {
        if (!md) return '';
        const lines = md.split(String.fromCharCode(10));
        let html = '';
        let inList = false;

        for (let i = 0; i < lines.length; i++) {
          let line = lines[i].trim();

          if (!line) {
            if (inList) { html += '</ul>'; inList = false; }
            continue;
          }

          if (line.includes('**')) {
            const parts = line.split('**');
            let formatted = '';
            for (let p = 0; p < parts.length; p++) {
              if (p % 2 === 1) {
                formatted += '<strong style="color: var(--ink-strong);">' + parts[p] + '</strong>';
              } else {
                formatted += parts[p];
              }
            }
            line = formatted;
          }

          if (line.indexOf(String.fromCharCode(96)) >= 0) {
            const parts = line.split(String.fromCharCode(96));
            let formatted = '';
            for (let p = 0; p < parts.length; p++) {
              if (p % 2 === 1) {
                formatted += '<code style="background: var(--surface-soft); color: var(--navy); padding: 2px 6px; border-radius: 4px; font-family: var(--font-mono); font-size: 0.82rem;">' + parts[p] + '</code>';
              } else {
                formatted += parts[p];
              }
            }
            line = formatted;
          }

          if (line.startsWith('# ')) {
            if (inList) { html += '</ul>'; inList = false; }
            html += '<h2 style="font-family: var(--font-display); font-size: 1.3rem; font-weight: 700; color: var(--ink-strong); margin: 16px 0 10px 0; border-bottom: 1px solid var(--line); padding-bottom: 6px;">' + line.substring(2) + '</h2>';
          } else if (line.startsWith('### ')) {
            if (inList) { html += '</ul>'; inList = false; }
            html += '<h4 style="font-family: var(--font-display); font-size: 1.05rem; font-weight: 700; color: var(--navy); margin: 14px 0 6px 0;">' + line.substring(4) + '</h4>';
          } else if (line.startsWith('## ')) {
            if (inList) { html += '</ul>'; inList = false; }
            html += '<h3 style="font-family: var(--font-display); font-size: 1.15rem; font-weight: 700; color: var(--ink-strong); margin: 14px 0 6px 0;">' + line.substring(3) + '</h3>';
          } else if (line === '---') {
            if (inList) { html += '</ul>'; inList = false; }
            html += '<hr style="border: 0; border-top: 1px dashed var(--line); margin: 14px 0;"/>';
          } else if (line.startsWith('- ') || line.startsWith('* ')) {
            if (!inList) { html += '<ul style="margin: 6px 0; padding-left: 20px; display: flex; flex-direction: column; gap: 5px;">'; inList = true; }
            html += '<li style="color: var(--ink); line-height: 1.6; font-size: 0.9375rem;">' + line.substring(2) + '</li>';
          } else {
            if (inList) { html += '</ul>'; inList = false; }
            html += '<p style="margin: 6px 0; line-height: 1.6; color: var(--ink); font-size: 0.9375rem;">' + line + '</p>';
          }
        }

        if (inList) html += '</ul>';
        return html;
      }

      function selectDocument(docId) {
        currentSelectedDocId = docId;

        // Atualização rápida de classes sem recriar o DOM dos cartões
        const container = document.getElementById('doc-cards-container');
        if (container) {
          container.querySelectorAll('.doc-card-item').forEach(card => {
            const isSelected = card.getAttribute('data-doc-id') === docId;
            if (isSelected) {
              card.classList.add('selected');
              card.style.borderColor = 'var(--navy)';
              card.style.boxShadow = '0 0 0 2px rgba(41,74,145,0.18)';
            } else {
              card.classList.remove('selected');
              card.style.borderColor = 'var(--line)';
              card.style.boxShadow = 'none';
            }
          });
        }

        const doc = documentsList.find(d => d.id === docId);
        const emptyView = document.getElementById('doc-reader-empty');
        const contentView = document.getElementById('doc-reader-content');
        const btnDocBackList = document.getElementById('btn-doc-back-list');
        const readerPanel = document.getElementById('doc-reader-panel');

        // Se estiver no mobile, alterna para o leitor em tela cheia
        if (window.innerWidth <= 900) {
          if (container) container.classList.add('doc-cards-mobile-hidden');
          if (readerPanel) readerPanel.classList.add('doc-reader-mobile-active');
          if (btnDocBackList) btnDocBackList.style.display = 'inline-flex';
        }

        if (!doc) {
          if (emptyView) emptyView.style.display = 'flex';
          if (contentView) contentView.style.display = 'none';
          return;
        }

        if (emptyView) emptyView.style.display = 'none';
        if (contentView) contentView.style.display = 'flex';

        const badgeEl = document.getElementById('doc-view-badge');
        const dateEl = document.getElementById('doc-view-date');
        const titleEl = document.getElementById('doc-view-title');
        const metaEl = document.getElementById('doc-view-meta');
        const bodyEl = document.getElementById('doc-view-body');

        if (badgeEl) {
          badgeEl.textContent = doc.typeName;
          badgeEl.style.background = doc.badgeBg || 'var(--tag-neutral-bg)';
          badgeEl.style.color = doc.badgeColor || 'var(--tag-neutral-ink)';
          badgeEl.style.border = '1px solid ' + (doc.badgeBorder || 'var(--tag-neutral-border)');
        }
        if (dateEl) dateEl.textContent = doc.date;
        if (titleEl) titleEl.textContent = doc.title;
        if (metaEl) metaEl.textContent = 'Autor: ' + doc.author + ' · Status: ' + doc.status;
        if (bodyEl) bodyEl.innerHTML = formatMarkdownToHtml(doc.content);
      }

      function resetDocumentReader() {
        currentSelectedDocId = null;
        const emptyView = document.getElementById('doc-reader-empty');
        const contentView = document.getElementById('doc-reader-content');
        if (emptyView) emptyView.style.display = 'flex';
        if (contentView) contentView.style.display = 'none';

        const container = document.getElementById('doc-cards-container');
        if (container) {
          container.querySelectorAll('.doc-card-item').forEach(card => {
            card.classList.remove('selected');
            card.style.borderColor = 'var(--line)';
            card.style.boxShadow = 'none';
          });
        }
      }

      function switchView(viewName) {
        const btnRailChat = document.getElementById('btn-rail-chat');
        const btnRailTasks = document.getElementById('btn-rail-tasks');
        const btnRailSupercerebro = document.getElementById('btn-rail-supercerebro');
        const btnRailInspector = document.getElementById('btn-rail-inspector');

        const btnMobChat = document.getElementById('btn-mobile-nav-chat');
        const btnMobTasks = document.getElementById('btn-mobile-nav-tasks');
        const btnMobSuper = document.getElementById('btn-mobile-nav-supercerebro');
        const btnMobTimeline = document.getElementById('btn-mobile-nav-timeline');
        const btnMobControls = document.getElementById('btn-mobile-nav-controls');
        const btnMobPalco = document.getElementById('btn-mobile-nav-palco');

        const chatWrapper = document.getElementById('chat-messages-wrapper');
        const documentsModal = document.getElementById('documents-modal');
        const supercerebroModal = document.getElementById('supercerebro-modal');
        const timelineModal = document.getElementById('timeline-modal');

        const paneControls = document.getElementById('pane-controls');
        const panePalco = document.getElementById('pane-palco');
        const paneChat = document.getElementById('pane-chat');
        const blueprintGrid = document.querySelector('.blueprint-grid');

        const composerCard = document.querySelector('.chat-input-wrapper');
        const btnChatBack = document.getElementById('btn-chat-back');
        const titleEl = document.getElementById('center-pane-title');

        document.querySelectorAll('.rail-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.mobile-nav-item').forEach(b => b.classList.remove('active'));

        if (chatWrapper) chatWrapper.style.display = 'none';
        if (documentsModal) documentsModal.style.display = 'none';
        if (supercerebroModal) supercerebroModal.style.display = 'none';
        if (timelineModal) timelineModal.style.display = 'none';

        // Atualização de classes de grid para layout perfeito sem desalinhamento
        if (blueprintGrid) {
          blueprintGrid.classList.remove(
            'view-chat',
            'view-documents',
            'view-supercerebro',
            'view-timeline',
            'view-controls',
            'view-palco',
            'view-full',
            'hide-palco',
            'hide-controls-and-palco'
          );
          blueprintGrid.classList.add('view-' + viewName);
        }

        // Limpar overrides inline para funcionamento limpo do CSS
        if (paneControls) paneControls.style.display = '';
        if (panePalco) panePalco.style.display = '';
        if (paneChat) paneChat.style.display = '';

        if (viewName === 'documents') {
          btnRailTasks?.classList.add('active');
          btnMobTasks?.classList.add('active');
          if (blueprintGrid) blueprintGrid.classList.add('view-full', 'hide-palco');
          if (documentsModal) documentsModal.style.display = 'flex';
          if (composerCard) composerCard.style.display = 'none';
          if (btnChatBack) btnChatBack.style.display = 'inline-flex';
          if (titleEl) titleEl.textContent = 'Central de Documentos & Artefatos';
          
          const docCardsContainer = document.getElementById('doc-cards-container');
          if (!docCardsContainer || !docCardsContainer.children.length) {
            renderDocumentsList();
          }
          if (window.innerWidth > 900) {
            if (currentSelectedDocId) {
              selectDocument(currentSelectedDocId);
            } else {
              resetDocumentReader();
            }
          } else {
            if (docCardsContainer) docCardsContainer.classList.remove('doc-cards-mobile-hidden');
            const readerPanel = document.getElementById('doc-reader-panel');
            if (readerPanel) readerPanel.classList.remove('doc-reader-mobile-active');
            const btnDocBackList = document.getElementById('btn-doc-back-list');
            if (btnDocBackList) btnDocBackList.style.display = 'none';
          }
        } else if (viewName === 'supercerebro') {
          btnRailSupercerebro?.classList.add('active');
          btnMobSuper?.classList.add('active');
          if (blueprintGrid) blueprintGrid.classList.add('view-full', 'hide-palco');
          if (supercerebroModal) supercerebroModal.style.display = 'flex';
          if (composerCard) composerCard.style.display = 'none';
          if (btnChatBack) btnChatBack.style.display = 'inline-flex';
          if (titleEl) titleEl.textContent = 'Supercérebro — Grafo de Conhecimento';

          // Renderização instantânea sem glitch nem atraso
          initGraphPositions(graphState.nodes);
          renderCanvasGraph();
          requestAnimationFrame(renderCanvasGraph);

          // Atualização de dados assíncrona em segundo plano
          fetchAndRenderSupercerebroGraph();
        } else if (viewName === 'timeline') {
          btnRailInspector?.classList.add('active');
          btnMobTimeline?.classList.add('active');
          if (blueprintGrid) blueprintGrid.classList.add('view-full', 'hide-palco');
          if (timelineModal) timelineModal.style.display = 'flex';
          if (composerCard) composerCard.style.display = 'none';
          if (btnChatBack) btnChatBack.style.display = 'inline-flex';
          if (titleEl) titleEl.textContent = 'Histórico & Linha do Tempo';
          renderTimelineEvents();
        } else if (viewName === 'controls') {
          btnMobControls?.classList.add('active');
          if (composerCard) composerCard.style.display = 'none';
          if (btnChatBack) btnChatBack.style.display = 'inline-flex';
          if (titleEl) titleEl.textContent = 'Mesa de Controles & BYOK';
        } else if (viewName === 'palco') {
          btnMobPalco?.classList.add('active');
          if (composerCard) composerCard.style.display = 'none';
          if (btnChatBack) btnChatBack.style.display = 'inline-flex';
          if (titleEl) titleEl.textContent = 'Palco Operacional da Conta';
        } else {
          btnRailChat?.classList.add('active');
          btnMobChat?.classList.add('active');
          if (blueprintGrid) blueprintGrid.classList.add('view-chat');
          if (chatWrapper) chatWrapper.style.display = 'flex';
          if (composerCard) composerCard.style.display = 'block';
          if (btnChatBack) btnChatBack.style.display = 'none';
          if (titleEl) titleEl.textContent = 'Agente AdzHub';
        }
      }

      window.switchView = switchView;

      function openDocumentsModal() { switchView('documents'); }
      function closeDocumentsModal() { switchView('chat'); }
      function openSupercerebroModal() { switchView('supercerebro'); }
      function closeSupercerebroModal() { switchView('chat'); }
      function openTimelineModal() { switchView('timeline'); }
      function closeTimelineModal() { switchView('chat'); }

      // Handlers para os botões do Icon Rail
      const btnRailChat = document.getElementById('btn-rail-chat');
      const btnRailTasks = document.getElementById('btn-rail-tasks');
      const btnRailInspector = document.getElementById('btn-rail-inspector');

      btnRailChat?.addEventListener('click', () => switchView('chat'));
      btnRailTasks?.addEventListener('click', () => switchView('documents'));
      btnRailInspector?.addEventListener('click', () => switchView('timeline'));
      document.getElementById('btn-chat-back')?.addEventListener('click', () => switchView('chat'));

      btnCloseDocuments?.addEventListener('click', closeDocumentsModal);

      document.getElementById('btn-doc-back-list')?.addEventListener('click', () => {
        const container = document.getElementById('doc-cards-container');
        if (container) container.classList.remove('doc-cards-mobile-hidden');
        const readerPanel = document.getElementById('doc-reader-panel');
        if (readerPanel) readerPanel.classList.remove('doc-reader-mobile-active');
        const btn = document.getElementById('btn-doc-back-list');
        if (btn) btn.style.display = 'none';
      });

      window.addEventListener('resize', () => {
        if (window.innerWidth > 900) {
          const container = document.getElementById('doc-cards-container');
          const readerPanel = document.getElementById('doc-reader-panel');
          const btnDocBackList = document.getElementById('btn-doc-back-list');
          if (container) container.classList.remove('doc-cards-mobile-hidden');
          if (readerPanel) readerPanel.classList.remove('doc-reader-mobile-active');
          if (btnDocBackList) btnDocBackList.style.display = 'none';
        }
      });

      document.querySelectorAll('#doc-filter-tabs .doc-tab-btn').forEach(tab => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('#doc-filter-tabs .doc-tab-btn').forEach(t => {
            t.classList.remove('active', 'btn-primary');
            t.classList.add('btn-secondary');
          });
          tab.classList.add('active', 'btn-primary');
          tab.classList.remove('btn-secondary');
          currentDocFilter = tab.getAttribute('data-doc-filter') || 'all';
          resetDocumentReader();
          renderDocumentsList();
        });
      });

      document.getElementById('doc-search-input')?.addEventListener('input', () => {
        resetDocumentReader();
        renderDocumentsList();
      });

      document.getElementById('doc-date-preset')?.addEventListener('change', () => {
        const dateInput = document.getElementById('doc-date-input');
        if (dateInput) dateInput.value = '';
        resetDocumentReader();
        renderDocumentsList();
      });

      document.getElementById('doc-date-input')?.addEventListener('change', () => {
        const datePreset = document.getElementById('doc-date-preset');
        if (datePreset) datePreset.value = 'all';
        resetDocumentReader();
        renderDocumentsList();
      });

      document.getElementById('btn-copy-doc')?.addEventListener('click', () => {
        const bodyEl = document.getElementById('doc-view-body');
        if (bodyEl && bodyEl.textContent) {
          navigator.clipboard.writeText(bodyEl.textContent);
          const btn = document.getElementById('btn-copy-doc');
          if (btn) {
            const originalText = btn.textContent;
            btn.textContent = '✓ Copiado!';
            setTimeout(() => { btn.textContent = originalText; }, 1800);
          }
        }
      });

      document.getElementById('btn-download-doc')?.addEventListener('click', () => {
        const doc = documentsList.find(d => d.id === currentSelectedDocId);
        if (doc) {
          const blob = new Blob([doc.content], { type: 'text/markdown;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = doc.id + '.md';
          a.click();
          URL.revokeObjectURL(url);
        }
      });

      btnRailSupercerebro?.addEventListener('click', () => switchView('supercerebro'));

      // ==========================================
      // Histórico & Linha do Tempo do Supercérebro
      // ==========================================
      const timelineModal = document.getElementById('timeline-modal');
      const btnCloseTimeline = document.getElementById('btn-close-timeline');

      let currentTimelineFilter = 'all';

      const INITIAL_TIMELINE_EVENTS = [
        {
          id: 'evt-tl-101',
          category: 'media',
          actor: {
            name: 'Aline Rocha',
            role: 'Tráfego Pago (SPOT)',
            avatarBg: 'var(--tag-info-bg)',
            avatarColor: 'var(--tag-info-ink)',
            avatarInitials: 'AR'
          },
          actionTitle: 'Pausa do Anúncio ad_whey_sabores_04',
          badgeText: 'Pausa de Anúncio',
          badgeBg: 'var(--tag-danger-bg)',
          badgeBorder: 'var(--tag-danger-border)',
          badgeColor: 'var(--tag-danger-ink)',
          summary: 'Aline Rocha pausou o criativo carrossel ad_whey_sabores_04 após identificar disparada de CPA para R$ 94,50 (limite de tolerância: R$ 35,00), realocando verba para o criativo campeão de Baunilha.',
          target: 'Anúncio: ad_whey_sabores_04 · Meta Ads',
          timestamp: '27/08/2026 14:15',
          provenance: 'Meta Ads'
        },
        {
          id: 'evt-tl-102',
          category: 'documents',
          actor: {
            name: 'Luiza Valente',
            role: 'Atendimento & Vendas',
            avatarBg: 'var(--tag-neutral-bg)',
            avatarColor: 'var(--tag-neutral-ink)',
            avatarInitials: 'LV'
          },
          actionTitle: 'Recebimento do Documento "Pauta UGC TikTok/Reels"',
          badgeText: 'Documento Recebido',
          badgeBg: 'var(--tag-neutral-bg)',
          badgeBorder: 'var(--tag-neutral-border)',
          badgeColor: 'var(--tag-neutral-ink)',
          summary: 'Luiza Valente recebeu e anexou a pauta de criativos UGC contendo 5 roteiros de alta conversão para gravação com influenciadores.',
          target: 'Documento: doc-pauta-ugc-01',
          timestamp: '27/08/2026 13:40',
          provenance: 'Central de Documentos'
        },
        {
          id: 'evt-tl-103',
          category: 'governance',
          actor: {
            name: 'Marcos Silva',
            role: 'Head de Marketing (HouseWhey)',
            avatarBg: 'var(--tag-success-bg)',
            avatarColor: 'var(--tag-success-ink)',
            avatarInitials: 'MS'
          },
          actionTitle: 'Aprovação da Proposta de Remanejamento de Orçamento',
          badgeText: 'Proposta Aprovada',
          badgeBg: 'var(--tag-success-bg)',
          badgeBorder: 'var(--tag-success-border)',
          badgeColor: 'var(--tag-success-ink)',
          summary: 'Marcos Silva aprovou a proposta #prop-8921 permitindo o remanejamento de R$ 500,00/dia da campanha Namorados para alavancar o lançamento de Whey Isolar.',
          target: 'Proposta #prop-8921 · Aprovada por Marcos Silva',
          timestamp: '27/08/2026 12:20',
          provenance: 'Aprovação da Conta'
        },
        {
          id: 'evt-tl-104',
          category: 'audit',
          actor: {
            name: 'Agente AdzHub',
            role: 'Auditoria & Integridade',
            avatarBg: 'var(--tag-info-bg)',
            avatarColor: 'var(--tag-info-ink)',
            avatarInitials: 'AH'
          },
          actionTitle: 'Auditoria de Regras da Conta',
          badgeText: 'Auditoria Salva',
          badgeBg: 'var(--tag-info-bg)',
          badgeBorder: 'var(--tag-info-border)',
          badgeColor: 'var(--tag-info-ink)',
          summary: 'Agente AdzHub executou a validação de regras da conta, confirmando a integridade das metas de CPA e investimento.',
          target: 'Verificação de Integridade',
          timestamp: '27/08/2026 11:05',
          provenance: 'Motor de Auditoria'
        },
        {
          id: 'evt-tl-105',
          category: 'governance',
          actor: {
            name: 'Carolina Mendes',
            role: 'Gerente Operacional (SPOT)',
            avatarBg: 'var(--tag-warning-bg)',
            avatarColor: 'var(--tag-warning-ink)',
            avatarInitials: 'CM'
          },
          actionTitle: 'Submissão de Proposta de Controle de Tolerância',
          badgeText: 'Proposta Submetida',
          badgeBg: 'var(--tag-warning-bg)',
          badgeBorder: 'var(--tag-warning-border)',
          badgeColor: 'var(--tag-warning-ink)',
          summary: 'Carolina Mendes registrou nova regra de tolerância: anúncios com CPA > 2.5x a meta após 1.000 impressões devem gerar pendência imediata de pausa.',
          target: 'Regra de Tolerância #gov-rule-04',
          timestamp: '27/08/2026 09:45',
          provenance: 'Painel da Conta'
        },
        {
          id: 'evt-tl-106',
          category: 'documents',
          actor: {
            name: 'Aline Rocha',
            role: 'Tráfego Pago (SPOT)',
            avatarBg: 'var(--tag-info-bg)',
            avatarColor: 'var(--tag-info-ink)',
            avatarInitials: 'AR'
          },
          actionTitle: 'Vínculo do Briefing Q3 na Conta',
          badgeText: 'Briefing Registrado',
          badgeBg: 'var(--tag-neutral-bg)',
          badgeBorder: 'var(--tag-neutral-border)',
          badgeColor: 'var(--tag-neutral-ink)',
          summary: 'Aline Rocha cadastrou o Briefing de Lançamento Whey Isolar HouseWhey Q3, conectando público, metas de CPA e canais de veiculação.',
          target: 'Documento: doc-briefing-q3',
          timestamp: '27/08/2026 09:30',
          provenance: 'Central de Documentos'
        }
      ];

      const timelineEventsList = [...INITIAL_TIMELINE_EVENTS];

      window.addTimelineEvent = function(evt) {
        if (!evt) return;
        const newEvt = {
          id: 'evt-dyn-' + Date.now(),
          category: evt.category || 'audit',
          actor: evt.actor || {
            name: 'Supercérebro IA',
            role: 'Orquestrador Autônomo',
            avatarBg: 'var(--tag-info-bg)',
            avatarColor: 'var(--tag-info-ink)',
            avatarInitials: 'IA'
          },
          actionTitle: evt.actionTitle || 'Ação Registrada',
          badgeText: evt.badgeText || 'Em Tempo Real',
          badgeBg: evt.badgeBg || 'var(--tag-info-bg)',
          badgeBorder: evt.badgeBorder || 'var(--tag-info-border)',
          badgeColor: evt.badgeColor || 'var(--tag-info-ink)',
          summary: evt.summary || '',
          target: evt.target || 'Supercérebro Session',
          timestamp: evt.timestamp || new Date().toLocaleString('pt-BR'),
          provenance: evt.provenance || 'Sessão AdzHub em Tempo Real'
        };
        timelineEventsList.unshift(newEvt);
        if (timelineModal && timelineModal.style.display !== 'none') {
          renderTimelineEvents();
        }
      };

      function renderTimelineEvents() {
        const container = document.getElementById('timeline-feed-container');
        const searchInput = document.getElementById('timeline-search-input');
        if (!container) return;

        const query = (searchInput && searchInput.value || '').toLowerCase().trim();

        const filtered = timelineEventsList.filter(item => {
          const matchCat = currentTimelineFilter === 'all' || item.category === currentTimelineFilter;
          if (!matchCat) return false;
          if (!query) return true;
          return item.actionTitle.toLowerCase().includes(query) ||
                 item.summary.toLowerCase().includes(query) ||
                 item.actor.name.toLowerCase().includes(query) ||
                 item.target.toLowerCase().includes(query) ||
                 item.badgeText.toLowerCase().includes(query);
        });

        if (filtered.length === 0) {
          container.innerHTML =
            '<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 16px; text-align: center; color: var(--ink-muted);">' +
              '<div style="margin-bottom: 12px; opacity: 0.45; color: var(--navy);">' + getLucideSvg('search', { size: 32 }) + '</div>' +
              '<div style="font-weight: 600; color: var(--ink-strong); font-size: 0.95rem; margin-bottom: 4px;">Nenhum evento encontrado</div>' +
              '<div style="font-size: 0.8rem;">Tente ajustar o termo da busca ou selecione outra aba de filtro.</div>' +
            '</div>';
          return;
        }

        let html = '<div style="display: flex; flex-direction: column; gap: 16px; position: relative; width: 100%; box-sizing: border-box; margin: 0;">';
        html += '<div style="position: absolute; top: 18px; bottom: 18px; left: 13px; width: 2px; background: var(--line-strong); opacity: 0.5; z-index: 1;"></div>';

        filtered.forEach(function(item) {
          const dotColor = item.badgeColor || 'var(--navy)';
          html +=
            '<div style="display: flex; gap: 16px; position: relative; z-index: 2; align-items: flex-start; width: 100%; box-sizing: border-box;">' +
              '<div style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; position: relative; top: 12px;" title="' + item.actor.name + ' (' + item.actor.role + ')">' +
                '<div style="width: 12px; height: 12px; border-radius: 50%; background: ' + dotColor + '; border: 2px solid var(--surface); box-shadow: 0 0 0 2px rgba(41,74,145,0.18); flex-shrink: 0;"></div>' +
              '</div>' +

              '<div style="flex: 1; min-width: 0; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-card); padding: 16px 22px; box-shadow: var(--shadow-card); display: flex; flex-direction: column; gap: 10px;">' +
                
                '<div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">' +
                  '<div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">' +
                    '<span style="font-weight: 700; color: var(--ink-strong); font-size: 1.05rem; font-family: var(--font-display); line-height: 1.35;">' +
                      item.actionTitle +
                    '</span>' +
                    '<span style="font-size: 0.78rem; font-weight: 600; padding: 3px 10px; border-radius: var(--radius-pill); border: 1px solid ' + (item.badgeBorder || 'var(--line)') + '; background: ' + item.badgeBg + '; color: ' + item.badgeColor + ';">' +
                      item.badgeText +
                    '</span>' +
                  '</div>' +
                  '<span style="font-family: var(--font-mono); font-size: 0.8125rem; color: var(--ink-muted); background: var(--surface-soft); padding: 4px 10px; border-radius: 6px; border: 1px solid var(--line); display: inline-flex; align-items: center; gap: 5px;">' +
                    getLucideSvg('clock', { size: 13, style: 'color: var(--ink-muted);' }) + ' ' + item.timestamp +
                  '</span>' +
                '</div>' +

                '<div style="font-size: 0.9375rem; line-height: 1.55; color: var(--ink); font-family: var(--font-sans);">' +
                  item.summary +
                '</div>' +

                '<div style="display: flex; align-items: center; justify-content: space-between; padding-top: 8px; border-top: 1px dashed var(--line); margin-top: 2px; font-size: 0.84rem; color: var(--ink-muted); flex-wrap: wrap; gap: 8px;">' +
                  '<div style="display: flex; align-items: center; gap: 12px;">' +
                    '<span style="display: inline-flex; align-items: center; gap: 5px;">' + getLucideSvg('user', { size: 14, style: 'color: var(--ink-muted);' }) + ' <strong>Operador:</strong> ' + item.actor.name + ' <span style="opacity: 0.85;">(' + item.actor.role + ')</span></span>' +
                  '</div>' +
                  '<div style="display: flex; align-items: center; gap: 10px;">' +
                    '<span style="background: var(--surface-soft); padding: 3px 8px; border-radius: 4px; border: 1px solid var(--line); display: inline-flex; align-items: center; gap: 5px;">' + getLucideSvg('target', { size: 13, style: 'color: var(--ink-muted);' }) + ' ' + item.target + '</span>' +
                    '<span style="font-family: var(--font-mono); opacity: 0.9; display: inline-flex; align-items: center; gap: 4px;">' + getLucideSvg('zap', { size: 13, style: 'color: var(--navy);' }) + ' ' + item.provenance + '</span>' +
                  '</div>' +
                '</div>' +

              '</div>' +
            '</div>';
        });

        html += '</div>';
        container.innerHTML = html;
      }

      function openTimelineModal() {
        if (!timelineModal) return;
        timelineModal.style.display = 'flex';
        renderTimelineEvents();
      }

      function closeTimelineModal() {
        if (!timelineModal) return;
        timelineModal.style.display = 'none';
      }

      btnCloseTimeline?.addEventListener('click', closeTimelineModal);

      document.querySelectorAll('#timeline-filter-tabs .timeline-tab-btn').forEach(tab => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('#timeline-filter-tabs .timeline-tab-btn').forEach(t => {
            t.classList.remove('active', 'btn-primary');
            t.classList.add('btn-secondary');
          });
          tab.classList.add('active', 'btn-primary');
          tab.classList.remove('btn-secondary');
          currentTimelineFilter = tab.getAttribute('data-timeline-filter') || 'all';
          renderTimelineEvents();
        });
      });

      document.getElementById('timeline-search-input')?.addEventListener('input', () => {
        renderTimelineEvents();
      });

      btnRailInspector?.addEventListener('click', () => switchView('timeline'));

      btnCloseSupercerebro?.addEventListener('click', closeSupercerebroModal);
      btnRefreshGraph?.addEventListener('click', fetchAndRenderSupercerebroGraph);

      if (graphCanvas) {
        const handleCanvasPointerDown = (e) => {
          const rect = graphCanvas.getBoundingClientRect();
          const mouseX = (e.clientX - rect.left - graphState.offsetX) / graphState.zoom;
          const mouseY = (e.clientY - rect.top - graphState.offsetY) / graphState.zoom;

          let clickedNode = null;
          for (let i = graphState.nodes.length - 1; i >= 0; i--) {
            const n = graphState.nodes[i];
            const style = getNodeStyle(n.type);
            const dist = Math.hypot(n.x - mouseX, n.y - mouseY);
            if (dist <= style.radius + 10) {
              clickedNode = n;
              break;
            }
          }

          if (clickedNode) {
            graphState.draggedNode = clickedNode;
            clickedNode.isUserDragged = true;
            selectGraphNode(clickedNode);
          } else {
            graphState.isDraggingCanvas = true;
            graphState.dragStartX = e.clientX - graphState.offsetX;
            graphState.dragStartY = e.clientY - graphState.offsetY;
            selectGraphNode(null);
          }
        };

        const handleCanvasPointerMove = (e) => {
          if (graphState.draggedNode) {
            const rect = graphCanvas.getBoundingClientRect();
            const width = rect.width > 50 ? rect.width : (graphWrapper.clientWidth || 800);
            const height = rect.height > 50 ? rect.height : (graphWrapper.clientHeight || 550);
            const centerX = width / 2;
            const centerY = height / 2;
            const newX = (e.clientX - rect.left - graphState.offsetX) / graphState.zoom;
            const newY = (e.clientY - rect.top - graphState.offsetY) / graphState.zoom;
            graphState.draggedNode.x = newX;
            graphState.draggedNode.y = newY;
            graphState.draggedNode.relX = newX - centerX;
            graphState.draggedNode.relY = newY - centerY;
            graphState.draggedNode.isUserDragged = true;
            renderCanvasGraph();
          } else if (graphState.isDraggingCanvas) {
            graphState.offsetX = e.clientX - graphState.dragStartX;
            graphState.offsetY = e.clientY - graphState.dragStartY;
            renderCanvasGraph();
          }
        };

        const handleCanvasPointerUp = () => {
          graphState.draggedNode = null;
          graphState.isDraggingCanvas = false;
        };

        graphCanvas.addEventListener('pointerdown', handleCanvasPointerDown);
        window.addEventListener('pointermove', handleCanvasPointerMove);
        window.addEventListener('pointerup', handleCanvasPointerUp);
        window.addEventListener('pointercancel', handleCanvasPointerUp);

        // Fallback para mouse events
        graphCanvas.addEventListener('mousedown', handleCanvasPointerDown);
        window.addEventListener('mousemove', handleCanvasPointerMove);
        window.addEventListener('mouseup', handleCanvasPointerUp);

        graphCanvas.addEventListener('wheel', (e) => {
          e.preventDefault();
          const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
          graphState.zoom = Math.max(0.4, Math.min(3.0, graphState.zoom * zoomFactor));
          renderCanvasGraph();
        }, { passive: false });
      }

      document.querySelectorAll('#graph-filter-tabs .graph-tab-btn').forEach(tab => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('#graph-filter-tabs .graph-tab-btn').forEach(t => {
            t.classList.remove('btn-primary', 'active');
            t.classList.add('btn-secondary');
          });
          tab.classList.remove('btn-secondary');
          tab.classList.add('btn-primary', 'active');
          graphState.filter = tab.getAttribute('data-graph-filter') || 'all';
          selectGraphNode(null);
        });
      });

      document.getElementById('btn-graph-zoom-in')?.addEventListener('click', () => {
        graphState.zoom = Math.min(3.0, graphState.zoom * 1.25);
        renderCanvasGraph();
      });
      document.getElementById('btn-graph-zoom-out')?.addEventListener('click', () => {
        graphState.zoom = Math.max(0.4, graphState.zoom / 1.25);
        renderCanvasGraph();
      });
      document.getElementById('btn-graph-reset-view')?.addEventListener('click', () => {
        graphState.zoom = 1;
        graphState.offsetX = 0;
        graphState.offsetY = 0;
        graphState.nodes.forEach(n => {
          n.isUserDragged = false;
          delete n.relX;
          delete n.relY;
        });
        initGraphPositions(graphState.nodes, true);
        renderCanvasGraph();
      });

      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (supercerebroModal && supercerebroModal.style.display !== 'none') closeSupercerebroModal();
          if (documentsModal && documentsModal.style.display !== 'none') closeDocumentsModal();
          if (timelineModal && timelineModal.style.display !== 'none') closeTimelineModal();
        }
      });

      // Observador para auto-scroll automático durante streaming/execução
      const chatContainerEl = document.getElementById('chat-messages-container');
      if (chatContainerEl && typeof MutationObserver !== 'undefined') {
        const chatObserver = new MutationObserver((mutations) => {
          if (sessionState.isExecuting) {
            const hasAddedNodes = mutations.some(m => m.type === 'childList' && m.addedNodes.length > 0);
            if (hasAddedNodes) {
              scrollChatToBottom(true);
            }
          }
        });
        chatObserver.observe(chatContainerEl, { childList: true, subtree: true });
      }

      // Inicialização
      updateKeyUI();
      validateExecution();
      initGraphPositions(graphState.nodes);
      updateGraphStats();
      if (graphWrapper && typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver(() => {
          if (supercerebroModal && supercerebroModal.style.display !== 'none') {
            renderCanvasGraph();
          }
        });
        resizeObserver.observe(graphWrapper);
      }
      renderDocumentsList();
      resetDocumentReader();
    })();
  </script>
</body>
</html>`;
}
