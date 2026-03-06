import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GitDiffOutput, GitStatusEntry, GitStatusOutput, HostBridge } from "../../../bridge/types";
import type { GitNotice, WorkspaceGitController } from "./types";

interface UseWorkspaceGitOptions {
  readonly hostBridge: HostBridge;
  readonly selectedRootPath: string | null;
}

interface GitDiffTarget {
  readonly path: string;
  readonly staged: boolean;
}

function formatActionError(action: string, error: unknown): string {
  return `${action}失败：${String(error)}`;
}

function normalizePaths(paths: ReadonlyArray<string>): ReadonlyArray<string> {
  return [...new Set(paths.map((path) => path.trim()).filter((path) => path.length > 0))];
}

function pickBranchName(status: GitStatusOutput | null, currentBranch: string): string {
  if (status === null || !status.isRepository) {
    return "";
  }
  if (status.branches.some((branch) => branch.name === currentBranch)) {
    return currentBranch;
  }
  const activeBranch = status.branches.find((branch) => branch.isCurrent)?.name;
  return activeBranch ?? status.branch?.head ?? status.branches[0]?.name ?? "";
}

function matchesDiffTarget(entry: GitStatusEntry, target: GitDiffTarget): boolean {
  return entry.path === target.path;
}

function statusHasTarget(status: GitStatusOutput, target: GitDiffTarget): boolean {
  const entries = target.staged ? status.staged : [...status.unstaged, ...status.untracked, ...status.conflicted];
  return entries.some((entry) => matchesDiffTarget(entry, target));
}

