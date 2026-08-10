import { describe, expect, it } from "vitest";
import { prioritizePaths, pathPriorityScore } from "./prioritize-paths";

describe("prioritizePaths", () => {
  it("puts src code ahead of root configs and misc files", () => {
    const ordered = prioritizePaths([
      "README.md",
      "docs/notes.txt",
      "src/app.ts",
      "root-util.js",
      "package.json",
      "other/data.csv",
    ]);
    expect(ordered[0]).toBe("src/app.ts");
    expect(ordered[1]).toBe("root-util.js");
    expect(ordered.slice(0, 4)).toContain("package.json");
    expect(ordered[ordered.length - 1]).toBe("other/data.csv");
  });

  it("keeps relative order within the same priority band", () => {
    expect(prioritizePaths(["src/b.ts", "src/a.ts"])).toEqual([
      "src/b.ts",
      "src/a.ts",
    ]);
  });
});

describe("pathPriorityScore", () => {
  it("scores source code lowest (highest priority)", () => {
    expect(pathPriorityScore("src/x.ts")).toBeLessThan(
      pathPriorityScore("x.ts"),
    );
    expect(pathPriorityScore("x.ts")).toBeLessThan(
      pathPriorityScore("notes.txt"),
    );
  });
});
