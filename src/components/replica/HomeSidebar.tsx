import { useCallback, type MouseEvent } from "react";
import type { WorkspaceRoot } from "../../app/useWorkspaceRoots";
import { SidebarIcon } from "./icons";
import {
  OfficialCloseIcon,
  OfficialFolderIcon,
  OfficialFolderPlusIcon,
  OfficialSettingsGearIcon,
  OfficialSortIcon
} from "./officialIcons";
import { SettingsPopover } from "./SettingsPopover";

export interface HomeSidebarProps {
  readonly roots: ReadonlyArray<WorkspaceRoot>;
  readonly selectedRootId: string | null;
  readonly settingsMenuOpen: boolean;
  readonly collapsed: boolean;
  readonly onToggleSettingsMenu: () => void;
  readonly onDismissSettingsMenu: () => void;
  readonly onOpenSettings: () => void;
  readonly onSelectRoot: (rootId: string) => void;
  readonly onCreateThread: () => Promise<void>;
  readonly onAddRoot: () => void;
  readonly onRemoveRoot: (rootId: string) => void;
}

function WorkspaceRootItem(props: {
  readonly root: WorkspaceRoot;
  readonly selected: boolean;
  readonly onSelect: (rootId: string) => void;
  readonly onRemove: (rootId: string) => void;
}): JSX.Element {
  const { onRemove, onSelect, root, selected } = props;
  const handleRemove = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onRemove(root.id);
    },
    [onRemove, root.id]
  );

  return (
    <li className={selected ? "thread-item thread-item-active" : "thread-item"} onClick={() => onSelect(root.id)}>
      <OfficialFolderIcon className={selected ? "thread-leading-icon thread-leading-icon-active" : "thread-leading-icon"} />
      <span className="thread-label">{root.name}</span>
      {selected ? (
        <button
          type="button"
          className="thread-item-tools"
          aria-label={`移除工作区 ${root.name}`}
          title={`移除工作区 ${root.name}`}
          onClick={handleRemove}
        >
          <OfficialCloseIcon className="thread-item-tools-icon" />
        </button>
      ) : null}
    </li>
  );
}

export function HomeSidebar(props: HomeSidebarProps): JSX.Element {
  const sidebarClassName = props.collapsed ? "replica-sidebar sidebar-collapsed" : "replica-sidebar";
  return (
    <aside className={sidebarClassName}>
      {props.settingsMenuOpen ? (
        <button type="button" className="settings-backdrop" onClick={props.onDismissSettingsMenu} aria-label="关闭菜单" />
      ) : null}
      <div className="sidebar-header" aria-hidden="true" />
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
              selected={root.id === props.selectedRootId}
              onSelect={props.onSelectRoot}
              onRemove={props.onRemoveRoot}
            />
          ))}
          {props.roots.length === 0 ? <li className="thread-empty">暂无工作区，点击左上角添加</li> : null}
        </ul>
      </section>
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
