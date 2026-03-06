import type { ThreadSummary } from "../domain/types";
import { normalizeWorkspacePath } from "./workspacePath";

function toUpdatedAtTimestamp(updatedAt: string): number {
  const timestamp = Date.parse(updatedAt);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function findLatestThreadForWorkspace(
  threads: ReadonlyArray<ThreadSummary>,
  workspacePath: string | null
): ThreadSummary | null {
  if (workspacePath === null) {
    return null;
  }
  const normalizedWorkspacePath = normalizeWorkspacePath(workspacePath);
  if (normalizedWorkspacePath.length === 0) {
    return null;
  }

  let latestThread: ThreadSummary | null = null;
  let latestUpdatedAt = Number.NEGATIVE_INFINITY;
  for (const thread of threads) {
    if (normalizeWorkspacePath(thread.cwd ?? "") !== normalizedWorkspacePath) {
      continue;
    }
    const updatedAt = toUpdatedAtTimestamp(thread.updatedAt);
    if (latestThread === null || updatedAt > latestUpdatedAt) {
      latestThread = thread;
      latestUpdatedAt = updatedAt;
    }
  }
  return latestThread;
}
