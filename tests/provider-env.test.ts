import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("getProviderBaseUrl", () => {
  const originalAnthropicBaseUrl = process.env.ANTHROPIC_BASE_URL;
  const originalOpenRouterBaseUrl = process.env.OPENROUTER_BASE_URL;

  beforeEach(() => {
    vi.resetModules();

    if (originalAnthropicBaseUrl === undefined) {
      delete process.env.ANTHROPIC_BASE_URL;
    } else {
      process.env.ANTHROPIC_BASE_URL = originalAnthropicBaseUrl;
    }

    if (originalOpenRouterBaseUrl === undefined) {
      delete process.env.OPENROUTER_BASE_URL;
    } else {
      process.env.OPENROUTER_BASE_URL = originalOpenRouterBaseUrl;
    }
  });

  it("defaults OpenRouter to the Anthropic messages API base", async () => {
    delete process.env.ANTHROPIC_BASE_URL;
    delete process.env.OPENROUTER_BASE_URL;

    const { getProviderBaseUrl } = await import("../src/lib/ai/provider-env");

    expect(getProviderBaseUrl("openrouter")).toBe("https://openrouter.ai/api/v1");
  });

  it("normalizes legacy OpenRouter base URLs", async () => {
    process.env.ANTHROPIC_BASE_URL = "https://openrouter.ai/api";

    const { getProviderBaseUrl } = await import("../src/lib/ai/provider-env");

    expect(getProviderBaseUrl("openrouter")).toBe("https://openrouter.ai/api/v1");
  });
});
