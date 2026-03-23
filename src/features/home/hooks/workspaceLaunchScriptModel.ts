import type { TerminalStatus } from "../../terminal/model/terminalRuntime";
import type {
  UpdateWorkspaceLaunchScriptsInput,
  WorkspaceRoot,
} from "../../workspace/hooks/useWorkspaceRoots";
import {
  coerceLaunchScriptIconId,
  getLaunchScriptIconLabel,
  type LaunchScriptEntry,
  type LaunchScriptIconId,
} from "../../workspace/model/workspaceLaunchScripts";

export const MAIN_LAUNCH_TERMINAL_ID = "launch";

export interface LaunchTerminalController {
  readonly activeRootKey: string;
  readonly activeTerminalId: string | null;
  readonly ensureTerminalWithTitle: (terminalId: string, title: string) => string;
  readonly hasWorkspace: boolean;
  readonly restartTerminalSession: (terminalId: string) => Promise<void>;
  readonly showPanelOnly: () => void;
  readonly terminalState: {
    readonly readyKey: string | null;
    readonly status: TerminalStatus;
  };
  readonly writeTerminalData: (terminalId: string, data: string) => Promise<void>;
}

export interface PendingLaunch {
  readonly rootId: string;
  readonly terminalTabKey: string;
  readonly terminalId: string;
  readonly script: string;
  readonly errorKey: string;
}

export interface WorkspaceLaunchScriptsState {
  readonly launchScript: string | null;
  readonly launchScripts: ReadonlyArray<LaunchScriptEntry>;
  readonly mainEditorOpen: boolean;
  readonly mainDraftScript: string;
  readonly mainError: string | null;
  readonly entryEditorOpenId: string | null;
  readonly entryDraftScript: string;
  readonly entryDraftIcon: LaunchScriptIconId;
  readonly entryDraftLabel: string;
  readonly entryErrorById: Readonly<Record<string, string | null>>;
  readonly newEditorOpen: boolean;
  readonly newDraftScript: string;
  readonly newDraftIcon: LaunchScriptIconId;
  readonly newDraftLabel: string;
  readonly newError: string | null;
  readonly onRunMain: () => void;
  readonly onOpenMainEditor: () => void;
  readonly onCloseMainEditor: () => void;
  readonly onMainDraftChange: (value: string) => void;
  readonly onSaveMain: () => void;
  readonly onRunEntry: (entryId: string) => void;
  readonly onOpenEntryEditor: (entryId: string) => void;
  readonly onCloseEntryEditor: () => void;
  readonly onEntryDraftScriptChange: (value: string) => void;
  readonly onEntryDraftIconChange: (value: LaunchScriptIconId) => void;
  readonly onEntryDraftLabelChange: (value: string) => void;
  readonly onSaveEntry: () => void;
  readonly onDeleteEntry: () => void;
  readonly onOpenNew: () => void;
  readonly onCloseNew: () => void;
  readonly onNewDraftScriptChange: (value: string) => void;
  readonly onNewDraftIconChange: (value: LaunchScriptIconId) => void;
  readonly onNewDraftLabelChange: (value: string) => void;
  readonly onCreateNew: () => void;
}

export interface UseWorkspaceLaunchScriptsOptions {
  readonly selectedRoot: WorkspaceRoot | null;
  readonly terminalController: LaunchTerminalController;
  readonly updateWorkspaceLaunchScripts: (
    input: UpdateWorkspaceLaunchScriptsInput,
  ) => void;
}

export function toNullableScript(value: string): string | null {
  return value.trim().length > 0 ? value : null;
}

export function toNullableLabel(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function buildEntryTerminalId(entryId: string): string {
  return `launch:${entryId}`;
}

export function buildEntryTerminalTitle(
  entry: Pick<LaunchScriptEntry, "icon" | "label">,
): string {
  const suffix = entry.label ?? getLaunchScriptIconLabel(entry.icon);
  return `启动: ${suffix}`;
}

export function normalizeLaunchScripts(
  root: WorkspaceRoot | null,
): ReadonlyArray<LaunchScriptEntry> {
  return (root?.launchScripts ?? []).map((entry) => ({
    ...entry,
    icon: coerceLaunchScriptIconId(entry.icon),
  }));
}

export function saveLaunchScriptsConfig(
  selectedRoot: WorkspaceRoot,
  updateWorkspaceLaunchScripts: (
    input: UpdateWorkspaceLaunchScriptsInput,
  ) => void,
  config: {
    readonly launchScript: string | null;
    readonly launchScripts: ReadonlyArray<LaunchScriptEntry> | null;
  },
): void {
  updateWorkspaceLaunchScripts({
    rootId: selectedRoot.id,
    launchScript: config.launchScript,
    launchScripts: config.launchScripts,
  });
}
