/**
 * @adzhub/runtime - Model Allowlist & Pricing Engine
 * Catálogo estrito de modelos permitidos, precificação por 1M tokens e cálculo de custo USD/BRL.
 */

export interface ModelMetadata {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  pricePromptUsdPer1M: number;
  priceCompletionUsdPer1M: number;
  supportsTools: boolean;
  supportsStructuredOutputs: boolean;
}

export const USD_TO_BRL_RATE = 5.5;

export const ALLOWED_MODELS: Record<string, ModelMetadata> = {
  'anthropic/claude-3.5-sonnet': {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    contextWindow: 200000,
    pricePromptUsdPer1M: 3.0,
    priceCompletionUsdPer1M: 15.0,
    supportsTools: true,
    supportsStructuredOutputs: true
  },
  'anthropic/claude-3-5-sonnet': {
    id: 'anthropic/claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    contextWindow: 200000,
    pricePromptUsdPer1M: 3.0,
    priceCompletionUsdPer1M: 15.0,
    supportsTools: true,
    supportsStructuredOutputs: true
  },
  'openai/gpt-4o': {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    contextWindow: 128000,
    pricePromptUsdPer1M: 2.5,
    priceCompletionUsdPer1M: 10.0,
    supportsTools: true,
    supportsStructuredOutputs: true
  },
  'openai/gpt-4o-mini': {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    contextWindow: 128000,
    pricePromptUsdPer1M: 0.15,
    priceCompletionUsdPer1M: 0.6,
    supportsTools: true,
    supportsStructuredOutputs: true
  },
  'google/gemini-2.5-flash': {
    id: 'google/gemini-2.5-flash',
    name: 'Google Gemini 2.5 Flash',
    provider: 'Google',
    contextWindow: 1048576,
    pricePromptUsdPer1M: 0.1,
    priceCompletionUsdPer1M: 0.4,
    supportsTools: true,
    supportsStructuredOutputs: true
  },
  'google/gemini-2.0-flash-001': {
    id: 'google/gemini-2.0-flash-001',
    name: 'Gemini 2.5 Flash (Google)',
    provider: 'Google',
    contextWindow: 1048576,
    pricePromptUsdPer1M: 0.1,
    priceCompletionUsdPer1M: 0.4,
    supportsTools: true,
    supportsStructuredOutputs: true
  },
  'google/gemini-2.0-flash': {
    id: 'google/gemini-2.0-flash',
    name: 'Gemini 2.5 Flash (Google)',
    provider: 'Google',
    contextWindow: 1048576,
    pricePromptUsdPer1M: 0.1,
    priceCompletionUsdPer1M: 0.4,
    supportsTools: true,
    supportsStructuredOutputs: true
  },
  'google/gemini-1.5-flash': {
    id: 'google/gemini-1.5-flash',
    name: 'Google Gemini 1.5 Flash',
    provider: 'Google',
    contextWindow: 1048576,
    pricePromptUsdPer1M: 0.075,
    priceCompletionUsdPer1M: 0.3,
    supportsTools: true,
    supportsStructuredOutputs: true
  },
  'google/gemini-1.5-pro': {
    id: 'google/gemini-1.5-pro',
    name: 'Google Gemini 1.5 Pro',
    provider: 'Google',
    contextWindow: 2097152,
    pricePromptUsdPer1M: 1.25,
    priceCompletionUsdPer1M: 5.0,
    supportsTools: true,
    supportsStructuredOutputs: true
  },
  'google/gemini-2.5-pro': {
    id: 'google/gemini-2.5-pro',
    name: 'Google Gemini 2.5 Pro',
    provider: 'Google',
    contextWindow: 2097152,
    pricePromptUsdPer1M: 1.25,
    priceCompletionUsdPer1M: 5.0,
    supportsTools: true,
    supportsStructuredOutputs: true
  },
  'meta-llama/llama-3.3-70b-instruct': {
    id: 'meta-llama/llama-3.3-70b-instruct',
    name: 'Llama 3.3 70B Instruct',
    provider: 'Meta',
    contextWindow: 128000,
    pricePromptUsdPer1M: 0.35,
    priceCompletionUsdPer1M: 0.4,
    supportsTools: true,
    supportsStructuredOutputs: true
  },
  'meta-llama/llama-3.1-70b-instruct': {
    id: 'meta-llama/llama-3.1-70b-instruct',
    name: 'Llama 3.1 70B Instruct',
    provider: 'Meta',
    contextWindow: 128000,
    pricePromptUsdPer1M: 0.35,
    priceCompletionUsdPer1M: 0.4,
    supportsTools: true,
    supportsStructuredOutputs: true
  },
  'deepseek/deepseek-chat': {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek V3 (Chat)',
    provider: 'DeepSeek',
    contextWindow: 64000,
    pricePromptUsdPer1M: 0.14,
    priceCompletionUsdPer1M: 0.28,
    supportsTools: true,
    supportsStructuredOutputs: true
  },
  'deepseek/deepseek-r1': {
    id: 'deepseek/deepseek-r1',
    name: 'DeepSeek R1 (Reasoning)',
    provider: 'DeepSeek',
    contextWindow: 64000,
    pricePromptUsdPer1M: 0.55,
    priceCompletionUsdPer1M: 2.19,
    supportsTools: true,
    supportsStructuredOutputs: true
  },
  'mock/test-model': {
    id: 'mock/test-model',
    name: 'Deterministic Test Model (In-Memory)',
    provider: 'Mock',
    contextWindow: 100000,
    pricePromptUsdPer1M: 0.0,
    priceCompletionUsdPer1M: 0.0,
    supportsTools: true,
    supportsStructuredOutputs: true
  },
  'mock/deterministic-agent': {
    id: 'mock/deterministic-agent',
    name: 'Mock Determinístico (Offline Demo)',
    provider: 'Mock',
    contextWindow: 100000,
    pricePromptUsdPer1M: 0.0,
    priceCompletionUsdPer1M: 0.0,
    supportsTools: true,
    supportsStructuredOutputs: true
  }
};

