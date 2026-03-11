import { useCallback, useMemo, useRef, useState } from "react";
import { GitCommitIcon, GitBranchIcon, GitPullIcon, GitPushIcon } from "./git/gitIcons";
import { GitPushConfirmDialog } from "./git/GitPushConfirmDialog";
import { canCommitChanges, canPullChanges, canPushChanges } from "./git/gitActionAvailability";
import type { WorkspaceGitController } from "./git/types";
import { WorkspaceGitView } from "./git/WorkspaceGitView";
import { OfficialChevronRightIcon } from "./officialIcons";
import { useToolbarMenuDismissal } from "./useToolbarMenuDismissal";

const CURRENT_WORKSPACE_LABEL = "当前工作区";
const GIT_MENU_LABEL = "Git 操作";
const GIT_TRIGGER_LABEL = "选择 Git 操作";
const COMMIT_LABEL = "提交";
const OPEN_PANEL_LABEL = "打开 Git 工作台";
const PUSH_LABEL = "推送";
const PULL_LABEL = "拉取";

interface WorkspaceGitButtonProps {
  readonly controller: WorkspaceGitController;
  readonly selectedRootName: string;
  readonly selectedRootPath: string | null;
}

interface GitMenuAction {
  readonly disabled: boolean;
  readonly label: string;
  readonly onClick: () => Promise<void> | void;
  readonly renderIcon: (className: string) => JSX.Element;
}

function createMenuActions(controller: WorkspaceGitController, openPanel: () => void, requestPush: () => void): ReadonlyArray<GitMenuAction> {
  return [
    { label: COMMIT_LABEL, disabled: !canCommitChanges(controller), onClick: controller.commit, renderIcon: (className) => <GitCommitIcon className={className} /> },
    { label: PUSH_LABEL, disabled: !canPushChanges(controller), onClick: requestPush, renderIcon: (className) => <GitPushIcon className={className} /> },
    { label: PULL_LABEL, disabled: !canPullChanges(controller), onClick: controller.pull, renderIcon: (className) => <GitPullIcon className={className} /> },
    { label: OPEN_PANEL_LABEL, disabled: false, onClick: openPanel, renderIcon: (className) => <GitBranchIcon className={className} /> }
  ];
}

function WorkspaceGitMenu(props: {
  readonly actions: ReadonlyArray<GitMenuAction>;
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
          disabled={action.disabled}
          onClick={() => {
            if (action.disabled) {
              return;
            }
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

function GitWorkspaceDialog(props: {
  readonly controller: WorkspaceGitController;
  readonly open: boolean;
  readonly selectedRootName: string;
  readonly selectedRootPath: string | null;
  readonly onClose: () => void;
  readonly onRequestPush: () => void;
}): JSX.Element | null {
  if (!props.open || props.selectedRootPath === null) {
    return null;
  }

  return (
    <div className="git-dialog-backdrop" role="presentation" onClick={props.onClose}>
      <section className="git-dialog" role="dialog" aria-modal="true" aria-label="Git 工作台" onClick={(event) => event.stopPropagation()}>
        <header className="git-dialog-header">
          <strong>Git 工作台</strong>
          <button type="button" className="git-dialog-close" onClick={props.onClose} aria-label="关闭 Git 工作台">×</button>
        </header>
        <div className="git-dialog-body">
          <WorkspaceGitView selectedRootName={props.selectedRootName} controller={props.controller} onRequestPush={props.onRequestPush} />
        </div>
      </section>
    </div>
  );
}

export function WorkspaceGitButton(props: WorkspaceGitButtonProps): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [pushConfirmOpen, setPushConfirmOpen] = useState(false);
  const [pushConfirmPending, setPushConfirmPending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const openPanel = useCallback(() => setPanelOpen(true), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);
  const closePushConfirm = useCallback(() => {
    if (!pushConfirmPending) {
      setPushConfirmOpen(false);
    }
  }, [pushConfirmPending]);
  const requestPush = useCallback(() => {
    if (canPushChanges(props.controller)) {
      setPushConfirmOpen(true);
    }
  }, [props.controller]);
  const confirmPush = useCallback(async () => {
    setPushConfirmPending(true);
    try {
      await props.controller.push();
      setPushConfirmOpen(false);
    } finally {
      setPushConfirmPending(false);
    }
  }, [props.controller]);
  const triggerDisabled = props.selectedRootPath === null || props.controller.pendingAction !== null || props.controller.loading || !props.controller.statusLoaded;
  const pushDisabled = props.selectedRootPath === null || !canPushChanges(props.controller);
  const menuActions = useMemo(() => createMenuActions(props.controller, openPanel, requestPush), [props.controller, openPanel, requestPush]);
  const branchName = props.controller.status?.branch?.head ?? null;

  useToolbarMenuDismissal(menuOpen, containerRef, closeMenu);

  return (
    <>
      <div className={menuOpen ? "toolbar-split toolbar-split-open" : "toolbar-split"} ref={containerRef}>
        <button type="button" className="toolbar-split-main" disabled={pushDisabled} aria-label={`${PUSH_LABEL}${CURRENT_WORKSPACE_LABEL}`} onClick={requestPush}>
          <GitPushIcon className="toolbar-action-icon" />
          <span className="toolbar-split-main-text">{PUSH_LABEL}</span>
        </button>
        <button type="button" className="toolbar-split-trigger" disabled={triggerDisabled} aria-haspopup="menu" aria-expanded={menuOpen} aria-label={GIT_TRIGGER_LABEL} onClick={() => setMenuOpen((value) => !value)}>
          <OfficialChevronRightIcon className="toolbar-caret-icon" />
        </button>
        {menuOpen ? <WorkspaceGitMenu actions={menuActions} onClose={closeMenu} /> : null}
      </div>
      <GitWorkspaceDialog controller={props.controller} open={panelOpen} selectedRootName={props.selectedRootName} selectedRootPath={props.selectedRootPath} onClose={closePanel} onRequestPush={requestPush} />
      <GitPushConfirmDialog branchName={branchName} open={pushConfirmOpen} pending={pushConfirmPending} onClose={closePushConfirm} onConfirm={() => void confirmPush()} />
    </>
  );
}
