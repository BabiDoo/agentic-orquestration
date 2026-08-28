import { describe, it, expect } from 'vitest';
import { initializeWebShell } from './index.js';

describe('@adzhub/web', () => {
  it('should initialize web shell and integrate all domain modules cleanly', () => {
    const status = initializeWebShell();
    expect(status.isReady).toBe(true);
    expect(status.version).toBe('1.1');
    expect(status.modules).toHaveLength(7);
  });
});
