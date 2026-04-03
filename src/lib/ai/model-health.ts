import type { AIModelId } from "./model-catalog";

export const AI_MODEL_HEALTH_STATUSES = [
  "available",
  "quota_exceeded",
  "invalid_key",
  "unsupported_model",
  "unconfigured",
  "error",
] as const;

export type AIModelHealthStatus = (typeof AI_MODEL_HEALTH_STATUSES)[number];

export interface AIModelHealth {
  checkedAt: number;
  detail?: string;
  modelId: AIModelId;
  status: AIModelHealthStatus;
}

export const isModelAvailable = (health?: AIModelHealth | null) =>
  health?.status === "available";

export const getModelHealthLabel = (health?: AIModelHealth | null) => {
  switch (health?.status) {
    case "available":
      return "Ready";
    case "quota_exceeded":
      return "Quota";
    case "invalid_key":
      return "Auth";
    case "unsupported_model":
      return "Unsupported";
    case "unconfigured":
      return "No key";
    case "error":
      return "Error";
    default:
      return "Checking";
  }
};
