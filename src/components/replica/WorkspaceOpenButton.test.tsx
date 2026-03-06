import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { HostBridge } from "../../bridge/types";
import { WorkspaceOpenButton } from "./WorkspaceOpenButton";

function createHostBridge(overrides?: {
  readonly openExternal?: ReturnType<typeof vi.fn>;
  readonly openWorkspace?: ReturnType<typeof vi.fn>;
}): HostBridge {
  return {
    appServer: {
      start: vi.fn(),
      stop: vi.fn(),
      restart: vi.fn()
    },
    rpc: {
      request: vi.fn(),
      cancel: vi.fn()
    },
    serverRequest: {
      resolve: vi.fn()
    },
    app: {
      openExternal: overrides?.openExternal ?? vi.fn().mockResolvedValue(undefined),
      openWorkspace: overrides?.openWorkspace ?? vi.fn().mockResolvedValue(undefined),
      openCodexConfigToml: vi.fn(),
      showNotification: vi.fn(),
      showContextMenu: vi.fn(),
      importOfficialData: vi.fn()
    },
    terminal: {
      createSession: vi.fn(),
      write: vi.fn(),
      resize: vi.fn(),
      closeSession: vi.fn()
    },
    subscribe: vi.fn()
  } as unknown as HostBridge;
}

describe("WorkspaceOpenButton", () => {
  it("disables the main button when no workspace is selected", () => {
    render(<WorkspaceOpenButton hostBridge={createHostBridge()} selectedRootPath={null} />);

    expect(screen.getByRole("button", { name: "使用 VS Code 打开当前工作区" })).toBeDisabled();
  });

  it("opens the selected workspace in VS Code by default", async () => {
    const openExternal = vi.fn().mockResolvedValue(undefined);

    render(
      <WorkspaceOpenButton
        hostBridge={createHostBridge({ openExternal })}
        selectedRootPath="E:\code\My Project"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "使用 VS Code 打开当前工作区" }));

    await waitFor(() => {
      expect(openExternal).toHaveBeenCalledWith("vscode://file/E:/code/My%20Project");
    });
  });

  it("switches the main action after choosing File Explorer", async () => {
    const openExternal = vi.fn().mockResolvedValue(undefined);

    render(
      <WorkspaceOpenButton
        hostBridge={createHostBridge({ openExternal })}
        selectedRootPath="E:/code/project"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "选择打开方式" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "File Explorer" }));
    fireEvent.click(screen.getByRole("button", { name: "使用 File Explorer 打开当前工作区" }));

    await waitFor(() => {
      expect(openExternal).toHaveBeenCalledWith("E:/code/project");
    });
  });

  it("switches the main action after choosing Terminal", async () => {
    const openWorkspace = vi.fn().mockResolvedValue(undefined);

    render(
      <WorkspaceOpenButton
        hostBridge={createHostBridge({ openWorkspace })}
        selectedRootPath="E:/code/project"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "选择打开方式" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Terminal" }));
    fireEvent.click(screen.getByRole("button", { name: "使用 Terminal 打开当前工作区" }));

    await waitFor(() => {
      expect(openWorkspace).toHaveBeenCalledWith({
        path: "E:/code/project",
        opener: "terminal"
      });
    });
  });
});
