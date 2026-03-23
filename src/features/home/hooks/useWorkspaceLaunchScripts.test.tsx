import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";
import { AppStoreProvider } from "../../../state/store";
import type { WorkspaceRoot } from "../../workspace/hooks/useWorkspaceRoots";
import { useWorkspaceLaunchScripts } from "./useWorkspaceLaunchScripts";

function Wrapper(props: PropsWithChildren): JSX.Element {
  return <AppStoreProvider>{props.children}</AppStoreProvider>;
}

function createWorkspaceRoot(overrides?: Partial<WorkspaceRoot>): WorkspaceRoot {
  return {
    id: "root-1",
    name: "FPGA",
    path: "E:/code/FPGA",
    launchScript: null,
    launchScripts: null,
    ...overrides,
  };
}

type LaunchTerminalController = Parameters<
  typeof useWorkspaceLaunchScripts
>[0]["terminalController"];

function createTerminalController(
  overrides?: Partial<LaunchTerminalController>,
): LaunchTerminalController {
  return {
    activeRootKey: "root-1",
    activeTerminalId: null,
    ensureTerminalWithTitle: vi.fn((terminalId: string) => terminalId),
    hasWorkspace: true,
    restartTerminalSession: vi.fn().mockResolvedValue(undefined),
    showPanelOnly: vi.fn(),
    terminalState: {
      readyKey: null,
      status: "idle",
    },
    writeTerminalData: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("useWorkspaceLaunchScripts", () => {
  it("opens the main editor when no launch script is configured", () => {
    const terminalController = createTerminalController();
    const { result } = renderHook(() => useWorkspaceLaunchScripts({
      selectedRoot: createWorkspaceRoot(),
      terminalController,
      updateWorkspaceLaunchScripts: vi.fn(),
    }), { wrapper: Wrapper });

    act(() => {
      result.current.onRunMain();
    });

    expect(result.current.mainEditorOpen).toBe(true);
  });

  it("creates and edits launch scripts through the workspace updater", () => {
    const updateWorkspaceLaunchScripts = vi.fn();
    const terminalController = createTerminalController();
    const root = createWorkspaceRoot({
      launchScripts: [
        {
          id: "api",
          script: "pnpm api",
          icon: "server",
          label: "API",
        },
      ],
    });
    const { result } = renderHook(() => useWorkspaceLaunchScripts({
      selectedRoot: root,
      terminalController,
      updateWorkspaceLaunchScripts,
    }), { wrapper: Wrapper });

    act(() => {
      result.current.onOpenMainEditor();
      result.current.onOpenNew();
    });
    act(() => {
      result.current.onNewDraftLabelChange("前端");
      result.current.onNewDraftScriptChange("pnpm web");
      result.current.onNewDraftIconChange("globe");
    });
    act(() => {
      result.current.onCreateNew();
    });

    expect(updateWorkspaceLaunchScripts).toHaveBeenNthCalledWith(1, {
      rootId: "root-1",
      launchScript: null,
      launchScripts: [
        {
          id: "api",
          script: "pnpm api",
          icon: "server",
          label: "API",
        },
        {
          id: expect.any(String),
          script: "pnpm web",
          icon: "globe",
          label: "前端",
        },
      ],
    });

    act(() => {
      result.current.onOpenEntryEditor("api");
    });
    act(() => {
      result.current.onEntryDraftLabelChange("后端");
      result.current.onEntryDraftScriptChange("pnpm start:api");
    });
    act(() => {
      result.current.onSaveEntry();
    });

    expect(updateWorkspaceLaunchScripts).toHaveBeenNthCalledWith(2, {
      rootId: "root-1",
      launchScript: null,
      launchScripts: [
        {
          id: "api",
          script: "pnpm start:api",
          icon: "server",
          label: "后端",
        },
      ],
    });
  });

  it("runs the main launch script after the terminal becomes ready", async () => {
    const ensureTerminalWithTitle = vi.fn((terminalId: string) => terminalId);
    const restartTerminalSession = vi.fn().mockResolvedValue(undefined);
    const showPanelOnly = vi.fn();
    const writeTerminalData = vi.fn().mockResolvedValue(undefined);
    const baseRoot = createWorkspaceRoot({
      launchScript: "npm run dev",
    });

    type LaunchRunProps = {
      readonly activeTerminalId: string | null;
      readonly readyKey: string | null;
      readonly status: "idle" | "ready";
    };
    const initialProps: LaunchRunProps = {
      activeTerminalId: null,
      readyKey: null,
      status: "idle",
    };

    const { result, rerender } = renderHook(
      ({ activeTerminalId, readyKey, status }: LaunchRunProps) =>
        useWorkspaceLaunchScripts({
          selectedRoot: baseRoot,
          terminalController: createTerminalController({
            activeTerminalId,
            ensureTerminalWithTitle,
            restartTerminalSession,
            showPanelOnly,
            terminalState: { readyKey, status },
            writeTerminalData,
          }),
          updateWorkspaceLaunchScripts: vi.fn(),
        }),
      {
        initialProps,
        wrapper: Wrapper,
      },
    );

    act(() => {
      result.current.onRunMain();
    });

    expect(ensureTerminalWithTitle).toHaveBeenCalledWith("launch", "启动");
    expect(showPanelOnly).toHaveBeenCalledTimes(1);
    expect(restartTerminalSession).toHaveBeenCalledWith("launch");

    rerender({
      activeTerminalId: "launch",
      readyKey: "root-1:launch",
      status: "ready",
    });

    await waitFor(() => {
      expect(writeTerminalData).toHaveBeenCalledWith("launch", "npm run dev\n");
    });
  });

  it("does not write launch data when the terminal is active but readyKey is stale", async () => {
    const writeTerminalData = vi.fn().mockResolvedValue(undefined);
    type ReadyKeyProps = {
      readonly readyKey: string | null;
    };
    const initialProps: ReadyKeyProps = {
      readyKey: null,
    };
    const { result, rerender } = renderHook(
      ({ readyKey }: ReadyKeyProps) =>
        useWorkspaceLaunchScripts({
          selectedRoot: createWorkspaceRoot({ launchScript: "npm run dev" }),
          terminalController: createTerminalController({
            activeTerminalId: "launch",
            terminalState: { readyKey, status: "ready" },
            writeTerminalData,
          }),
          updateWorkspaceLaunchScripts: vi.fn(),
        }),
      {
        initialProps,
        wrapper: Wrapper,
      },
    );

    act(() => {
      result.current.onRunMain();
    });

    rerender({ readyKey: "root-1:terminal-1" });
    await waitFor(() => {
      expect(writeTerminalData).not.toHaveBeenCalled();
    });

    rerender({ readyKey: "root-1:launch" });
    await waitFor(() => {
      expect(writeTerminalData).toHaveBeenCalledWith("launch", "npm run dev\n");
    });
  });
});
