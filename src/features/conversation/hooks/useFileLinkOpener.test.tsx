import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { HostBridge } from "../../../bridge/types";
import { useFileLinkOpener } from "./useFileLinkOpener";

function createHostBridge() {
  const openFileInEditor = vi.fn().mockResolvedValue(undefined);
  return {
    hostBridge: {
      app: {
        openFileInEditor,
      },
    } as unknown as HostBridge,
    openFileInEditor,
  };
}

describe("useFileLinkOpener", () => {
  it("joins relative file targets to the active workspace and preserves line metadata", async () => {
    const { hostBridge, openFileInEditor } = createHostBridge();
    const { result } = renderHook(() =>
      useFileLinkOpener(hostBridge, "E:/code/codex-app-plus", "windowsNative"),
    );

    await act(async () => {
      await result.current.openFileLink({
        path: "src/App.tsx",
        line: 42,
        column: 7,
      });
    });

    expect(openFileInEditor).toHaveBeenCalledWith({
      path: "E:/code/codex-app-plus/src/App.tsx",
      agentEnvironment: "windowsNative",
      line: 42,
      column: 7,
    });
  });

  it("maps /workspace paths to the active workspace root", async () => {
    const { hostBridge, openFileInEditor } = createHostBridge();
    const { result } = renderHook(() =>
      useFileLinkOpener(hostBridge, "E:/code/codex-app-plus", "windowsNative"),
    );

    await act(async () => {
      await result.current.openFileLink({
        path: "/workspace/src/App.tsx",
        line: 33,
        column: null,
      });
    });

    expect(openFileInEditor).toHaveBeenCalledWith({
      path: "E:/code/codex-app-plus/src/App.tsx",
      agentEnvironment: "windowsNative",
      line: 33,
      column: null,
    });
  });

  it("maps nested /workspaces paths to the active workspace root", async () => {
    const { hostBridge, openFileInEditor } = createHostBridge();
    const { result } = renderHook(() =>
      useFileLinkOpener(hostBridge, "E:/code/codex-app-plus", "windowsNative"),
    );

    await act(async () => {
      await result.current.openFileLink({
        path: "/workspaces/team/codex-app-plus/src/App.tsx",
        line: 12,
        column: 2,
      });
    });

    expect(openFileInEditor).toHaveBeenCalledWith({
      path: "E:/code/codex-app-plus/src/App.tsx",
      agentEnvironment: "windowsNative",
      line: 12,
      column: 2,
    });
  });

  it("converts Windows absolute paths to WSL agent paths before opening", async () => {
    const { hostBridge, openFileInEditor } = createHostBridge();
    const { result } = renderHook(() =>
      useFileLinkOpener(hostBridge, "E:/code/codex-app-plus", "wsl"),
    );

    await act(async () => {
      await result.current.openFileLink({
        path: "E:/code/codex-app-plus/src/App.tsx",
        line: 21,
        column: null,
      });
    });

    expect(openFileInEditor).toHaveBeenCalledWith({
      path: "/mnt/e/code/codex-app-plus/src/App.tsx",
      agentEnvironment: "wsl",
      line: 21,
      column: null,
    });
  });

  it("normalizes WSL UNC paths back to Linux paths before opening", async () => {
    const { hostBridge, openFileInEditor } = createHostBridge();
    const { result } = renderHook(() =>
      useFileLinkOpener(hostBridge, null, "wsl"),
    );

    await act(async () => {
      await result.current.openFileLink({
        path: "\\\\wsl.localhost\\Ubuntu\\home\\me\\codex-app-plus\\src\\App.tsx",
        line: 9,
        column: 4,
      });
    });

    expect(openFileInEditor).toHaveBeenCalledWith({
      path: "/home/me/codex-app-plus/src/App.tsx",
      agentEnvironment: "wsl",
      line: 9,
      column: 4,
    });
  });
});
