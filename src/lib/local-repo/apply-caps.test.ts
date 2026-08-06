import { describe, expect, it } from "vitest";
import { applyCaps } from "./apply-caps";
import { MAX_FILE_BYTES, MAX_FILES, MAX_TOTAL_BYTES } from "@/lib/repo-caps";

describe("applyCaps", () => {
  it("returns selected files within caps", () => {
    const map = new Map([
      ["a.ts", " consola "],
      ["b.ts", "hello"],
    ]);
    expect(applyCaps(map, ["a.ts", "b.ts"])).toEqual({
      files: [
        { path: "a.ts", content: " consola " },
        { path: "b.ts", content: "hello" },
      ],
      omitted: [],
    });
  });

  it("omits missing paths", () => {
    const map = new Map([["a.ts", "x"]]);
    expect(applyCaps(map, ["a.ts", "missing.ts"]).omitted).toEqual([
      "missing.ts",
    ]);
  });

  it("omits files larger than MAX_FILE_BYTES", () => {
    const big = "x".repeat(MAX_FILE_BYTES + 1);
    const map = new Map([["big.ts", big]]);
    expect(applyCaps(map, ["big.ts"])).toEqual({
      files: [],
      omitted: ["big.ts"],
    });
  });

  it("omits paths beyond MAX_FILES", () => {
    const map = new Map<string, string>();
    const paths: string[] = [];
    for (let i = 0; i < MAX_FILES + 2; i += 1) {
      const path = `f${i}.ts`;
      map.set(path, "ok");
      paths.push(path);
    }
    const result = applyCaps(map, paths);
    expect(result.files).toHaveLength(MAX_FILES);
    expect(result.omitted).toEqual([
      `f${MAX_FILES}.ts`,
      `f${MAX_FILES + 1}.ts`,
    ]);
  });

  it("omits when total would exceed MAX_TOTAL_BYTES", () => {
    // Stay under MAX_FILE_BYTES but exceed MAX_TOTAL_BYTES across files.
    const chunkSize = Math.min(MAX_FILE_BYTES, Math.floor(MAX_TOTAL_BYTES / 3));
    const chunk = "y".repeat(chunkSize);
    const paths = ["a.ts", "b.ts", "c.ts", "d.ts", "e.ts", "f.ts"];
    const map = new Map(paths.map((path) => [path, chunk] as const));
    const result = applyCaps(map, paths);
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.omitted.length).toBeGreaterThan(0);
    expect(result.files.length + result.omitted.length).toBe(paths.length);
    const total = result.files.reduce(
      (sum, file) => sum + new TextEncoder().encode(file.content).byteLength,
      0,
    );
    expect(total).toBeLessThanOrEqual(MAX_TOTAL_BYTES);
  });
});
