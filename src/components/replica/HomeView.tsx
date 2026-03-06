import { useCallback, useState } from "react";
import type { WorkspaceRoot } from "../../app/useWorkspaceRoots";
import type { HostBridge } from "../../bridge/types";
import vscodeIconUrl from "../../assets/official/apps/vscode.png";
import { TerminalPanel } from "../terminal/TerminalPanel";
import { ComposerFooter } from "./ComposerFooter";
import { HomeSidebar } from "./HomeSidebar";
import {
  OfficialArrowTopRightIcon,
  OfficialChevronRightIcon,
  OfficialPlusIcon,
  OfficialSidebarToggleIcon
} from "./officialIcons";

const MIN_TRIMMED_MESSAGE_LENGTH = 1;

interface HomeViewProps {
  readonly hostBridge: HostBridge;
  readonly roots: ReadonlyArray<WorkspaceRoot>;
  readonly selectedRootId: string | null;
  readonly selectedRootName: string;
  readonly selectedRootPath: string | null;
  readonly settingsMenuOpen: boolean;
  readonly onToggleSettingsMenu: () => void;
  readonly onDismissSettingsMenu: () => void;
  readonly onOpenSettings: () => void;
  readonly onSelectRoot: (rootId: string) => void;
  readonly onAddRoot: () => void;
  readonly onRemoveRoot: (rootId: string) => void;
}

interface MainContentProps {
  readonly selectedRootName: string;
  readonly selectedRootPath: string | null;
  readonly terminalOpen: boolean;
  readonly onToggleTerminal: () => void;
}

function MainContent(props: MainContentProps): JSX.Element {
  return (
    <div className="replica-main">
      <MainToolbar terminalOpen={props.terminalOpen} onToggleTerminal={props.onToggleTerminal} />
      <EmptyCanvas selectedRootName={props.selectedRootName} selectedRootPath={props.selectedRootPath} />
      <ComposerArea />
    </div>
  );
}

interface MainToolbarProps {
  readonly terminalOpen: boolean;
  readonly onToggleTerminal: () => void;
}

function MainToolbar(props: MainToolbarProps): JSX.Element {
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
          <button
            type="button"
            className="toolbar-icon-btn"
            aria-label={props.terminalOpen ? "隐藏终端" : "显示终端"}
            aria-pressed={props.terminalOpen}
            onClick={props.onToggleTerminal}
          >
            <TerminalIcon className="toolbar-terminal-icon" />
          </button>
        </div>
      </div>
    </header>
  );
}

function EmptyCanvas(props: {
  readonly selectedRootName: string;
  readonly selectedRootPath: string | null;
}): JSX.Element {
  const selectorClassName =
    props.selectedRootPath === null ? "workspace-selector workspace-selector-placeholder" : "workspace-selector";

  return (
    <main className="main-canvas">
      <div className="empty-state" aria-label="欢迎界面">
        <h2 className="empty-title">开始构建</h2>
        <button type="button" className={selectorClassName}>
          <span className="workspace-selector-label">{props.selectedRootName}</span>
          <OfficialChevronRightIcon className="workspace-selector-caret" />
        </button>
      </div>
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
  const [draft, setDraft] = useState("");
  const canSend = draft.trim().length >= MIN_TRIMMED_MESSAGE_LENGTH;

  return (
    <div className="composer-card">
      <textarea
        className="composer-input"
        placeholder="向 Codex 任意提问，或 添加文件 / 运行命令"
        value={draft}
        onChange={(event) => setDraft(event.currentTarget.value)}
      />
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
        <button type="button" className="send-btn" aria-label="发送" disabled={!canSend}>
          <SendArrowIcon className="send-icon" />
        </button>
      </div>
    </div>
  );
}

function SendArrowIcon({ className }: { readonly className?: string }): JSX.Element {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 13.3V2.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M3.2 7.1L8 2.3l4.8 4.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TerminalIcon({ className }: { readonly className?: string }): JSX.Element {
  return (
    <svg className={className} viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="3.5" y="4.5" width="13" height="11" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6.6 8l2 2-2 2" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.8 12h3.6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function HomeView(props: HomeViewProps): JSX.Element {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const toggleTerminal = useCallback(() => {
    setTerminalOpen((value) => !value);
  }, []);

  return (
    <div className="replica-app">
      <HomeSidebar
        roots={props.roots}
        selectedRootId={props.selectedRootId}
        settingsMenuOpen={props.settingsMenuOpen}
        collapsed={sidebarCollapsed}
        onToggleSettingsMenu={props.onToggleSettingsMenu}
        onDismissSettingsMenu={props.onDismissSettingsMenu}
        onOpenSettings={props.onOpenSettings}
        onSelectRoot={props.onSelectRoot}
        onAddRoot={props.onAddRoot}
        onRemoveRoot={props.onRemoveRoot}
      />
      <MainContent
        selectedRootName={props.selectedRootName}
        selectedRootPath={props.selectedRootPath}
        terminalOpen={terminalOpen}
        onToggleTerminal={toggleTerminal}
      />
      <TerminalPanel
        hostBridge={props.hostBridge}
        open={terminalOpen}
        cwd={props.selectedRootPath}
        cwdLabel={props.selectedRootName}
        onClose={() => setTerminalOpen(false)}
      />
      <SidebarCollapseButton collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((value) => !value)} />
    </div>
  );
}

function SidebarCollapseButton(props: {
  readonly collapsed: boolean;
  readonly onToggle: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      className="sidebar-collapse-toggle"
      onClick={props.onToggle}
      aria-label={props.collapsed ? "展开边栏" : "折叠边栏"}
    >
      <OfficialSidebarToggleIcon className="sidebar-collapse-icon" />
    </button>
  );
}