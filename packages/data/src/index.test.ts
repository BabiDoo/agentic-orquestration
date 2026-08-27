import { describe, it, expect } from 'vitest';
import { UtmNormalizer } from './index.js';

describe('@adzhub/data', () => {
  const normalizer = new UtmNormalizer();

  it('should normalize UTMs to lowercase, trimmed, with underscores', () => {
    const result = normalizer.normalize('  Housewhey Promo 2026 ');
    expect(result.normalizedValue).toBe('housewhey_promo_2026');
    expect(result.isValid).toBe(true);
  });

  it('should return MISSING_UTM for null or empty input', () => {
    expect(normalizer.normalize(null).normalizedValue).toBe('MISSING_UTM');
    expect(normalizer.normalize('').normalizedValue).toBe('MISSING_UTM');
    expect(normalizer.normalize('   ').normalizedValue).toBe('MISSING_UTM');
  });
});
