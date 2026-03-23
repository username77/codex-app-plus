import { useCallback, useEffect, useMemo, useState } from "react";
import { useUiBannerNotifications } from "../../shared/hooks/useUiBannerNotifications";
import {
  createLaunchScriptEntryId,
  DEFAULT_LAUNCH_SCRIPT_ICON,
  type LaunchScriptEntry,
  type LaunchScriptIconId,
} from "../../workspace/model/workspaceLaunchScripts";
import {
  normalizeLaunchScripts,
  saveLaunchScriptsConfig,
  toNullableLabel,
  toNullableScript,
  type UseWorkspaceLaunchScriptsOptions,
  type WorkspaceLaunchScriptsState,
} from "./workspaceLaunchScriptModel";
import { useWorkspaceLaunchRunner } from "./useWorkspaceLaunchRunner";

export type { WorkspaceLaunchScriptsState } from "./workspaceLaunchScriptModel";

export function useWorkspaceLaunchScripts(
  options: UseWorkspaceLaunchScriptsOptions,
): WorkspaceLaunchScriptsState {
  const { notifyError } = useUiBannerNotifications("workspace-launch-scripts");
  const [mainEditorOpen, setMainEditorOpen] = useState(false);
  const [mainDraftScript, setMainDraftScript] = useState("");
  const [mainError, setMainError] = useState<string | null>(null);
  const [entryEditorOpenId, setEntryEditorOpenId] = useState<string | null>(null);
  const [entryDraftScript, setEntryDraftScript] = useState("");
  const [entryDraftIcon, setEntryDraftIcon] = useState<LaunchScriptIconId>(
    DEFAULT_LAUNCH_SCRIPT_ICON,
  );
  const [entryDraftLabel, setEntryDraftLabel] = useState("");
  const [entryErrorById, setEntryErrorById] = useState<Record<string, string | null>>({});
  const [newEditorOpen, setNewEditorOpen] = useState(false);
  const [newDraftScript, setNewDraftScript] = useState("");
  const [newDraftIcon, setNewDraftIcon] = useState<LaunchScriptIconId>(
    DEFAULT_LAUNCH_SCRIPT_ICON,
  );
  const [newDraftLabel, setNewDraftLabel] = useState("");
  const [newError, setNewError] = useState<string | null>(null);
  const selectedRoot = options.selectedRoot;
  const launchScripts = useMemo(
    () => normalizeLaunchScripts(selectedRoot),
    [selectedRoot],
  );
  const launchScript = selectedRoot?.launchScript ?? null;

  useEffect(() => {
    setMainEditorOpen(false);
    setMainDraftScript(launchScript ?? "");
    setMainError(null);
    setEntryEditorOpenId(null);
    setEntryDraftScript("");
    setEntryDraftIcon(DEFAULT_LAUNCH_SCRIPT_ICON);
    setEntryDraftLabel("");
    setEntryErrorById({});
    setNewEditorOpen(false);
    setNewDraftScript("");
    setNewDraftIcon(DEFAULT_LAUNCH_SCRIPT_ICON);
    setNewDraftLabel("");
    setNewError(null);
  }, [launchScript, selectedRoot?.id]);

  const onOpenMainEditor = useCallback(() => {
    setMainDraftScript(launchScript ?? "");
    setMainError(null);
    setMainEditorOpen(true);
  }, [launchScript]);

  const onCloseMainEditor = useCallback(() => {
    setMainEditorOpen(false);
    setMainError(null);
    setNewEditorOpen(false);
    setNewError(null);
  }, []);

  const onSaveMain = useCallback(() => {
    if (selectedRoot === null) {
      return;
    }
    saveLaunchScriptsConfig(selectedRoot, options.updateWorkspaceLaunchScripts, {
      launchScript: toNullableScript(mainDraftScript),
      launchScripts: launchScripts.length > 0 ? launchScripts : null,
    });
    setMainEditorOpen(false);
    setMainError(null);
  }, [
    launchScripts,
    mainDraftScript,
    options.updateWorkspaceLaunchScripts,
    selectedRoot,
  ]);

  const onOpenEntryEditor = useCallback((entryId: string) => {
    const entry = launchScripts.find((item) => item.id === entryId);
    if (entry === undefined) {
      return;
    }
    setEntryDraftScript(entry.script);
    setEntryDraftIcon(entry.icon);
    setEntryDraftLabel(entry.label ?? "");
    setEntryEditorOpenId(entryId);
    setEntryErrorById((current) => ({ ...current, [entryId]: null }));
  }, [launchScripts]);

  const onCloseEntryEditor = useCallback(() => {
    setEntryEditorOpenId(null);
  }, []);

  const onSaveEntry = useCallback(() => {
    if (selectedRoot === null || entryEditorOpenId === null) {
      return;
    }
    const nextScript = toNullableScript(entryDraftScript);
    if (nextScript === null) {
      setEntryErrorById((current) => ({
        ...current,
        [entryEditorOpenId]: "启动脚本不能为空。",
      }));
      return;
    }
    const nextScripts = launchScripts.map((entry) => (
      entry.id === entryEditorOpenId
        ? {
          ...entry,
          script: nextScript,
          icon: entryDraftIcon,
          label: toNullableLabel(entryDraftLabel),
        }
        : entry
    ));
    saveLaunchScriptsConfig(selectedRoot, options.updateWorkspaceLaunchScripts, {
      launchScript,
      launchScripts: nextScripts,
    });
    setEntryEditorOpenId(null);
  }, [
    entryDraftIcon,
    entryDraftLabel,
    entryDraftScript,
    entryEditorOpenId,
    launchScript,
    launchScripts,
    options.updateWorkspaceLaunchScripts,
    selectedRoot,
  ]);

  const onDeleteEntry = useCallback(() => {
    if (selectedRoot === null || entryEditorOpenId === null) {
      return;
    }
    const nextScripts = launchScripts.filter((entry) => entry.id !== entryEditorOpenId);
    saveLaunchScriptsConfig(selectedRoot, options.updateWorkspaceLaunchScripts, {
      launchScript,
      launchScripts: nextScripts.length > 0 ? nextScripts : null,
    });
    setEntryEditorOpenId(null);
  }, [
    entryEditorOpenId,
    launchScript,
    launchScripts,
    options.updateWorkspaceLaunchScripts,
    selectedRoot,
  ]);

  const onOpenNew = useCallback(() => {
    setNewDraftScript("");
    setNewDraftIcon(DEFAULT_LAUNCH_SCRIPT_ICON);
    setNewDraftLabel("");
    setNewError(null);
    setNewEditorOpen(true);
  }, []);

  const onCloseNew = useCallback(() => {
    setNewEditorOpen(false);
    setNewError(null);
  }, []);

  const onCreateNew = useCallback(() => {
    if (selectedRoot === null) {
      return;
    }
    const nextScript = toNullableScript(newDraftScript);
    if (nextScript === null) {
      setNewError("启动脚本不能为空。");
      return;
    }
    const nextScripts: ReadonlyArray<LaunchScriptEntry> = [
      ...launchScripts,
      {
        id: createLaunchScriptEntryId(),
        script: nextScript,
        icon: newDraftIcon,
        label: toNullableLabel(newDraftLabel),
      },
    ];
    saveLaunchScriptsConfig(selectedRoot, options.updateWorkspaceLaunchScripts, {
      launchScript,
      launchScripts: nextScripts,
    });
    setNewEditorOpen(false);
    setNewError(null);
  }, [
    launchScript,
    launchScripts,
    newDraftIcon,
    newDraftLabel,
    newDraftScript,
    options.updateWorkspaceLaunchScripts,
    selectedRoot,
  ]);

  const { onRunEntry, onRunMain } = useWorkspaceLaunchRunner({
    launchScript,
    launchScripts,
    notifyError,
    onOpenEntryEditor,
    onOpenMainEditor,
    selectedRoot,
    setEntryErrorById,
    setMainError,
    terminalController: options.terminalController,
  });

  return {
    launchScript,
    launchScripts,
    mainEditorOpen,
    mainDraftScript,
    mainError,
    entryEditorOpenId,
    entryDraftScript,
    entryDraftIcon,
    entryDraftLabel,
    entryErrorById,
    newEditorOpen,
    newDraftScript,
    newDraftIcon,
    newDraftLabel,
    newError,
    onRunMain,
    onOpenMainEditor,
    onCloseMainEditor,
    onMainDraftChange: setMainDraftScript,
    onSaveMain,
    onRunEntry,
    onOpenEntryEditor,
    onCloseEntryEditor,
    onEntryDraftScriptChange: setEntryDraftScript,
    onEntryDraftIconChange: setEntryDraftIcon,
    onEntryDraftLabelChange: setEntryDraftLabel,
    onSaveEntry,
    onDeleteEntry,
    onOpenNew,
    onCloseNew,
    onNewDraftScriptChange: setNewDraftScript,
    onNewDraftIconChange: setNewDraftIcon,
    onNewDraftLabelChange: setNewDraftLabel,
    onCreateNew,
  };
}
