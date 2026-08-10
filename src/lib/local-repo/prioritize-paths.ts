const SRC_SEGMENTS = new Set([
  "src",
  "app",
  "lib",
  "components",
  "pages",
  "server",
  "api",
  "hooks",
  "services",
  "domain",
  "modules",
  "features",
  "packages",
]);

const CODE_EXTENSIONS = new Set([
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "py",
  "go",
  "rs",
  "java",
  "kt",
  "rb",
  "php",
  "cs",
  "swift",
  "vue",
  "svelte",
  "css",
  "scss",
  "sass",
  "less",
  "html",
  "sql",
]);

const META_BASENAMES = new Set([
  "package.json",
  "readme.md",
  "readme",
  "tsconfig.json",
  "jsconfig.json",
  "cargo.toml",
  "go.mod",
  "pyproject.toml",
  "requirements.txt",
  "dockerfile",
  "composer.json",
  "gemfile",
]);

function extensionOf(base: string): string {
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

/** Lower score = higher priority when packing into AI context caps. */
export function pathPriorityScore(path: string): number {
  const normalized = path.replace(/\\/g, "/").replace(/^\.\//, "");
  const segments = normalized.split("/").filter(Boolean);
  const base = segments[segments.length - 1] ?? "";
  const ext = extensionOf(base);
  const inSrc = segments.some((segment) => SRC_SEGMENTS.has(segment));

  if (inSrc && CODE_EXTENSIONS.has(ext)) return 0;
  if (CODE_EXTENSIONS.has(ext)) return 1;
  if (META_BASENAMES.has(base.toLowerCase())) return 2;
  return 3;
}

/** Stable sort: higher-value source files first, original order as tie-breaker. */
export function prioritizePaths(paths: string[]): string[] {
  return paths
    .map((path, index) => ({ path, index, score: pathPriorityScore(path) }))
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((entry) => entry.path);
}
