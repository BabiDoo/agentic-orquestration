import { describe, it, expect } from 'vitest';
import { CONTRACTS_VERSION } from './index.js';

describe('@adzhub/contracts', () => {
  it('should expose the contract version correctly', () => {
    expect(CONTRACTS_VERSION).toBe('1.1');
  });
});
