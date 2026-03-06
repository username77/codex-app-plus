import type { HostBridge } from "../../bridge/types";
import { WorkspaceGitButton } from "./WorkspaceGitButton";
import { WorkspaceOpenButton } from "./WorkspaceOpenButton";
import { GitDiffIcon } from "./git/gitIcons";
import type { WorkspaceGitController } from "./git/types";

interface HomeMainToolbarProps {
  readonly hostBridge: HostBridge;
  readonly selectedRootName: string;
  readonly selectedRootPath: string | null;
  readonly terminalOpen: boolean;
  readonly diffOpen: boolean;
  readonly gitController: WorkspaceGitController;
  readonly onToggleTerminal: () => void;
  readonly onToggleDiff: () => void;
}

function ToolbarIconButton(props: {
  readonly active: boolean;
  readonly disabled?: boolean;
  readonly label: string;
  readonly onClick: () => void;
  readonly children: JSX.Element;
}): JSX.Element {
  return (
    <button type="button" className="toolbar-icon-btn" aria-label={props.label} aria-pressed={props.active} disabled={props.disabled} onClick={props.onClick}>
      {props.children}
    </button>
  );
}

function TerminalIcon(props: { readonly className?: string }): JSX.Element {
  return (
    <svg className={props.className} viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="3.5" y="4.5" width="13" height="11" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6.6 8l2 2-2 2" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.8 12h3.6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function HomeMainToolbar(props: HomeMainToolbarProps): JSX.Element {
  const title = props.selectedRootPath === null ? "工作区会话" : props.selectedRootName;
  const terminalLabel = props.terminalOpen ? "隐藏终端" : "显示终端";
  const diffLabel = props.diffOpen ? "隐藏差异侧栏" : "显示差异侧栏";

  return (
    <header className="main-toolbar">
      <h1 className="toolbar-title">{title}</h1>
      <div className="toolbar-actions">
        <WorkspaceOpenButton hostBridge={props.hostBridge} selectedRootPath={props.selectedRootPath} />
        <WorkspaceGitButton controller={props.gitController} selectedRootName={props.selectedRootName} selectedRootPath={props.selectedRootPath} />
        <div className="toolbar-icon-row" aria-label="快捷操作">
          <ToolbarIconButton active={props.diffOpen} disabled={props.selectedRootPath === null} label={diffLabel} onClick={props.onToggleDiff}>
            <GitDiffIcon className="toolbar-terminal-icon" />
          </ToolbarIconButton>
          <ToolbarIconButton active={props.terminalOpen} label={terminalLabel} onClick={props.onToggleTerminal}>
            <TerminalIcon className="toolbar-terminal-icon" />
          </ToolbarIconButton>
        </div>
      </div>
    </header>
  );
}
