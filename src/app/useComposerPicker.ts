import { useEffect, useMemo, useState } from "react";
import type { HostBridge } from "../bridge/types";
import type { ReasoningEffort } from "../protocol/generated/ReasoningEffort";
import {
  type ComposerModelOption,
  listComposerModels,
  readComposerSelectionFromConfig
} from "./composerPreferences";

interface ComposerPickerState {
  readonly models: ReadonlyArray<ComposerModelOption>;
  readonly defaultModel: string | null;
  readonly defaultEffort: ReasoningEffort | null;
}

export function useComposerPicker(hostBridge: HostBridge, configSnapshot: unknown): ComposerPickerState {
  const [models, setModels] = useState<ReadonlyArray<ComposerModelOption>>([]);
  const defaults = useMemo(() => readComposerSelectionFromConfig(configSnapshot), [configSnapshot]);

  useEffect(() => {
    let cancelled = false;

    const loadModels = async () => {
      try {
        const nextModels = await listComposerModels(hostBridge);
        if (!cancelled) {
          setModels(nextModels);
        }
      } catch (error) {
        console.error("读取模型列表失败", error);
      }
    };

    void loadModels();
    return () => {
      cancelled = true;
    };
  }, [hostBridge]);

  return {
    models,
    defaultModel: defaults.model,
    defaultEffort: defaults.effort
  };
}
