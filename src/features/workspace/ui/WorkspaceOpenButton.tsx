import { useCallback, useRef, useState } from "react";
import type { HostBridge, WorkspaceOpener } from "../../../bridge/types";
import fileExplorerIconUrl from "../../../assets/official/apps/file-explorer.png";
import gitBashIconUrl from "../../../assets/official/apps/git-bash.png";
import githubDesktopIconUrl from "../../../assets/official/apps/github-desktop.png";
import terminalIconUrl from "../../../assets/official/apps/microsoft-terminal.png";
import visualStudioIconUrl from "../../../assets/official/apps/visual-studio.png";
import vscodeIconUrl from "../../../assets/official/apps/vscode.png";
import { useUiBannerNotifications } from "../../shared/hooks/useUiBannerNotifications";
import { OfficialChevronRightIcon } from "../../shared/ui/officialIcons";
import { useToolbarMenuDismissal } from "../../shared/hooks/useToolbarMenuDismissal";

const OPEN_TEXT = "\u6253\u5f00";
const OPEN_METHODS_TEXT = "\u6253\u5f00\u65b9\u5f0f";
const SELECT_OPEN_METHOD_TEXT = "\u9009\u62e9\u6253\u5f00\u65b9\u5f0f";
const CURRENT_WORKSPACE_TEXT = "\u5f53\u524d\u5de5\u4f5c\u533a";
const WINDOWS_DRIVE_SEGMENT_PATTERN = /^[A-Za-z]:$/;

interface WorkspaceOpenButtonProps {
  readonly hostBridge: HostBridge;
  readonly selectedRootPath: string | null;
  readonly selectedOpener: WorkspaceOpener;
  readonly onSelectOpener: (opener: WorkspaceOpener) => void;
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

const WORKSPACE_OPENER_OPTIONS = [
  {
    id: "vscode",
    label: "VS Code",
    renderIcon: (className: string) => <ImageOptionIcon className={className} src={vscodeIconUrl} />
  },
  {
    id: "visualStudio",
    label: "Visual Studio",
    renderIcon: (className: string) => <ImageOptionIcon className={className} src={visualStudioIconUrl} />
  },
  {
    id: "githubDesktop",
    label: "GitHub Desktop",
    renderIcon: (className: string) => <ImageOptionIcon className={className} src={githubDesktopIconUrl} />
  },
  {
    id: "explorer",
    label: "File Explorer",
    renderIcon: (className: string) => <ImageOptionIcon className={className} src={fileExplorerIconUrl} />
  },
  {
    id: "terminal",
    label: "Terminal",
    renderIcon: (className: string) => <ImageOptionIcon className={className} src={terminalIconUrl} />
  },
  {
    id: "gitBash",
    label: "Git Bash",
    renderIcon: (className: string) => <ImageOptionIcon className={className} src={gitBashIconUrl} />
  }
] as const satisfies ReadonlyArray<WorkspaceOpenerOption>;

function assertSelectedRootPath(selectedRootPath: string | null): string {
  if (selectedRootPath === null) {
    throw new Error("\u6253\u5f00\u5de5\u4f5c\u533a\u524d\u5fc5\u987b\u5148\u9009\u62e9\u4e00\u4e2a\u5de5\u4f5c\u533a\u3002");
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
  const { notifyError } = useUiBannerNotifications("workspace-open");
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const canOpenWorkspace = props.selectedRootPath !== null;
  const selectedOption = findWorkspaceOpenerOption(props.selectedOpener);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useToolbarMenuDismissal(menuOpen, containerRef, closeMenu);

  const openSelectedWorkspace = useCallback(async () => {
    const selectedRootPath = assertSelectedRootPath(props.selectedRootPath);

    try {
      if (props.selectedOpener === "vscode") {
        await props.hostBridge.app.openExternal(createVsCodeWorkspaceUrl(selectedRootPath));
        return;
      }
      if (props.selectedOpener === "explorer") {
        await props.hostBridge.app.openExternal(selectedRootPath);
        return;
      }
      await props.hostBridge.app.openWorkspace({
        path: selectedRootPath,
        opener: props.selectedOpener
      });
    } catch (error) {
      console.error(`Failed to open workspace with ${selectedOption.label}`, error);
      notifyError(`${selectedOption.label} 打开失败`, error);
    }
  }, [notifyError, props.hostBridge.app, props.selectedOpener, props.selectedRootPath, selectedOption.label]);

  const selectOpener = useCallback(
    (opener: WorkspaceOpener) => {
      props.onSelectOpener(opener);
      closeMenu();
    },
    [closeMenu, props.onSelectOpener]
  );

  return (
    <div className={menuOpen ? "toolbar-split toolbar-split-open" : "toolbar-split"} ref={containerRef}>
      <button
        type="button"
        className="toolbar-split-main"
        data-opener={props.selectedOpener}
        disabled={!canOpenWorkspace}
        aria-label={`\u4f7f\u7528 ${selectedOption.label} ${OPEN_TEXT}${CURRENT_WORKSPACE_TEXT}`}
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
      {menuOpen ? <WorkspaceOpenMenu selectedOpener={props.selectedOpener} onSelectOpener={selectOpener} /> : null}
    </div>
  );
}
