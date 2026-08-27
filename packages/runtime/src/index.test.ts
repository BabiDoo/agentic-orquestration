import { describe, it, expect } from 'vitest';
import { RuntimeEngine } from './index.js';

describe('@adzhub/runtime', () => {
  it('should initialize runtime engine with correct mode', () => {
    const engine = new RuntimeEngine({ mode: 'GOVERNED_PEVC', maxReplans: 2 });
    expect(engine.getMode()).toBe('GOVERNED_PEVC');
    expect(engine.getInitialStatus()).toBe('PENDING');
  });
});
