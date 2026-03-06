import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { HostBridge } from "../../bridge/types";
import vscodeIconUrl from "../../assets/official/apps/vscode.png";
import { OfficialChevronRightIcon, OfficialFolderIcon } from "./officialIcons";

const CURRENT_WORKSPACE_LABEL = "当前工作区";
const OPEN_IN_VSCODE_LABEL = "在 VS Code 中打开";
const OPEN_IN_EXPLORER_LABEL = "在文件资源管理器中打开";
const OPEN_MENU_LABEL = "其他打开方式";
const WINDOWS_DRIVE_SEGMENT_PATTERN = /^[A-Za-z]:$/;

type WorkspaceOpenMode = "vscode" | "explorer";

interface WorkspaceOpenButtonProps {
  readonly hostBridge: HostBridge;
  readonly selectedRootPath: string | null;
}

function assertSelectedRootPath(selectedRootPath: string | null): string {
  if (selectedRootPath === null) {
    throw new Error("打开工作区前必须先选择一个工作区。");
  }
  return selectedRootPath;
}

function encodeFileUrlPath(path: string): string {
  return path
    .replace(/\\+/g, "/")
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment, index) => {
      if (index === 0 && WINDOWS_DRIVE_SEGMENT_PATTERN.test(segment)) {
        return segment;
      }
      return encodeURIComponent(segment);
    })
    .join("/");
}

function createVsCodeWorkspaceUrl(path: string): string {
  return `vscode://file/${encodeFileUrlPath(path)}`;
}

function getOpenTarget(path: string, mode: WorkspaceOpenMode): string {
  return mode === "vscode" ? createVsCodeWorkspaceUrl(path) : path;
}

function getOpenErrorLabel(mode: WorkspaceOpenMode): string {
  return mode === "vscode" ? OPEN_IN_VSCODE_LABEL : OPEN_IN_EXPLORER_LABEL;
}

function useMenuDismissal(
  menuOpen: boolean,
  containerRef: RefObject<HTMLDivElement>,
  onDismiss: () => void
): void {
  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        onDismiss();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onDismiss();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [containerRef, menuOpen, onDismiss]);
}

function WorkspaceOpenMenu(props: {
  readonly canOpenWorkspace: boolean;
  readonly onOpenExplorer: () => void;
}): JSX.Element {
  return (
    <div className="toolbar-split-menu" role="menu" aria-label={OPEN_MENU_LABEL}>
      <button
        type="button"
        className="toolbar-menu-item"
        role="menuitem"
        disabled={!props.canOpenWorkspace}
        aria-label={`${OPEN_IN_EXPLORER_LABEL}${CURRENT_WORKSPACE_LABEL}`}
        onClick={props.onOpenExplorer}
      >
        <OfficialFolderIcon className="toolbar-menu-icon" />
        <span>{OPEN_IN_EXPLORER_LABEL}</span>
      </button>
    </div>
  );
}

export function WorkspaceOpenButton(props: WorkspaceOpenButtonProps): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const canOpenWorkspace = props.selectedRootPath !== null;
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useMenuDismissal(menuOpen, containerRef, closeMenu);

  const openWorkspace = useCallback(
    async (mode: WorkspaceOpenMode) => {
      const selectedRootPath = assertSelectedRootPath(props.selectedRootPath);
      try {
        await props.hostBridge.app.openExternal(getOpenTarget(selectedRootPath, mode));
        closeMenu();
      } catch (error) {
        console.error(`${getOpenErrorLabel(mode)}失败`, error);
        window.alert(`${getOpenErrorLabel(mode)}失败：${String(error)}`);
      }
    },
    [closeMenu, props.hostBridge.app, props.selectedRootPath]
  );

  return (
    <div className={menuOpen ? "toolbar-split toolbar-split-open" : "toolbar-split"} ref={containerRef}>
      <button
        type="button"
        className="toolbar-split-main"
        disabled={!canOpenWorkspace}
        aria-label={`${OPEN_IN_VSCODE_LABEL}${CURRENT_WORKSPACE_LABEL}`}
        onClick={() => void openWorkspace("vscode")}
      >
        <img className="toolbar-app-icon" src={vscodeIconUrl} alt="" />
        <span>打开</span>
      </button>
      <button
        type="button"
        className="toolbar-split-trigger"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="选择其他打开方式"
        onClick={() => setMenuOpen((value) => !value)}
      >
        <OfficialChevronRightIcon className="toolbar-caret-icon" />
      </button>
      {menuOpen ? (
        <WorkspaceOpenMenu
          canOpenWorkspace={canOpenWorkspace}
          onOpenExplorer={() => void openWorkspace("explorer")}
        />
      ) : null}
    </div>
  );
}
