import { unzipSync } from "fflate";
import { normalizeRepoPath, shouldSkipPath } from "./filters";
import type { LocalRepoContents } from "./read-folder";

export const MAX_ZIP_BYTES = 200 * 1024 * 1024;

/**
 * In-memory handle after listing a zip: paths are text-eligible only;
 * bytes stay as Uint8Array until {@link extractZipFiles}.
 */
export type ZipHandle = {
  paths: string[];
  repoName: string;
  /** Normalized repo path → raw entry bytes (not decoded to string). */
  entries: Record<string, Uint8Array>;
};

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

function assertZipSize(buffer: ArrayBuffer): void {
  if (buffer.byteLength > MAX_ZIP_BYTES) {
    throw new Error("Zip archive is too large (max 200MB)");
  }
}

function unzipBuffer(buffer: ArrayBuffer): Record<string, Uint8Array> {
  try {
    return unzipSync(new Uint8Array(buffer));
  } catch {
    throw new Error("Invalid or corrupt zip archive");
  }
}

function normalizeEntryPath(
  rawPath: string,
  stripPrefix: string,
): string | null {
  const normalized = normalizeRepoPath(rawPath);
  const path = stripPrefix
    ? normalized.startsWith(stripPrefix)
      ? normalized.slice(stripPrefix.length)
      : normalized
    : normalized;
  if (!path || shouldSkipPath(path)) return null;
  return path;
}

function isTextEligible(bytes: Uint8Array): boolean {
  if (bytes.length === 0) return false;
  if (bytes.includes(0)) return false;
  try {
    const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return content.length > 0;
  } catch {
    return false;
  }
}

/**
 * Phase 1: unzip once, list text-eligible paths without building a content Map.
 */
export function listZipPaths(
  buffer: ArrayBuffer,
  archiveName = "archive.zip",
): ZipHandle {
  assertZipSize(buffer);
  const unzipped = unzipBuffer(buffer);

  const rawPaths = Object.keys(unzipped).filter(
    (path) => path && !path.endsWith("/"),
  );
  const { stripPrefix } = stripCommonRoot(
    rawPaths.map((p) => normalizeRepoPath(p)),
  );

  const entries: Record<string, Uint8Array> = {};
  const paths: string[] = [];

  for (const rawPath of rawPaths) {
    const path = normalizeEntryPath(rawPath, stripPrefix);
    if (!path) continue;

    const bytes = unzipped[rawPath];
    if (!bytes || !isTextEligible(bytes)) continue;

    entries[path] = bytes;
    paths.push(path);
  }

  paths.sort();
  const base = archiveName.replace(/\.zip$/i, "") || "archive";
  return { paths, repoName: base, entries };
}

/**
 * Phase 2: UTF-8-decode only the selected paths into a content Map.
 */
export function extractZipFiles(
  handle: ZipHandle,
  selectedPaths: string[],
): Map<string, string> {
  const files = new Map<string, string>();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const wanted = new Set(selectedPaths);

  for (const path of wanted) {
    if (shouldSkipPath(path)) continue;
    const bytes = handle.entries[path];
    if (!bytes || bytes.length === 0) continue;
    try {
      const content = decoder.decode(bytes);
      if (!content || content.includes("\u0000")) continue;
      files.set(path, content);
    } catch {
      // Skip non-UTF-8 / binary files.
    }
  }

  return files;
}

/**
 * Convenience: list + extract all text-eligible files (legacy / tests).
 */
export function readZip(
  buffer: ArrayBuffer,
  archiveName = "archive.zip",
): LocalRepoContents {
  const handle = listZipPaths(buffer, archiveName);
  return {
    paths: handle.paths,
    files: extractZipFiles(handle, handle.paths),
    repoName: handle.repoName,
  };
}
