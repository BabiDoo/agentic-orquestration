/**
 * @adzhub/web
 * Ponto de entrada da interface web / shell interativo do Harness Microkernel.
 */

import { CONTRACTS_VERSION } from '@adzhub/contracts';
import { RuntimeEngine } from '@adzhub/runtime';
import { CapabilityBroker } from '@adzhub/policy';
import { Verifier } from '@adzhub/verify';
import { CreativeAnalysisApp } from '@adzhub/creative-analysis';
import { UtmNormalizer } from '@adzhub/data';

export interface WebShellStatus {
  version: string;
  isReady: boolean;
  modules: string[];
}

export function initializeWebShell(): WebShellStatus {
  const runtime = new RuntimeEngine({ mode: 'GOVERNED_PEVC', maxReplans: 2 });
  const policy = new CapabilityBroker(['read:meta', 'read:crm']);
  const verifier = new Verifier();
  const creativeApp = new CreativeAnalysisApp();
  const normalizer = new UtmNormalizer();

  if (!runtime || !policy || !verifier || !creativeApp || !normalizer) {
    throw new Error('Falha ao inicializar dependências do web shell');
  }

  return {
    version: CONTRACTS_VERSION,
    isReady: true,
    modules: ['contracts', 'runtime', 'policy', 'verify', 'creative-analysis', 'tools', 'data']
  };
}

export * from './api.js';
export * from './runs-service.js';
export * from './ui-shell.js';
export * from './canonical-scenarios.js';
