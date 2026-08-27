/**
 * @adzhub/creative-analysis
 * App de Metodologia para análise de criativos, ranking e proposta de briefings.
 */

export interface CreativePerformanceInput {
  adId: string;
  adName: string;
  spendBrl: number;
  salesCount: number;
  revenueBrl: number;
}

export interface CreativeAnalysisResult {
  adId: string;
  cpaBrl: number | null;
  roas: number | null;
  recommendation: 'MANTER' | 'PAUSAR_SUGESTAO' | 'VARIAR_HOOK' | 'INCONCLUSIVO';
}

export class CreativeAnalysisApp {
  public analyze(input: CreativePerformanceInput): CreativeAnalysisResult {
    const cpaBrl = input.salesCount > 0 ? input.spendBrl / input.salesCount : null;
    const roas = input.spendBrl > 0 ? input.revenueBrl / input.spendBrl : null;

    let recommendation: CreativeAnalysisResult['recommendation'] = 'INCONCLUSIVO';
    if (roas !== null && roas >= 2.0) {
      recommendation = 'MANTER';
    } else if (cpaBrl !== null && cpaBrl > 100) {
      recommendation = 'VARIAR_HOOK';
    }

    return {
      adId: input.adId,
      cpaBrl,
      roas,
      recommendation
    };
  }
}
