import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { HostBridge } from "../../bridge/types";
import { WorkspaceOpenButton } from "./WorkspaceOpenButton";

function createHostBridge(openExternal = vi.fn().mockResolvedValue(undefined)): HostBridge {
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
      openExternal,
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
  it("disables the main VS Code action when no workspace is selected", () => {
    render(<WorkspaceOpenButton hostBridge={createHostBridge()} selectedRootPath={null} />);

    expect(screen.getByRole("button", { name: "在 VS Code 中打开当前工作区" })).toBeDisabled();
  });

  it("opens the selected workspace in VS Code", async () => {
    const openExternal = vi.fn().mockResolvedValue(undefined);

    render(
      <WorkspaceOpenButton
        hostBridge={createHostBridge(openExternal)}
        selectedRootPath="E:\code\My Project"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "在 VS Code 中打开当前工作区" }));

    await waitFor(() => {
      expect(openExternal).toHaveBeenCalledWith("vscode://file/E:/code/My%20Project");
    });
  });

  it("opens the selected workspace in Explorer from the dropdown", async () => {
    const openExternal = vi.fn().mockResolvedValue(undefined);
    const selectedRootPath = "E:/code/project";

    render(
      <WorkspaceOpenButton
        hostBridge={createHostBridge(openExternal)}
        selectedRootPath={selectedRootPath}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "选择其他打开方式" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "在文件资源管理器中打开当前工作区" }));

    await waitFor(() => {
      expect(openExternal).toHaveBeenCalledWith(selectedRootPath);
    });
  });
});
