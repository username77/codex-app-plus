import { useCallback, useState } from "react";
import type { WorkspaceRoot } from "../../app/useWorkspaceRoots";
import type { HostBridge } from "../../bridge/types";
import type {
  AuthStatus,
  ConnectionStatus,
  ConversationMessage,
  ReceivedServerRequest,
  ThreadSummary
} from "../../domain/types";
import { TerminalPanel } from "../terminal/TerminalPanel";
import { ConversationPane } from "./ConversationPane";
import { HomeSidebar } from "./HomeSidebar";
import { useWorkspaceGit } from "./git/useWorkspaceGit";
import { WorkspaceGitView } from "./git/WorkspaceGitView";
import { WorkspaceGitButton } from "./WorkspaceGitButton";
import { WorkspaceOpenButton } from "./WorkspaceOpenButton";
import { OfficialSidebarToggleIcon } from "./officialIcons";

interface HomeViewProps {
  readonly hostBridge: HostBridge;
  readonly busy: boolean;
  readonly inputText: string;
  readonly roots: ReadonlyArray<WorkspaceRoot>;
  readonly selectedRootId: string | null;
  readonly selectedRootName: string;
  readonly selectedRootPath: string | null;
  readonly threads: ReadonlyArray<ThreadSummary>;
  readonly selectedThreadId: string | null;
  readonly messages: ReadonlyArray<ConversationMessage>;
  readonly pendingServerRequests: ReadonlyArray<ReceivedServerRequest>;
  readonly connectionStatus: ConnectionStatus;
  readonly fatalError: string | null;
  readonly authStatus: AuthStatus;
  readonly authMode: string | null;
  readonly retryScheduledAt: number | null;
  readonly settingsMenuOpen: boolean;
  readonly onToggleSettingsMenu: () => void;
  readonly onDismissSettingsMenu: () => void;
  readonly onOpenSettings: () => void;
  readonly onSelectRoot: (rootId: string) => void;
  readonly onSelectThread: (threadId: string) => void;
  readonly onInputChange: (text: string) => void;
  readonly onCreateThread: () => Promise<void>;
  readonly onSendTurn: () => Promise<void>;
  readonly onAddRoot: () => void;
  readonly onRemoveRoot: (rootId: string) => void;
  readonly onRetryConnection: () => Promise<void>;
  readonly onLogin: () => Promise<void>;
  readonly onApproveRequest: (requestId: string) => Promise<void>;
  readonly onRejectRequest: (requestId: string) => Promise<void>;
}

function MainToolbar(props: {
  readonly git: ReturnType<typeof useWorkspaceGit>;
  readonly onOpenGitPanel: () => void;
  readonly hostBridge: HostBridge;
  readonly selectedRootName: string;
  readonly selectedRootPath: string | null;
  readonly terminalOpen: boolean;
  readonly onToggleTerminal: () => void;
}): JSX.Element {
  const title = props.selectedRootPath === null ? "工作区会话" : props.selectedRootName;
  return (
    <header className="main-toolbar">
      <h1 className="toolbar-title">{title}</h1>
      <div className="toolbar-actions">
        <WorkspaceOpenButton hostBridge={props.hostBridge} selectedRootPath={props.selectedRootPath} />
        <WorkspaceGitButton
          selectedRootPath={props.selectedRootPath}
          statusLoaded={props.git.statusLoaded}
          hasRepository={props.git.hasRepository}
          loading={props.git.loading}
          pendingAction={props.git.pendingAction}
          onOpenPanel={props.onOpenGitPanel}
          onInit={props.git.initRepository}
          onFetch={props.git.fetch}
          onPull={props.git.pull}
          onPush={props.git.push}
          onRefresh={props.git.refresh}
        />
        <button type="button" className="toolbar-pill" onClick={props.onToggleTerminal}>
          {props.terminalOpen ? "隐藏终端" : "显示终端"}
        </button>
      </div>
    </header>
  );
}

export function HomeView(props: HomeViewProps): JSX.Element {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [gitPanelOpen, setGitPanelOpen] = useState(false);
  const git = useWorkspaceGit({ hostBridge: props.hostBridge, selectedRootPath: props.selectedRootPath });
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
        onCreateThread={props.onCreateThread}
        onAddRoot={props.onAddRoot}
        onRemoveRoot={props.onRemoveRoot}
      />
      <div className="replica-main">
        <MainToolbar
          git={git}
          onOpenGitPanel={() => setGitPanelOpen(true)}
          hostBridge={props.hostBridge}
          selectedRootName={props.selectedRootName}
          selectedRootPath={props.selectedRootPath}
          terminalOpen={terminalOpen}
          onToggleTerminal={toggleTerminal}
        />
        <ConversationPane
          busy={props.busy}
          connectionStatus={props.connectionStatus}
          fatalError={props.fatalError}
          authStatus={props.authStatus}
          authMode={props.authMode}
          retryScheduledAt={props.retryScheduledAt}
          inputText={props.inputText}
          selectedRootPath={props.selectedRootPath}
          selectedThreadId={props.selectedThreadId}
          threads={props.threads}
          messages={props.messages}
          pendingServerRequests={props.pendingServerRequests}
          onInputChange={props.onInputChange}
          onSelectThread={props.onSelectThread}
          onSendTurn={props.onSendTurn}
          onRetryConnection={props.onRetryConnection}
          onLogin={props.onLogin}
          onApproveRequest={props.onApproveRequest}
          onRejectRequest={props.onRejectRequest}
        />
      </div>
      <TerminalPanel
        hostBridge={props.hostBridge}
        open={terminalOpen}
        cwd={props.selectedRootPath}
        cwdLabel={props.selectedRootName}
        onClose={() => setTerminalOpen(false)}
      />
      {gitPanelOpen && props.selectedRootPath !== null ? (
        <div className="git-dialog-backdrop" role="presentation" onClick={() => setGitPanelOpen(false)}>
          <section className="git-dialog" role="dialog" aria-modal="true" aria-label="Git 工作台" onClick={(event) => event.stopPropagation()}>
            <header className="git-dialog-header">
              <strong>Git 工作台</strong>
              <button type="button" className="git-dialog-close" onClick={() => setGitPanelOpen(false)} aria-label="关闭 Git 工作台">
                ×
              </button>
            </header>
            <div className="git-dialog-body">
              <WorkspaceGitView selectedRootName={props.selectedRootName} controller={git} />
            </div>
          </section>
        </div>
      ) : null}
      <button
        type="button"
        className="sidebar-collapse-toggle"
        onClick={() => setSidebarCollapsed((value) => !value)}
        aria-label={sidebarCollapsed ? "展开侧边栏" : "折叠侧边栏"}
      >
        <OfficialSidebarToggleIcon className="sidebar-collapse-icon" />
      </button>
    </div>
  );
}
