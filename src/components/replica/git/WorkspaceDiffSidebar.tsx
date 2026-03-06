import { useEffect, useState } from "react";
import { OfficialCloseIcon } from "../officialIcons";
import { getDefaultGitChangeScope, getGitChangeScopeOptions, type GitChangeScope } from "./GitChangeBrowser";
import { GitDiffFileList } from "./GitDiffFileList";
import { GitStateCard } from "./GitStateCard";
import { GitDiffIcon } from "./gitIcons";
import type { WorkspaceGitController } from "./types";
import type { GitViewState } from "./gitViewState";
import { getGitViewState } from "./gitViewState";
import { WorkspaceDiffScopeSelector } from "./WorkspaceDiffScopeSelector";

interface WorkspaceDiffSidebarProps {
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

function DiffSidebarHeader(props: {
  readonly controller: WorkspaceGitController;
  readonly scope?: GitChangeScope;
  readonly onScopeChange?: (scope: GitChangeScope) => void;
  readonly onClose: () => void;
}): JSX.Element {
  const options = getGitChangeScopeOptions(props.controller);
  const showSelector = props.scope !== undefined && props.onScopeChange !== undefined && options.length > 0;

  return (
    <header className="workspace-diff-sidebar-header">
      <div className="workspace-diff-sidebar-title-wrap">
        {showSelector ? (
          <WorkspaceDiffScopeSelector options={options} selectedScope={props.scope!} onChange={props.onScopeChange!} />
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
      <button type="button" className="workspace-diff-sidebar-close" aria-label="关闭差异侧栏" onClick={props.onClose}>
        <OfficialCloseIcon className="workspace-diff-sidebar-close-icon" />
      </button>
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

function DiffSidebarBody(props: { readonly controller: WorkspaceGitController; readonly scope: GitChangeScope }): JSX.Element {
  const options = getGitChangeScopeOptions(props.controller);
  const scopeLabel = options.find((option) => option.scope === props.scope)?.label ?? "未暂存";

  return (
    <div className="workspace-diff-sidebar-content workspace-diff-sidebar-content-stream">
      {props.controller.notice !== null ? (
        <div className={props.controller.notice.kind === "success" ? "git-banner git-banner-success" : "git-banner git-banner-error"}>
          {props.controller.notice.text}
        </div>
      ) : null}
      <GitDiffFileList controller={props.controller} scope={props.scope} scopeLabel={scopeLabel} />
    </div>
  );
}

export function WorkspaceDiffSidebar(props: WorkspaceDiffSidebarProps): JSX.Element | null {
  const [scope, setScope] = useDiffScope(props.open, props.controller);
  if (!props.open || props.selectedRootPath === null) {
    return null;
  }

  const viewState = getGitViewState(props.selectedRootName, props.controller);
  return (
    <aside className="workspace-diff-sidebar workspace-diff-sidebar-open" aria-label="工作区差异侧栏">
      <DiffSidebarHeader controller={props.controller} scope={viewState === null ? scope : undefined} onScopeChange={viewState === null ? setScope : undefined} onClose={props.onClose} />
      {viewState !== null ? <DiffSidebarState viewState={viewState} /> : <DiffSidebarBody controller={props.controller} scope={scope} />}
    </aside>
  );
}
