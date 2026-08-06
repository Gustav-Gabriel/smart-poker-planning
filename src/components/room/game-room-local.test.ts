import { afterEach, describe, expect, it } from "vitest";
import { buildLocalFilesPayload } from "@/components/room/game-room";
import {
  clearAll,
  localRepoKey,
  setSelectedContents,
} from "@/lib/local-repo/host-content-store";
import type { RepoAttachment } from "@/lib/types";

describe("buildLocalFilesPayload", () => {
  afterEach(() => {
    clearAll();
  });

  it("returns empty localFiles when no local repos", () => {
    const github: RepoAttachment = {
      provider: "github",
      url: "https://github.com/a/b",
      owner: "a",
      repo: "b",
      ref: "main",
      selectedPaths: ["x.ts"],
    };
    expect(buildLocalFilesPayload([github])).toEqual({
      ok: true,
      localFiles: [],
    });
  });

  it("builds files from host store for local repos", () => {
    setSelectedContents(
      localRepoKey("demo"),
      new Map([
        ["a.ts", "aaa"],
        ["b.ts", "bbb"],
      ]),
    );
    const local: RepoAttachment = {
      provider: "local",
      url: "local://demo",
      owner: "local",
      repo: "demo",
      ref: "local",
      selectedPaths: ["a.ts"],
    };
    expect(buildLocalFilesPayload([local])).toEqual({
      ok: true,
      localFiles: [
        {
          repository: "local/demo",
          files: [{ path: "a.ts", content: "aaa" }],
        },
      ],
    });
  });

  it("errors when local contents are missing after reload", () => {
    const local: RepoAttachment = {
      provider: "local",
      url: "local://demo",
      owner: "local",
      repo: "demo",
      ref: "local",
      selectedPaths: ["a.ts"],
    };
    const result = buildLocalFilesPayload([local]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Anexe o zip/i);
    }
  });
});
