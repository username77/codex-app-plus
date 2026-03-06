import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GitDiffOutput, GitStatusOutput, HostBridge } from "../../../bridge/types";
import { createGitDiffKey } from "./gitDiffKey";
import type { GitNotice, WorkspaceGitController } from "./types";
import { addLoadingDiffKey, formatActionError, type GitDiffTarget, normalizePaths, pickBranchName, removeLoadingDiffKey, statusHasTarget, storeDiff } from "./workspaceGitHelpers";

interface UseWorkspaceGitOptions { readonly hostBridge: HostBridge; readonly selectedRootPath: string | null; }

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
  const [diffCache, setDiffCache] = useState<Readonly<Record<string, GitDiffOutput>>>({});
  const [diffTarget, setDiffTarget] = useState<GitDiffTarget | null>(null);
  const [loadingDiffKeys, setLoadingDiffKeys] = useState<ReadonlyArray<string>>([]);
  const requestIdRef = useRef(0);

  const clearTransientState = useCallback(() => {
    setStatus(null);
    setError(null);
    setNotice(null);
    setDiff(null);
    setDiffCache({});
    setDiffTarget(null);
    setLoadingDiffKeys([]);
    setCommitMessage("");
    setSelectedBranch("");
    setNewBranchName("");
  }, []);

  const loadDiff = useCallback(
    async (repoPath: string, target: GitDiffTarget): Promise<GitDiffOutput> => {
      const diffKey = createGitDiffKey(target.path, target.staged);
      setLoadingDiffKeys((current) => addLoadingDiffKey(current, diffKey));
      try {
        const nextDiff = await options.hostBridge.git.getDiff({ repoPath, path: target.path, staged: target.staged });
        setDiffCache((current) => storeDiff(current, nextDiff));
        return nextDiff;
      } finally {
        setLoadingDiffKeys((current) => removeLoadingDiffKey(current, diffKey));
      }
    },
    [options.hostBridge.git]
  );

  const syncDiff = useCallback(
    async (repoPath: string, nextStatus: GitStatusOutput, target: GitDiffTarget | null, requestId: number) => {
      if (target === null || !statusHasTarget(nextStatus, target)) {
        if (requestId === requestIdRef.current) {
          setDiff(null);
          setDiffTarget(null);
        }
        return;
      }
      const nextDiff = await loadDiff(repoPath, target);
      if (requestId === requestIdRef.current) {
        setDiff(nextDiff);
        setDiffTarget(target);
      }
    },
    [loadDiff]
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
    setDiffCache({});
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
        const nextDiff = await loadDiff(options.selectedRootPath, nextDiffTarget);
        setDiffTarget(nextDiffTarget);
        setDiff(nextDiff);
      } catch (reason) {
        setNotice({ kind: "error", text: formatActionError("加载差异", reason) });
      }
    },
    [loadDiff, options.selectedRootPath]
  );

  const ensureDiff = useCallback(
    async (path: string, staged: boolean) => {
      if (options.selectedRootPath === null) {
        return;
      }
      const diffKey = createGitDiffKey(path, staged);
      if (diffCache[diffKey] !== undefined || loadingDiffKeys.includes(diffKey)) {
        return;
      }
      try {
        await loadDiff(options.selectedRootPath, { path, staged });
      } catch (reason) {
        setNotice({ kind: "error", text: formatActionError("加载差异", reason) });
      }
    },
    [diffCache, loadDiff, loadingDiffKeys, options.selectedRootPath]
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
      diffCache,
      diffTarget,
      loadingDiffKeys,
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
      ensureDiff,
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
      diffCache,
      diffTarget,
      discardPaths,
      ensureDiff,
      error,
      loading,
      loadingDiffKeys,
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
