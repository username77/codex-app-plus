import {
  OfficialAlertCircleIcon,
  OfficialArrowTopRightIcon,
  OfficialChevronRightIcon,
  OfficialCloseIcon,
  OfficialCodexMarkIcon,
  OfficialFolderIcon,
  OfficialPlusIcon,
  OfficialSettingsGearIcon,
  OfficialWorktreeIcon
} from "./officialIcons";
import { SidebarIcon } from "./icons";
import type { WorkspaceRoot } from "../../app/useWorkspaceRoots";
import { SettingsPopover } from "./SettingsPopover";
import { useState } from "react";
import appIconUrl from "../../assets/official/app.png";
import vscodeIconUrl from "../../assets/official/apps/vscode.png";

interface HomeViewProps {
  readonly roots: ReadonlyArray<WorkspaceRoot>;
  readonly selectedRootId: string | null;
  readonly selectedRootName: string;
  readonly settingsMenuOpen: boolean;
  onToggleSettingsMenu: () => void;
  onDismissSettingsMenu: () => void;
  onOpenSettings: () => void;
  onSelectRoot: (rootId: string) => void;
  onAddRoot: () => void;
}

interface SidebarProps extends Pick<HomeViewProps, "roots" | "selectedRootId" | "onSelectRoot" | "onAddRoot" | "settingsMenuOpen" | "onToggleSettingsMenu" | "onDismissSettingsMenu" | "onOpenSettings"> {
}

function Sidebar(props: SidebarProps): JSX.Element {
  const { roots, selectedRootId, onSelectRoot, onAddRoot, settingsMenuOpen, onToggleSettingsMenu, onDismissSettingsMenu, onOpenSettings } = props;

  return (
    <aside className="replica-sidebar">
      {settingsMenuOpen ? <button type="button" className="settings-backdrop" onClick={onDismissSettingsMenu} aria-label="关闭菜单" /> : null}
      <div className="sidebar-header">
        <button type="button" className="sidebar-app-btn" aria-label="Codex">
          <img className="sidebar-app-icon" src={appIconUrl} alt="" />
        </button>
      </div>
      <nav className="sidebar-nav">
        <button type="button" className="sidebar-nav-item sidebar-nav-item-active"><SidebarIcon kind="new-thread" /><span>新线程</span></button>
        <button type="button" className="sidebar-nav-item"><SidebarIcon kind="automation" /><span>自动化</span></button>
        <button type="button" className="sidebar-nav-item"><SidebarIcon kind="skills" /><span>技能</span></button>
      </nav>
      <section className="thread-section">
        <div className="thread-section-title">线程</div>
        <div className="thread-header-actions">
          <button type="button" className="thread-header-btn" onClick={onAddRoot} aria-label="添加项目">
            <OfficialPlusIcon className="thread-header-icon" />
          </button>
          <button type="button" className="thread-header-btn" aria-label="更多选项">
            <span className="thread-header-ellipsis" aria-hidden="true">
              ⋯
            </span>
          </button>
        </div>
        <ul className="thread-list">
          {roots.map((root) => (
            <li key={root.id} className={root.id === selectedRootId ? "thread-item thread-item-active" : "thread-item"} onClick={() => onSelectRoot(root.id)}>
              <OfficialFolderIcon className={root.id === selectedRootId ? "thread-leading-icon thread-leading-icon-active" : "thread-leading-icon"} />
              <span className="thread-label">{root.name}</span>
              {root.id === selectedRootId ? <span className="thread-item-tools">···</span> : null}
            </li>
          ))}
          {roots.length === 0 ? <li className="thread-empty">暂无项目，点击 + 添加</li> : null}
        </ul>
      </section>
      <div className="settings-slot">
        {settingsMenuOpen ? <SettingsPopover onOpenSettings={onOpenSettings} /> : null}
        <button type="button" className="sidebar-settings" onClick={onToggleSettingsMenu}>
          <OfficialSettingsGearIcon className="settings-gear" />
          <span>设置</span>
        </button>
      </div>
    </aside>
  );
}

interface MainContentProps {
  readonly selectedRootName: string;
}

function MainContent({ selectedRootName }: MainContentProps): JSX.Element {
  return (
    <div className="replica-main">
      <MainToolbar />
      <EmptyCanvas selectedRootName={selectedRootName} />
      <ComposerArea />
    </div>
  );
}

