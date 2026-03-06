import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import type { WorkspaceRoot } from "../../app/useWorkspaceRoots";
import { listThreadsForWorkspace } from "../../app/workspaceThread";
import type { ThreadSummary } from "../../domain/types";
import { SidebarIcon } from "./icons";
import {
  OfficialChevronRightIcon,
  OfficialCloseIcon,
  OfficialFolderIcon,
  OfficialFolderPlusIcon,
  OfficialSettingsGearIcon,
  OfficialSortIcon
} from "./officialIcons";
import { SettingsPopover } from "./SettingsPopover";

export interface HomeSidebarProps {
  readonly roots: ReadonlyArray<WorkspaceRoot>;
  readonly threads: ReadonlyArray<ThreadSummary>;
  readonly selectedRootId: string | null;
  readonly selectedThreadId: string | null;
  readonly settingsMenuOpen: boolean;
  readonly collapsed: boolean;
  readonly onToggleSettingsMenu: () => void;
  readonly onDismissSettingsMenu: () => void;
  readonly onOpenSettings: () => void;
  readonly onSelectRoot: (rootId: string) => void;
  readonly onSelectThread: (threadId: string) => void;
  readonly onCreateThread: () => Promise<void>;
  readonly onAddRoot: () => void;
  readonly onRemoveRoot: (rootId: string) => void;
}

interface WorkspaceRootRowProps {
  readonly root: WorkspaceRoot;
  readonly expanded: boolean;
  readonly selected: boolean;
  readonly threadCount: number;
  readonly onSelect: (rootId: string) => void;
  readonly onToggleExpanded: (rootId: string) => void;
  readonly onRemove: (rootId: string) => void;
}

interface WorkspaceRootItemProps {
  readonly root: WorkspaceRoot;
  readonly expanded: boolean;
  readonly selected: boolean;
  readonly selectedThreadId: string | null;
  readonly threads: ReadonlyArray<ThreadSummary>;
  readonly onSelectRoot: (rootId: string) => void;
  readonly onSelectThread: (threadId: string) => void;
  readonly onToggleExpanded: (rootId: string) => void;
  readonly onRemoveRoot: (rootId: string) => void;
}

interface WorkspaceSectionProps {
  readonly roots: ReadonlyArray<WorkspaceRoot>;
  readonly threads: ReadonlyArray<ThreadSummary>;
  readonly selectedRootId: string | null;
  readonly selectedThreadId: string | null;
  readonly onSelectRoot: (rootId: string) => void;
  readonly onSelectThread: (threadId: string) => void;
  readonly onAddRoot: () => void;
  readonly onRemoveRoot: (rootId: string) => void;
}

