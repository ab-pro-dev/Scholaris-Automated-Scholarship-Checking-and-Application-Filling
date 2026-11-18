/**
 * AI Model Token Pricing & Cost Calculation Utility
 * Prices are in USD per 1,000,000 (1M) tokens.
 */

export interface ModelPricing {
  promptPerMillion: number;
  completionPerMillion: number;
}

export const AI_MODEL_PRICING: Record<string, ModelPricing> = {
  // Google Gemini
  'gemini-1.5-flash': {
    promptPerMillion: 0.075,
    completionPerMillion: 0.30,
  },
  'gemini-1.5-flash-8b': {
    promptPerMillion: 0.0375,
    completionPerMillion: 0.15,
  },
  'gemini-1.5-pro': {
    promptPerMillion: 1.25,
    completionPerMillion: 5.00,
  },
  'gemini-2.0-flash': {
    promptPerMillion: 0.10,
    completionPerMillion: 0.40,
  },

  // OpenRouter (Llama models)
  'meta-llama/llama-3.3-70b-instruct': {
    promptPerMillion: 0.12,
    completionPerMillion: 0.30,
  },
  'meta-llama/llama-3.1-8b-instruct': {
    promptPerMillion: 0.05,
    completionPerMillion: 0.05,
  },
  'anthropic/claude-3.5-sonnet': {
    promptPerMillion: 3.00,
    completionPerMillion: 15.00,
  },
};

const DEFAULT_PRICING: ModelPricing = {
  promptPerMillion: 0.10,
  completionPerMillion: 0.30,
};

/**
 * Calculates estimated USD cost for a given model, prompt tokens, and completion tokens.
 * Returns cost rounded to 6 decimal places.
 */
export function calculateAICost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const normalizedModel = (model || '').toLowerCase().trim();
  
  // Find matching pricing or prefix match
  let pricing = AI_MODEL_PRICING[normalizedModel];
  if (!pricing) {
    const key = Object.keys(AI_MODEL_PRICING).find((k) =>
      normalizedModel.includes(k.toLowerCase())
    );
    pricing = key ? AI_MODEL_PRICING[key] : DEFAULT_PRICING;
  }

  const promptCost = (promptTokens / 1_000_000) * pricing.promptPerMillion;
  const completionCost = (completionTokens / 1_000_000) * pricing.completionPerMillion;
  const totalCost = promptCost + completionCost;

  return Math.round(totalCost * 1_000_000) / 1_000_000;
}
