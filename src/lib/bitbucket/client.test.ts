import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BitbucketAuthError,
  BitbucketNotFoundError,
  fetchSelectedContents,
  listRepoTree,
  listRepoTreeFromUrl,
  MAX_FILE_BYTES,
  MAX_FILES,
  MAX_TOTAL_BYTES,
} from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function textResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain" },
  });
}

describe("listRepoTree", () => {
  it("resolves mainbranch and collects commit_file paths across pages", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "https://api.bitbucket.org/2.0/repositories/acme/api") {
        return jsonResponse({ mainbranch: { name: "main" } });
      }
      if (
        url ===
        "https://api.bitbucket.org/2.0/repositories/acme/api/src/main/?max_depth=20&pagelen=100"
      ) {
        return jsonResponse({
          values: [
            { type: "commit_directory", path: "src" },
            { type: "commit_file", path: "README.md" },
          ],
          next: "https://api.bitbucket.org/2.0/repositories/acme/api/src/main/?page=2",
        });
      }
      if (
        url ===
        "https://api.bitbucket.org/2.0/repositories/acme/api/src/main/?page=2"
      ) {
        return jsonResponse({
          values: [{ type: "commit_file", path: "src/index.ts" }],
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      listRepoTree({ workspace: "acme", repo: "api" }),
    ).resolves.toEqual({
      ref: "main",
      paths: ["README.md", "src/index.ts"],
    });
  });

  it("sends Bearer token when provided without username", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ mainbranch: { name: "main" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    // Second call for tree — keep it empty after repo
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ mainbranch: { name: "main" } }))
      .mockResolvedValueOnce(jsonResponse({ values: [] }));

    await listRepoTree({
      workspace: "acme",
      repo: "api",
      token: "bb-token",
    });

    const firstCall = fetchMock.mock.calls[0];
    const init = firstCall[1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer bb-token");
  });

  it("sends Basic auth when username and token are provided", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ mainbranch: { name: "main" } }))
      .mockResolvedValueOnce(jsonResponse({ values: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await listRepoTree({
      workspace: "acme",
      repo: "api",
      token: "app-password",
      username: "ana",
    });

    const firstCall = fetchMock.mock.calls[0];
    const init = firstCall[1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe(
      `Basic ${Buffer.from("ana:app-password").toString("base64")}`,
    );
  });

  it("uses explicit ref without fetching mainbranch", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (
        url ===
        "https://api.bitbucket.org/2.0/repositories/acme/api/src/development/?max_depth=20&pagelen=100"
      ) {
        return jsonResponse({
          values: [{ type: "commit_file", path: "app.py" }],
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      listRepoTree({
        workspace: "acme",
        repo: "api",
        ref: "development",
      }),
    ).resolves.toEqual({
      ref: "development",
      paths: ["app.py"],
    });
  });

  it("maps 401 to BitbucketAuthError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({}, 401)));
    await expect(
      listRepoTree({ workspace: "acme", repo: "api" }),
    ).rejects.toBeInstanceOf(BitbucketAuthError);
  });

  it("maps 404 to BitbucketNotFoundError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({}, 404)));
    await expect(
      listRepoTree({ workspace: "acme", repo: "api" }),
    ).rejects.toBeInstanceOf(BitbucketNotFoundError);
  });

  it("maps timeout to Bitbucket request timed out", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const error = new Error("Aborted");
        error.name = "TimeoutError";
        throw error;
      }),
    );
    await expect(
      listRepoTree({ workspace: "acme", repo: "api" }),
    ).rejects.toThrow("Bitbucket request timed out");
  });
});

describe("listRepoTreeFromUrl", () => {
  it("exports workspace as owner for RepoAttachment compatibility", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ mainbranch: { name: "develop" } }))
        .mockResolvedValueOnce(
          jsonResponse({
            values: [{ type: "commit_file", path: "app.py" }],
          }),
        ),
    );

    await expect(
      listRepoTreeFromUrl({ url: "https://bitbucket.org/acme/api" }),
    ).resolves.toEqual({
      owner: "acme",
      repo: "api",
      ref: "develop",
      paths: ["app.py"],
    });
  });

  it("passes parsed branch ref and Basic auth from URL helpers", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (
        url ===
        "https://api.bitbucket.org/2.0/repositories/useniu/marilena-backend/src/development/?max_depth=20&pagelen=100"
      ) {
        return jsonResponse({
          values: [{ type: "commit_file", path: "README.md" }],
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      listRepoTreeFromUrl({
        url: "https://bitbucket.org/useniu/marilena-backend/src/development/",
        token: "app-password",
        username: "ana",
      }),
    ).resolves.toEqual({
      owner: "useniu",
      repo: "marilena-backend",
      ref: "development",
      paths: ["README.md"],
    });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe(
      `Basic ${Buffer.from("ana:app-password").toString("base64")}`,
    );
  });
});

describe("fetchSelectedContents", () => {
  it("fetches raw text and applies size caps", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/README.md")) {
        return textResponse("hello");
      }
      if (url.endsWith("/big.txt")) {
        return textResponse("x".repeat(MAX_FILE_BYTES + 1));
      }
      if (url.endsWith("/missing.ts")) {
        return textResponse("", 404);
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchSelectedContents({
      workspace: "acme",
      repo: "api",
      ref: "main",
      paths: ["README.md", "big.txt", "missing.ts"],
    });

    expect(result.files).toEqual([{ path: "README.md", content: "hello" }]);
    expect(result.omitted).toEqual(["big.txt", "missing.ts"]);
    expect(MAX_FILES).toBe(40);
    expect(MAX_TOTAL_BYTES).toBe(204_800);
  });

  it("omits paths beyond MAX_FILES", async () => {
    const paths = Array.from({ length: MAX_FILES + 2 }, (_, i) => `f${i}.txt`);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => textResponse("ok")),
    );

    const result = await fetchSelectedContents({
      workspace: "acme",
      repo: "api",
      ref: "main",
      paths,
    });

    expect(result.files).toHaveLength(MAX_FILES);
    expect(result.omitted).toEqual([
      `f${MAX_FILES}.txt`,
      `f${MAX_FILES + 1}.txt`,
    ]);
  });
});
