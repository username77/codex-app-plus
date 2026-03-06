import type {
  AppPreferencesController,
  ThreadDetailLevel,
  UiLanguage
} from "../../../app/useAppPreferences";
import type { EmbeddedTerminalShell, WorkspaceOpener } from "../../../bridge/types";
import { SettingsSelectRow, type SettingsSelectOption } from "./SettingsSelectRow";

const WORKSPACE_OPENER_OPTIONS: ReadonlyArray<SettingsSelectOption<WorkspaceOpener>> = [
  { value: "vscode", label: "VS Code" },
  { value: "visualStudio", label: "Visual Studio" },
  { value: "githubDesktop", label: "GitHub Desktop" },
  { value: "explorer", label: "File Explorer" },
  { value: "terminal", label: "Terminal" },
  { value: "gitBash", label: "Git Bash" }
];

const TERMINAL_SHELL_OPTIONS: ReadonlyArray<SettingsSelectOption<EmbeddedTerminalShell>> = [
  { value: "powerShell", label: "PowerShell" },
  { value: "commandPrompt", label: "Command Prompt" },
  { value: "gitBash", label: "Git Bash" }
];

const UI_LANGUAGE_OPTIONS: ReadonlyArray<SettingsSelectOption<UiLanguage>> = [
  { value: "zh-CN", label: "中文（中国）" },
  { value: "en-US", label: "English (US)" }
];

const THREAD_DETAIL_LEVEL_OPTIONS: ReadonlyArray<SettingsSelectOption<ThreadDetailLevel>> = [
  { value: "compact", label: "简略步骤" },
  { value: "commands", label: "带代码命令的步骤" },
  { value: "full", label: "完整输出" }
];

const UI_LANGUAGE_NOTE = "当前仅保存偏好，尚未驱动 UI 翻译。";
const THREAD_DETAIL_NOTE = "当前仅保存偏好，尚未驱动会话渲染。";

interface GeneralSettingsSectionProps {
  readonly preferences: AppPreferencesController;
}

export function GeneralSettingsSection(props: GeneralSettingsSectionProps): JSX.Element {
  const { preferences } = props;

  return (
    <div className="settings-panel-group">
      <header className="settings-title-wrap">
        <h1 className="settings-page-title">常规</h1>
      </header>
      <section className="settings-card">
        <SettingsSelectRow
          label="默认打开目标"
          description="默认打开文件和文件夹的位置"
          value={preferences.workspaceOpener}
          options={WORKSPACE_OPENER_OPTIONS}
          onChange={preferences.setWorkspaceOpener}
        />
        <SettingsSelectRow
          label="集成终端 Shell"
          description="选择集成终端默认打开的 Shell。"
          value={preferences.embeddedTerminalShell}
          options={TERMINAL_SHELL_OPTIONS}
          onChange={preferences.setEmbeddedTerminalShell}
        />
        <SettingsSelectRow
          label="语言"
          description="应用 UI 语言"
          value={preferences.uiLanguage}
          options={UI_LANGUAGE_OPTIONS}
          onChange={preferences.setUiLanguage}
          statusNote={UI_LANGUAGE_NOTE}
        />
        <SettingsSelectRow
          label="线程详细信息"
          description="选择线程中命令输出的显示量"
          value={preferences.threadDetailLevel}
          options={THREAD_DETAIL_LEVEL_OPTIONS}
          onChange={preferences.setThreadDetailLevel}
          statusNote={THREAD_DETAIL_NOTE}
        />
      </section>
    </div>
  );
}
