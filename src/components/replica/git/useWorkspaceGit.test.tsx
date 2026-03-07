import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GitDiffOutput, GitStatusOutput, HostBridge } from "../../../bridge/types";
import { useWorkspaceGit } from "./useWorkspaceGit";

interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

function createStatus(overrides?: Partial<GitStatusOutput>): GitStatusOutput {
  return {
    isRepository: true,
    repoRoot: "E:/code/project",
    branch: { head: "main", upstream: "origin/main", ahead: 0, behind: 0, detached: false },
    remoteName: "origin",
    remoteUrl: "https://example.com/repo.git",
    branches: [{ name: "main", upstream: "origin/main", isCurrent: true }],
    staged: [],
    unstaged: [],
    untracked: [],
    conflicted: [],
    isClean: false,
    ...overrides
  };
}

function createDiff(path: string, staged = false): GitDiffOutput {
  return {
    path,
    staged,
    diff: `@@ -1 +1 @@\n-console.log('${path}-old')\n+console.log('${path}-new')`
  };
}

function createHostBridge(getStatus: ReturnType<typeof vi.fn>, getDiff: ReturnType<typeof vi.fn>): HostBridge {
  return {
    git: {
      getStatus,
      getDiff,
      initRepository: vi.fn().mockResolvedValue(undefined),
      stagePaths: vi.fn().mockResolvedValue(undefined),
      unstagePaths: vi.fn().mockResolvedValue(undefined),
      discardPaths: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      fetch: vi.fn().mockResolvedValue(undefined),
      pull: vi.fn().mockResolvedValue(undefined),
      push: vi.fn().mockResolvedValue(undefined),
      checkout: vi.fn().mockResolvedValue(undefined)
    }
  } as unknown as HostBridge;
}

describe("useWorkspaceGit", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  async function waitForAutoRefresh(): Promise<void> {
    await new Promise((resolve) => window.setTimeout(resolve, 150));
  }

  it("preserves status and diff cache while refresh is pending", async () => {
    const status = createStatus({ unstaged: [{ path: "src/App.tsx", originalPath: null, indexStatus: " ", worktreeStatus: "M" }] });
    const deferred = createDeferred<GitStatusOutput>();
    const getStatus = vi.fn().mockResolvedValueOnce(status).mockImplementationOnce(() => deferred.promise);
    const getDiff = vi.fn().mockResolvedValue(createDiff("src/App.tsx"));
    const hostBridge = createHostBridge(getStatus, getDiff);

    const { result } = renderHook(() => useWorkspaceGit({ hostBridge, selectedRootPath: "E:/code/project", autoRefreshEnabled: false }));

    await waitFor(() => expect(result.current.status?.unstaged).toHaveLength(1));
    await act(async () => {
      await result.current.selectDiff("src/App.tsx", false);
    });

    const previousStatus = result.current.status;
    const previousDiffCache = result.current.diffCache;

    act(() => {
      void result.current.refresh();
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.status).toBe(previousStatus);
    expect(result.current.diffCache).toBe(previousDiffCache);

    deferred.resolve(status);
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("coalesces focus and visibility refreshes when auto refresh is enabled", async () => {
    const status = createStatus({ unstaged: [{ path: "src/App.tsx", originalPath: null, indexStatus: " ", worktreeStatus: "M" }] });
    const getStatus = vi.fn().mockResolvedValue(status);
    const getDiff = vi.fn().mockResolvedValue(createDiff("src/App.tsx"));
    const hostBridge = createHostBridge(getStatus, getDiff);

    const { rerender } = renderHook(
      (props: { readonly autoRefreshEnabled: boolean }) =>
        useWorkspaceGit({ hostBridge, selectedRootPath: "E:/code/project", autoRefreshEnabled: props.autoRefreshEnabled }),
      { initialProps: { autoRefreshEnabled: false } }
    );

    await waitFor(() => expect(getStatus).toHaveBeenCalledTimes(1));
    getStatus.mockClear();

    rerender({ autoRefreshEnabled: true });
    await waitForAutoRefresh();
    await waitFor(() => expect(getStatus).toHaveBeenCalledTimes(1));
    getStatus.mockClear();

    const originalVisibility = Object.getOwnPropertyDescriptor(document, "visibilityState");
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });

    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
    await waitForAutoRefresh();
    await waitFor(() => expect(getStatus).toHaveBeenCalledTimes(1));

    if (originalVisibility !== undefined) {
      Object.defineProperty(document, "visibilityState", originalVisibility);
    }
  });

  it("prunes obsolete diff cache entries after refresh", async () => {
    const firstStatus = createStatus({
      unstaged: [{ path: "src/App.tsx", originalPath: null, indexStatus: " ", worktreeStatus: "M" }],
      untracked: [{ path: "src/Old.ts", originalPath: null, indexStatus: "?", worktreeStatus: "?" }]
    });
    const secondStatus = createStatus({ unstaged: [{ path: "src/Next.ts", originalPath: null, indexStatus: " ", worktreeStatus: "M" }] });
    const getStatus = vi.fn().mockResolvedValueOnce(firstStatus).mockResolvedValueOnce(secondStatus);
    const getDiff = vi.fn().mockImplementation(async ({ path }: { readonly path: string }) => createDiff(path));
    const hostBridge = createHostBridge(getStatus, getDiff);

    const { result } = renderHook(() => useWorkspaceGit({ hostBridge, selectedRootPath: "E:/code/project", autoRefreshEnabled: false }));

    await waitFor(() => expect(result.current.status?.unstaged).toHaveLength(1));
    await act(async () => {
      await result.current.selectDiff("src/App.tsx", false);
      await result.current.ensureDiff("src/Old.ts", false);
    });
    expect(Object.keys(result.current.diffCache).sort()).toEqual(["unstaged:src/App.tsx", "unstaged:src/Old.ts"]);

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => expect(result.current.diffTarget).toEqual({ path: "src/Next.ts", staged: false }));
    expect(Object.keys(result.current.diffCache)).toEqual(["unstaged:src/Next.ts"]);
  });
});
