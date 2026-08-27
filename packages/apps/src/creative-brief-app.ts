import { z } from 'zod';
import {
  RawMapaSolucaoData,
  RawAnaliseCriativosData,
  RAW_MAPA_SOLUCAO_DATA,
  RAW_ANALISE_CRIATIVOS_DATA
} from '@adzhub/data';

/**
 * Schema de entrada para geração de Briefing Criativo.
 */
export const CreativeBriefInputSchema = z.object({
  client_id: z.string().min(1, { message: 'client_id é obrigatório' }),
  timeframe: z.object({
    since: z.string().datetime({ message: 'since deve ser data ISO-8601' }),
    until: z.string().datetime({ message: 'until deve ser data ISO-8601' }),
    timezone: z.string().default('America/Sao_Paulo')
  }),
  target_ad_id: z
    .string()
    .optional()
    .describe('ID de anúncio existente a renovar/variar (ex: ad_namorados_casal_03)'),
  angle_focus: z
    .enum(['SABOR_E_DIGESTAO', 'PUREZA_E_LAUDOS', 'LONGEVIDADE_E_SAUDE', 'PERFORMANCE_ATLETA'])
    .optional()
    .default('SABOR_E_DIGESTAO'),
  format_preference: z
    .enum(['VIDEO_VERTICAL_9X16', 'CARROSSEL_SQUARE_1X1', 'ESTATICO_FEED_4X5'])
    .optional()
    .default('VIDEO_VERTICAL_9X16')
});

export type CreativeBriefInput = z.infer<typeof CreativeBriefInputSchema>;
export type CreativeBriefInputRaw = z.input<typeof CreativeBriefInputSchema>;

/**
 * Especificação dos 3 primeiros segundos (Hook).
 */
export const HookSpecSchema = z.object({
  headline: z.string(),
  visual_direction_3s: z.string(),
  spoken_or_text_hook: z.string(),
  underlying_pain_addressed: z.string(),
  target_hook_rate: z.number().min(0).max(1)
});

export type HookSpec = z.infer<typeof HookSpecSchema>;

/**
 * Especificação de Desenvolvimento e Oferta.
 */
export const BodyAndOfferSpecSchema = z.object({
  pacing_and_mood: z.string(),
  demonstrations: z.array(z.string()).min(1),
  proof_element_cited: z.string(),
  product_highlight: z.string(),
  cta_text: z.string(),
  utm_parameters_template: z.string()
});

export type BodyAndOfferSpec = z.infer<typeof BodyAndOfferSpecSchema>;

/**
 * Schema de um Briefing Criativo Completo.
 */
export const CreativeBriefItemSchema = z.object({
  brief_id: z.string().regex(/^art_cb_[a-zA-Z0-9_-]+$/),
  title: z.string(),
  client_id: z.string(),
  brand_name: z.string(),
  target_audience: z.object({
    persona: z.string(),
    main_driver: z.string(),
    pain_points: z.array(z.string()).min(1)
  }),
  core_offer: z.object({
    product_name: z.string(),
    promise: z.string(),
    bundle_or_discount: z.string()
  }),
  strategic_angle: z.string(),
  hook: HookSpecSchema,
  body_and_offer: BodyAndOfferSpecSchema,
  forbidden_claims: z.array(z.string()).min(1),
  technical_specs: z.object({
    format: z.string(),
    aspect_ratio: z.string(),
    duration_seconds: z.string(),
    safe_zones: z.string()
  }),
  success_metrics: z.object({
    target_hook_score: z.number(),
    target_cpa_brl: z.number(),
    target_retention_rate_percent: z.number()
  }),
  rendered_markdown: z.string().min(1),
  evidence_refs: z.array(z.string()).min(1),
  locators: z.array(z.string()).min(1)
});

export type CreativeBriefItem = z.infer<typeof CreativeBriefItemSchema>;

/**
 * Schema de saída do App de Briefing Criativo.
 */
export const CreativeBriefOutputSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  client_id: z.string(),
  timeframe: z.object({
    since: z.string(),
    until: z.string(),
    timezone: z.string()
  }),
  generated_at: z.string().datetime(),
  briefs: z.array(CreativeBriefItemSchema).min(1),
  executive_summary: z.string().min(1),
  evidence_refs: z.array(z.string()).min(1)
});

export type CreativeBriefOutput = z.infer<typeof CreativeBriefOutputSchema>;

