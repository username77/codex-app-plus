import { useEffect, useState } from "react";
import type { HostBridge } from "../../../bridge/types";
import { OfficialCloseIcon } from "../../shared/ui/officialIcons";
import { useWorkspaceDiffViewer } from "../hooks/useWorkspaceDiffViewer";
import { getGitViewState, type GitViewState } from "../model/gitViewState";
import type { WorkspaceGitController } from "../model/types";
import {
  getDefaultGitChangeScope,
  getGitChangeScopeOptions,
  type GitChangeScope,
} from "./GitChangeBrowser";
import { GitStateCard } from "./GitStateCard";
import { GitDiffIcon, GitRefreshIcon } from "./gitIcons";
import { WorkspaceDiffScopeSelector } from "./WorkspaceDiffScopeSelector";
import { WorkspaceDiffViewer } from "./WorkspaceDiffViewer";

interface WorkspaceDiffSidebarProps {
  readonly hostBridge: HostBridge;
  readonly open: boolean;
  readonly selectedRootName: string;
  readonly selectedRootPath: string | null;
  readonly controller: WorkspaceGitController;
  readonly onClose: () => void;
}

function useDiffScope(open: boolean, controller: WorkspaceGitController): [GitChangeScope, (scope: GitChangeScope) => void] {
  const [scope, setScope] = useState<GitChangeScope>("unstaged");
  useEffect(() => {
    if (!open || controller.status === null || !controller.status.isRepository) {
      return;
    }
    setScope((currentScope) => {
      const options = getGitChangeScopeOptions(controller);
      const currentOption = options.find((option) => option.scope === currentScope);
      if (currentOption !== undefined && (currentOption.count > 0 || currentOption.scope === "all")) {
        return currentScope;
      }
      return getDefaultGitChangeScope(controller);
    });
  }, [controller, open]);
  return [scope, setScope];
}

function DiffChangeSummary(props: {
  readonly additions: number;
  readonly deletions: number;
  readonly files: number;
  readonly loading: boolean;
}): JSX.Element | null {
  if (props.files === 0) {
    return null;
  }
  if (props.loading) {
    return <div className="workspace-diff-sidebar-summary workspace-diff-sidebar-summary-pending">更新中…</div>;
  }
  return (
    <div className="workspace-diff-sidebar-summary" aria-label={`当前分组新增 ${props.additions} 行，删除 ${props.deletions} 行`}>
      <span className="workspace-diff-sidebar-summary-add">+{props.additions}</span>
      <span className="workspace-diff-sidebar-summary-delete">-{props.deletions}</span>
    </div>
  );
}

function DiffSidebarHeader(props: {
  readonly controller: WorkspaceGitController;
  readonly files: number;
  readonly additions: number;
  readonly deletions: number;
  readonly loading: boolean;
  readonly scope?: GitChangeScope;
  readonly onRefresh: () => Promise<void>;
  readonly onScopeChange?: (scope: GitChangeScope) => void;
  readonly onClose: () => void;
}): JSX.Element {
  const options = getGitChangeScopeOptions(props.controller);
  const showSelector = props.scope !== undefined && props.onScopeChange !== undefined && options.length > 0;
  return (
    <header className="workspace-diff-sidebar-header">
      <div className="workspace-diff-sidebar-title-wrap">
        {showSelector ? (
          <>
            <WorkspaceDiffScopeSelector options={options} selectedScope={props.scope!} onChange={props.onScopeChange!} />
            <DiffChangeSummary
              additions={props.additions}
              deletions={props.deletions}
              files={props.files}
              loading={props.loading}
            />
          </>
        ) : (
          <>
            <GitDiffIcon className="workspace-diff-sidebar-icon" />
            <div>
              <h2 className="workspace-diff-sidebar-title">差异</h2>
              <p className="workspace-diff-sidebar-subtitle">{props.controller.status?.repoRoot ?? "当前工作区"}</p>
            </div>
          </>
        )}
      </div>
      <div className="workspace-diff-sidebar-actions">
        <button type="button" className="workspace-diff-sidebar-close" aria-label="刷新差异" onClick={() => void props.onRefresh()}>
          <GitRefreshIcon className="workspace-diff-sidebar-close-icon" />
        </button>
        <button type="button" className="workspace-diff-sidebar-close" aria-label="关闭差异侧栏" onClick={props.onClose}>
          <OfficialCloseIcon className="workspace-diff-sidebar-close-icon" />
        </button>
      </div>
    </header>
  );
}

function DiffSidebarState(props: { readonly viewState: GitViewState }): JSX.Element {
  return (
    <div className="workspace-diff-sidebar-content">
      <GitStateCard {...props.viewState} className="git-state-card workspace-diff-sidebar-state-card" />
    </div>
  );
}

async function refreshSidebar(
  controller: WorkspaceGitController,
  refreshViewer: () => Promise<void>,
): Promise<void> {
  await controller.refresh();
  await refreshViewer();
}

export function WorkspaceDiffSidebar(props: WorkspaceDiffSidebarProps): JSX.Element | null {
  const [scope, setScope] = useDiffScope(props.open, props.controller);
  const viewState = getGitViewState(props.selectedRootName, props.controller);
  const diffViewer = useWorkspaceDiffViewer({
    enabled: props.open,
    hostBridge: props.hostBridge,
    repoPath: props.selectedRootPath,
    scope,
    status: props.controller.status,
  });
  const busy = props.controller.loading || props.controller.pendingAction !== null;
  if (!props.open || props.selectedRootPath === null) {
    return null;
  }
  if (viewState !== null) {
    return (
      <aside className="workspace-diff-sidebar workspace-diff-sidebar-open" aria-label="工作区差异侧栏">
        <DiffSidebarHeader
          controller={props.controller}
          additions={0}
          deletions={0}
          files={0}
          loading={props.controller.loading}
          onRefresh={props.controller.refresh}
          onClose={props.onClose}
        />
        <DiffSidebarState viewState={viewState} />
      </aside>
    );
  }
  return (
    <aside className="workspace-diff-sidebar workspace-diff-sidebar-open" aria-label="工作区差异侧栏">
      <DiffSidebarHeader
        controller={props.controller}
        additions={diffViewer.summary.additions}
        deletions={diffViewer.summary.deletions}
        files={diffViewer.summary.files}
        loading={diffViewer.loading}
        scope={scope}
        onRefresh={() => refreshSidebar(props.controller, diffViewer.refresh)}
        onScopeChange={setScope}
        onClose={props.onClose}
      />
      <div className="workspace-diff-sidebar-content workspace-diff-sidebar-content-stream">
        {props.controller.notice !== null ? (
          <div className={props.controller.notice.kind === "success" ? "git-banner git-banner-success" : "git-banner git-banner-error"}>
            {props.controller.notice.text}
          </div>
        ) : null}
        <WorkspaceDiffViewer
          busy={busy}
          error={diffViewer.error}
          items={diffViewer.items}
          loading={diffViewer.loading}
          onDiscardPaths={props.controller.discardPaths}
          onStagePaths={props.controller.stagePaths}
          onUnstagePaths={props.controller.unstagePaths}
          showSectionLabel={scope === "all"}
        />
      </div>
    </aside>
  );
}
