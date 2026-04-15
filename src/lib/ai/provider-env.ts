import "server-only";

import { type AIProvider } from "./model-catalog";

const PROVIDER_KEY_ENV_ALIASES: Record<AIProvider, string[]> = {
  openrouter: [
    "ANTHROPIC_AUTH_TOKEN",
    "OPENROUTER_API_KEY",
    "ANTHROPIC_API_KEY",
  ],
  xai: ["XAI_API_KEY"],
};

const PROVIDER_BASE_URL_ENV_ALIASES: Partial<Record<AIProvider, string[]>> = {
  openrouter: ["ANTHROPIC_BASE_URL", "OPENROUTER_BASE_URL"],
};

export const getProviderEnvKeys = (provider: AIProvider) =>
  PROVIDER_KEY_ENV_ALIASES[provider];

export const getProviderApiKey = (provider: AIProvider) => {
  for (const envKey of PROVIDER_KEY_ENV_ALIASES[provider]) {
    const value = process.env[envKey]?.trim();

    if (value) {
      return value;
    }
  }

  return undefined;
};

export const getProviderBaseUrl = (provider: AIProvider) => {
  for (const envKey of PROVIDER_BASE_URL_ENV_ALIASES[provider] ?? []) {
    const value = process.env[envKey]?.trim();

    if (value) {
      return value;
    }
  }

  return provider === "openrouter" ? "https://openrouter.ai/api" : undefined;
};
