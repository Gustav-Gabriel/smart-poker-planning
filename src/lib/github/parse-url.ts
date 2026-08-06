const GITHUB_URL_PATTERN =
  /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#]+)\/([^/?#]+)/i;

export function parseGithubUrl(url: string): { owner: string; repo: string } {
  const match = url.match(GITHUB_URL_PATTERN);
  if (!match) {
    throw new Error("Invalid GitHub repository URL");
  }

  let repo = match[2];
  if (repo.endsWith(".git")) {
    repo = repo.slice(0, -4);
  }

  return { owner: match[1], repo };
}
