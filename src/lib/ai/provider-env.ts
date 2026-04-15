import "server-only";

import { type AIProvider } from "./model-catalog";

const PROVIDER_ENV_ALIASES: Record<AIProvider, string[]> = {
  anthropic: ["ANTHROPIC_API_KEY"],
  google: ["GOOGLE_GENERATIVE_AI_API_KEY", "GEMINI_API_KEY"],
  openai: ["OPENAI_API_KEY"],
  xai: ["XAI_API_KEY"],
};

export const getProviderEnvKeys = (provider: AIProvider) =>
  PROVIDER_ENV_ALIASES[provider];

export const getProviderApiKey = (provider: AIProvider) => {
  for (const envKey of PROVIDER_ENV_ALIASES[provider]) {
    const value = process.env[envKey]?.trim();

    if (value) {
      return value;
    }
  }

  return undefined;
};
