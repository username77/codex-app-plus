import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { HostBridge, WorkspaceOpener } from "../../bridge/types";
import terminalIconUrl from "../../assets/official/apps/microsoft-terminal.png";
import vscodeIconUrl from "../../assets/official/apps/vscode.png";
import { OfficialChevronRightIcon, OfficialFolderIcon } from "./officialIcons";

const OPEN_TEXT = "打开";
const OPEN_METHODS_TEXT = "打开方式";
const SELECT_OPEN_METHOD_TEXT = "选择打开方式";
const CURRENT_WORKSPACE_TEXT = "当前工作区";
const WINDOWS_DRIVE_SEGMENT_PATTERN = /^[A-Za-z]:$/;

interface WorkspaceOpenButtonProps {
  readonly hostBridge: HostBridge;
  readonly selectedRootPath: string | null;
}

interface WorkspaceOpenerOption {
  readonly id: WorkspaceOpener;
  readonly label: string;
  readonly renderIcon: (className: string) => JSX.Element;
}

function ImageOptionIcon(props: {
  readonly className: string;
  readonly src: string;
}): JSX.Element {
  return <img className={props.className} src={props.src} alt="" />;
}

function VisualStudioOptionIcon(props: { readonly className: string }): JSX.Element {
  return (
    <svg className={props.className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#6B4CE6" d="M19.4 3.6 10 7.6 5.3 4.7 3 5.9v12.2l2.3 1.2 4.7-2.9 9.4 4 1.6-1V4.6z" />
      <path fill="#FFF" d="m14.5 7.8-5.2 4.1v.2l5.2 4.1 2.1-1.2V9z" />
    </svg>
  );
}

function GitHubDesktopOptionIcon(props: { readonly className: string }): JSX.Element {
  return (
    <svg className={props.className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#7D5DFF" />
      <path
        fill="#FFF"
        d="M12 6.4a5.6 5.6 0 0 0-1.8 10.9v-1.9c-1.2.2-1.6-.5-1.8-.9-.1-.3-.3-.6-.6-.8-.2-.1 0-.1.1-.1.6 0 1 .5 1.1.7.6.9 1.6.6 2 .5.1-.4.3-.7.5-.9-2.1-.2-3.1-1.3-3.1-3 0-.7.2-1.2.6-1.7-.1-.3-.2-.9.1-1.7 0 0 .7-.2 1.8.7.5-.2 1.1-.2 1.6-.2s1.1 0 1.6.2c1.1-.9 1.8-.7 1.8-.7.3.8.2 1.4.1 1.7.4.5.6 1 .6 1.7 0 1.7-1 2.8-3.1 3 .3.2.6.7.6 1.4v1.7A5.6 5.6 0 0 0 12 6.4Z"
      />
    </svg>
  );
}

function GitBashOptionIcon(props: { readonly className: string }): JSX.Element {
  return (
    <svg className={props.className} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" rx="3" transform="rotate(45 12 12)" fill="#7CCB71" />
      <path fill="#FFF" d="m9.2 10.1 1.8 1.9-1.8 1.9.9.8 2.6-2.7-2.6-2.7Zm4.6 4.1h2v-1.2h-2Z" />
    </svg>
  );
}

const WORKSPACE_OPENER_OPTIONS = [
  {
    id: "vscode",
    label: "VS Code",
    renderIcon: (className: string) => <ImageOptionIcon className={className} src={vscodeIconUrl} />
  },
  {
    id: "visualStudio",
    label: "Visual Studio",
    renderIcon: (className: string) => <VisualStudioOptionIcon className={className} />
  },
  {
    id: "githubDesktop",
    label: "GitHub Desktop",
    renderIcon: (className: string) => <GitHubDesktopOptionIcon className={className} />
  },
  {
    id: "explorer",
    label: "File Explorer",
    renderIcon: (className: string) => <OfficialFolderIcon className={className} />
  },
  {
    id: "terminal",
    label: "Terminal",
    renderIcon: (className: string) => <ImageOptionIcon className={className} src={terminalIconUrl} />
  },
  {
    id: "gitBash",
    label: "Git Bash",
    renderIcon: (className: string) => <GitBashOptionIcon className={className} />
  }
] as const satisfies ReadonlyArray<WorkspaceOpenerOption>;

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

function findWorkspaceOpenerOption(opener: WorkspaceOpener): WorkspaceOpenerOption {
  return WORKSPACE_OPENER_OPTIONS.find((option) => option.id === opener) ?? WORKSPACE_OPENER_OPTIONS[0];
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
  readonly selectedOpener: WorkspaceOpener;
  readonly onSelectOpener: (opener: WorkspaceOpener) => void;
}): JSX.Element {
  return (
    <div className="toolbar-split-menu" role="menu" aria-label={OPEN_METHODS_TEXT}>
      <div className="toolbar-menu-title">{OPEN_METHODS_TEXT}</div>
      <div className="toolbar-menu-list">
        {WORKSPACE_OPENER_OPTIONS.map((option) => {
          const selected = option.id === props.selectedOpener;
          const className = selected ? "toolbar-menu-item toolbar-menu-item-active" : "toolbar-menu-item";
          return (
            <button
              key={option.id}
              type="button"
              className={className}
              role="menuitemradio"
              aria-checked={selected}
              aria-label={option.label}
              onClick={() => props.onSelectOpener(option.id)}
            >
              {option.renderIcon("toolbar-menu-icon")}
              <span className="toolbar-menu-label">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function WorkspaceOpenButton(props: WorkspaceOpenButtonProps): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedOpener, setSelectedOpener] = useState<WorkspaceOpener>("vscode");
  const containerRef = useRef<HTMLDivElement>(null);
  const canOpenWorkspace = props.selectedRootPath !== null;
  const selectedOption = findWorkspaceOpenerOption(selectedOpener);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useMenuDismissal(menuOpen, containerRef, closeMenu);

  const openSelectedWorkspace = useCallback(async () => {
    const selectedRootPath = assertSelectedRootPath(props.selectedRootPath);

    try {
      if (selectedOpener === "vscode") {
        await props.hostBridge.app.openExternal(createVsCodeWorkspaceUrl(selectedRootPath));
        return;
      }
      if (selectedOpener === "explorer") {
        await props.hostBridge.app.openExternal(selectedRootPath);
        return;
      }
      await props.hostBridge.app.openWorkspace({
        path: selectedRootPath,
        opener: selectedOpener
      });
    } catch (error) {
      console.error(`Failed to open workspace with ${selectedOption.label}`, error);
      window.alert(`${selectedOption.label}打开失败：${String(error)}`);
    }
  }, [props.hostBridge.app, props.selectedRootPath, selectedOpener, selectedOption.label]);

  const selectOpener = useCallback(
    (opener: WorkspaceOpener) => {
      setSelectedOpener(opener);
      closeMenu();
    },
    [closeMenu]
  );

  return (
    <div className={menuOpen ? "toolbar-split toolbar-split-open" : "toolbar-split"} ref={containerRef}>
      <button
        type="button"
        className="toolbar-split-main"
        data-opener={selectedOpener}
        disabled={!canOpenWorkspace}
        aria-label={`使用 ${selectedOption.label} ${OPEN_TEXT}${CURRENT_WORKSPACE_TEXT}`}
        onClick={() => void openSelectedWorkspace()}
      >
        {selectedOption.renderIcon("toolbar-app-icon")}
        <span className="toolbar-split-main-text">{OPEN_TEXT}</span>
      </button>
      <button
        type="button"
        className="toolbar-split-trigger"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={SELECT_OPEN_METHOD_TEXT}
        onClick={() => setMenuOpen((value) => !value)}
      >
        <OfficialChevronRightIcon className="toolbar-caret-icon" />
      </button>
      {menuOpen ? <WorkspaceOpenMenu selectedOpener={selectedOpener} onSelectOpener={selectOpener} /> : null}
    </div>
  );
}
