import {
  MAX_FILE_BYTES,
  MAX_FILES,
  MAX_TOTAL_BYTES,
} from "@/lib/repo-caps";

/**
 * Select paths from a content map and enforce the same size/count caps as GitHub.
 */
export function applyCaps(
  contentMap: Map<string, string>,
  selectedPaths: string[],
): { files: { path: string; content: string }[]; omitted: string[] } {
  const files: { path: string; content: string }[] = [];
  const omitted: string[] = [];
  let totalBytes = 0;

  for (const path of selectedPaths) {
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