function MainToolbar(): JSX.Element {
  return (
    <header className="main-toolbar">
      <h1 className="toolbar-title">新线程</h1>
      <div className="toolbar-actions">
        <button type="button" className="toolbar-pill">
          <img className="toolbar-app-icon" src={vscodeIconUrl} alt="" />
          <span>打开</span>
          <OfficialChevronRightIcon className="toolbar-caret-icon" />
        </button>
        <button type="button" className="toolbar-pill">
          <OfficialArrowTopRightIcon className="toolbar-leading-icon" />
          <span>推送</span>
          <OfficialChevronRightIcon className="toolbar-caret-icon" />
        </button>
        <div className="toolbar-icon-row" aria-label="快捷操作">
          <button type="button" className="toolbar-icon-btn" aria-label="视图">
            ◱
          </button>
          <button type="button" className="toolbar-icon-btn" aria-label="复制">
            ⧉
          </button>
          <button type="button" className="toolbar-icon-btn" aria-label="窗口">
            ☐
          </button>
          <button type="button" className="toolbar-icon-btn" aria-label="更多">
            ⋯
          </button>
        </div>
      </div>
    </header>
  );
}

function EmptyCanvas({ selectedRootName }: { readonly selectedRootName: string }): JSX.Element {
  return (
    <main className="main-canvas">
      <OfficialCodexMarkIcon className="center-mark" />
      <h2 className="canvas-title">开始构建</h2>
      <button type="button" className="workspace-pill">
        <span>{selectedRootName}</span>
        <OfficialChevronRightIcon className="workspace-caret" />
      </button>
    </main>
  );
}

function ComposerArea(): JSX.Element {
  return (
    <footer className="composer-area">
      <ComposerCard />
      <ComposerFooter />
    </footer>
  );
}

function ComposerCard(): JSX.Element {
  return (
    <div className="composer-card">
      <textarea className="composer-input" placeholder="向 Codex 任意提问，或 添加文件 / 运行命令" />
      <div className="composer-bar">
        <div className="composer-left">
          <button type="button" className="composer-mini-btn" aria-label="添加">
            <OfficialPlusIcon className="composer-plus-icon" />
          </button>
          <button type="button" className="composer-chip">
            GPT-5.2 <OfficialChevronRightIcon className="chip-caret" />
          </button>
          <button type="button" className="composer-chip">
            超高 <OfficialChevronRightIcon className="chip-caret" />
          </button>
        </div>
        <button type="button" className="send-btn" aria-label="发送">
          ↑
        </button>
      </div>
    </div>
  );
}

function ComposerFooter(): JSX.Element {
  return (
    <div className="composer-footer">
      <div className="composer-footer-left">
        <button type="button" className="composer-footer-item">
          <span className="footer-icon" aria-hidden="true">
            ⌂
          </span>
          本地 <OfficialChevronRightIcon className="footer-caret" />
        </button>
        <button type="button" className="composer-footer-item footer-warning">
          <OfficialAlertCircleIcon className="footer-alert-icon" />
          完全访问权限 <OfficialChevronRightIcon className="footer-caret" />
        </button>
      </div>
      <button type="button" className="composer-footer-item">
        <OfficialWorktreeIcon className="footer-branch-icon" />
        main <OfficialChevronRightIcon className="footer-caret" />
      </button>
    </div>
  );
}

export function HomeView(props: HomeViewProps): JSX.Element {
  const [terminalOpen, setTerminalOpen] = useState(true);

  return (
    <div className="replica-app">
      <Sidebar {...props} />
      <MainContent selectedRootName={props.selectedRootName} />
      {terminalOpen ? <TerminalPanel onClose={() => setTerminalOpen(false)} /> : null}
    </div>
  );
}

function TerminalPanel({ onClose }: { readonly onClose: () => void }): JSX.Element {
  return (
    <section className="replica-terminal" aria-label="终端">
      <header className="terminal-toolbar">
        <div className="terminal-title">
          <span className="terminal-title-main">终端</span>
          <span className="terminal-title-sub">PowerShell</span>
        </div>
        <button type="button" className="terminal-close-btn" aria-label="关闭终端" onClick={onClose}>
          <OfficialCloseIcon className="terminal-close-icon" />
        </button>
      </header>
      <pre className="terminal-body">
        {[
          "PS E:\\\\code\\\\codex-app-plus> pnpm dev",
          "",
          "> codex-app-plus@0.1.0 dev E:\\\\code\\\\codex-app-plus",
          "> vite",
          "",
          "Port 5173 is in use, trying another one...",
          "",
          "VITE v5.4.21  ready in 331 ms",
          "",
          "  ➜  Local:   http://localhost:5174/",
          "  ➜  Network: use --host to expose",
          "  ➜  press h + enter to show help",
          "",
          "PS E:\\\\code\\\\codex-app-plus> ^C",
          "PS E:\\\\code\\\\codex-app-plus>"
        ].join("\n")}
      </pre>
    </section>
  );
}
