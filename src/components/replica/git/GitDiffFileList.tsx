import { useEffect, useMemo, useState } from "react";
import type { GitStatusEntry } from "../../../bridge/types";
import { getVisibleGitChangeSections, type GitChangeScope, type GitChangeSectionData, type GitChangeSectionMode } from "./GitChangeBrowser";
import { GitDiffCodeView } from "./GitDiffCodeView";
import { parseUnifiedDiff } from "./diffPreviewModel";
import { createGitDiffKey } from "./gitDiffKey";
import { GitChevronDownIcon, GitChevronUpIcon, GitEmptyDiffIcon, GitRestoreIcon, GitStageIcon } from "./gitIcons";
import { getSelectedDiffKey } from "./gitViewState";
import type { WorkspaceGitController } from "./types";

interface GitDiffFileListProps {
  readonly controller: WorkspaceGitController;
  readonly scope: GitChangeScope;
  readonly scopeLabel: string;
}

function getEntryTitle(entry: GitStatusEntry): string {
  if (entry.originalPath === null) {
    return entry.path;
  }
  return `${entry.originalPath} → ${entry.path}`;
}

function getPrimaryActionLabel(mode: GitChangeSectionMode): string {
  if (mode === "staged") {
    return "取消暂存";
  }
  if (mode === "conflicted") {
    return "加入暂存";
  }
  return "暂存";
}

function getSecondaryActionLabel(mode: GitChangeSectionMode): string | null {
  if (mode === "unstaged") {
    return "还原";
  }
  if (mode === "untracked") {
    return "删除";
  }
  return null;
}

function getEmptyStateTitle(scope: GitChangeScope, scopeLabel: string): string {
  if (scope === "all") {
    return "无代码更改";
  }
  return `无${scopeLabel}更改`;
}

function useVisibleDiffs(controller: WorkspaceGitController, sections: ReadonlyArray<GitChangeSectionData>): void {
  const targets = useMemo(
    () => sections.flatMap((section) => section.entries.map((entry) => ({ path: entry.path, staged: section.staged }))),
    [sections]
  );

  useEffect(() => {
    const missingTargets = targets.filter((target) => {
      const diffKey = createGitDiffKey(target.path, target.staged);
      return controller.diffCache[diffKey] === undefined && !controller.loadingDiffKeys.includes(diffKey);
    });
    if (missingTargets.length === 0) {
      return;
    }
    void Promise.allSettled(missingTargets.map((target) => controller.ensureDiff(target.path, target.staged)));
  }, [controller, targets]);
}

function DiffFileActionButton(props: { readonly icon: JSX.Element; readonly label: string; readonly disabled: boolean; readonly onClick: () => void }): JSX.Element {
  return (
    <button type="button" className="workspace-diff-file-action" aria-label={props.label} disabled={props.disabled} onClick={props.onClick}>
      {props.icon}
    </button>
  );
}

function applyPrimaryAction(controller: WorkspaceGitController, mode: GitChangeSectionMode, path: string): void {
  if (mode === "staged") {
    void controller.unstagePaths([path]);
    return;
  }
  void controller.stagePaths([path]);
}

function handleSecondaryAction(controller: WorkspaceGitController, mode: GitChangeSectionMode, path: string): void {
  const confirmed = window.confirm(`确定要处理文件 ${path} 吗？该操作不可撤销。`);
  if (confirmed) {
    void controller.discardPaths([path], mode === "untracked");
  }
}

function FileCardActions(props: {
  readonly controller: WorkspaceGitController;
  readonly mode: GitChangeSectionMode;
  readonly path: string;
  readonly collapsed: boolean;
  readonly onToggleCollapse: () => void;
}): JSX.Element {
  const busy = props.controller.loading || props.controller.pendingAction !== null;
  const secondaryLabel = getSecondaryActionLabel(props.mode);

  return (
    <div className="workspace-diff-file-actions">
      {secondaryLabel !== null ? (
        <DiffFileActionButton
          icon={<GitRestoreIcon className="workspace-diff-file-action-icon" />}
          label={`${secondaryLabel} ${props.path}`}
          disabled={busy}
          onClick={() => handleSecondaryAction(props.controller, props.mode, props.path)}
        />
      ) : null}
      <DiffFileActionButton
        icon={<GitStageIcon className="workspace-diff-file-action-icon" />}
        label={`${getPrimaryActionLabel(props.mode)} ${props.path}`}
        disabled={busy}
        onClick={() => applyPrimaryAction(props.controller, props.mode, props.path)}
      />
      <DiffFileActionButton
        icon={props.collapsed ? <GitChevronDownIcon className="workspace-diff-file-action-icon" /> : <GitChevronUpIcon className="workspace-diff-file-action-icon" />}
        label={props.collapsed ? `展开 ${props.path}` : `折叠 ${props.path}`}
        disabled={false}
        onClick={props.onToggleCollapse}
      />
    </div>
  );
}

