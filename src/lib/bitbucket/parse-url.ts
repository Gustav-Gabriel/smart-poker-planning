const BITBUCKET_URL_PATTERN =
  /(?:https?:\/\/)?(?:www\.)?bitbucket\.org\/([^/?#]+)\/([^/?#]+)/i;

export function parseBitbucketUrl(url: string): {
  workspace: string;
  repo: string;
} {
  const match = url.match(BITBUCKET_URL_PATTERN);
  if (!match) {
    throw new Error("Invalid Bitbucket repository URL");
  }

  let repo = match[2];
  if (repo.endsWith(".git")) {
    repo = repo.slice(0, -4);
  }

  return { workspace: match[1], repo };
}