function formatThreadUpdatedAt(updatedAt: string): string {
  const timestamp = Date.parse(updatedAt);
  if (Number.isNaN(timestamp)) {
    return "";
  }
  return new Date(timestamp).toLocaleString([], { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getThreadLabel(thread: ThreadSummary): string {
  const title = thread.title.trim();
  return title.length > 0 ? title : "未命名会话";
}

function createThreadsByRootId(
  roots: ReadonlyArray<WorkspaceRoot>,
  threads: ReadonlyArray<ThreadSummary>
): ReadonlyMap<string, ReadonlyArray<ThreadSummary>> {
  return new Map(roots.map((root) => [root.id, listThreadsForWorkspace(threads, root.path)]));
}

function useExpandedRootId(
  roots: ReadonlyArray<WorkspaceRoot>,
  selectedRootId: string | null,
  onSelectRoot: (rootId: string) => void
): { readonly expandedRootId: string | null; readonly selectRoot: (rootId: string) => void; readonly toggleExpanded: (rootId: string) => void } {
  const [expandedRootId, setExpandedRootId] = useState<string | null>(selectedRootId);
  useEffect(() => {
    if (selectedRootId !== null) {
      setExpandedRootId(selectedRootId);
    }
  }, [selectedRootId]);

  useEffect(() => {
    if (expandedRootId === null || roots.some((root) => root.id === expandedRootId)) {
      return;
    }
    setExpandedRootId(selectedRootId ?? null);
  }, [expandedRootId, roots, selectedRootId]);

  const selectRoot = useCallback(
    (rootId: string) => {
      onSelectRoot(rootId);
      setExpandedRootId(rootId);
    },
    [onSelectRoot]
  );

  const toggleExpanded = useCallback(
    (rootId: string) => {
      if (selectedRootId !== rootId) {
        onSelectRoot(rootId);
        setExpandedRootId(rootId);
        return;
      }
      setExpandedRootId((current) => (current === rootId ? null : rootId));
    },
    [onSelectRoot, selectedRootId]
  );

  return { expandedRootId, selectRoot, toggleExpanded };
}

function WorkspaceThreadItem(props: {
  readonly thread: ThreadSummary;
  readonly selected: boolean;
  readonly onSelect: (threadId: string) => void;
}): JSX.Element {
  const className = props.selected ? "workspace-thread-button workspace-thread-button-active" : "workspace-thread-button";
  return (
    <li>
      <button type="button" className={className} onClick={() => props.onSelect(props.thread.id)}>
        <span className="workspace-thread-title">{getThreadLabel(props.thread)}</span>
        <span className="workspace-thread-meta">{formatThreadUpdatedAt(props.thread.updatedAt)}</span>
      </button>
    </li>
  );
}

function WorkspaceRootRow(props: WorkspaceRootRowProps): JSX.Element {
  const handleRemove = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      props.onRemove(props.root.id);
    },
    [props]
  );
  const handleToggle = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      props.onToggleExpanded(props.root.id);
    },
    [props]
  );
  const chevronClassName = props.expanded ? "workspace-chevron workspace-chevron-expanded" : "workspace-chevron";
  const leadingIconClassName = props.selected ? "thread-leading-icon thread-leading-icon-active" : "thread-leading-icon";
  const rowClassName = props.selected ? "thread-item thread-item-active workspace-root-row" : "thread-item workspace-root-row";

  return (
    <div className={rowClassName}>
      <button type="button" className="workspace-expand-btn" aria-label={props.expanded ? `折叠工作区 ${props.root.name}` : `展开工作区 ${props.root.name}`} onClick={handleToggle}>
        <OfficialChevronRightIcon className={chevronClassName} />
      </button>
      <button type="button" className="workspace-root-button" onClick={() => props.onSelect(props.root.id)}>
        <OfficialFolderIcon className={leadingIconClassName} />
        <span className="thread-label">{props.root.name}</span>
        {props.threadCount > 0 ? <span className="workspace-thread-count">{props.threadCount}</span> : null}
      </button>
      {props.selected ? (
        <button type="button" className="thread-item-tools" aria-label={`移除工作区 ${props.root.name}`} title={`移除工作区 ${props.root.name}`} onClick={handleRemove}>
          <OfficialCloseIcon className="thread-item-tools-icon" />
        </button>
      ) : null}
    </div>
  );
}

function WorkspaceThreadList(props: {
  readonly threads: ReadonlyArray<ThreadSummary>;
  readonly selectedThreadId: string | null;
  readonly onSelectThread: (threadId: string) => void;
}): JSX.Element {
  if (props.threads.length === 0) {
    return <ul className="workspace-thread-list"><li className="workspace-thread-empty">暂无会话</li></ul>;
  }

  return (
    <ul className="workspace-thread-list">
      {props.threads.map((thread) => (
        <WorkspaceThreadItem key={thread.id} thread={thread} selected={thread.id === props.selectedThreadId} onSelect={props.onSelectThread} />
      ))}
    </ul>
  );
}

