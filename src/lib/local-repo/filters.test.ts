import { describe, expect, it } from "vitest";
import { shouldSkipPath } from "./filters";

describe("shouldSkipPath", () => {
  it("skips .git and node_modules segments", () => {
    expect(shouldSkipPath(".git/config")).toBe(true);
    expect(shouldSkipPath("src/.git/hooks")).toBe(true);
    expect(shouldSkipPath("node_modules/left-pad/index.js")).toBe(true);
    expect(shouldSkipPath("packages/app/node_modules/x.js")).toBe(true);
  });

  it("skips build/cache dirs and lockfiles", () => {
    expect(shouldSkipPath("dist/index.js")).toBe(true);
    expect(shouldSkipPath(".next/server.js")).toBe(true);
    expect(shouldSkipPath("coverage/lcov.info")).toBe(true);
    expect(shouldSkipPath("package-lock.json")).toBe(true);
    expect(shouldSkipPath("pnpm-lock.yaml")).toBe(true);
    expect(shouldSkipPath("yarn.lock")).toBe(true);
  });

  it("skips common binary extensions", () => {
    expect(shouldSkipPath("logo.png")).toBe(true);
    expect(shouldSkipPath("assets/icon.ICO")).toBe(true);
    expect(shouldSkipPath("font.woff2")).toBe(true);
    expect(shouldSkipPath("dist/app.zip")).toBe(true);
    expect(shouldSkipPath("lib/native.so")).toBe(true);
    expect(shouldSkipPath("docs/manual.pdf")).toBe(true);
    expect(shouldSkipPath("clip.mp4")).toBe(true);
    expect(shouldSkipPath("bundle.js.map")).toBe(true);
  });

  it("keeps normal source paths", () => {
    expect(shouldSkipPath("src/index.ts")).toBe(false);
    expect(shouldSkipPath("README.md")).toBe(false);
    expect(shouldSkipPath("Dockerfile")).toBe(false);
    expect(shouldSkipPath("package.json")).toBe(false);
  });

  it("skips directory-looking trailing slashes", () => {
    expect(shouldSkipPath("src/")).toBe(true);
  });
});
