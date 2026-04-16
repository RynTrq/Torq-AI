import { describe, expect, it } from "vitest";

import {
  isSimpleChatMessage,
  shouldUseToolNetwork,
} from "../src/features/conversations/inngest/message-routing";

describe("message routing", () => {
  it("keeps short greetings on the simple chat path", () => {
    expect(isSimpleChatMessage("hello")).toBe(true);
    expect(shouldUseToolNetwork("hello")).toBe(false);
  });

  it("routes explicit file creation requests through the tool network", () => {
    expect(shouldUseToolNetwork("Create a README.md file with setup instructions")).toBe(true);
    expect(shouldUseToolNetwork("Give me a C++ file for this")).toBe(true);
    expect(shouldUseToolNetwork("Return the files in a src/ folder")).toBe(true);
  });

  it("does not force general coding questions through file tools", () => {
    expect(shouldUseToolNetwork("Explain the two sum solution in C++")).toBe(false);
    expect(shouldUseToolNetwork("Why is this algorithm O(n)?")).toBe(false);
  });
});
