import "server-only";

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";
import {
  anthropic as agentAnthropic,
  gemini,
  grok,
  openai as agentOpenAI,
} from "@inngest/agent-kit";

import {
  AI_MODELS,
  AI_MODEL_IDS,
  DEFAULT_AI_MODEL_ID,
  type AIModelDefinition,
  type AIProvider,
  isAIModelId,
} from "./model-catalog";
import { getAIModelHealth } from "./model-health-server";
import { isModelAvailable } from "./model-health";
import { getProviderApiKey, getProviderEnvKeys } from "./provider-env";

interface AgentKitDefaultParameters {
  max_tokens?: number;
  temperature?: number;
}

export const isProviderConfigured = (provider: AIProvider) =>
  Boolean(getProviderApiKey(provider));

export const getCandidateAIModels = (
  requestedModelId?: string | null,
): AIModelDefinition[] => {
  const candidates: AIModelDefinition[] = [];
  const seen = new Set<string>();
  const requestedModel =
    requestedModelId && isAIModelId(requestedModelId)
      ? AI_MODELS[requestedModelId]
      : undefined;

  const addCandidate = (model?: AIModelDefinition) => {
    if (!model || seen.has(model.id) || !isProviderConfigured(model.provider)) {
      return;
    }

    seen.add(model.id);
    candidates.push(model);
  };

  addCandidate(requestedModel);

  // After the requested model, prefer jumping to other providers before
  // trying another model from the same provider. This avoids wasting a turn
  // when an entire provider is unavailable because of billing/quota issues.
  for (const modelId of AI_MODEL_IDS) {
    const model = AI_MODELS[modelId];
    if (model.provider !== requestedModel?.provider) {
      addCandidate(model);
    }
  }

  addCandidate(AI_MODELS[DEFAULT_AI_MODEL_ID]);

  for (const modelId of AI_MODEL_IDS) {
    const model = AI_MODELS[modelId];
    if (model.provider === requestedModel?.provider) {
      addCandidate(model);
    }
  }

  for (const modelId of AI_MODEL_IDS) {
    addCandidate(AI_MODELS[modelId]);
  }

  return candidates;
};

export const resolveAIModel = (requestedModelId?: string | null): AIModelDefinition => {
  const firstAvailable = getCandidateAIModels(requestedModelId)[0];

  if (firstAvailable) {
    return firstAvailable;
  }

  throw new Error(
    `No AI provider is configured. Add ${getProviderEnvKeys("anthropic")[0]}, ${getProviderEnvKeys("google").join(" or ")}, ${getProviderEnvKeys("openai")[0]}, or ${getProviderEnvKeys("xai")[0]}.`,
  );
};

export const getHealthyCandidateAIModels = async (
  requestedModelId?: string | null,
) => {
  const candidates = getCandidateAIModels(requestedModelId);
  const healthyCandidates: AIModelDefinition[] = [];

  for (const candidate of candidates) {
    const health = await getAIModelHealth(candidate.id);

    if (isModelAvailable(health)) {
      healthyCandidates.push(candidate);
    }
  }

  return healthyCandidates;
};

export const resolveHealthyAIModel = async (
  requestedModelId?: string | null,
): Promise<AIModelDefinition> => {
  const healthyCandidates = await getHealthyCandidateAIModels(requestedModelId);

  if (healthyCandidates[0]) {
    return healthyCandidates[0];
  }

  const fallback = getCandidateAIModels(requestedModelId)[0];

  if (fallback) {
    return fallback;
  }

  throw new Error(
    `No AI provider is configured. Add ${getProviderEnvKeys("anthropic")[0]}, ${getProviderEnvKeys("google").join(" or ")}, ${getProviderEnvKeys("openai")[0]}, or ${getProviderEnvKeys("xai")[0]}.`,
  );
};

const anthropicProvider = createAnthropic({
  apiKey: getProviderApiKey("anthropic"),
});

const googleProvider = createGoogleGenerativeAI({
  apiKey: getProviderApiKey("google"),
});

