import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useMemo, useState } from "react";
import type { ComposerSelection } from "./app/composerPreferences";
import { useComposerPicker } from "./app/useComposerPicker";
import { useAppController } from "./app/useAppController";
import { inferWorkspaceNameFromPath } from "./app/workspacePath";
import { useWorkspaceConversation } from "./app/useWorkspaceConversation";
import { useWorkspaceRoots } from "./app/useWorkspaceRoots";
import type { HostBridge } from "./bridge/types";
import { HomeView } from "./components/replica/HomeView";
import { SettingsView, type SettingsSection } from "./components/replica/SettingsView";

interface AppProps {
  readonly hostBridge: HostBridge;
}

async function requestWorkspaceFolder(): Promise<{ readonly name: string; readonly path: string } | null> {
  const selection = await open({
    title: "选择工作区文件夹",
    directory: true,
    multiple: false
  });
  if (selection === null) {
    return null;
  }
  if (Array.isArray(selection)) {
    throw new Error("当前只支持选择一个工作区文件夹");
  }
  const path = selection.trim();
  if (path.length === 0) {
    return null;
  }
  return { name: inferWorkspaceNameFromPath(path), path };
}

export function App({ hostBridge }: AppProps): JSX.Element {
  const controller = useAppController(hostBridge);
  const composerPicker = useComposerPicker(hostBridge, controller.state.configSnapshot);
  const workspace = useWorkspaceRoots(controller.state.threads);
  const [screen, setScreen] = useState<"home" | SettingsSection>("home");
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);

  const selectedRoot = workspace.roots.find((root) => root.id === workspace.selectedRootId) ?? null;
  const selectedRootName = selectedRoot?.name ?? "选择工作区";
  const selectedRootPath = selectedRoot?.path ?? null;
  const conversation = useWorkspaceConversation(hostBridge, controller.state.threads, selectedRootPath);
  const messages = useMemo(
    () => controller.state.messages.filter((message) => message.threadId === conversation.selectedThreadId),
    [controller.state.messages, conversation.selectedThreadId]
  );

  const openConfigToml = useCallback(async () => {
    try {
      await hostBridge.app.openCodexConfigToml();
    } catch (error) {
      console.error("打开 config.toml 失败", error);
      window.alert(`打开 config.toml 失败: ${String(error)}`);
    }
  }, [hostBridge.app]);

  const openSettings = useCallback(() => {
    setScreen("general");
    setSettingsMenuOpen(false);
  }, []);

  const addRoot = useCallback(async () => {
    try {
      const root = await requestWorkspaceFolder();
      if (root !== null) {
        workspace.addRoot(root);
      }
    } catch (error) {
      console.error("选择工作区文件夹失败", error);
      window.alert(`选择工作区文件夹失败: ${String(error)}`);
    }
  }, [workspace]);

  const createWorkspaceThread = useCallback(async () => {
    try {
      await conversation.createThread();
    } catch (error) {
      console.error("创建工作区会话失败", error);
      window.alert(`创建工作区会话失败: ${String(error)}`);
    }
  }, [conversation]);

  const sendWorkspaceTurn = useCallback(async (selection: ComposerSelection) => {
    try {
      await conversation.sendTurn(selection);
    } catch (error) {
      console.error("发送工作区消息失败", error);
      window.alert(`发送工作区消息失败: ${String(error)}`);
    }
  }, [conversation]);

  if (screen !== "home") {
    return (
      <SettingsView
        section={screen}
        roots={workspace.roots}
        onBackHome={() => setScreen("home")}
        onSelectSection={setScreen}
        onAddRoot={addRoot}
        onOpenConfigToml={openConfigToml}
      />
    );
  }

  return (
    <HomeView
      hostBridge={hostBridge}
      busy={controller.state.busy}
      inputText={controller.state.inputText}
      roots={workspace.roots}
      selectedRootId={workspace.selectedRootId}
      selectedRootName={selectedRootName}
      selectedRootPath={selectedRootPath}
      threads={conversation.workspaceThreads}
      selectedThreadId={conversation.selectedThreadId}
      messages={messages}
      models={composerPicker.models}
      defaultModel={composerPicker.defaultModel}
      defaultEffort={composerPicker.defaultEffort}
      pendingServerRequests={controller.state.pendingServerRequests}
      connectionStatus={controller.state.connectionStatus}
      fatalError={controller.state.fatalError}
      authStatus={controller.state.authStatus}
      authMode={controller.state.authMode}
      retryScheduledAt={controller.state.retryScheduledAt}
      settingsMenuOpen={settingsMenuOpen}
      onToggleSettingsMenu={() => setSettingsMenuOpen((openValue) => !openValue)}
      onDismissSettingsMenu={() => setSettingsMenuOpen(false)}
      onOpenSettings={openSettings}
      onSelectRoot={workspace.selectRoot}
      onSelectThread={conversation.selectThread}
      onInputChange={controller.setInput}
      onCreateThread={createWorkspaceThread}
      onSendTurn={sendWorkspaceTurn}
      onAddRoot={addRoot}
      onRemoveRoot={workspace.removeRoot}
      onRetryConnection={controller.retryConnection}
      onLogin={controller.login}
      onApproveRequest={controller.approveRequest}
      onRejectRequest={controller.rejectRequest}
    />
  );
}
