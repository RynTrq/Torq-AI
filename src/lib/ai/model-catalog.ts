export const AI_MODEL_IDS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "arcee-ai/trinity-large-preview:free",
  "z-ai/glm-4.5-air:free",
  "openai/gpt-oss-120b:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "minimax/minimax-m2.5:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
  "google/gemma-4-26b-a4b-it:free",
  "openai/gpt-oss-20b:free",
  "nvidia/llama-nemotron-embed-vl-1b-v2:free",
  "qwen/qwen3-coder:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "liquid/lfm-2.5-1.2b-thinking:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "liquid/lfm-2.5-1.2b-instruct:free",
  "google/gemma-3-27b-it:free",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "google/gemma-3-4b-it:free",
  "google/gemma-3n-e4b-it:free",
  "google/gemma-3n-e2b-it:free",
  "google/gemma-3-12b-it:free",
  "meta-llama/llama-guard-4-12b:free",
  "grok-4",
  "grok-4.20-reasoning",
  "grok-3-mini",
] as const;

export type AIModelId = (typeof AI_MODEL_IDS)[number];
export type AIProvider = "openrouter" | "xai";

export interface AIModelDefinition {
  id: AIModelId;
  label: string;
  provider: AIProvider;
  tagline: string;
}

export const DEFAULT_AI_MODEL_ID: AIModelId = "qwen/qwen3-coder:free";

