import { normalizeRepoPath, shouldSkipPath } from "./filters";

export type LocalRepoContents = {
  paths: string[];
  files: Map<string, string>;
  /** Display name for the attachment (folder or zip basename without extension). */
  repoName: string;
};

function webkitRelativePath(file: File): string {
  const relative = (file as File & { webkitRelativePath?: string })
    .webkitRelativePath;
  if (relative && relative.length > 0) {
    // Drop the top-level folder name so paths match in-repo layout.
    const slash = relative.indexOf("/");
    return slash >= 0 ? relative.slice(slash + 1) : relative;
  }
  return file.name;
}

function folderRepoName(files: FileList | File[]): string {
  const first = files[0] as File & { webkitRelativePath?: string } | undefined;
  if (first?.webkitRelativePath) {
    const top = first.webkitRelativePath.split("/")[0];
    if (top) return top;
  }
  return "local-folder";
}

/**
 * Read a directory FileList (from webkitdirectory) into text file paths + contents.
 */
export async function readFolder(
  fileList: FileList | File[],
): Promise<LocalRepoContents> {
  const files = new Map<string, string>();
  const paths: string[] = [];
  const list = Array.from(fileList);

  for (const file of list) {
    const path = normalizeRepoPath(webkitRelativePath(file));
    if (shouldSkipPath(path)) continue;

    try {
      const content = await file.text();
      // Skip empty or clearly binary (NUL) payloads.
      if (!content || content.includes("\u0000")) continue;
      files.set(path, content);
      paths.push(path);
    } catch {
      // Skip files that cannot be read as text.
    }
  }

  paths.sort();
  return { paths, files, repoName: folderRepoName(list) };
}
