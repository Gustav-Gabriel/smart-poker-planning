import { parseGithubUrl } from "./parse-url";

export const MAX_FILES = 40;
export const MAX_FILE_BYTES = 40_960;
export const MAX_TOTAL_BYTES = 204_800;
const REQUEST_TIMEOUT_MS = 20_000;

export class GithubAuthError extends Error {
  constructor(message = "GitHub authentication failed") {
    super(message);
    this.name = "GithubAuthError";
  }
}

export class GithubNotFoundError extends Error {
  constructor(message = "GitHub repository not found") {
    super(message);
    this.name = "GithubNotFoundError";
  }
}

type GithubFetchInit = {
  token?: string;
};

function githubHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function githubFetch(
  url: string,
  init: GithubFetchInit,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: githubHeaders(init.token),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("GitHub request timed out");
    }
    throw error;
  }

  if (response.status === 401 || response.status === 403) {
    throw new GithubAuthError();
  }

  if (response.status === 404) {
    throw new GithubNotFoundError();
  }

  if (!response.ok) {
    throw new Error(`GitHub request failed with status ${response.status}`);
  }

  return response;
}

type RepoResponse = {
  default_branch: string;
};

type TreeResponse = {
  tree: Array<{ path: string; type: string; size?: number }>;
};

type ContentsResponse = {
  content?: string;
  encoding?: string;
  size?: number;
};

function decodeContent(data: ContentsResponse): string {
  if (data.encoding === "base64" && data.content) {
    return Buffer.from(data.content.replace(/\n/g, ""), "base64").toString(
      "utf8",
    );
  }

  throw new Error("Unexpected GitHub content encoding");
}

export async function listRepoTree(input: {
  owner: string;
  repo: string;
  token?: string;
}): Promise<{ ref: string; paths: string[] }> {
  const repoUrl = `https://api.github.com/repos/${input.owner}/${input.repo}`;
  const repoResponse = await githubFetch(repoUrl, input);
  const repoData = (await repoResponse.json()) as RepoResponse;
  const ref = repoData.default_branch;

  const treeUrl = `https://api.github.com/repos/${input.owner}/${input.repo}/git/trees/${ref}?recursive=1`;
  const treeResponse = await githubFetch(treeUrl, input);
  const treeData = (await treeResponse.json()) as TreeResponse;

  const paths = treeData.tree
    .filter((entry) => entry.type === "blob")
    .map((entry) => entry.path);

  return { ref, paths };
}

export async function fetchSelectedContents(input: {
  owner: string;
  repo: string;
  ref: string;
  paths: string[];
  token?: string;
}): Promise<{ files: { path: string; content: string }[]; omitted: string[] }> {
  const files: { path: string; content: string }[] = [];
  const omitted: string[] = [];
  let totalBytes = 0;

  for (const path of input.paths) {
    if (files.length >= MAX_FILES) {
      omitted.push(path);
      continue;
    }

    const url = `https://api.github.com/repos/${input.owner}/${input.repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(input.ref)}`;

    let response: Response;
    try {
      response = await githubFetch(url, input);
    } catch (error) {
      if (error instanceof GithubNotFoundError) {
        omitted.push(path);
        continue;
      }
      throw error;
    }

    const data = (await response.json()) as ContentsResponse;
    const size = data.size ?? 0;

    if (size > MAX_FILE_BYTES) {
      omitted.push(path);
      continue;
    }

    const content = decodeContent(data);
    const byteLength = Buffer.byteLength(content, "utf8");

    if (byteLength > MAX_FILE_BYTES) {
      omitted.push(path);
      continue;
    }

    if (totalBytes + byteLength > MAX_TOTAL_BYTES) {
      omitted.push(path);
      continue;
    }

    files.push({ path, content });
    totalBytes += byteLength;
  }

  return { files, omitted };
}

export async function listRepoTreeFromUrl(input: {
  url: string;
  token?: string;
}): Promise<{ owner: string; repo: string; ref: string; paths: string[] }> {
  const { owner, repo } = parseGithubUrl(input.url);
  const tree = await listRepoTree({ owner, repo, token: input.token });
  return { owner, repo, ...tree };
}

export async function fetchSelectedContentsFromUrl(input: {
  url: string;
  ref: string;
  paths: string[];
  token?: string;
}): Promise<{ files: { path: string; content: string }[]; omitted: string[] }> {
  const { owner, repo } = parseGithubUrl(input.url);
  return fetchSelectedContents({
    owner,
    repo,
    ref: input.ref,
    paths: input.paths,
    token: input.token,
  });
}
