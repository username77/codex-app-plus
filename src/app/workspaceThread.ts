import type { ThreadSummary } from "../domain/types";
import { normalizeWorkspacePath } from "./workspacePath";

function toUpdatedAtTimestamp(updatedAt: string): number {
  const timestamp = Date.parse(updatedAt);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function listThreadsForWorkspace(
  threads: ReadonlyArray<ThreadSummary>,
  workspacePath: string | null
): ReadonlyArray<ThreadSummary> {
  if (workspacePath === null) {
    return [];
  }

  const normalizedWorkspacePath = normalizeWorkspacePath(workspacePath);
  if (normalizedWorkspacePath.length === 0) {
    return [];
  }

  return [...threads]
    .filter((thread) => normalizeWorkspacePath(thread.cwd ?? "") === normalizedWorkspacePath)
    .sort((left, right) => toUpdatedAtTimestamp(right.updatedAt) - toUpdatedAtTimestamp(left.updatedAt));
}

export function findLatestThreadForWorkspace(
  threads: ReadonlyArray<ThreadSummary>,
  workspacePath: string | null
): ThreadSummary | null {
  return listThreadsForWorkspace(threads, workspacePath)[0] ?? null;
}