export interface CreativeBriefAppOptions {
  mapaSolucaoData?: RawMapaSolucaoData;
  analiseCriativosData?: RawAnaliseCriativosData;
}

/**
 * App de Geração de Briefings Criativos (CREATIVE_BRIEF_GENERATION).
 * Transforma insights diagnósticos e mapa da solução em briefings normativos em markdown puro.
 */
export class CreativeBriefApp {
  public generateBrief(
    rawInput: CreativeBriefInputRaw,
    options: CreativeBriefAppOptions = {}
  ): CreativeBriefOutput {
    const input = CreativeBriefInputSchema.parse(rawInput);
    const mapaSolucao = options.mapaSolucaoData ?? RAW_MAPA_SOLUCAO_DATA;
    const analiseCriativos = options.analiseCriativosData ?? RAW_ANALISE_CRIATIVOS_DATA;

    if (mapaSolucao.client_id !== input.client_id) {
      throw new Error(
        `Isolamento de cliente violado no briefing criativo: solicitado '${input.client_id}'.`
      );
    }

    const now = new Date().toISOString();
    const briefs: CreativeBriefItem[] = [];
    const allEvidenceRefs: string[] = [];

    // Busca dados do anúncio alvo se fornecido
    const targetAdEval = input.target_ad_id
      ? analiseCriativos.creatives.find((c) => c.ad_id === input.target_ad_id)
      : null;

    const brief1Id = `art_cb_hook_refresh_${input.target_ad_id ?? 'general_01'}`;
    const evidenceRef1 = `evi_cb_${input.client_id}_01`;
    allEvidenceRefs.push(evidenceRef1);

    const personaAtleta = mapaSolucao.target_audiences[0] ?? {
      persona: 'Atleta & Praticante Dedicado',
      main_driver: 'Performance máxima e digestão leve'
    };

    const personaLongevidade = mapaSolucao.target_audiences[1] ?? {
      persona: 'Entusiasta de Longevidade & Saúde',
      main_driver: 'Suplementação preventiva com segurança biológica'
    };

    const selectedPersona =
      input.angle_focus === 'LONGEVIDADE_E_SAUDE' || input.angle_focus === 'PUREZA_E_LAUDOS'
        ? personaLongevidade
        : personaAtleta;

    const proofElement =
      input.angle_focus === 'PUREZA_E_LAUDOS'
        ? mapaSolucao.proof_elements[2]! // Laudo lote a lote
        : input.angle_focus === 'LONGEVIDADE_E_SAUDE'
          ? mapaSolucao.proof_elements[0]! // IFOS 5 estrelas
          : mapaSolucao.proof_elements[1]!; // Grass-fed Glanbia

    const hookData: HookSpec = {
      headline:
        input.angle_focus === 'PUREZA_E_LAUDOS'
          ? 'Você sabe exatamente o que tem no seu Whey?'
          : 'Cansado de Whey com gosto de remédio e estômago pesado?',
      visual_direction_3s:
        'Corte rápido em macro (close-up) da dissolução instantânea do pó na água gelada sem formar grumos, seguido de expressão de surpresa positiva ao primeiro gole.',
      spoken_or_text_hook:
        'Se o seu Whey deixa aquele sabor residual químico na boca, você está tomando a proteína errada. Veja o que acontece quando a matéria-prima é 100% pura.',
      underlying_pain_addressed:
        'Desconforto digestivo, gosto artificial de adoçante químico e desconfiança sobre laudos nutricionais.',
      target_hook_rate: 0.4
    };

    const bodyData: BodyAndOfferSpec = {
      pacing_and_mood: 'Dinâmico, transparente, esportivo e confiante. Foco sensorial em textura e pureza.',
      demonstrations: [
        'Mistura com apenas 4 giros na coqueteleira sem coador',
        'Leitura do QR Code na embalagem mostrando o laudo microbiológico e proteico do lote',
        'Tabela nutricional limpa com 27g de proteína por dose sem aditivos ocultos'
      ],
      proof_element_cited: proofElement,
      product_highlight: 'Whey Protein Isolado 100% Grass-Fed Housewhey (Sabor Baunilha Natural)',
      cta_text: 'Experimente agora com Garantia de Sabor e Frete Grátis acima de R$ 199',
      utm_parameters_template:
        'utm_source=meta_ads&utm_medium=cpc&utm_campaign=whey_isolado_refresh&utm_content=cb_hook_refresh_v1'
    };

    const markdownBrief = `# Briefing Criativo: ${hookData.headline}
**ID do Artefato:** \`${brief1Id}\`  
**Cliente:** ${mapaSolucao.brand_name} (\`${input.client_id}\`)  
**Data de Criação:** ${now}  
**Objetivo:** Renovação de Gancho e Elevação de Retenção (Mitigação de CPA Crítico)

---

## 1. Público-Alvo & Persona
- **Persona:** ${selectedPersona.persona}
- **Motivador Central:** ${selectedPersona.main_driver}
- **Dores Principais:** Desconforto gástrico pós-treino, gosto enjoativo de aromas sintéticos e falta de clareza sobre pureza.

## 2. Oferta & Proposta de Valor
- **Produto:** ${bodyData.product_highlight}
- **Promessa:** ${mapaSolucao.promise}
- **Elemento de Prova:** ${bodyData.proof_element_cited}

## 3. Especificação do Hook (Primeiros 3 Segundos)
- **Gancho Verbal / Texto:** *"${hookData.spoken_or_text_hook}"*
- **Direção Visual:** ${hookData.visual_direction_3s}
- **Meta de Retenção (3s):** ${Math.round(hookData.target_hook_rate * 100)}%

## 4. Roteiro & Desenvolvimento (Corpo do Vídeo)
- **Pacing:** ${bodyData.pacing_and_mood}
- **Demonstrações Visuais Obrigatórias:**
${bodyData.demonstrations.map((d) => `  - [ ] ${d}`).join('\n')}

## 5. Chamada para Ação (CTA) & Destino
- **CTA:** ${bodyData.cta_text}
- **Link com UTMs:** \`https://housewhey.com.br/produtos/whey-isolado-baunilha?${bodyData.utm_parameters_template}\`

## 6. Restrições e Claims Proibidas (Compliance)
${mapaSolucao.forbidden_claims.map((c) => `> ⚠️ **PROIBIDO:** ${c}`).join('\n\n')}

## 7. Metas e Critérios de Sucesso
- **Hook Score Alvo:** >= 8.0/10
- **CPA Máximo Tolerado:** R$ 40,00
- **Taxa de Retenção:** >= 35%
`;

    briefs.push({
      brief_id: brief1Id,
      title: `Briefing de Hook Refresh — ${hookData.headline}`,
      client_id: input.client_id,
      brand_name: mapaSolucao.brand_name,
      target_audience: {
        persona: selectedPersona.persona,
        main_driver: selectedPersona.main_driver,
        pain_points: [
          'Desconforto digestivo e inchaço',
          'Sabor artificial e enjoativo',
          'Dúvidas sobre laudos e procedência'
        ]
      },
      core_offer: {
        product_name: bodyData.product_highlight,
        promise: mapaSolucao.promise,
        bundle_or_discount: 'Combo 2 Refis com 15% OFF + Frete Grátis'
      },
      strategic_angle: input.angle_focus,
      hook: hookData,
      body_and_offer: bodyData,
      forbidden_claims: mapaSolucao.forbidden_claims,
      technical_specs: {
        format: input.format_preference,
        aspect_ratio: input.format_preference === 'VIDEO_VERTICAL_9X16' ? '9:16' : '1:1',
        duration_seconds: '20s a 35s',
        safe_zones: 'Manter textos e rostos dentro dos 80% centrais verticais'
      },
      success_metrics: {
        target_hook_score: 8.0,
        target_cpa_brl: 40.0,
        target_retention_rate_percent: 35.0
      },
      rendered_markdown: markdownBrief,
      evidence_refs: [evidenceRef1],
      locators: [
        `app_mapa_solucao:${input.client_id}`,
        targetAdEval ? `creative_evaluation:${targetAdEval.ad_id}` : 'general_briefing'
      ]
    });

    const summary = `Briefing criativo gerado com sucesso para ${mapaSolucao.brand_name} sob a ótica de ${input.angle_focus}. O briefing contém roteiro estruturado de 3s para combater saturação criativa, diretrizes de compliance com 4 restrições estritas e especificações de formato para produção imediata.`;

    return {
      schemaVersion: '1.0.0',
      client_id: input.client_id,
      timeframe: input.timeframe,
      generated_at: now,
      briefs,
      executive_summary: summary,
      evidence_refs: allEvidenceRefs
    };
  }
}