export const AI_MODELS: Record<AIModelId, AIModelDefinition> = {
  "nvidia/nemotron-3-super-120b-a12b:free": {
    id: "nvidia/nemotron-3-super-120b-a12b:free",
    label: "NVIDIA Nemotron 3 Super",
    provider: "openrouter",
    tagline: "Large open reasoning model for heavier coding and generation tasks.",
  },
  "arcee-ai/trinity-large-preview:free": {
    id: "arcee-ai/trinity-large-preview:free",
    label: "Arcee Trinity Large Preview",
    provider: "openrouter",
    tagline: "Preview large model for broad reasoning and coding workflows.",
  },
  "z-ai/glm-4.5-air:free": {
    id: "z-ai/glm-4.5-air:free",
    label: "Z.ai GLM 4.5 Air",
    provider: "openrouter",
    tagline: "Lower-latency general model for everyday edits and chat.",
  },
  "openai/gpt-oss-120b:free": {
    id: "openai/gpt-oss-120b:free",
    label: "OpenAI GPT-OSS 120B",
    provider: "openrouter",
    tagline: "High-capability open model suited to deeper engineering tasks.",
  },
  "nvidia/nemotron-3-nano-30b-a3b:free": {
    id: "nvidia/nemotron-3-nano-30b-a3b:free",
    label: "NVIDIA Nemotron 3 Nano 30B A3B",
    provider: "openrouter",
    tagline: "Smaller NVIDIA reasoning model for fast iterative work.",
  },
  "minimax/minimax-m2.5:free": {
    id: "minimax/minimax-m2.5:free",
    label: "MiniMax M2.5",
    provider: "openrouter",
    tagline: "General-purpose model tuned for balanced speed and quality.",
  },
  "nvidia/nemotron-nano-9b-v2:free": {
    id: "nvidia/nemotron-nano-9b-v2:free",
    label: "NVIDIA Nemotron Nano 9B V2",
    provider: "openrouter",
    tagline: "Compact NVIDIA model for quick prompts and lightweight edits.",
  },
  "google/gemma-4-31b-it:free": {
    id: "google/gemma-4-31b-it:free",
    label: "Google Gemma 4 31B",
    provider: "openrouter",
    tagline: "Larger Gemma instruct model for stronger reasoning depth.",
  },
  "nvidia/nemotron-nano-12b-v2-vl:free": {
    id: "nvidia/nemotron-nano-12b-v2-vl:free",
    label: "NVIDIA Nemotron Nano 12B 2 VL",
    provider: "openrouter",
    tagline: "Vision-language model for multimodal prompts and analysis.",
  },
  "google/gemma-4-26b-a4b-it:free": {
    id: "google/gemma-4-26b-a4b-it:free",
    label: "Google Gemma 4 26B A4B",
    provider: "openrouter",
    tagline: "Balanced Gemma 4 variant for cost-aware reasoning workloads.",
  },
  "openai/gpt-oss-20b:free": {
    id: "openai/gpt-oss-20b:free",
    label: "OpenAI GPT-OSS 20B",
    provider: "openrouter",
    tagline: "Smaller GPT-OSS option for faster interactive responses.",
  },
  "nvidia/llama-nemotron-embed-vl-1b-v2:free": {
    id: "nvidia/llama-nemotron-embed-vl-1b-v2:free",
    label: "NVIDIA Llama Nemotron Embed VL 1B V2",
    provider: "openrouter",
    tagline: "Specialized VL model exposed in the catalog per requested provider set.",
  },
  "qwen/qwen3-coder:free": {
    id: "qwen/qwen3-coder:free",
    label: "Qwen3 Coder 480B A35B",
    provider: "openrouter",
    tagline: "Coding-first model and the default choice for project generation.",
  },
  "meta-llama/llama-3.3-70b-instruct:free": {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    label: "Meta Llama 3.3 70B Instruct",
    provider: "openrouter",
    tagline: "Strong general instruct model for coding and planning work.",
  },
  "liquid/lfm-2.5-1.2b-thinking:free": {
    id: "liquid/lfm-2.5-1.2b-thinking:free",
    label: "LiquidAI LFM2.5 1.2B Thinking",
    provider: "openrouter",
    tagline: "Tiny reasoning model optimized for low-latency thought-heavy prompts.",
  },
  "qwen/qwen3-next-80b-a3b-instruct:free": {
    id: "qwen/qwen3-next-80b-a3b-instruct:free",
    label: "Qwen3 Next 80B A3B Instruct",
    provider: "openrouter",
    tagline: "Large instruct model for stronger synthesis and code generation.",
  },
  "liquid/lfm-2.5-1.2b-instruct:free": {
    id: "liquid/lfm-2.5-1.2b-instruct:free",
    label: "LiquidAI LFM2.5 1.2B Instruct",
    provider: "openrouter",
    tagline: "Tiny instruct model for ultra-fast lightweight interactions.",
  },
  "google/gemma-3-27b-it:free": {
    id: "google/gemma-3-27b-it:free",
    label: "Google Gemma 3 27B",
    provider: "openrouter",
    tagline: "Larger Gemma 3 model for robust instruction following.",
  },
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free": {
    id: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
    label: "Venice Uncensored",
    provider: "openrouter",
    tagline: "Unfiltered open model variant for broader response behavior.",
  },
  "nousresearch/hermes-3-llama-3.1-405b:free": {
    id: "nousresearch/hermes-3-llama-3.1-405b:free",
    label: "Nous Hermes 3 405B Instruct",
    provider: "openrouter",
    tagline: "Very large open instruct model for complex multi-step reasoning.",
  },
  "meta-llama/llama-3.2-3b-instruct:free": {
    id: "meta-llama/llama-3.2-3b-instruct:free",
    label: "Meta Llama 3.2 3B Instruct",
    provider: "openrouter",
    tagline: "Fast compact instruct model for quick turnarounds.",
  },
  "google/gemma-3-4b-it:free": {
    id: "google/gemma-3-4b-it:free",
    label: "Google Gemma 3 4B",
    provider: "openrouter",
    tagline: "Small Gemma model for speed-focused generation.",
  },
  "google/gemma-3n-e4b-it:free": {
    id: "google/gemma-3n-e4b-it:free",
    label: "Google Gemma 3n 4B",
    provider: "openrouter",
    tagline: "Compact Gemma 3n model for low-latency general tasks.",
  },
  "google/gemma-3n-e2b-it:free": {
    id: "google/gemma-3n-e2b-it:free",
    label: "Google Gemma 3n 2B",
    provider: "openrouter",
    tagline: "Ultra-small Gemma option for the lightest workloads.",
  },
  "google/gemma-3-12b-it:free": {
    id: "google/gemma-3-12b-it:free",
    label: "Google Gemma 3 12B",
    provider: "openrouter",
    tagline: "Mid-sized Gemma model for balanced speed and quality.",
  },
  "meta-llama/llama-guard-4-12b:free": {
    id: "meta-llama/llama-guard-4-12b:free",
    label: "Meta Llama Guard 4 12B",
    provider: "openrouter",
    tagline: "Safety-oriented model exposed in the catalog per requested provider set.",
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
  openrouter: "OpenRouter",
  xai: "xAI",
};

export const AI_PROVIDER_ORDER: AIProvider[] = ["openrouter", "xai"];

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
