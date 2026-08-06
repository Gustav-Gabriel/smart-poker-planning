/**
 * Host-only in-memory store of selected local file contents for deep analysis.
 * Cleared on page reload; never sent to the room server as full zip.
 * Intended for browser use from host-controls / game-room only.
 */

const store = new Map<string, Map<string, string>>();

export function localRepoKey(repoName: string): string {
  return `local/${repoName}`;
}

export function setSelectedContents(
  repoKey: string,
  contents: Map<string, string>,
): void {
  store.set(repoKey, contents);
}

export function getSelectedContents(
  repoKey: string,
): Map<string, string> | undefined {
  return store.get(repoKey);
}

export function clear(repoKey: string): void {
  store.delete(repoKey);
}

export function clearAll(): void {
  store.clear();
}
