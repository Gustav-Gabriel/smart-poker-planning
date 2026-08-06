import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { readZip } from "./read-zip";

function makeZip(entries: Record<string, string>): ArrayBuffer {
  const encoded: Record<string, Uint8Array> = {};
  for (const [path, content] of Object.entries(entries)) {
    encoded[path] = strToU8(content);
  }
  return zipSync(encoded).buffer as ArrayBuffer;
}

describe("readZip", () => {
  it("extracts text files and skips binaries / node_modules", () => {
    const buffer = makeZip({
      "demo/src/index.ts": "export const n = 1;\n",
      "demo/README.md": "# Demo\n",
      "demo/logo.png": "not-really-png",
      "demo/node_modules/x/index.js": "skip",
      "demo/.git/config": "skip",
    });

    const result = readZip(buffer, "demo.zip");
    expect(result.repoName).toBe("demo");
    expect(result.paths).toEqual(["README.md", "src/index.ts"]);
    expect(result.files.get("src/index.ts")).toBe("export const n = 1;\n");
    expect(result.files.has("logo.png")).toBe(false);
  });

  it("rejects corrupt zip", () => {
    expect(() => readZip(new Uint8Array([1, 2, 3]).buffer)).toThrow(
      /corrupt|Invalid/i,
    );
  });
});