function FileCardHeader(props: {
  readonly entry: GitStatusEntry;
  readonly mode: GitChangeSectionMode;
  readonly additions: number;
  readonly deletions: number;
  readonly active: boolean;
  readonly controller: WorkspaceGitController;
  readonly staged: boolean;
  readonly collapsed: boolean;
  readonly onToggleCollapse: () => void;
}): JSX.Element {
  return (
    <header className="workspace-diff-file-header">
      <button type="button" className={props.active ? "workspace-diff-file-title workspace-diff-file-title-active" : "workspace-diff-file-title"} onClick={() => void props.controller.selectDiff(props.entry.path, props.staged)}>
        {getEntryTitle(props.entry)}
      </button>
      <div className="workspace-diff-file-summary" aria-label={`新增 ${props.additions} 行，删除 ${props.deletions} 行`}>
        <span className="workspace-diff-file-summary-add">+{props.additions}</span>
        <span className="workspace-diff-file-summary-delete">-{props.deletions}</span>
      </div>
      <FileCardActions controller={props.controller} mode={props.mode} path={props.entry.path} collapsed={props.collapsed} onToggleCollapse={props.onToggleCollapse} />
    </header>
  );
}

function FileCardBody(props: { readonly loading: boolean; readonly parsedDiff: ReturnType<typeof parseUnifiedDiff> | null }): JSX.Element {
  if (props.loading) {
    return <div className="workspace-diff-file-loading">正在加载差异…</div>;
  }
  if (props.parsedDiff === null) {
    return <div className="workspace-diff-file-loading">正在准备差异预览…</div>;
  }
  return <GitDiffCodeView parsed={props.parsedDiff} />;
}

function GitDiffFileCard(props: { readonly controller: WorkspaceGitController; readonly section: GitChangeSectionData; readonly entry: GitStatusEntry }): JSX.Element {
  const [collapsed, setCollapsed] = useState(false);
  const diffKey = createGitDiffKey(props.entry.path, props.section.staged);
  const diff = props.controller.diffCache[diffKey] ?? null;
  const parsedDiff = useMemo(() => (diff === null ? null : parseUnifiedDiff(diff.diff)), [diff]);
  const selectedDiffKey = getSelectedDiffKey(props.controller);
  const loading = props.controller.loadingDiffKeys.includes(diffKey);

  return (
    <article className={selectedDiffKey === diffKey ? "workspace-diff-file-card workspace-diff-file-card-active" : "workspace-diff-file-card"}>
      <FileCardHeader
        entry={props.entry}
        mode={props.section.mode}
        additions={parsedDiff?.additions ?? 0}
        deletions={parsedDiff?.deletions ?? 0}
        active={selectedDiffKey === diffKey}
        controller={props.controller}
        staged={props.section.staged}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
      />
      {collapsed ? null : <FileCardBody loading={loading} parsedDiff={parsedDiff} />}
    </article>
  );
}

function GitDiffSection(props: { readonly controller: WorkspaceGitController; readonly scope: GitChangeScope; readonly section: GitChangeSectionData }): JSX.Element {
  return (
    <section className="workspace-diff-section-group">
      {props.scope === "all" ? <div className="workspace-diff-section-title">{props.section.label}</div> : null}
      <div className="workspace-diff-file-list">
        {props.section.entries.map((entry) => (
          <GitDiffFileCard key={`${props.section.mode}:${entry.path}`} controller={props.controller} section={props.section} entry={entry} />
        ))}
      </div>
    </section>
  );
}

function GitDiffEmptyState(props: { readonly scope: GitChangeScope; readonly scopeLabel: string }): JSX.Element {
  return (
    <div className="workspace-diff-empty-state">
      <GitEmptyDiffIcon className="workspace-diff-empty-icon" />
      <h3 className="workspace-diff-empty-title">{getEmptyStateTitle(props.scope, props.scopeLabel)}</h3>
      <p className="workspace-diff-empty-body">代码更改将在此处显示</p>
    </div>
  );
}

export function GitDiffFileList(props: GitDiffFileListProps): JSX.Element | null {
  const sections = useMemo(
    () => getVisibleGitChangeSections(props.controller, props.scope).filter((section) => section.entries.length > 0),
    [props.controller, props.scope]
  );

  useVisibleDiffs(props.controller, sections);
  if (props.controller.status === null) {
    return null;
  }
  if (sections.length === 0) {
    return <GitDiffEmptyState scope={props.scope} scopeLabel={props.scopeLabel} />;
  }

  return (
    <div className="workspace-diff-file-groups">
      {sections.map((section) => (
        <GitDiffSection key={section.mode} controller={props.controller} scope={props.scope} section={section} />
      ))}
    </div>
  );
}
