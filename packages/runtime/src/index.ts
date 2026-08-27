/**
 * @adzhub/runtime
 * Motor de execução da máquina de estados PEV-C, scheduler, ledger de budgets, Model Adapters, BYOK Security e Baseline Basic/ReAct.
 */

import { ExecutionMode, TaskStatus } from '@adzhub/contracts';

export * from './model-allowlist.js';
export * from './model-adapter-interface.js';
export * from './openrouter-adapter.js';
export * from './google-gemini-adapter.js';
export * from './mock-model-adapter.js';
export * from './byok-security.js';
export * from './system-prompt.js';
export * from './basic-react-engine.js';
export * from './pevc-state-machine.js';
export * from './dag-planner.js';
export * from './dag-scheduler.js';
export * from './budget-ledger.js';
export * from './event-log.js';
export * from './checkpoint-replay.js';
export * from './circuit-breaker.js';
export * from './attribute-replan.js';

export interface RuntimeConfig {
  mode: ExecutionMode;
  maxReplans: number;
}

export class RuntimeEngine {
  private config: RuntimeConfig;

  constructor(config: RuntimeConfig) {
    this.config = config;
  }

  public getMode(): ExecutionMode {
    return this.config.mode;
  }

  public getInitialStatus(): TaskStatus {
    return 'PENDING';
  }
}
