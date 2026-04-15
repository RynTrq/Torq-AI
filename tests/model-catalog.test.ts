import { describe, expect, it } from "vitest";

import {
  AI_MODELS,
  AI_PROVIDER_LABELS,
  getAIModelDefinition,
} from "../src/lib/ai/model-catalog";

describe("AI model catalog", () => {
  it("includes xAI/Grok models", () => {
    expect(AI_MODELS["grok-4"].provider).toBe("xai");
    expect(AI_MODELS["grok-4.20-reasoning"].provider).toBe("xai");
    expect(AI_PROVIDER_LABELS.xai).toBe("xAI");
  });

  it("falls back to the default model for unknown IDs", () => {
    expect(getAIModelDefinition("not-a-model").id).toBe("gemini-2.5-flash");
  });
});
