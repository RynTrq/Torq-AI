import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("getCandidateAIModels", () => {
  const originalEnv = {
    ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_AUTH_TOKEN,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    XAI_API_KEY: process.env.XAI_API_KEY,
  };

  beforeEach(() => {
    vi.resetModules();
    process.env.ANTHROPIC_AUTH_TOKEN = originalEnv.ANTHROPIC_AUTH_TOKEN ?? "test-openrouter";
    process.env.GROQ_API_KEY = originalEnv.GROQ_API_KEY ?? "test-groq";
    process.env.XAI_API_KEY = originalEnv.XAI_API_KEY ?? "test-xai";
  });

  it("prefers same-provider fallbacks before switching providers", async () => {
    const { getCandidateAIModels } = await import("../src/lib/ai/model-server");
    const { AI_MODELS } = await import("../src/lib/ai/model-catalog");

    const candidates = getCandidateAIModels("moonshotai/kimi-k2-instruct")
      .slice(0, 4)
      .map((candidate) => candidate.id);

    expect(candidates[0]).toBe("moonshotai/kimi-k2-instruct");
    expect(AI_MODELS[candidates[1]].provider).toBe("groq");
    expect(AI_MODELS[candidates[2]].provider).toBe("groq");
  });
});
