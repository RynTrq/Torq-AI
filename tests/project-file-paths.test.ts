import { describe, expect, it } from "vitest";

import {
  buildProjectFilePathMaps,
  normalizeProjectPathSegment,
} from "../src/lib/project-file-paths";

describe("normalizeProjectPathSegment", () => {
  it("trims valid names", () => {
    expect(normalizeProjectPathSegment("  src  ")).toBe("src");
  });

  it("rejects traversal-like names", () => {
    expect(() => normalizeProjectPathSegment("..")).toThrow(
      "Project item name cannot be . or ..",
    );
  });

  it("rejects slash-delimited names", () => {
    expect(() => normalizeProjectPathSegment("src/app")).toThrow(
      "Project item name cannot contain slashes or control characters",
    );
  });
});

describe("buildProjectFilePathMaps", () => {
  it("builds stable nested paths", () => {
    const { filePathsById } = buildProjectFilePathMaps([
      { _id: "folder", name: "src" },
      { _id: "file", name: "index.ts", parentId: "folder" },
    ]);

    expect(filePathsById.get("file")).toBe("src/index.ts");
  });

  it("rejects duplicate resolved paths", () => {
    expect(() =>
      buildProjectFilePathMaps([
        { _id: "folder-a", name: "src" },
        { _id: "folder-b", name: "src" },
      ]),
    ).toThrow("Duplicate project path detected: src");
  });

  it("rejects cyclic parent relationships", () => {
    expect(() =>
      buildProjectFilePathMaps([
        { _id: "a", name: "src", parentId: "b" },
        { _id: "b", name: "nested", parentId: "a" },
      ]),
    ).toThrow('Detected a cycle in project item "src"');
  });
});
