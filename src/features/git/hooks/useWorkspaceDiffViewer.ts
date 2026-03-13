import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  GitStatusOutput,
  GitWorkspaceDiffOutput,
  HostBridge,
} from "../../../bridge/types";
import type { GitChangeScope } from "../ui/GitChangeBrowser";

export interface WorkspaceDiffViewerSummary {
  readonly files: number;
  readonly additions: number;
  readonly deletions: number;
}

interface UseWorkspaceDiffViewerOptions {
  readonly enabled: boolean;
  readonly hostBridge: HostBridge;
  readonly repoPath: string | null;
  readonly scope: GitChangeScope;
  readonly status: GitStatusOutput | null;
  readonly ignoreWhitespaceChanges?: boolean;
}

function shouldStartLoading(
  enabled: boolean,
  repoPath: string | null,
  status: GitStatusOutput | null,
): boolean {
  return enabled && repoPath !== null && status !== null && status.isRepository;
}

function createStatusSignature(status: GitStatusOutput | null): string {
  if (status === null || !status.isRepository) {
    return "";
  }
  return [
    ...status.staged.map((entry) => `s:${entry.path}:${entry.indexStatus}:${entry.worktreeStatus}`),
    ...status.unstaged.map((entry) => `u:${entry.path}:${entry.indexStatus}:${entry.worktreeStatus}`),
    ...status.untracked.map((entry) => `n:${entry.path}`),
    ...status.conflicted.map((entry) => `c:${entry.path}:${entry.indexStatus}:${entry.worktreeStatus}`),
  ].join("|");
}

function calculateSummary(items: ReadonlyArray<GitWorkspaceDiffOutput>): WorkspaceDiffViewerSummary {
  return items.reduce(
    (summary, item) => ({
      files: summary.files + 1,
      additions: summary.additions + item.additions,
      deletions: summary.deletions + item.deletions,
    }),
    { files: 0, additions: 0, deletions: 0 },
  );
}

export function useWorkspaceDiffViewer(options: UseWorkspaceDiffViewerOptions) {
  const { enabled, hostBridge, ignoreWhitespaceChanges = false, repoPath, scope, status } = options;
  const [items, setItems] = useState<ReadonlyArray<GitWorkspaceDiffOutput>>([]);
  const [loading, setLoading] = useState(() => shouldStartLoading(enabled, repoPath, status));
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const statusSignature = useMemo(() => createStatusSignature(status), [status]);

  const refresh = useCallback(async () => {
    if (!enabled || repoPath === null || status === null || !status.isRepository) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);
    try {
      const nextItems = await hostBridge.git.getWorkspaceDiffs({
        repoPath,
        scope,
        ignoreWhitespaceChanges,
      });
      if (requestId !== requestIdRef.current) {
        return;
      }
      setItems(nextItems);
    } catch (reason) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setItems([]);
      setError(String(reason));
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [enabled, hostBridge.git, ignoreWhitespaceChanges, repoPath, scope, status]);

  useEffect(() => {
    void refresh();
  }, [refresh, statusSignature]);

  const summary = useMemo(() => calculateSummary(items), [items]);

  return {
    items,
    summary,
    loading,
    error,
    refresh,
  };
}
