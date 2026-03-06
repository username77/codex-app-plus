import { useCallback, useRef, useState } from "react";
import { OfficialChevronRightIcon } from "./officialIcons";
import { useToolbarMenuDismissal } from "./useToolbarMenuDismissal";

const CURRENT_WORKSPACE_LABEL = "当前工作区";
const GIT_MENU_LABEL = "Git 操作";
const GIT_TRIGGER_LABEL = "选择 Git 操作";
const PUSH_LABEL = "推送";
const COMMIT_LABEL = "提交";
const CREATE_PULL_REQUEST_LABEL = "创建拉取请求";
const PUSH_UNAVAILABLE_MESSAGE = "Git 推送功能暂未接入。";

interface WorkspaceGitButtonProps {
  readonly selectedRootPath: string | null;
}

function showPushUnavailable(): void {
  window.alert(PUSH_UNAVAILABLE_MESSAGE);
}

function WorkspaceGitMenu(props: { readonly canRunGitAction: boolean; readonly onPush: () => void }): JSX.Element {
  return (
    <div className="toolbar-split-menu" role="menu" aria-label={GIT_MENU_LABEL}>
      <div className="toolbar-menu-title">{GIT_MENU_LABEL}</div>
      <div className="toolbar-menu-separator" />
      <button type="button" className="toolbar-menu-item" role="menuitem" disabled>
        <CommitIcon className="toolbar-menu-icon" />
        <span>{COMMIT_LABEL}</span>
      </button>
      <button
        type="button"
        className="toolbar-menu-item toolbar-menu-item-active"
        role="menuitem"
        disabled={!props.canRunGitAction}
        aria-label={`${PUSH_LABEL}${CURRENT_WORKSPACE_LABEL}`}
        onClick={props.onPush}
      >
        <GitPushIcon className="toolbar-menu-icon" />
        <span>{PUSH_LABEL}</span>
      </button>
      <button type="button" className="toolbar-menu-item" role="menuitem" disabled>
        <PullRequestIcon className="toolbar-menu-icon" />
        <span>{CREATE_PULL_REQUEST_LABEL}</span>
      </button>
    </div>
  );
}

export function WorkspaceGitButton(props: WorkspaceGitButtonProps): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const canRunGitAction = props.selectedRootPath !== null;
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const handlePush = useCallback(() => {
    closeMenu();
    showPushUnavailable();
  }, [closeMenu]);

  useToolbarMenuDismissal(menuOpen, containerRef, closeMenu);

  return (
    <div className={menuOpen ? "toolbar-split toolbar-split-open" : "toolbar-split"} ref={containerRef}>
      <button
        type="button"
        className="toolbar-split-main"
        disabled={!canRunGitAction}
        aria-label={`${PUSH_LABEL}${CURRENT_WORKSPACE_LABEL}`}
        onClick={handlePush}
      >
        <GitPushIcon className="toolbar-action-icon" />
        <span>{PUSH_LABEL}</span>
      </button>
      <button
        type="button"
        className="toolbar-split-trigger"
        disabled={!canRunGitAction}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={GIT_TRIGGER_LABEL}
        onClick={() => setMenuOpen((value) => !value)}
      >
        <OfficialChevronRightIcon className="toolbar-caret-icon" />
      </button>
      {menuOpen ? <WorkspaceGitMenu canRunGitAction={canRunGitAction} onPush={handlePush} /> : null}
    </div>
  );
}

function GitPushIcon({ className }: { readonly className?: string }): JSX.Element {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M5.3 14.7h8.85c1.58 0 2.85-1.23 2.85-2.72 0-1.42-1.17-2.61-2.66-2.71A4.52 4.52 0 0 0 5.88 7.6 3.18 3.18 0 0 0 3 10.76c0 2.17 1.56 3.94 3.5 3.94Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 12.2V6.7" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <path d="m7.95 8.6 2.05-2.05L12.05 8.6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CommitIcon({ className }: { readonly className?: string }): JSX.Element {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3.5 10h3.2m5.6 0h4.2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <circle cx="10" cy="10" r="3.2" stroke="currentColor" strokeWidth="1.35" />
    </svg>
  );
}

function PullRequestIcon({ className }: { readonly className?: string }): JSX.Element {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="6" cy="5.5" r="1.65" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="6" cy="14.5" r="1.65" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="14.2" cy="8" r="1.65" stroke="currentColor" strokeWidth="1.25" />
      <path d="M6 7.15v5.7" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M7.65 5.5h3.1a3.45 3.45 0 0 1 3.45 3.45" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m11.85 7.2 2.35 2.35 2.3-2.35" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
