export type ModelPricing = {
  provider: string;
  model: string;
  inputPer1M: number;  // USD per 1M input tokens
  outputPer1M: number; // USD per 1M output tokens
  contextWindow?: number;
};

export const MODEL_PRICING: ModelPricing[] = [
  // OpenAI
  { provider: "openai", model: "gpt-4o", inputPer1M: 2.5, outputPer1M: 10.0, contextWindow: 128000 },
  { provider: "openai", model: "gpt-4o-mini", inputPer1M: 0.15, outputPer1M: 0.60, contextWindow: 128000 },
  { provider: "openai", model: "gpt-4-turbo", inputPer1M: 10.0, outputPer1M: 30.0, contextWindow: 128000 },
  { provider: "openai", model: "gpt-4-turbo-preview", inputPer1M: 10.0, outputPer1M: 30.0, contextWindow: 128000 },
  { provider: "openai", model: "gpt-4", inputPer1M: 30.0, outputPer1M: 60.0, contextWindow: 8192 },
  { provider: "openai", model: "gpt-3.5-turbo", inputPer1M: 0.5, outputPer1M: 1.5, contextWindow: 16385 },
  { provider: "openai", model: "gpt-3.5-turbo-instruct", inputPer1M: 1.5, outputPer1M: 2.0, contextWindow: 4096 },

  // Anthropic
  { provider: "anthropic", model: "claude-opus-4-6", inputPer1M: 15.0, outputPer1M: 75.0, contextWindow: 200000 },
  { provider: "anthropic", model: "claude-opus-4", inputPer1M: 15.0, outputPer1M: 75.0, contextWindow: 200000 },
  { provider: "anthropic", model: "claude-sonnet-4-6", inputPer1M: 3.0, outputPer1M: 15.0, contextWindow: 200000 },
  { provider: "anthropic", model: "claude-sonnet-4", inputPer1M: 3.0, outputPer1M: 15.0, contextWindow: 200000 },
  { provider: "anthropic", model: "claude-3-5-sonnet-20241022", inputPer1M: 3.0, outputPer1M: 15.0, contextWindow: 200000 },
  { provider: "anthropic", model: "claude-3-5-haiku-20241022", inputPer1M: 0.8, outputPer1M: 4.0, contextWindow: 200000 },
  { provider: "anthropic", model: "claude-3-opus-20240229", inputPer1M: 15.0, outputPer1M: 75.0, contextWindow: 200000 },
  { provider: "anthropic", model: "claude-3-sonnet-20240229", inputPer1M: 3.0, outputPer1M: 15.0, contextWindow: 200000 },
  { provider: "anthropic", model: "claude-3-haiku-20240307", inputPer1M: 0.25, outputPer1M: 1.25, contextWindow: 200000 },
  { provider: "anthropic", model: "claude-haiku-4-5", inputPer1M: 0.8, outputPer1M: 4.0, contextWindow: 200000 },

  // Google
  { provider: "google", model: "gemini-1.5-pro", inputPer1M: 3.5, outputPer1M: 10.5, contextWindow: 2000000 },
  { provider: "google", model: "gemini-1.5-flash", inputPer1M: 0.075, outputPer1M: 0.30, contextWindow: 1000000 },
  { provider: "google", model: "gemini-1.5-flash-8b", inputPer1M: 0.0375, outputPer1M: 0.15, contextWindow: 1000000 },
  { provider: "google", model: "gemini-2.0-flash", inputPer1M: 0.1, outputPer1M: 0.4, contextWindow: 1000000 },
  { provider: "google", model: "gemini-pro", inputPer1M: 0.5, outputPer1M: 1.5, contextWindow: 32768 },

  // Mistral
  { provider: "mistral", model: "mistral-large-latest", inputPer1M: 3.0, outputPer1M: 9.0, contextWindow: 128000 },
  { provider: "mistral", model: "mistral-large-2411", inputPer1M: 3.0, outputPer1M: 9.0, contextWindow: 128000 },
  { provider: "mistral", model: "mistral-medium-latest", inputPer1M: 2.7, outputPer1M: 8.1, contextWindow: 32768 },
  { provider: "mistral", model: "mistral-small-latest", inputPer1M: 0.2, outputPer1M: 0.6, contextWindow: 32768 },
  { provider: "mistral", model: "mistral-7b-instruct", inputPer1M: 0.25, outputPer1M: 0.25, contextWindow: 32768 },
  { provider: "mistral", model: "codestral-latest", inputPer1M: 0.2, outputPer1M: 0.6, contextWindow: 256000 },

  // Cohere
  { provider: "cohere", model: "command-r-plus", inputPer1M: 2.5, outputPer1M: 10.0, contextWindow: 128000 },
  { provider: "cohere", model: "command-r", inputPer1M: 0.15, outputPer1M: 0.60, contextWindow: 128000 },
  { provider: "cohere", model: "command", inputPer1M: 1.0, outputPer1M: 2.0, contextWindow: 4096 },

  // Groq (Llama pricing)
  { provider: "groq", model: "llama-3.1-70b-versatile", inputPer1M: 0.59, outputPer1M: 0.79, contextWindow: 128000 },
  { provider: "groq", model: "llama-3.1-8b-instant", inputPer1M: 0.05, outputPer1M: 0.08, contextWindow: 128000 },
  { provider: "groq", model: "llama-3.3-70b-versatile", inputPer1M: 0.59, outputPer1M: 0.79, contextWindow: 128000 },
  { provider: "groq", model: "mixtral-8x7b-32768", inputPer1M: 0.27, outputPer1M: 0.27, contextWindow: 32768 },

  // AWS Bedrock (Claude via Bedrock)
  { provider: "bedrock", model: "anthropic.claude-3-sonnet-20240229-v1:0", inputPer1M: 3.0, outputPer1M: 15.0, contextWindow: 200000 },
  { provider: "bedrock", model: "anthropic.claude-3-haiku-20240307-v1:0", inputPer1M: 0.25, outputPer1M: 1.25, contextWindow: 200000 },
  { provider: "bedrock", model: "meta.llama3-70b-instruct-v1:0", inputPer1M: 2.65, outputPer1M: 3.5, contextWindow: 128000 },
];

