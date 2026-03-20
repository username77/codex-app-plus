import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { HostBridge } from "../../../bridge/types";
import { useTerminalController } from "./useTerminalController";
import { useTerminalSession } from "./useTerminalSession";
import { useTerminalTabs } from "./useTerminalTabs";

vi.mock("./useTerminalSession", () => ({
  useTerminalSession: vi.fn(),
}));

vi.mock("./useTerminalTabs", () => ({
  useTerminalTabs: vi.fn(),
}));

function createHostBridge(): HostBridge {
  return {
    terminal: {
      closeSession: vi.fn().mockResolvedValue(undefined),
      createSession: vi.fn(),
      resize: vi.fn(),
      write: vi.fn(),
    },
    subscribe: vi.fn().mockResolvedValue(() => undefined),
  } as unknown as HostBridge;
}

function createTerminalState() {
  return {
    closeTerminalSession: vi.fn().mockResolvedValue(undefined),
    containerRef: vi.fn(),
    focusTerminal: vi.fn(),
    message: "Open a terminal to start a session.",
    restartSession: vi.fn().mockResolvedValue(undefined),
    status: "idle" as const,
  };
}

function mockTerminalTabs(
  overrides: Partial<ReturnType<typeof useTerminalTabs>> = {},
): ReturnType<typeof useTerminalTabs> {
  const value = {
    activeRootKey: "root-1",
    activeTerminalId: null,
    closeTerminal: vi.fn(),
    createTerminal: vi.fn().mockReturnValue("terminal-1"),
    hasWorkspace: true,
    setActiveTerminal: vi.fn(),
    terminals: [],
    ...overrides,
  } as ReturnType<typeof useTerminalTabs>;
  vi.mocked(useTerminalTabs).mockReturnValue(value);
  return value;
}

describe("useTerminalController", () => {
  it("does not create a terminal session on initial render", () => {
    const tabs = mockTerminalTabs();
    vi.mocked(useTerminalSession).mockReturnValue(createTerminalState());

    renderHook(() =>
      useTerminalController({
        activeRootId: "root-1",
        activeRootPath: "E:/code/workspace-a",
        hostBridge: createHostBridge(),
        isOpen: false,
        resolvedTheme: "dark",
        shell: "powerShell",
        enforceUtf8: true,
      }),
    );

    expect(tabs.createTerminal).not.toHaveBeenCalled();
  });

  it("creates the first terminal only after the panel is explicitly shown", () => {
    const onShowPanel = vi.fn();
    const tabs = mockTerminalTabs();
    vi.mocked(useTerminalSession).mockReturnValue(createTerminalState());

    const { result } = renderHook(() =>
      useTerminalController({
        activeRootId: "root-1",
        activeRootPath: "E:/code/workspace-a",
        hostBridge: createHostBridge(),
        isOpen: false,
        onShowPanel,
        resolvedTheme: "dark",
        shell: "powerShell",
        enforceUtf8: true,
      }),
    );

    act(() => {
      result.current.showPanel();
    });

    expect(onShowPanel).toHaveBeenCalledTimes(1);
    expect(tabs.createTerminal).toHaveBeenCalledWith("root-1");
  });

  it("reuses the existing tab when the panel is shown again", () => {
    const tabs = mockTerminalTabs({
      terminals: [{ id: "terminal-existing", title: "Terminal 1" }],
    });
    vi.mocked(useTerminalSession).mockReturnValue(createTerminalState());

    const { result } = renderHook(() =>
      useTerminalController({
        activeRootId: "root-1",
        activeRootPath: "E:/code/workspace-a",
        hostBridge: createHostBridge(),
        isOpen: false,
        onShowPanel: vi.fn(),
        resolvedTheme: "dark",
        shell: "powerShell",
        enforceUtf8: true,
      }),
    );

    act(() => {
      result.current.showPanel();
    });

    expect(tabs.setActiveTerminal).toHaveBeenCalledWith("root-1", "terminal-existing");
    expect(tabs.createTerminal).not.toHaveBeenCalled();
  });

  it("shows the panel without creating a terminal when no workspace is selected", () => {
    const onShowPanel = vi.fn();
    const tabs = mockTerminalTabs({
      activeRootKey: "__terminal-root-empty__",
      hasWorkspace: false,
    });
    vi.mocked(useTerminalSession).mockReturnValue(createTerminalState());

    const { result } = renderHook(() =>
      useTerminalController({
        activeRootId: null,
        activeRootPath: null,
        hostBridge: createHostBridge(),
        isOpen: false,
        onShowPanel,
        resolvedTheme: "dark",
        shell: "powerShell",
        enforceUtf8: true,
      }),
    );

    act(() => {
      result.current.showPanel();
    });

    expect(onShowPanel).toHaveBeenCalledTimes(1);
    expect(tabs.createTerminal).not.toHaveBeenCalled();
  });

  it("hides the panel after closing the last tab", async () => {
    const onHidePanel = vi.fn();
    const terminalState = createTerminalState();
    const tabs = mockTerminalTabs({
      activeTerminalId: "terminal-1",
      terminals: [{ id: "terminal-1", title: "Terminal 1" }],
    });
    vi.mocked(useTerminalSession).mockReturnValue(terminalState);

    const { result } = renderHook(() =>
      useTerminalController({
        activeRootId: "root-1",
        activeRootPath: "E:/code/workspace-a",
        hostBridge: createHostBridge(),
        isOpen: true,
        onHidePanel,
        resolvedTheme: "dark",
        shell: "powerShell",
        enforceUtf8: true,
      }),
    );

    act(() => {
      result.current.onCloseTerminal("terminal-1");
    });

    await waitFor(() => {
      expect(terminalState.closeTerminalSession).toHaveBeenCalledWith("root-1:terminal-1");
      expect(tabs.closeTerminal).toHaveBeenCalledWith("root-1", "terminal-1");
      expect(onHidePanel).toHaveBeenCalledTimes(1);
    });
  });
});
