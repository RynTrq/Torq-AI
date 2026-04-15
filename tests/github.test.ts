import { describe, expect, it } from "vitest";

import { parseGitHubRepositoryUrl } from "../src/lib/github";

describe("parseGitHubRepositoryUrl", () => {
  it("parses https URLs", () => {
    expect(parseGitHubRepositoryUrl("https://github.com/vercel/next.js")).toEqual(
      {
        owner: "vercel",
        repo: "next.js",
      },
    );
  });

  it("parses ssh-style URLs", () => {
    expect(
      parseGitHubRepositoryUrl("git@github.com:RynTrq/Torq-AI.git"),
    ).toEqual({
      owner: "RynTrq",
      repo: "Torq-AI",
    });
  });

  it("rejects non-github hosts", () => {
    expect(() =>
      parseGitHubRepositoryUrl("https://example.com/RynTrq/Torq-AI"),
    ).toThrow("Invalid GitHub URL");
  });

  it("rejects extra path segments", () => {
    expect(() =>
      parseGitHubRepositoryUrl("https://github.com/vercel/next.js/tree/canary"),
    ).toThrow("Invalid GitHub URL");
  });
});
