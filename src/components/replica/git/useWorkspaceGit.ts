import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  GitBranchRef,
  GitDiffOutput,
  GitStatusSnapshotOutput,
  HostBridge,
} from "../../../bridge/types";
import { createGitDiffKey } from "./gitDiffKey";
import type { GitNotice, WorkspaceGitController } from "./types";
import { useWorkspaceGitActions } from "./useWorkspaceGitActions";
import { useWorkspaceGitAutoRefresh } from "./useWorkspaceGitAutoRefresh";
import { composeGitStatus } from "./workspaceGitStatus";
import {
  addLoadingDiffKey,
  createStaleDiffKeys,
  findRetainedDiffTarget,
  formatActionError,
  isSameDiffTarget,
  pickBranchName,
  pruneDiffCache,
  removeLoadingDiffKey,
  removeStaleDiffKey,
  storeDiff,
  type GitDiffTarget,
} from "./workspaceGitHelpers";

interface UseWorkspaceGitOptions {
  readonly diffStateEnabled?: boolean;
  readonly hostBridge: HostBridge;
  readonly selectedRootPath: string | null;
  readonly autoRefreshEnabled: boolean;
}

type RefreshMode = "initial" | "incremental";

function createDiffTarget(path: string, staged: boolean): GitDiffTarget {
  return { path, staged };
}

function getMatchingDiff(
  controllerDiff: GitDiffOutput | null,
  target: GitDiffTarget | null,
): GitDiffOutput | null {
  if (controllerDiff === null || target === null) {
    return null;
  }
  return controllerDiff.path === target.path && controllerDiff.staged === target.staged
    ? controllerDiff
    : null;
}

