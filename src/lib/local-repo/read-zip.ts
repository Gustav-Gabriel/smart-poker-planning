import { unzipSync } from "fflate";
import { normalizeRepoPath, shouldSkipPath } from "./filters";
import type { LocalRepoContents } from "./read-folder";

const MAX_ZIP_BYTES = 50 * 1024 * 1024;

function stripCommonRoot(paths: string[]): {
  stripPrefix: string;
  adjusted: string[];
} {
  if (paths.length === 0) {
    return { stripPrefix: "", adjusted: [] };
  }
  const firstSeg = paths[0]!.split("/")[0];
  if (
    firstSeg &&
    paths.every((p) => p === firstSeg || p.startsWith(`${firstSeg}/`))
  ) {
    return {
      stripPrefix: `${firstSeg}/`,
      adjusted: paths
        .filter((p) => p.startsWith(`${firstSeg}/`))
        .map((p) => p.slice(firstSeg.length + 1)),
    };
  }
  return { stripPrefix: "", adjusted: paths };
}

/**
 * Unzip an ArrayBuffer with fflate and extract text file paths + contents.
 */
export function readZip(
  buffer: ArrayBuffer,
  archiveName = "archive.zip",
): LocalRepoContents {
  if (buffer.byteLength > MAX_ZIP_BYTES) {
    throw new Error("Zip archive is too large (max 50MB)");
  }

  let unzipped: Record<string, Uint8Array>;
  try {
    unzipped = unzipSync(new Uint8Array(buffer));
  } catch {
    throw new Error("Invalid or corrupt zip archive");
  }

  const rawPaths = Object.keys(unzipped).filter(
    (path) => path && !path.endsWith("/"),
  );
  const { stripPrefix } = stripCommonRoot(
    rawPaths.map((p) => normalizeRepoPath(p)),
  );

  const files = new Map<string, string>();
  const paths: string[] = [];
  const decoder = new TextDecoder("utf-8", { fatal: true });

  for (const rawPath of rawPaths) {
    const normalized = normalizeRepoPath(rawPath);
    const path = stripPrefix
      ? normalized.startsWith(stripPrefix)
        ? normalized.slice(stripPrefix.length)
        : normalized
      : normalized;
    if (!path || shouldSkipPath(path)) continue;

    const bytes = unzipped[rawPath];
    if (!bytes || bytes.length === 0) continue;

    try {
      const content = decoder.decode(bytes);
      if (!content || content.includes("\u0000")) continue;
      files.set(path, content);
      paths.push(path);
    } catch {
      // Skip non-UTF-8 / binary files.
    }
  }

  paths.sort();
  const base = archiveName.replace(/\.zip$/i, "") || "archive";
  return { paths, files, repoName: base };
}
