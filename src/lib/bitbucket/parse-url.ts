const BITBUCKET_URL_PATTERN =
  /(?:https?:\/\/)?(?:www\.)?bitbucket\.org\/([^/?#]+)\/([^/?#]+)(?:\/src\/([^/?#]+))?/i;

export function parseBitbucketUrl(url: string): {
  workspace: string;
  repo: string;
  ref?: string;
} {
  const match = url.match(BITBUCKET_URL_PATTERN);
  if (!match) {
    throw new Error("Invalid Bitbucket repository URL");
  }

  let repo = match[2];
  if (repo.endsWith(".git")) {
    repo = repo.slice(0, -4);
  }

  const result: { workspace: string; repo: string; ref?: string } = {
    workspace: match[1],
    repo,
  };

  if (match[3]) {
    result.ref = decodeURIComponent(match[3]);
  }

  return result;
}