/**
 * Retorna true se o ID do modelo constar na allowlist.
 */
export function isModelAllowed(modelId: string): boolean {
  if (!modelId) return false;
  if (modelId.startsWith('mock/')) return true;
  if (Object.prototype.hasOwnProperty.call(ALLOWED_MODELS, modelId)) return true;
  const normalized = modelId.replace(/\./g, '-');
  return Object.keys(ALLOWED_MODELS).some((k) => k.replace(/\./g, '-') === normalized);
}

/**
 * Retorna os metadados do modelo a partir da allowlist.
 */
export function getModelMetadata(modelId: string): ModelMetadata | undefined {
  return ALLOWED_MODELS[modelId];
}

/**
 * Retorna a lista completa de modelos permitidos.
 */
export function getAllowedModelsList(): ModelMetadata[] {
  return Object.values(ALLOWED_MODELS);
}

/**
 * Calcula os custos em USD e BRL a partir do modelo e quantidade de tokens consumidos.
 */
export function calculateModelCost(
  modelId: string,
  promptTokens: number,
  completionTokens: number,
  customUsdRate?: number
): { costUsd: number; costBrl: number } {
  const meta = getModelMetadata(modelId) ?? {
    pricePromptUsdPer1M: 2.0,
    priceCompletionUsdPer1M: 8.0
  };

  const usdRate = customUsdRate ?? USD_TO_BRL_RATE;

  const promptCostUsd = (promptTokens / 1_000_000) * meta.pricePromptUsdPer1M;
  const completionCostUsd = (completionTokens / 1_000_000) * meta.priceCompletionUsdPer1M;
  const costUsd = Math.round((promptCostUsd + completionCostUsd) * 1_000_000) / 1_000_000;
  const costBrl = Math.round(costUsd * usdRate * 100_000) / 100_000;

  return {
    costUsd,
    costBrl
  };
}
