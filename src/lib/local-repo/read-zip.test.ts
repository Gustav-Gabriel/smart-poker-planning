import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import {
  extractZipFiles,
  listZipPaths,
  MAX_ZIP_BYTES,
  readZip,
} from "./read-zip";

function makeZip(entries: Record<string, string>): ArrayBuffer {
  const encoded: Record<string, Uint8Array> = {};
  for (const [path, content] of Object.entries(entries)) {
    encoded[path] = strToU8(content);
  }
  return zipSync(encoded).buffer as ArrayBuffer;
}

describe("listZipPaths / extractZipFiles", () => {
  it("lists text-eligible paths without requiring a full content Map", () => {
    const buffer = makeZip({
      "demo/src/index.ts": "export const n = 1;\n",
      "demo/README.md": "# Demo\n",
      "demo/logo.png": "not-really-png",
      "demo/node_modules/x/index.js": "skip",
      "demo/.git/config": "skip",
    });

    const handle = listZipPaths(buffer, "demo.zip");
    expect(handle.repoName).toBe("demo");
    expect(handle.paths).toEqual(["README.md", "src/index.ts"]);
    expect(handle.entries["src/index.ts"]).toBeInstanceOf(Uint8Array);
    expect(Object.keys(handle.entries).sort()).toEqual([
      "README.md",
      "src/index.ts",
    ]);
  });

  it("extracts only selected paths as UTF-8 strings", () => {
    const buffer = makeZip({
      "demo/src/index.ts": "export const n = 1;\n",
      "demo/README.md": "# Demo\n",
      "demo/src/other.ts": "export const o = 2;\n",
    });
    const handle = listZipPaths(buffer, "demo.zip");
    const files = extractZipFiles(handle, ["src/index.ts"]);
    expect([...files.keys()]).toEqual(["src/index.ts"]);
    expect(files.get("src/index.ts")).toBe("export const n = 1;\n");
    expect(files.has("README.md")).toBe(false);
  });

  it("rejects archives over the 200MB compressed limit", () => {
    expect(MAX_ZIP_BYTES).toBe(200 * 1024 * 1024);
    // Avoid allocating 200MB in the test runner: exercise the same message/path
    // via a zero-byte buffer whose reported length exceeds the limit.
    const oversized = new ArrayBuffer(0);
    Object.defineProperty(oversized, "byteLength", {
      value: MAX_ZIP_BYTES + 1,
    });
    expect(() => listZipPaths(oversized, "huge.zip")).toThrow(
      /too large \(max 200MB\)/i,
    );
  });

  it("rejects corrupt zip", () => {
    expect(() => listZipPaths(new Uint8Array([1, 2, 3]).buffer)).toThrow(
      /corrupt|Invalid/i,
    );
  });
});

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
});
