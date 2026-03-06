import { useEffect, useMemo, useState } from "react";
import type { ReasoningEffort } from "../protocol/generated/ReasoningEffort";
import {
  type ComposerModelOption,
  resolveComposerEffort,
  resolveComposerModel
} from "./composerPreferences";

interface ComposerSelectionState {
  readonly selectedModel: string | null;
  readonly selectedEffort: ReasoningEffort | null;
  readonly selectedModelOption: ComposerModelOption | null;
  readonly selectModel: (model: string) => void;
  readonly selectEffort: (effort: ReasoningEffort) => void;
}

export function useComposerSelection(
  models: ReadonlyArray<ComposerModelOption>,
  defaultModel: string | null,
  defaultEffort: ReasoningEffort | null
): ComposerSelectionState {
  const [selectedModel, setSelectedModel] = useState<string | null>(defaultModel);
  const [selectedEffort, setSelectedEffort] = useState<ReasoningEffort | null>(defaultEffort);
  const defaultModelOption = useMemo(() => resolveComposerModel(models, defaultModel), [defaultModel, models]);
  const selectedModelOption = useMemo(() => resolveComposerModel(models, selectedModel), [models, selectedModel]);

  useEffect(() => {
    const nextModel = selectedModelOption?.value ?? defaultModelOption?.value ?? selectedModel;
    if (nextModel !== selectedModel) {
      setSelectedModel(nextModel);
    }
  }, [defaultModelOption, selectedModel, selectedModelOption]);

  useEffect(() => {
    const nextEffort = resolveComposerEffort(selectedModelOption, selectedEffort ?? defaultEffort);
    if (nextEffort !== selectedEffort) {
      setSelectedEffort(nextEffort);
    }
  }, [defaultEffort, selectedEffort, selectedModelOption]);

  return {
    selectedModel: selectedModelOption?.value ?? selectedModel,
    selectedEffort,
    selectedModelOption,
    selectModel: setSelectedModel,
    selectEffort: setSelectedEffort
  };
}
