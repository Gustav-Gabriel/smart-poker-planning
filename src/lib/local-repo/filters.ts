const SKIP_DIR_SEGMENTS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  "coverage",
  ".turbo",
  ".cache",
  "vendor",
  "target",
  "out",
  ".vercel",
  ".output",
  "__pycache__",
  ".venv",
  "venv",
  "Pods",
  "DerivedData",
  ".idea",
  ".gradle",
  "bower_components",
]);

const SKIP_BASENAMES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lock",
  "bun.lockb",
  "Cargo.lock",
  "poetry.lock",
  "composer.lock",
  "Gemfile.lock",
  "Pipfile.lock",
  ".DS_Store",
  "Thumbs.db",
  "desktop.ini",
]);

const BINARY_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "ico",
  "bmp",
  "svg",
  "woff",
  "woff2",
  "ttf",
  "eot",
  "otf",
  "zip",
  "gz",
  "tgz",
  "rar",
  "7z",
  "jar",
  "war",
  "exe",
  "dll",
  "so",
  "dylib",
  "pdf",
  "mp4",
  "mp3",
  "wav",
  "webm",
  "mov",
  "avi",
  "bin",
  "dat",
  "wasm",
  "class",
  "o",
  "a",
  "pyc",
  "pyo",
  "map",
  "lock",
]);

/** Normalize to forward slashes and strip a leading `./`. */
export function normalizeRepoPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}

/**
 * Returns true when a path should be excluded from local tree listing
 * (VCS / dependency / build dirs, lockfiles, and common binaries).
 */
export function shouldSkipPath(path: string): boolean {
  const normalized = normalizeRepoPath(path);
  if (!normalized || normalized.endsWith("/")) {
    return true;
  }

  const segments = normalized.split("/").filter(Boolean);
  if (segments.some((segment) => SKIP_DIR_SEGMENTS.has(segment))) {
    return true;
  }

  const base = segments[segments.length - 1] ?? "";
  if (SKIP_BASENAMES.has(base)) {
    return true;
  }

  if (base.endsWith(".min.js") || base.endsWith(".min.css")) {
    return true;
  }

  const dot = base.lastIndexOf(".");
  if (dot <= 0) {
    return false;
  }
  const ext = base.slice(dot + 1).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}
