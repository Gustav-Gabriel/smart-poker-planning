import {
  MAX_FILE_BYTES,
  MAX_FILES,
  MAX_TOTAL_BYTES,
} from "@/lib/repo-caps";
import { prioritizePaths } from "./prioritize-paths";

/**
 * Select paths from a content map and enforce size/count caps.
 * Paths are packed in priority order (src/code first) so "select all"
 * still prefers the most useful files when the budget runs out.
 */
export function applyCaps(
  contentMap: Map<string, string>,
  selectedPaths: string[],
): { files: { path: string; content: string }[]; omitted: string[] } {
  const files: { path: string; content: string }[] = [];
  const omitted: string[] = [];
  let totalBytes = 0;

  for (const path of prioritizePaths(selectedPaths)) {
    if (files.length >= MAX_FILES) {
      omitted.push(path);
      continue;
    }

    const content = contentMap.get(path);
    if (content === undefined) {
      omitted.push(path);
      continue;
    }

    const byteLength = new TextEncoder().encode(content).byteLength;
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
