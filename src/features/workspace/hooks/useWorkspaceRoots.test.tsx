import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WorkspacePersistenceState } from "../../../bridge/types";
import { useWorkspaceRoots } from "./useWorkspaceRoots";

function cloneState(value: WorkspacePersistenceState | null): WorkspacePersistenceState | null {
  return value === null ? null : JSON.parse(JSON.stringify(value)) as WorkspacePersistenceState;
}

function createPersistenceBridge(initialState: WorkspacePersistenceState | null = null) {
  let storedState = cloneState(initialState);

  return {
    appBridge: {
      readWorkspaceState: vi.fn(async () => cloneState(storedState)),
      writeWorkspaceState: vi.fn(async (nextState: WorkspacePersistenceState) => {
        storedState = cloneState(nextState);
      }),
    },
    readStoredState: () => cloneState(storedState),
  };
}

describe("useWorkspaceRoots", () => {
  it("starts empty until the user adds a workspace", async () => {
    const { appBridge } = createPersistenceBridge();
    const { result } = renderHook(() => useWorkspaceRoots(appBridge));

    await waitFor(() => {
      expect(appBridge.readWorkspaceState).toHaveBeenCalledTimes(1);
    });

    expect(result.current.roots).toEqual([]);
    expect(result.current.selectedRootId).toBeNull();
  });

  it("persists manually added roots after remount", async () => {
    const bridge = createPersistenceBridge();
    const first = renderHook(() => useWorkspaceRoots(bridge.appBridge));

    await waitFor(() => {
      expect(bridge.appBridge.readWorkspaceState).toHaveBeenCalledTimes(1);
    });

    act(() => {
      first.result.current.addRoot({ name: "FPGA", path: "E:/code/FPGA" });
    });

    await waitFor(() => {
      expect(bridge.readStoredState()?.roots).toHaveLength(1);
    });

    first.unmount();

    const second = renderHook(() => useWorkspaceRoots(bridge.appBridge));
    await waitFor(() => {
      expect(second.result.current.roots).toHaveLength(1);
    });

    expect(second.result.current.roots[0]).toMatchObject({
      name: "FPGA",
      path: "E:/code/FPGA",
      launchScript: null,
      launchScripts: null,
    });
  });

  it("persists the selected root id after remount", async () => {
    const bridge = createPersistenceBridge();
    const first = renderHook(() => useWorkspaceRoots(bridge.appBridge));

    await waitFor(() => {
      expect(bridge.appBridge.readWorkspaceState).toHaveBeenCalledTimes(1);
    });

    act(() => {
      first.result.current.addRoot({ name: "FPGA", path: "E:/code/FPGA" });
      first.result.current.addRoot({ name: "Docs", path: "E:/docs" });
    });

    const docsRoot = first.result.current.roots.find((root) => root.name === "Docs");
    if (docsRoot === undefined) {
      throw new Error("Docs root 未创建");
    }

    act(() => {
      first.result.current.selectRoot(docsRoot.id);
    });

    await waitFor(() => {
      expect(bridge.readStoredState()?.selectedRootId).toBe(docsRoot.id);
    });

    first.unmount();

    const second = renderHook(() => useWorkspaceRoots(bridge.appBridge));
    await waitFor(() => {
      expect(second.result.current.selectedRootId).toBe(docsRoot.id);
    });
  });

  it("shows a removed root again after manual re-add", async () => {
    const { appBridge } = createPersistenceBridge();
    const { result } = renderHook(() => useWorkspaceRoots(appBridge));

    await waitFor(() => {
      expect(appBridge.readWorkspaceState).toHaveBeenCalledTimes(1);
    });

    act(() => {
      result.current.addRoot({ name: "FPGA", path: "E:/code/FPGA" });
    });

    const removedRoot = result.current.roots[0];
    if (removedRoot === undefined) {
      throw new Error("缺少要移除的工作区");
    }

    act(() => {
      result.current.removeRoot(removedRoot.id);
    });

    act(() => {
      result.current.addRoot({ name: removedRoot.name, path: removedRoot.path });
    });

    expect(result.current.roots).toHaveLength(1);
    expect(result.current.roots[0]).toMatchObject({ name: removedRoot.name, path: removedRoot.path });
  });

  it("reorders roots and persists the new order", async () => {
    const bridge = createPersistenceBridge();
    const hook = renderHook(() => useWorkspaceRoots(bridge.appBridge));

    await waitFor(() => {
      expect(bridge.appBridge.readWorkspaceState).toHaveBeenCalledTimes(1);
    });

    act(() => {
      hook.result.current.addRoot({ name: "FPGA", path: "E:/code/FPGA" });
      hook.result.current.addRoot({ name: "Codex", path: "E:/code/codex" });
      hook.result.current.addRoot({ name: "Docs", path: "E:/docs" });
    });

    expect(hook.result.current.roots.map((root) => root.name)).toEqual(["FPGA", "Codex", "Docs"]);

    act(() => {
      hook.result.current.reorderRoots(2, 0);
    });

    expect(hook.result.current.roots.map((root) => root.name)).toEqual(["Docs", "FPGA", "Codex"]);

    await waitFor(() => {
      expect(bridge.readStoredState()?.roots.map((root) => root.name)).toEqual(["Docs", "FPGA", "Codex"]);
    });

    hook.unmount();

    const remounted = renderHook(() => useWorkspaceRoots(bridge.appBridge));
    await waitFor(() => {
      expect(remounted.result.current.roots.map((root) => root.name)).toEqual(["Docs", "FPGA", "Codex"]);
    });
  });

  it("persists managed worktrees after remount", async () => {
    const bridge = createPersistenceBridge();
    const hook = renderHook(() => useWorkspaceRoots(bridge.appBridge));

    await waitFor(() => {
      expect(bridge.appBridge.readWorkspaceState).toHaveBeenCalledTimes(1);
    });

    act(() => {
      hook.result.current.addManagedWorktree({
        path: "E:/code/codex-worktrees/feature-a",
        repoPath: "E:/code/codex",
        branch: "feature-a",
      });
    });

    await waitFor(() => {
      expect(bridge.readStoredState()?.managedWorktrees[0]?.branch).toBe("feature-a");
    });

    hook.unmount();

    const remounted = renderHook(() => useWorkspaceRoots(bridge.appBridge));
    await waitFor(() => {
      expect(remounted.result.current.managedWorktrees).toHaveLength(1);
    });

    expect(remounted.result.current.managedWorktrees[0]).toMatchObject({
      path: "E:/code/codex-worktrees/feature-a",
      repoPath: "E:/code/codex",
      branch: "feature-a",
    });
  });

  it("removes managed worktrees by path", async () => {
    const { appBridge } = createPersistenceBridge();
    const hook = renderHook(() => useWorkspaceRoots(appBridge));

    await waitFor(() => {
      expect(appBridge.readWorkspaceState).toHaveBeenCalledTimes(1);
    });

    act(() => {
      hook.result.current.addManagedWorktree({
        path: "E:/code/codex-worktrees/feature-a",
        repoPath: "E:/code/codex",
        branch: "feature-a",
      });
      hook.result.current.removeManagedWorktree("E:/code/codex-worktrees/feature-a");
    });

    expect(hook.result.current.managedWorktrees).toEqual([]);
  });

  it("persists launch script settings for a workspace", async () => {
    const bridge = createPersistenceBridge();
    const first = renderHook(() => useWorkspaceRoots(bridge.appBridge));

    await waitFor(() => {
      expect(bridge.appBridge.readWorkspaceState).toHaveBeenCalledTimes(1);
    });

    act(() => {
      first.result.current.addRoot({ name: "FPGA", path: "E:/code/FPGA" });
    });

    const rootId = first.result.current.roots[0]?.id ?? "";
    act(() => {
      first.result.current.updateWorkspaceLaunchScripts({
        rootId,
        launchScript: "npm run dev",
        launchScripts: [
          {
            id: "web",
            script: "pnpm web",
            icon: "globe",
            label: "前端",
          },
        ],
      });
    });

    await waitFor(() => {
      expect(bridge.readStoredState()?.roots[0]?.launchScript).toBe("npm run dev");
    });

    first.unmount();

    const second = renderHook(() => useWorkspaceRoots(bridge.appBridge));
    await waitFor(() => {
      expect(second.result.current.roots[0]).toMatchObject({
        launchScript: "npm run dev",
        launchScripts: [
          {
            id: "web",
            script: "pnpm web",
            icon: "globe",
            label: "前端",
          },
        ],
      });
    });
  });
});
