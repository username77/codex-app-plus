import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { HostBridge } from "../../bridge/types";
import { useTerminalOpenAction } from "./terminalRuntime";

vi.mock("@xterm/addon-fit", () => ({
  FitAddon: class FitAddon {
    fit(): void {}
  }
}));

vi.mock("@xterm/xterm", () => ({
  Terminal: class Terminal {
    cols = 120;
    rows = 32;
    loadAddon(): void {}
    onData() {
      return { dispose(): void {} };
    }
    open(): void {}
    focus(): void {}
    reset(): void {}
    write(): void {}
    writeln(): void {}
    dispose(): void {}
  }
}));

function createHostBridge(createSession: ReturnType<typeof vi.fn>): HostBridge {
  return {
    appServer: {
      start: vi.fn(),
      stop: vi.fn(),
      restart: vi.fn()
    },
    rpc: {
      request: vi.fn(),
      notify: vi.fn(),
      cancel: vi.fn()
    },
    serverRequest: {
      resolve: vi.fn()
    },
    app: {
      openExternal: vi.fn(),
      openWorkspace: vi.fn(),
      openCodexConfigToml: vi.fn(),
      showNotification: vi.fn(),
      showContextMenu: vi.fn(),
      importOfficialData: vi.fn(),
      listCodexSessions: vi.fn(),
      readCodexSession: vi.fn()
    },
    git: {
      getStatus: vi.fn(),
      getDiff: vi.fn(),
      initRepository: vi.fn(),
      stagePaths: vi.fn(),
      unstagePaths: vi.fn(),
      discardPaths: vi.fn(),
      commit: vi.fn(),
      fetch: vi.fn(),
      pull: vi.fn(),
      push: vi.fn(),
      checkout: vi.fn()
    },
    terminal: {
      createSession,
      write: vi.fn(),
      resize: vi.fn(),
      closeSession: vi.fn().mockResolvedValue(undefined)
    },
    subscribe: vi.fn()
  } as unknown as HostBridge;
}

describe("useTerminalOpenAction", () => {
  it("passes the selected shell to terminal session creation", async () => {
    const createSession = vi.fn().mockResolvedValue({ sessionId: "terminal-1", shell: "Git Bash" });
    const setErrorMessage = vi.fn();
    const setShellLabel = vi.fn();
    const setStatus = vi.fn();
    const syncTerminalSize = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useTerminalOpenAction({
        creatingRef: { current: false },
        cwd: "E:/code/project",
        hostBridge: createHostBridge(createSession),
        mountedRef: { current: true },
        open: true,
        reportError: vi.fn(),
        sessionIdRef: { current: null },
        setErrorMessage,
        setShellLabel,
        setStatus,
        shell: "gitBash",
        syncTerminalSize,
        terminalRef: { current: null }
      })
    );

    await act(async () => {
      await result.current();
    });

    expect(createSession).toHaveBeenCalledWith({
      cwd: "E:/code/project",
      cols: 120,
      rows: 32,
      shell: "gitBash"
    });
    expect(setShellLabel).toHaveBeenCalledWith("Git Bash");
    expect(syncTerminalSize).toHaveBeenCalled();
  });
});