const openAIProvider = createOpenAI({
  apiKey: getProviderApiKey("openai"),
});

const xaiProvider = createXai({
  apiKey: getProviderApiKey("xai"),
});

export const getSdkModelByDefinition = (resolvedModel: AIModelDefinition) => {
  switch (resolvedModel.provider) {
    case "anthropic":
      return {
        resolvedModel,
        model: anthropicProvider(resolvedModel.id),
      };
    case "google":
      return {
        resolvedModel,
        model: googleProvider(resolvedModel.id),
      };
    case "openai":
      return {
        resolvedModel,
        model: openAIProvider(resolvedModel.id),
      };
    case "xai":
      return {
        resolvedModel,
        model: xaiProvider(resolvedModel.id),
      };
  }
};

export const getSdkModel = (requestedModelId?: string | null) => {
  const resolvedModel = resolveAIModel(requestedModelId);

  return getSdkModelByDefinition(resolvedModel);
};

export const getHealthySdkModel = async (requestedModelId?: string | null) => {
  const resolvedModel = await resolveHealthyAIModel(requestedModelId);

  return getSdkModelByDefinition(resolvedModel);
};

export const getAgentKitModelByDefinition = (
  resolvedModel: AIModelDefinition,
  defaultParameters?: AgentKitDefaultParameters,
) => {
  switch (resolvedModel.provider) {
    case "anthropic":
      return {
        resolvedModel,
        model: agentAnthropic({
          apiKey: getProviderApiKey("anthropic"),
          model: resolvedModel.id,
          defaultParameters: {
            max_tokens: defaultParameters?.max_tokens ?? 8192,
            ...(defaultParameters?.temperature !== undefined
              ? { temperature: defaultParameters.temperature }
              : {}),
          },
        }),
      };
    case "google":
      return {
        resolvedModel,
        model: gemini({
          apiKey: getProviderApiKey("google"),
          model: resolvedModel.id,
          ...(defaultParameters?.max_tokens !== undefined ||
          defaultParameters?.temperature !== undefined
            ? {
                defaultParameters: {
                  generationConfig: {
                    ...(defaultParameters?.max_tokens !== undefined
                      ? { maxOutputTokens: defaultParameters.max_tokens }
                      : {}),
                    ...(defaultParameters?.temperature !== undefined
                      ? { temperature: defaultParameters.temperature }
                      : {}),
                  },
                },
              }
            : {}),
        }),
      };
    case "openai":
      return {
        resolvedModel,
        model: agentOpenAI({
          apiKey: getProviderApiKey("openai"),
          model: resolvedModel.id,
          ...(defaultParameters?.max_tokens !== undefined ||
          defaultParameters?.temperature !== undefined
            ? {
                defaultParameters: {
                  ...(defaultParameters?.max_tokens !== undefined
                    ? { max_completion_tokens: defaultParameters.max_tokens }
                    : {}),
                  ...(defaultParameters?.temperature !== undefined
                    ? { temperature: defaultParameters.temperature }
                    : {}),
                },
              }
            : {}),
        }),
      };
    case "xai":
      return {
        resolvedModel,
        model: grok({
          apiKey: getProviderApiKey("xai"),
          model: resolvedModel.id,
          ...(defaultParameters?.max_tokens !== undefined ||
          defaultParameters?.temperature !== undefined
            ? {
                defaultParameters: {
                  ...(defaultParameters?.max_tokens !== undefined
                    ? { max_tokens: defaultParameters.max_tokens }
                    : {}),
                  ...(defaultParameters?.temperature !== undefined
                    ? { temperature: defaultParameters.temperature }
                    : {}),
                },
              }
            : {}),
        }),
      };
  }
};

export const getAgentKitModel = (
  requestedModelId?: string | null,
  defaultParameters?: AgentKitDefaultParameters,
) => {
  const resolvedModel = resolveAIModel(requestedModelId);

  return getAgentKitModelByDefinition(resolvedModel, defaultParameters);
};
