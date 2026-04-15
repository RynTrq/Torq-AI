import "server-only";

import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";
import {
  anthropic as agentAnthropic,
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
import { getAIModelHealth, getCachedAIModelHealth } from "./model-health-server";
import { isModelAvailable } from "./model-health";
import {
  getProviderApiKey,
  getProviderBaseUrl,
  getProviderEnvKeys,
} from "./provider-env";

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

const getNoProviderConfiguredError = () =>
  `No AI provider is configured. Add ${getProviderEnvKeys("openrouter").join(" or ")}, ${getProviderEnvKeys("groq")[0]}, or ${getProviderEnvKeys("xai")[0]}.`;

export const resolveAIModel = (
  requestedModelId?: string | null,
): AIModelDefinition => {
  const firstAvailable = getCandidateAIModels(requestedModelId)[0];

  if (firstAvailable) {
    return firstAvailable;
  }

  throw new Error(getNoProviderConfiguredError());
};

export const getHealthyCandidateAIModels = async (
  requestedModelId?: string | null,
) => {
  const candidates = getCandidateAIModels(requestedModelId);
  const healthByModelId = new Map(
    (
      await Promise.all(
        candidates.map(async (candidate) => [
          candidate.id,
          await getAIModelHealth(candidate.id),
        ] as const),
      )
    ).map(([modelId, health]) => [modelId, health]),
  );

  return candidates.filter((candidate) =>
    isModelAvailable(healthByModelId.get(candidate.id)),
  );
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

  throw new Error(getNoProviderConfiguredError());
};

export const resolveResponsiveAIModel = (
  requestedModelId?: string | null,
): AIModelDefinition => {
  const candidates = getCandidateAIModels(requestedModelId);

  for (const candidate of candidates) {
    if (isModelAvailable(getCachedAIModelHealth(candidate.id))) {
      return candidate;
    }
  }

  const uncheckedCandidate = candidates.find(
    (candidate) => !getCachedAIModelHealth(candidate.id),
  );

  if (uncheckedCandidate) {
    return uncheckedCandidate;
  }

  const fallback = candidates[0];

  if (fallback) {
    return fallback;
  }

  throw new Error(getNoProviderConfiguredError());
};

const openRouterProvider = createAnthropic({
  apiKey: getProviderApiKey("openrouter"),
  baseURL: getProviderBaseUrl("openrouter"),
  name: "openrouter.messages",
});

const groqProvider = createOpenAI({
  apiKey: getProviderApiKey("groq"),
  baseURL: "https://api.groq.com/openai/v1",
});

const xaiProvider = createXai({
  apiKey: getProviderApiKey("xai"),
});

export const getSdkModelByDefinition = (resolvedModel: AIModelDefinition) => {
  switch (resolvedModel.provider) {
    case "openrouter":
      return {
        resolvedModel,
        model: openRouterProvider(resolvedModel.id),
      };
    case "groq":
      return {
        resolvedModel,
        model: groqProvider(resolvedModel.id),
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

export const getResponsiveSdkModel = (requestedModelId?: string | null) => {
  const resolvedModel = resolveResponsiveAIModel(requestedModelId);

  return getSdkModelByDefinition(resolvedModel);
};

export const getAgentKitModelByDefinition = (
  resolvedModel: AIModelDefinition,
  defaultParameters?: AgentKitDefaultParameters,
) => {
  switch (resolvedModel.provider) {
    case "openrouter":
      return {
        resolvedModel,
        model: agentAnthropic({
          apiKey: getProviderApiKey("openrouter"),
          baseUrl: getProviderBaseUrl("openrouter"),
          model: resolvedModel.id,
          defaultParameters: {
            max_tokens: defaultParameters?.max_tokens ?? 8192,
            ...(defaultParameters?.temperature !== undefined
              ? { temperature: defaultParameters.temperature }
              : {}),
          },
        }),
      };
    case "groq":
      return {
        resolvedModel,
        model: agentOpenAI({
          apiKey: getProviderApiKey("groq"),
          baseUrl: "https://api.groq.com/openai/v1",
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