function WorkspaceRootItem(props: WorkspaceRootItemProps): JSX.Element {
  return (
    <li className="workspace-root-item">
      <WorkspaceRootRow
        root={props.root}
        expanded={props.expanded}
        selected={props.selected}
        threadCount={props.threads.length}
        onSelect={props.onSelectRoot}
        onToggleExpanded={props.onToggleExpanded}
        onRemove={props.onRemoveRoot}
      />
      {props.expanded ? <WorkspaceThreadList threads={props.threads} selectedThreadId={props.selectedThreadId} onSelectThread={props.onSelectThread} /> : null}
    </li>
  );
}

function SidebarNav(props: { readonly onCreateThread: () => Promise<void> }): JSX.Element {
  return (
    <nav className="sidebar-nav">
      <button type="button" className="sidebar-nav-item" onClick={() => void props.onCreateThread()}>
        <SidebarIcon kind="new-thread" />
        <span>新会话</span>
      </button>
      <button type="button" className="sidebar-nav-item">
        <SidebarIcon kind="automation" />
        <span>自动化</span>
      </button>
      <button type="button" className="sidebar-nav-item">
        <SidebarIcon kind="skills" />
        <span>技能</span>
      </button>
    </nav>
  );
}

function WorkspaceSection(props: WorkspaceSectionProps): JSX.Element {
  const { expandedRootId, selectRoot, toggleExpanded } = useExpandedRootId(props.roots, props.selectedRootId, props.onSelectRoot);
  const threadsByRootId = useMemo(() => createThreadsByRootId(props.roots, props.threads), [props.roots, props.threads]);

  return (
    <section className="thread-section">
      <div className="thread-section-header">
        <div className="thread-section-title">工作区</div>
        <div className="thread-header-actions">
          <button type="button" className="thread-header-btn" onClick={props.onAddRoot} aria-label="添加工作区">
            <OfficialFolderPlusIcon className="thread-header-icon" />
          </button>
          <button type="button" className="thread-header-btn" aria-label="排序">
            <OfficialSortIcon className="thread-header-icon" />
          </button>
        </div>
      </div>
      <ul className="thread-list">
        {props.roots.map((root) => (
          <WorkspaceRootItem
            key={root.id}
            root={root}
            expanded={root.id === expandedRootId}
            selected={root.id === props.selectedRootId}
            selectedThreadId={props.selectedThreadId}
            threads={threadsByRootId.get(root.id) ?? []}
            onSelectRoot={selectRoot}
            onSelectThread={props.onSelectThread}
            onToggleExpanded={toggleExpanded}
            onRemoveRoot={props.onRemoveRoot}
          />
        ))}
        {props.roots.length === 0 ? <li className="thread-empty">暂无工作区，点击左上角添加</li> : null}
      </ul>
    </section>
  );
}

export function HomeSidebar(props: HomeSidebarProps): JSX.Element {
  const sidebarClassName = props.collapsed ? "replica-sidebar sidebar-collapsed" : "replica-sidebar";
  return (
    <aside className={sidebarClassName}>
      {props.settingsMenuOpen ? <button type="button" className="settings-backdrop" onClick={props.onDismissSettingsMenu} aria-label="关闭菜单" /> : null}
      <div className="sidebar-header" aria-hidden="true" />
      <SidebarNav onCreateThread={props.onCreateThread} />
      <WorkspaceSection
        roots={props.roots}
        threads={props.threads}
        selectedRootId={props.selectedRootId}
        selectedThreadId={props.selectedThreadId}
        onSelectRoot={props.onSelectRoot}
        onSelectThread={props.onSelectThread}
        onAddRoot={props.onAddRoot}
        onRemoveRoot={props.onRemoveRoot}
      />
      <div className="settings-slot">
        {props.settingsMenuOpen ? <SettingsPopover onOpenSettings={props.onOpenSettings} /> : null}
        <button type="button" className="sidebar-settings" onClick={props.onToggleSettingsMenu}>
          <OfficialSettingsGearIcon className="settings-gear" />
          <span>设置</span>
        </button>
      </div>
    </aside>
  );
}
