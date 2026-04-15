export const AI_MODEL_IDS = [
  "claude-sonnet-4-20250514",
  "claude-opus-4-1-20250805",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gpt-5-mini",
  "gpt-5.2",
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-120b",
  "grok-4",
  "grok-4.20-reasoning",
  "grok-3-mini",
] as const;

export type AIModelId = (typeof AI_MODEL_IDS)[number];
export type AIProvider = "anthropic" | "google" | "openai" | "groq" | "xai";

export interface AIModelDefinition {
  id: AIModelId;
  label: string;
  provider: AIProvider;
  tagline: string;
}

export const DEFAULT_AI_MODEL_ID: AIModelId = "gemini-2.5-flash";

export const AI_MODELS: Record<AIModelId, AIModelDefinition> = {
  "claude-sonnet-4-20250514": {
    id: "claude-sonnet-4-20250514",
    label: "Claude Sonnet 4",
    provider: "anthropic",
    tagline: "Balanced coding model for everyday builds and edits.",
  },
  "claude-opus-4-1-20250805": {
    id: "claude-opus-4-1-20250805",
    label: "Claude Opus 4.1",
    provider: "anthropic",
    tagline: "Highest-end Claude model for deeper project work.",
  },
  "gemini-2.5-flash": {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "google",
    tagline: "Fastest Gemini option for quick generation and iteration.",
  },
  "gemini-2.5-pro": {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    provider: "google",
    tagline: "Google’s strongest coding and reasoning model.",
  },
  "gpt-5-mini": {
    id: "gpt-5-mini",
    label: "GPT-5 mini",
    provider: "openai",
    tagline: "Fast OpenAI model for lighter edits and prompts.",
  },
  "gpt-5.2": {
    id: "gpt-5.2",
    label: "GPT-5.2",
    provider: "openai",
    tagline: "OpenAI’s flagship model for complex coding work.",
  },
  "llama-3.3-70b-versatile": {
    id: "llama-3.3-70b-versatile",
    label: "Llama 3.3 70B Versatile",
    provider: "groq",
    tagline: "Fast Groq-hosted Meta model for general coding and chat work.",
  },
  "openai/gpt-oss-120b": {
    id: "openai/gpt-oss-120b",
    label: "GPT-OSS 120B",
    provider: "groq",
    tagline: "High-capability Groq-hosted open model for deeper engineering tasks.",
  },
  "grok-4": {
    id: "grok-4",
    label: "Grok 4",
    provider: "xai",
    tagline: "xAI’s general flagship model for strong reasoning and generation.",
  },
  "grok-4.20-reasoning": {
    id: "grok-4.20-reasoning",
    label: "Grok 4.20 Reasoning",
    provider: "xai",
    tagline: "xAI’s coding-oriented reasoning model for heavier engineering tasks.",
  },
  "grok-3-mini": {
    id: "grok-3-mini",
    label: "Grok 3 Mini",
    provider: "xai",
    tagline: "Lower-latency Grok option for lighter edits and fast iteration.",
  },
};

export const AI_PROVIDER_LABELS: Record<AIProvider, string> = {
  anthropic: "Anthropic",
  google: "Google",
  openai: "OpenAI",
  groq: "Groq",
  xai: "xAI",
};

export const AI_PROVIDER_ORDER: AIProvider[] = [
  "anthropic",
  "google",
  "openai",
  "groq",
  "xai",
];

export const isAIModelId = (value: string): value is AIModelId =>
  AI_MODEL_IDS.includes(value as AIModelId);

export const getAIModelDefinition = (modelId?: string | null) => {
  if (modelId && isAIModelId(modelId)) {
    return AI_MODELS[modelId];
  }

  return AI_MODELS[DEFAULT_AI_MODEL_ID];
};

export const getAIModelsByProvider = (provider: AIProvider) =>
  AI_MODEL_IDS.map((modelId) => AI_MODELS[modelId]).filter(
    (model) => model.provider === provider,
  );
