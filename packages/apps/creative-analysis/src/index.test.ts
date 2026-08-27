import { describe, it, expect } from 'vitest';
import { CreativeAnalysisApp } from './index.js';

describe('@adzhub/creative-analysis', () => {
  const app = new CreativeAnalysisApp();

  it('should recommend MANTER for high ROAS', () => {
    const result = app.analyze({
      adId: 'ad_1',
      adName: 'Creativo 01',
      spendBrl: 100,
      salesCount: 5,
      revenueBrl: 300
    });

    expect(result.cpaBrl).toBe(20);
    expect(result.roas).toBe(3);
    expect(result.recommendation).toBe('MANTER');
  });

  it('should handle zero sales safely without dividing by zero', () => {
    const result = app.analyze({
      adId: 'ad_2',
      adName: 'Creativo 02',
      spendBrl: 150,
      salesCount: 0,
      revenueBrl: 0
    });

    expect(result.cpaBrl).toBeNull();
    expect(result.roas).toBe(0);
    expect(result.recommendation).toBe('INCONCLUSIVO');
  });
});
