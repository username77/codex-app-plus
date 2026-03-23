import { useCallback, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { WorkspaceRoot } from "../../workspace/hooks/useWorkspaceRoots";
import type { LaunchScriptEntry } from "../../workspace/model/workspaceLaunchScripts";
import { buildTabKey } from "../../terminal/hooks/terminalSessionModel";
import {
  buildEntryTerminalId,
  buildEntryTerminalTitle,
  MAIN_LAUNCH_TERMINAL_ID,
  toNullableScript,
  type LaunchTerminalController,
  type PendingLaunch,
} from "./workspaceLaunchScriptModel";

interface UseWorkspaceLaunchRunnerOptions {
  readonly launchScript: string | null;
  readonly launchScripts: ReadonlyArray<LaunchScriptEntry>;
  readonly notifyError: (title: string, error: unknown, detail?: string | null) => void;
  readonly onOpenEntryEditor: (entryId: string) => void;
  readonly onOpenMainEditor: () => void;
  readonly selectedRoot: WorkspaceRoot | null;
  readonly setEntryErrorById: Dispatch<SetStateAction<Record<string, string | null>>>;
  readonly setMainError: Dispatch<SetStateAction<string | null>>;
  readonly terminalController: LaunchTerminalController;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function setLaunchError(
  errorKey: string,
  message: string,
  setMainError: Dispatch<SetStateAction<string | null>>,
  setEntryErrorById: Dispatch<SetStateAction<Record<string, string | null>>>,
): void {
  if (errorKey === "main") {
    setMainError(message);
    return;
  }
  setEntryErrorById((current) => ({ ...current, [errorKey]: message }));
}

export function useWorkspaceLaunchRunner(
  options: UseWorkspaceLaunchRunnerOptions,
): {
  readonly onRunEntry: (entryId: string) => void;
  readonly onRunMain: () => void;
} {
  const pendingLaunchRef = useRef<PendingLaunch | null>(null);

  const scheduleLaunch = useCallback((
    nextScript: string,
    terminalId: string,
    title: string,
    errorKey: string,
  ) => {
    if (options.selectedRoot === null || options.terminalController.hasWorkspace === false) {
      return;
    }
    options.terminalController.ensureTerminalWithTitle(terminalId, title);
    options.terminalController.showPanelOnly();
    pendingLaunchRef.current = {
      rootId: options.selectedRoot.id,
      terminalTabKey: buildTabKey(options.terminalController.activeRootKey, terminalId),
      terminalId,
      script: nextScript,
      errorKey,
    };
    void options.terminalController.restartTerminalSession(terminalId).catch((error) => {
      pendingLaunchRef.current = null;
      setLaunchError(
        errorKey,
        toErrorMessage(error),
        options.setMainError,
        options.setEntryErrorById,
      );
      options.notifyError("启动脚本运行失败", error);
    });
  }, [options]);

  const onRunMain = useCallback(() => {
    if (options.launchScript === null) {
      options.onOpenMainEditor();
      return;
    }
    options.setMainError(null);
    scheduleLaunch(options.launchScript, MAIN_LAUNCH_TERMINAL_ID, "启动", "main");
  }, [options, scheduleLaunch]);

  const onRunEntry = useCallback((entryId: string) => {
    const entry = options.launchScripts.find((item) => item.id === entryId);
    if (entry === undefined) {
      return;
    }
    if (toNullableScript(entry.script) === null) {
      options.onOpenEntryEditor(entryId);
      return;
    }
    options.setEntryErrorById((current) => ({ ...current, [entryId]: null }));
    scheduleLaunch(
      entry.script,
      buildEntryTerminalId(entry.id),
      buildEntryTerminalTitle(entry),
      entry.id,
    );
  }, [options, scheduleLaunch]);

  useEffect(() => {
    const pendingLaunch = pendingLaunchRef.current;
    if (
      pendingLaunch === null
      || options.selectedRoot === null
      || options.selectedRoot.id !== pendingLaunch.rootId
      || options.terminalController.activeTerminalId !== pendingLaunch.terminalId
      || options.terminalController.terminalState.readyKey !== pendingLaunch.terminalTabKey
    ) {
      return;
    }
    pendingLaunchRef.current = null;
    void options.terminalController.writeTerminalData(
      pendingLaunch.terminalId,
      `${pendingLaunch.script}\n`,
    ).catch((error) => {
      setLaunchError(
        pendingLaunch.errorKey,
        toErrorMessage(error),
        options.setMainError,
        options.setEntryErrorById,
      );
      options.notifyError("启动脚本运行失败", error);
    });
  }, [options]);

  useEffect(() => {
    pendingLaunchRef.current = null;
  }, [options.selectedRoot?.id]);

  return {
    onRunEntry,
    onRunMain,
  };
}
