import { parseBitbucketUrl } from "./parse-url";

export const MAX_FILES = 40;
export const MAX_FILE_BYTES = 40_960;
export const MAX_TOTAL_BYTES = 204_800;
const REQUEST_TIMEOUT_MS = 20_000;

export class BitbucketAuthError extends Error {
  constructor(message = "Bitbucket authentication failed") {
    super(message);
    this.name = "BitbucketAuthError";
  }
}

export class BitbucketNotFoundError extends Error {
  constructor(message = "Bitbucket repository not found") {
    super(message);
    this.name = "BitbucketNotFoundError";
  }
}

type BitbucketFetchInit = {
  token?: string;
};

function bitbucketHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function bitbucketFetch(
  url: string,
  init: BitbucketFetchInit,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: bitbucketHeaders(init.token),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("Bitbucket request timed out");
    }
    throw error;
  }

  if (response.status === 401 || response.status === 403) {
    throw new BitbucketAuthError();
  }

  if (response.status === 404) {
    throw new BitbucketNotFoundError();
  }

  if (!response.ok) {
    throw new Error(`Bitbucket request failed with status ${response.status}`);
  }

  return response;
}

type RepoResponse = {
  mainbranch?: { name?: string } | null;
};

type SrcListEntry = {
  type?: string;
  path?: string;
};

type SrcListResponse = {
  values?: SrcListEntry[];
  next?: string;
};

export async function listRepoTree(input: {
  workspace: string;
  repo: string;
  token?: string;
}): Promise<{ ref: string; paths: string[] }> {
  const repoUrl = `https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(input.workspace)}/${encodeURIComponent(input.repo)}`;
  const repoResponse = await bitbucketFetch(repoUrl, input);
  const repoData = (await repoResponse.json()) as RepoResponse;
  const ref = repoData.mainbranch?.name;
  if (!ref) {
    throw new Error("Bitbucket repository has no main branch");
  }

  const paths: string[] = [];
  let nextUrl: string | undefined =
    `https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(input.workspace)}/${encodeURIComponent(input.repo)}/src/${encodeURIComponent(ref)}/?max_depth=20&pagelen=100`;

  while (nextUrl) {
    const listResponse = await bitbucketFetch(nextUrl, input);
    const listData = (await listResponse.json()) as SrcListResponse;
    for (const entry of listData.values ?? []) {
      if (entry.type === "commit_file" && entry.path) {
        paths.push(entry.path);
      }
    }
    nextUrl = listData.next;
  }

  return { ref, paths };
}

function encodeSrcPath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export async function fetchSelectedContents(input: {
  workspace: string;
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

    const url = `https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(input.workspace)}/${encodeURIComponent(input.repo)}/src/${encodeURIComponent(input.ref)}/${encodeSrcPath(path)}`;

    let response: Response;
    try {
      response = await bitbucketFetch(url, input);
    } catch (error) {
      if (error instanceof BitbucketNotFoundError) {
        omitted.push(path);
        continue;
      }
      throw error;
    }

    const content = await response.text();
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
  const { workspace, repo } = parseBitbucketUrl(input.url);
  const tree = await listRepoTree({
    workspace,
    repo,
    token: input.token,
  });
  return { owner: workspace, repo, ...tree };
}

export async function fetchSelectedContentsFromUrl(input: {
  url: string;
  ref: string;
  paths: string[];
  token?: string;
}): Promise<{ files: { path: string; content: string }[]; omitted: string[] }> {
  const { workspace, repo } = parseBitbucketUrl(input.url);
  return fetchSelectedContents({
    workspace,
    repo,
    ref: input.ref,
    paths: input.paths,
    token: input.token,
  });
}