export function useWorkspaceGit(options: UseWorkspaceGitOptions): WorkspaceGitController {
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [status, setStatus] = useState<GitStatusOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<GitNotice | null>(null);
  const [commitMessage, setCommitMessage] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [newBranchName, setNewBranchName] = useState("");
  const [diff, setDiff] = useState<GitDiffOutput | null>(null);
  const [diffTarget, setDiffTarget] = useState<GitDiffTarget | null>(null);
  const requestIdRef = useRef(0);

  const clearTransientState = useCallback(() => {
    setStatus(null);
    setError(null);
    setNotice(null);
    setDiff(null);
    setDiffTarget(null);
    setCommitMessage("");
    setSelectedBranch("");
    setNewBranchName("");
  }, []);

  const syncDiff = useCallback(
    async (repoPath: string, nextStatus: GitStatusOutput, target: GitDiffTarget | null, requestId: number) => {
      if (target === null || !statusHasTarget(nextStatus, target)) {
        if (requestId === requestIdRef.current) {
          setDiff(null);
          setDiffTarget(null);
        }
        return;
      }
      const nextDiff = await options.hostBridge.git.getDiff({ repoPath, path: target.path, staged: target.staged });
      if (requestId === requestIdRef.current) {
        setDiff(nextDiff);
        setDiffTarget(target);
      }
    },
    [options.hostBridge.git]
  );

  const refresh = useCallback(async () => {
    if (options.selectedRootPath === null) {
      clearTransientState();
      return;
    }
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);
    try {
      const nextStatus = await options.hostBridge.git.getStatus({ repoPath: options.selectedRootPath });
      if (requestId !== requestIdRef.current) {
        return;
      }
      setStatus(nextStatus);
      setSelectedBranch((currentBranch) => pickBranchName(nextStatus, currentBranch));
      await syncDiff(options.selectedRootPath, nextStatus, diffTarget, requestId);
    } catch (reason) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setStatus(null);
      setDiff(null);
      setDiffTarget(null);
      setError(String(reason));
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [clearTransientState, diffTarget, options.hostBridge.git, options.selectedRootPath, syncDiff]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runAction = useCallback(
    async (actionName: string, operation: (repoPath: string) => Promise<void>, successText: string): Promise<boolean> => {
      if (options.selectedRootPath === null) {
        return false;
      }
      setPendingAction(actionName);
      setError(null);
      setNotice(null);
      try {
        await operation(options.selectedRootPath);
        setNotice({ kind: "success", text: successText });
        await refresh();
        return true;
      } catch (reason) {
        setNotice({ kind: "error", text: formatActionError(actionName, reason) });
        return false;
      } finally {
        setPendingAction(null);
      }
    },
    [options.selectedRootPath, refresh]
  );

  const selectDiff = useCallback(
    async (path: string, staged: boolean) => {
      if (options.selectedRootPath === null) {
        return;
      }
      try {
        const nextDiffTarget = { path, staged };
        setDiffTarget(nextDiffTarget);
        setDiff(await options.hostBridge.git.getDiff({ repoPath: options.selectedRootPath, path, staged }));
      } catch (reason) {
        setNotice({ kind: "error", text: formatActionError("加载差异", reason) });
      }
    },
    [options.hostBridge.git, options.selectedRootPath]
  );

  const stagePaths = useCallback(
    async (paths: ReadonlyArray<string>) => {
      const normalized = normalizePaths(paths);
      if (normalized.length === 0) {
        return;
      }
      await runAction("暂存更改", (repoPath) => options.hostBridge.git.stagePaths({ repoPath, paths: normalized }), "已更新暂存区。");
    },
    [options.hostBridge.git, runAction]
  );

  const unstagePaths = useCallback(
    async (paths: ReadonlyArray<string>) => {
      const normalized = normalizePaths(paths);
      if (normalized.length === 0) {
        return;
      }
      await runAction("取消暂存", (repoPath) => options.hostBridge.git.unstagePaths({ repoPath, paths: normalized }), "已更新暂存区。");
    },
    [options.hostBridge.git, runAction]
  );

  const discardPaths = useCallback(
    async (paths: ReadonlyArray<string>, deleteUntracked: boolean) => {
      const normalized = normalizePaths(paths);
      if (normalized.length === 0) {
        return;
      }
      const actionName = deleteUntracked ? "删除未跟踪文件" : "还原工作区";
      const successText = deleteUntracked ? "未跟踪文件已删除。" : "工作区变更已还原。";
      await runAction(
        actionName,
        (repoPath) => options.hostBridge.git.discardPaths({ repoPath, paths: normalized, deleteUntracked }),
        successText
      );
    },
    [options.hostBridge.git, runAction]
  );

  const commit = useCallback(async () => {
    const message = commitMessage.trim();
    if (message.length === 0) {
      return;
    }
    const succeeded = await runAction("提交更改", (repoPath) => options.hostBridge.git.commit({ repoPath, message }), "提交已创建。");
    if (succeeded) {
      setCommitMessage("");
    }
  }, [commitMessage, options.hostBridge.git, runAction]);

  const checkoutSelectedBranch = useCallback(async () => {
    const branchName = selectedBranch.trim();
    if (branchName.length === 0) {
      return;
    }
    await runAction(
      "切换分支",
      (repoPath) => options.hostBridge.git.checkout({ repoPath, branchName, create: false }),
      `已切换到分支 ${branchName}。`
    );
  }, [options.hostBridge.git, runAction, selectedBranch]);

  const createBranch = useCallback(async () => {
    const branchName = newBranchName.trim();
    if (branchName.length === 0) {
      return;
    }
    const succeeded = await runAction(
      "新建分支",
      (repoPath) => options.hostBridge.git.checkout({ repoPath, branchName, create: true }),
      `已创建并切换到分支 ${branchName}。`
    );
    if (succeeded) {
      setNewBranchName("");
    }
  }, [newBranchName, options.hostBridge.git, runAction]);

  return useMemo(
    () => ({
      loading,
      pendingAction,
      status,
      statusLoaded: status !== null,
      hasRepository: status?.isRepository ?? false,
      error,
      notice,
      commitMessage,
      selectedBranch,
      newBranchName,
      diff,
      diffTarget,
      refresh,
      initRepository: async () => {
        await runAction("初始化 Git 仓库", (repoPath) => options.hostBridge.git.initRepository({ repoPath }), "Git 仓库已初始化。");
      },
      fetch: async () => {
        await runAction("抓取远端更新", (repoPath) => options.hostBridge.git.fetch({ repoPath }), "远端更新已抓取。");
      },
      pull: async () => {
        await runAction("拉取远端更新", (repoPath) => options.hostBridge.git.pull({ repoPath }), "远端更新已拉取。");
      },
      push: async () => {
        await runAction("推送分支", (repoPath) => options.hostBridge.git.push({ repoPath }), "本地提交已推送。");
      },
      stagePaths,
      unstagePaths,
      discardPaths,
      commit,
      checkoutSelectedBranch,
      createBranch,
      selectDiff,
      clearDiff: () => {
        setDiff(null);
        setDiffTarget(null);
      },
      setCommitMessage,
      setSelectedBranch,
      setNewBranchName
    }),
    [
      checkoutSelectedBranch,
      commit,
      commitMessage,
      createBranch,
      diff,
      diffTarget,
      discardPaths,
      error,
      loading,
      newBranchName,
      notice,
      options.hostBridge.git,
      pendingAction,
      refresh,
      runAction,
      selectDiff,
      selectedBranch,
      stagePaths,
      status,
      unstagePaths
    ]
  );
}
