import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { HostBridge } from "../../../bridge/types";
import { useTerminalSession } from "./useTerminalSession";

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
    refresh(): void {}
    dispose(): void {}
  }
}));

function createHostBridge(): HostBridge {
  return {
    terminal: {
      createSession: vi.fn().mockResolvedValue({
        sessionId: "session-1",
        shell: "PowerShell",
      }),
      write: vi.fn(),
      resize: vi.fn(),
      closeSession: vi.fn().mockResolvedValue(undefined),
    },
    subscribe: vi.fn().mockResolvedValue(() => undefined),
  } as unknown as HostBridge;
}

describe("useTerminalSession", () => {
  it("initializes the terminal after the container ref is attached", async () => {
    const hostBridge = createHostBridge();
    const { result } = renderHook(() =>
      useTerminalSession({
        activeRootKey: "root-1",
        activeRootPath: "E:/code/codex-app-plus",
        activeTerminalId: "terminal-1",
        focusRequestVersion: 0,
        hostBridge,
        isVisible: true,
        shell: "powerShell",
        enforceUtf8: true,
        resolvedTheme: "dark",
      }),
    );

    expect(result.current.message).toBe("Preparing terminal...");

    await act(async () => {
      result.current.containerRef(document.createElement("div"));
    });

    await waitFor(() => {
      expect(hostBridge.terminal.createSession).toHaveBeenCalledWith({
        cwd: "E:/code/codex-app-plus",
        cols: 120,
        rows: 32,
        shell: "powerShell",
        enforceUtf8: true,
      });
    });
  });
});
