import "server-only";

import {
  AI_MODELS,
  AI_MODEL_IDS,
  type AIModelDefinition,
  type AIModelId,
} from "./model-catalog";
import { type AIModelHealth, type AIModelHealthStatus } from "./model-health";
import { getProviderApiKey, getProviderBaseUrl } from "./provider-env";

const HEALTH_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_DETAIL_LENGTH = 240;
const HEALTH_PROBE_TIMEOUT_MS = 15_000;

const healthCache = new Map<AIModelId, AIModelHealth>();

const trimDetail = (detail?: string | null) => {
  if (!detail) {
    return undefined;
  }

  return detail.length > MAX_DETAIL_LENGTH
    ? `${detail.slice(0, MAX_DETAIL_LENGTH - 3).trimEnd()}...`
    : detail;
};

const getConfiguredKey = (model: AIModelDefinition) => {
  switch (model.provider) {
    case "openrouter":
      return getProviderApiKey("openrouter");
    case "groq":
      return getProviderApiKey("groq");
    case "xai":
      return getProviderApiKey("xai");
  }
};

const parseResponseDetail = async (response: Response) => {
  if (response.ok) {
    return undefined;
  }

  const text = await response.text();

  try {
    const body = JSON.parse(text) as Record<string, unknown>;

    if (typeof body.error === "string") {
      return trimDetail(body.error);
    }

    if (body.error && typeof body.error === "object") {
      const nested = body.error as Record<string, unknown>;
      if (typeof nested.message === "string") {
        return trimDetail(nested.message);
      }
    }

    if (typeof body.message === "string") {
      return trimDetail(body.message);
    }
  } catch {
    return trimDetail(text);
  }

  return trimDetail(text);
};

const inferHealthStatus = ({
  detail,
  response,
}: {
  detail?: string;
  response: Response;
}): AIModelHealthStatus => {
  if (response.ok) {
    return "available";
  }

  if (response.status === 401 || response.status === 403) {
    return "invalid_key";
  }

  if (
    response.status === 404 ||
    detail?.toLowerCase().includes("model not found") ||
    detail?.toLowerCase().includes("unsupported model")
  ) {
    return "unsupported_model";
  }

  if (
    response.status === 429 ||
    detail?.toLowerCase().includes("quota") ||
    detail?.toLowerCase().includes("credit balance is too low") ||
    detail?.toLowerCase().includes("billing")
  ) {
    return "quota_exceeded";
  }

  return "error";
};

const probeModel = async (model: AIModelDefinition): Promise<AIModelHealth> => {
  const apiKey = getConfiguredKey(model);
  const signal = AbortSignal.timeout(HEALTH_PROBE_TIMEOUT_MS);

  if (!apiKey) {
    return {
      checkedAt: Date.now(),
      detail: "No API key configured for this provider.",
      modelId: model.id,
      status: "unconfigured",
    };
  }

  let response: Response;

  switch (model.provider) {
    case "openrouter":
      response = await fetch(`${getProviderBaseUrl("openrouter")}/v1/messages`, {
        body: JSON.stringify({
          max_tokens: 16,
          messages: [{ role: "user", content: "Say ok" }],
          model: model.id,
        }),
        headers: {
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          "x-api-key": apiKey,
        },
        method: "POST",
        signal,
      });
      break;
    case "groq":
      response = await fetch("https://api.groq.com/openai/v1/responses", {
        body: JSON.stringify({
          input: "Say ok",
          max_output_tokens: 16,
          model: model.id,
        }),
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        method: "POST",
        signal,
      });
      break;
    case "xai":
      response = await fetch("https://api.x.ai/v1/responses", {
        body: JSON.stringify({
          input: "Say ok",
          max_output_tokens: 16,
          model: model.id,
        }),
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        method: "POST",
        signal,
      });
      break;
  }

  const detail = await parseResponseDetail(response);

  return {
    checkedAt: Date.now(),
    detail,
    modelId: model.id,
    status: inferHealthStatus({ detail, response }),
  };
};

export const getAIModelHealth = async (
  modelId: AIModelId,
  options?: { force?: boolean },
): Promise<AIModelHealth> => {
  const cached = healthCache.get(modelId);

  if (
    cached &&
    !options?.force &&
    Date.now() - cached.checkedAt < HEALTH_CACHE_TTL_MS
  ) {
    return cached;
  }

  const model = AI_MODELS[modelId];

  try {
    const health = await probeModel(model);
    healthCache.set(modelId, health);
    return health;
  } catch (error) {
    const health: AIModelHealth = {
      checkedAt: Date.now(),
      detail:
        error instanceof Error
          ? trimDetail(error.message)
          : "Unknown health-check failure.",
      modelId,
      status: "error",
    };

    healthCache.set(modelId, health);
    return health;
  }
};

export const getAllAIModelHealth = async (options?: { force?: boolean }) => {
  const entries = await Promise.all(
    AI_MODEL_IDS.map(async (modelId) => [
      modelId,
      await getAIModelHealth(modelId, options),
    ] as const),
  );

  return Object.fromEntries(entries) as Record<AIModelId, AIModelHealth>;
};
