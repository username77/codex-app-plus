import { useCallback, useMemo, useRef, useState } from "react";
import { GitBranchIcon, GitPullIcon, GitPushIcon, GitRefreshIcon } from "./git/gitIcons";
import { OfficialChevronRightIcon } from "./officialIcons";
import { useToolbarMenuDismissal } from "./useToolbarMenuDismissal";

const CURRENT_WORKSPACE_LABEL = "当前工作区";
const GIT_LABEL = "Git";
const GIT_MENU_LABEL = "Git 操作";
const GIT_TRIGGER_LABEL = "选择 Git 操作";
const INIT_LABEL = "初始化";
const PUSH_LABEL = "推送";
const PULL_LABEL = "拉取";
const FETCH_LABEL = "抓取";
const REFRESH_LABEL = "刷新状态";

interface WorkspaceGitButtonProps {
  readonly selectedRootPath: string | null;
  readonly statusLoaded: boolean;
  readonly hasRepository: boolean;
  readonly loading: boolean;
  readonly pendingAction: string | null;
  readonly onOpenPanel: () => void;
  readonly onInit: () => Promise<void>;
  readonly onFetch: () => Promise<void>;
  readonly onPull: () => Promise<void>;
  readonly onPush: () => Promise<void>;
  readonly onRefresh: () => Promise<void>;
}

interface GitMenuAction {
  readonly label: string;
  readonly onClick: () => Promise<void>;
  readonly renderIcon: (className: string) => JSX.Element;
}

function WorkspaceGitMenu(props: {
  readonly actions: ReadonlyArray<GitMenuAction>;
  readonly disabled: boolean;
  readonly onClose: () => void;
}): JSX.Element {
  return (
    <div className="toolbar-split-menu" role="menu" aria-label={GIT_MENU_LABEL}>
      <div className="toolbar-menu-title">{GIT_MENU_LABEL}</div>
      <div className="toolbar-menu-separator" />
      {props.actions.map((action) => (
        <button
          key={action.label}
          type="button"
          className="toolbar-menu-item"
          role="menuitem"
          disabled={props.disabled}
          onClick={() => {
            props.onClose();
            void action.onClick();
          }}
        >
          {action.renderIcon("toolbar-menu-icon")}
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}

export function WorkspaceGitButton(props: WorkspaceGitButtonProps): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const mainDisabled = props.selectedRootPath === null;
  const triggerDisabled = props.selectedRootPath === null || props.pendingAction !== null || props.loading || !props.statusLoaded;
  const mainLabel = GIT_LABEL;
  const handleMainAction = useCallback(() => {
    closeMenu();
    props.onOpenPanel();
  }, [closeMenu, props]);
  const actions = useMemo<ReadonlyArray<GitMenuAction>>(() => {
    if (props.statusLoaded && !props.hasRepository) {
      return [
        {
          label: INIT_LABEL,
          onClick: props.onInit,
          renderIcon: (className: string) => <GitBranchIcon className={className} />
        },
        {
          label: REFRESH_LABEL,
          onClick: props.onRefresh,
          renderIcon: (className: string) => <GitRefreshIcon className={className} />
        }
      ];
    }
    return [
      {
        label: PUSH_LABEL,
        onClick: props.onPush,
        renderIcon: (className: string) => <GitPushIcon className={className} />
      },
      {
        label: PULL_LABEL,
        onClick: props.onPull,
        renderIcon: (className: string) => <GitPullIcon className={className} />
      },
      {
        label: FETCH_LABEL,
        onClick: props.onFetch,
        renderIcon: (className: string) => <GitRefreshIcon className={className} />
      },
      {
        label: REFRESH_LABEL,
        onClick: props.onRefresh,
        renderIcon: (className: string) => <GitRefreshIcon className={className} />
      }
    ];
  }, [props.hasRepository, props.onFetch, props.onInit, props.onPull, props.onRefresh, props.statusLoaded]);
  useToolbarMenuDismissal(menuOpen, containerRef, closeMenu);

  return (
    <div className={menuOpen ? "toolbar-split toolbar-split-open" : "toolbar-split"} ref={containerRef}>
      <button
        type="button"
        className="toolbar-split-main"
        disabled={mainDisabled}
        aria-label={`${mainLabel}${CURRENT_WORKSPACE_LABEL}`}
        onClick={handleMainAction}
      >
        <GitBranchIcon className="toolbar-action-icon" />
        <span>{mainLabel}</span>
      </button>
      <button
        type="button"
        className="toolbar-split-trigger"
        disabled={triggerDisabled}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={GIT_TRIGGER_LABEL}
        onClick={() => setMenuOpen((value) => !value)}
      >
        <OfficialChevronRightIcon className="toolbar-caret-icon" />
      </button>
      {menuOpen ? <WorkspaceGitMenu actions={actions} disabled={triggerDisabled} onClose={closeMenu} /> : null}
    </div>
  );
}