const FALLBACK_PRICING: ModelPricing = {
  provider: "unknown",
  model: "unknown",
  inputPer1M: 1.0,
  outputPer1M: 3.0,
};

export function getModelPricing(model: string, provider?: string): ModelPricing {
  const normalizedModel = model.toLowerCase().trim();
  const normalizedProvider = provider?.toLowerCase().trim();

  // Exact match first
  let found = MODEL_PRICING.find(
    (p) => p.model.toLowerCase() === normalizedModel &&
      (!normalizedProvider || p.provider.toLowerCase() === normalizedProvider)
  );

  if (found) return found;

  // Partial match on model name
  found = MODEL_PRICING.find(
    (p) => normalizedModel.includes(p.model.toLowerCase()) ||
      p.model.toLowerCase().includes(normalizedModel)
  );

  if (found) return found;

  // Provider-only fallback
  if (normalizedProvider) {
    found = MODEL_PRICING.find((p) => p.provider.toLowerCase() === normalizedProvider);
    if (found) return found;
  }

  return { ...FALLBACK_PRICING, provider: provider || "unknown", model };
}

export function calculateCost(
  promptTokens: number,
  completionTokens: number,
  model: string,
  provider?: string
): { inputCost: number; outputCost: number; totalCost: number; pricing: ModelPricing } {
  const pricing = getModelPricing(model, provider);
  const inputCost = (promptTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (completionTokens / 1_000_000) * pricing.outputPer1M;
  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    pricing,
  };
}

export function detectProvider(model: string, hostHeader?: string): string {
  const m = model.toLowerCase();
  if (m.startsWith("gpt") || m.includes("openai")) return "openai";
  if (m.startsWith("claude") || m.includes("anthropic")) return "anthropic";
  if (m.startsWith("gemini") || m.includes("google")) return "google";
  if (m.startsWith("mistral") || m.includes("mixtral") || m.includes("codestral")) return "mistral";
  if (m.startsWith("command") || m.includes("cohere")) return "cohere";
  if (m.includes("llama") || m.includes("groq")) return "groq";
  if (m.includes("bedrock") || m.includes("anthropic.")) return "bedrock";
  return "unknown";
}

export function formatCost(cost: number): string {
  if (cost < 0.01) return `$${(cost * 100).toFixed(4)}¢`;
  if (cost < 1) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

export function getProviderColor(provider: string): string {
  const colors: Record<string, string> = {
    openai: "#74aa9c",
    anthropic: "#d97706",
    google: "#4285f4",
    mistral: "#ff6b6b",
    cohere: "#39d353",
    groq: "#a855f7",
    bedrock: "#f97316",
    unknown: "#6b7280",
  };
  return colors[provider.toLowerCase()] || colors.unknown;
}