export function useWorkspaceGit(
  options: UseWorkspaceGitOptions,
): WorkspaceGitController {
  const diffStateEnabled = options.diffStateEnabled ?? true;
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<GitStatusSnapshotOutput | null>(null);
  const [branchRefs, setBranchRefs] = useState<ReadonlyArray<GitBranchRef>>([]);
  const [branchRefsLoading, setBranchRefsLoading] = useState(false);
  const [branchRefsLoaded, setBranchRefsLoaded] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null);
  const [remoteUrlLoading, setRemoteUrlLoading] = useState(false);
  const [remoteUrlLoaded, setRemoteUrlLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<GitNotice | null>(null);
  const [commitMessage, setCommitMessage] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [newBranchName, setNewBranchName] = useState("");
  const [diff, setDiff] = useState<GitDiffOutput | null>(null);
  const [diffCache, setDiffCache] = useState<Readonly<Record<string, GitDiffOutput>>>({});
  const [diffTarget, setDiffTarget] = useState<GitDiffTarget | null>(null);
  const [loadingDiffKeys, setLoadingDiffKeys] = useState<ReadonlyArray<string>>([]);
  const [staleDiffKeys, setStaleDiffKeys] = useState<ReadonlyArray<string>>([]);

  const requestIdRef = useRef(0);
  const selectionIdRef = useRef(0);
  const branchRefsRequestIdRef = useRef(0);
  const remoteUrlRequestIdRef = useRef(0);
  const previousRootRef = useRef<string | null>(null);
  const selectedRootRef = useRef<string | null>(options.selectedRootPath);
  const snapshotRef = useRef<GitStatusSnapshotOutput | null>(null);
  const branchRefsRef = useRef<ReadonlyArray<GitBranchRef>>([]);
  const branchRefsLoadedRef = useRef(false);
  const remoteUrlRef = useRef<string | null>(null);
  const remoteUrlLoadedRef = useRef(false);
  const diffCacheRef = useRef<Readonly<Record<string, GitDiffOutput>>>({});
  const diffTargetRef = useRef<GitDiffTarget | null>(null);
  const loadingDiffKeysRef = useRef<ReadonlyArray<string>>([]);
  const staleDiffKeysRef = useRef<ReadonlyArray<string>>([]);

  useEffect(() => {
    selectedRootRef.current = options.selectedRootPath;
  }, [options.selectedRootPath]);

  const writeSnapshot = useCallback((nextSnapshot: GitStatusSnapshotOutput | null) => {
    snapshotRef.current = nextSnapshot;
    setSnapshot(nextSnapshot);
  }, []);

  const writeBranchRefs = useCallback((nextBranchRefs: ReadonlyArray<GitBranchRef>) => {
    branchRefsRef.current = nextBranchRefs;
    setBranchRefs(nextBranchRefs);
  }, []);

  const writeBranchRefsLoaded = useCallback((nextLoaded: boolean) => {
    branchRefsLoadedRef.current = nextLoaded;
    setBranchRefsLoaded(nextLoaded);
  }, []);

  const writeRemoteUrl = useCallback((nextRemoteUrl: string | null) => {
    remoteUrlRef.current = nextRemoteUrl;
    setRemoteUrl(nextRemoteUrl);
  }, []);

  const writeRemoteUrlLoaded = useCallback((nextLoaded: boolean) => {
    remoteUrlLoadedRef.current = nextLoaded;
    setRemoteUrlLoaded(nextLoaded);
  }, []);

  const writeDiffCache = useCallback((nextCache: Readonly<Record<string, GitDiffOutput>>) => {
    diffCacheRef.current = nextCache;
    setDiffCache(nextCache);
  }, []);

  const writeDiffTarget = useCallback((nextTarget: GitDiffTarget | null) => {
    diffTargetRef.current = nextTarget;
    setDiffTarget(nextTarget);
  }, []);

  const writeLoadingDiffKeys = useCallback((nextKeys: ReadonlyArray<string>) => {
    loadingDiffKeysRef.current = nextKeys;
    setLoadingDiffKeys(nextKeys);
  }, []);

  const writeStaleDiffKeys = useCallback((nextKeys: ReadonlyArray<string>) => {
    staleDiffKeysRef.current = nextKeys;
    setStaleDiffKeys(nextKeys);
  }, []);

  const resetBranchRefsState = useCallback(() => {
    branchRefsRequestIdRef.current += 1;
    writeBranchRefs([]);
    writeBranchRefsLoaded(false);
    setBranchRefsLoading(false);
  }, [writeBranchRefs, writeBranchRefsLoaded]);

  const resetRemoteUrlState = useCallback(
    (loaded: boolean) => {
      remoteUrlRequestIdRef.current += 1;
      writeRemoteUrl(null);
      writeRemoteUrlLoaded(loaded);
      setRemoteUrlLoading(false);
    },
    [writeRemoteUrl, writeRemoteUrlLoaded],
  );

  const resetRepositoryState = useCallback(() => {
    writeSnapshot(null);
    setError(null);
    setNotice(null);
    setDiff(null);
    writeDiffCache({});
    writeDiffTarget(null);
    writeLoadingDiffKeys([]);
    writeStaleDiffKeys([]);
    resetBranchRefsState();
    resetRemoteUrlState(false);
  }, [
    resetBranchRefsState,
    resetRemoteUrlState,
    writeDiffCache,
    writeDiffTarget,
    writeLoadingDiffKeys,
    writeSnapshot,
    writeStaleDiffKeys,
  ]);

  const clearTransientState = useCallback(() => {
    resetRepositoryState();
    setCommitMessage("");
    setSelectedBranch("");
    setNewBranchName("");
  }, [resetRepositoryState]);

  const status = useMemo(
    () =>
      composeGitStatus(
        snapshot,
        branchRefs,
        branchRefsLoaded,
        remoteUrl,
        remoteUrlLoaded,
      ),
    [branchRefs, branchRefsLoaded, remoteUrl, remoteUrlLoaded, snapshot],
  );

  const loadDiff = useCallback(
    async (repoPath: string, target: GitDiffTarget): Promise<GitDiffOutput> => {
      const diffKey = createGitDiffKey(target.path, target.staged);
      writeLoadingDiffKeys(addLoadingDiffKey(loadingDiffKeysRef.current, diffKey));
      try {
        const nextDiff = await options.hostBridge.git.getDiff({
          repoPath,
          path: target.path,
          staged: target.staged,
        });
        writeDiffCache(storeDiff(diffCacheRef.current, nextDiff));
        writeStaleDiffKeys(removeStaleDiffKey(staleDiffKeysRef.current, diffKey));
        return nextDiff;
      } finally {
        writeLoadingDiffKeys(
          removeLoadingDiffKey(loadingDiffKeysRef.current, diffKey),
        );
      }
    },
    [options.hostBridge.git, writeDiffCache, writeLoadingDiffKeys, writeStaleDiffKeys],
  );

  const syncSelectedDiff = useCallback(
    async (
      repoPath: string,
      nextStatus: NonNullable<typeof status>,
      requestId: number,
      nextCache: Readonly<Record<string, GitDiffOutput>>,
    ) => {
      const nextTarget = findRetainedDiffTarget(nextStatus, diffTargetRef.current);
      if (nextTarget === null) {
        if (requestId === requestIdRef.current) {
          setDiff(null);
          writeDiffTarget(null);
        }
        return;
      }

      const diffKey = createGitDiffKey(nextTarget.path, nextTarget.staged);
      const cachedDiff = nextCache[diffKey] ?? null;
      if (requestId === requestIdRef.current) {
        writeDiffTarget(nextTarget);
        if (cachedDiff !== null) {
          setDiff(cachedDiff);
        }
      }

      const nextDiff = await loadDiff(repoPath, nextTarget);
      if (
        requestId === requestIdRef.current
        && isSameDiffTarget(diffTargetRef.current, nextTarget)
      ) {
        setDiff(nextDiff);
      }
    },
    [loadDiff, writeDiffTarget],
  );

  const refreshSnapshot = useCallback(
    async (mode: RefreshMode) => {
      if (options.selectedRootPath === null) {
        clearTransientState();
        previousRootRef.current = null;
        return;
      }

      const repoPath = options.selectedRootPath;
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setLoading(true);
      setError(null);

      try {
        const nextSnapshot = await options.hostBridge.git.getStatusSnapshot({ repoPath });
        if (requestId !== requestIdRef.current) {
          return;
        }

        const previousSnapshot = snapshotRef.current;
        if (!nextSnapshot.isRepository) {
          resetBranchRefsState();
        }
        if (nextSnapshot.remoteName === null) {
          resetRemoteUrlState(true);
        } else if (nextSnapshot.remoteName !== previousSnapshot?.remoteName) {
          resetRemoteUrlState(false);
        }

        writeSnapshot(nextSnapshot);
        const nextStatus = composeGitStatus(
          nextSnapshot,
          branchRefsRef.current,
          branchRefsLoadedRef.current,
          remoteUrlRef.current,
          remoteUrlLoadedRef.current,
        );
        if (nextStatus === null) {
          return;
        }
        setSelectedBranch((currentBranch) => pickBranchName(nextStatus, currentBranch));
        if (!diffStateEnabled) {
          writeDiffCache({});
          writeDiffTarget(null);
          writeLoadingDiffKeys([]);
          writeStaleDiffKeys([]);
          return;
        }

        const nextCache = pruneDiffCache(diffCacheRef.current, nextStatus);
        writeDiffCache(nextCache);
        writeStaleDiffKeys(createStaleDiffKeys(nextStatus));
        await syncSelectedDiff(repoPath, nextStatus, requestId, nextCache);
      } catch (reason) {
        if (requestId !== requestIdRef.current) {
          return;
        }
        if (mode === "initial") {
          resetRepositoryState();
        }
        setError(String(reason));
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [
      branchRefsLoadedRef,
      clearTransientState,
      diffStateEnabled,
      options.hostBridge.git,
      options.selectedRootPath,
      remoteUrlLoadedRef,
      resetBranchRefsState,
      resetRemoteUrlState,
      resetRepositoryState,
      syncSelectedDiff,
      writeDiffCache,
      writeDiffTarget,
      writeLoadingDiffKeys,
      writeSnapshot,
      writeStaleDiffKeys,
    ],
  );

  const refresh = useCallback(async () => {
    await refreshSnapshot("incremental");
  }, [refreshSnapshot]);

  const ensureBranchRefs = useCallback(async () => {
    if (
      options.selectedRootPath === null
      || snapshotRef.current === null
      || !snapshotRef.current.isRepository
      || branchRefsLoadedRef.current
      || branchRefsLoading
    ) {
      return;
    }

    const repoPath = options.selectedRootPath;
    const requestId = branchRefsRequestIdRef.current + 1;
    branchRefsRequestIdRef.current = requestId;
    setBranchRefsLoading(true);
    try {
      const nextBranchRefs = await options.hostBridge.git.getBranchRefs({ repoPath });
      if (
        requestId !== branchRefsRequestIdRef.current
        || selectedRootRef.current !== repoPath
      ) {
        return;
      }
      writeBranchRefs(nextBranchRefs);
      writeBranchRefsLoaded(true);
      setSelectedBranch((currentBranch) =>
        pickBranchName(
          composeGitStatus(
            snapshotRef.current,
            nextBranchRefs,
            true,
            remoteUrlRef.current,
            remoteUrlLoadedRef.current,
          ),
          currentBranch,
        ),
      );
    } catch (reason) {
      if (
        requestId === branchRefsRequestIdRef.current
        && selectedRootRef.current === repoPath
      ) {
        setNotice({ kind: "error", text: formatActionError("加载分支", reason) });
      }
    } finally {
      if (
        requestId === branchRefsRequestIdRef.current
        && selectedRootRef.current === repoPath
      ) {
        setBranchRefsLoading(false);
      }
    }
  }, [
    branchRefsLoading,
    options.hostBridge.git,
    options.selectedRootPath,
    writeBranchRefs,
    writeBranchRefsLoaded,
  ]);

  const ensureRemoteUrl = useCallback(async () => {
    const currentSnapshot = snapshotRef.current;
    if (
      options.selectedRootPath === null
      || currentSnapshot === null
      || !currentSnapshot.isRepository
      || remoteUrlLoading
      || remoteUrlLoadedRef.current
    ) {
      return;
    }
    if (currentSnapshot.remoteName === null) {
      resetRemoteUrlState(true);
      return;
    }

    const repoPath = options.selectedRootPath;
    const requestId = remoteUrlRequestIdRef.current + 1;
    remoteUrlRequestIdRef.current = requestId;
    setRemoteUrlLoading(true);
    try {
      const nextRemoteUrl = await options.hostBridge.git.getRemoteUrl({
        repoPath,
        remoteName: currentSnapshot.remoteName,
      });
      if (
        requestId !== remoteUrlRequestIdRef.current
        || selectedRootRef.current !== repoPath
      ) {
        return;
      }
      writeRemoteUrl(nextRemoteUrl);
      writeRemoteUrlLoaded(true);
    } catch (reason) {
      if (
        requestId === remoteUrlRequestIdRef.current
        && selectedRootRef.current === repoPath
      ) {
        setNotice({ kind: "error", text: formatActionError("加载远端地址", reason) });
      }
    } finally {
      if (
        requestId === remoteUrlRequestIdRef.current
        && selectedRootRef.current === repoPath
      ) {
        setRemoteUrlLoading(false);
      }
    }
  }, [
    options.hostBridge.git,
    options.selectedRootPath,
    remoteUrlLoading,
    resetRemoteUrlState,
    writeRemoteUrl,
    writeRemoteUrlLoaded,
  ]);

  useEffect(() => {
    const previousRootPath = previousRootRef.current;
    previousRootRef.current = options.selectedRootPath;
    if (options.selectedRootPath === null) {
      clearTransientState();
      return;
    }
    if (previousRootPath !== options.selectedRootPath) {
      resetRepositoryState();
      void refreshSnapshot("initial");
    }
  }, [clearTransientState, options.selectedRootPath, refreshSnapshot, resetRepositoryState]);

  useWorkspaceGitAutoRefresh({
    enabled: options.autoRefreshEnabled,
    selectedRootPath: options.selectedRootPath,
    loading,
    pendingAction,
    refresh,
  });

  const selectDiff = useCallback(
    async (path: string, staged: boolean) => {
      if (!diffStateEnabled || options.selectedRootPath === null) {
        return;
      }

      const selectionId = selectionIdRef.current + 1;
      selectionIdRef.current = selectionId;
      const nextTarget = createDiffTarget(path, staged);
      const diffKey = createGitDiffKey(path, staged);
      const cachedDiff = diffCacheRef.current[diffKey] ?? null;
      writeDiffTarget(nextTarget);
      const matchedDiff = getMatchingDiff(diff, nextTarget);
      if (cachedDiff !== null) {
        setDiff(cachedDiff);
      } else if (matchedDiff === null) {
        setDiff(null);
      }
      if (cachedDiff !== null && !staleDiffKeysRef.current.includes(diffKey)) {
        return;
      }

      try {
        const nextDiff = await loadDiff(options.selectedRootPath, nextTarget);
        if (
          selectionId === selectionIdRef.current
          && isSameDiffTarget(diffTargetRef.current, nextTarget)
        ) {
          setDiff(nextDiff);
        }
      } catch (reason) {
        setNotice({ kind: "error", text: formatActionError("加载差异", reason) });
      }
    },
    [diff, diffStateEnabled, loadDiff, options.selectedRootPath, writeDiffTarget],
  );

  const ensureDiff = useCallback(
    async (path: string, staged: boolean) => {
      if (!diffStateEnabled || options.selectedRootPath === null) {
        return;
      }

      const diffKey = createGitDiffKey(path, staged);
      const hasFreshDiff = diffCacheRef.current[diffKey] !== undefined
        && !staleDiffKeysRef.current.includes(diffKey);
      if (hasFreshDiff || loadingDiffKeysRef.current.includes(diffKey)) {
        return;
      }

      try {
        await loadDiff(options.selectedRootPath, createDiffTarget(path, staged));
      } catch (reason) {
        setNotice({ kind: "error", text: formatActionError("加载差异", reason) });
      }
    },
    [diffStateEnabled, loadDiff, options.selectedRootPath],
  );

  const {
    initRepository,
    fetch,
    pull,
    push,
    stagePaths,
    unstagePaths,
    discardPaths,
    commit,
    checkoutBranch,
    createBranchFromName,
    checkoutSelectedBranch,
    createBranch,
  } = useWorkspaceGitActions({
    hostBridge: options.hostBridge,
    selectedRootPath: options.selectedRootPath,
    commitMessage,
    selectedBranch,
    newBranchName,
    setCommitMessage,
    setSelectedBranch,
    setNewBranchName,
    setPendingAction,
    setError,
    setNotice,
    refresh,
    invalidateBranchRefs: resetBranchRefsState,
    invalidateRemoteUrl: () => resetRemoteUrlState(false),
  });

  return useMemo(
    () => ({
      loading,
      pendingAction,
      status,
      statusLoaded: snapshot !== null,
      hasRepository: status?.isRepository ?? false,
      error,
      notice,
      branchRefsLoading,
      branchRefsLoaded,
      remoteUrlLoading,
      remoteUrlLoaded,
      commitMessage,
      selectedBranch,
      newBranchName,
      diff,
      diffCache,
      diffTarget,
      loadingDiffKeys,
      staleDiffKeys,
      refresh,
      initRepository,
      fetch,
      pull,
      push,
      stagePaths,
      unstagePaths,
      discardPaths,
      commit,
      checkoutBranch,
      createBranchFromName,
      checkoutSelectedBranch,
      createBranch,
      ensureBranchRefs,
      ensureRemoteUrl,
      ensureDiff,
      selectDiff,
      clearDiff: () => {
        setDiff(null);
        writeDiffTarget(null);
      },
      setCommitMessage,
      setSelectedBranch,
      setNewBranchName,
    }),
    [
      branchRefsLoaded,
      branchRefsLoading,
      checkoutBranch,
      checkoutSelectedBranch,
      commit,
      commitMessage,
      createBranch,
      createBranchFromName,
      diff,
      diffCache,
      diffTarget,
      discardPaths,
      ensureBranchRefs,
      ensureDiff,
      ensureRemoteUrl,
      error,
      fetch,
      initRepository,
      loading,
      loadingDiffKeys,
      newBranchName,
      notice,
      pendingAction,
      pull,
      push,
      refresh,
      remoteUrlLoaded,
      remoteUrlLoading,
      selectDiff,
      selectedBranch,
      stagePaths,
      staleDiffKeys,
      status,
      snapshot,
      unstagePaths,
      writeDiffTarget,
    ],
  );
}
