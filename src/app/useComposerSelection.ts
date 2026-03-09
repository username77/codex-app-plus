import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReasoningEffort } from "../protocol/generated/ReasoningEffort";
import {
  type ComposerSelection,
  type ComposerModelOption,
  findComposerModel,
  resolveConfiguredComposerSelection
} from "./composerPreferences";

interface ComposerSelectionState {
  readonly selectedModel: string | null;
  readonly selectedEffort: ReasoningEffort | null;
  readonly selectedModelOption: ComposerModelOption | null;
  readonly selectModel: (model: string) => void;
  readonly selectEffort: (effort: ReasoningEffort) => void;
  readonly replaceSelection: (selection: ComposerSelection) => void;
}

export function useComposerSelection(
  models: ReadonlyArray<ComposerModelOption>,
  defaultModel: string | null,
  defaultEffort: ReasoningEffort | null
): ComposerSelectionState {
  const persistedSelection = useMemo(
    () => resolveConfiguredComposerSelection(models, defaultModel, defaultEffort),
    [defaultEffort, defaultModel, models]
  );
  const [selectedModel, setSelectedModel] = useState<string | null>(persistedSelection.model);
  const [selectedEffort, setSelectedEffort] = useState<ReasoningEffort | null>(persistedSelection.effort);
  const previousPersistedSelectionRef = useRef<ComposerSelection>(persistedSelection);
  const selectedModelOption = useMemo(() => findComposerModel(models, selectedModel), [models, selectedModel]);

  useEffect(() => {
    const previous = previousPersistedSelectionRef.current;
    if (previous.model === persistedSelection.model && previous.effort === persistedSelection.effort) {
      return;
    }

    previousPersistedSelectionRef.current = persistedSelection;
    setSelectedModel(persistedSelection.model);
    setSelectedEffort(persistedSelection.effort);
  }, [persistedSelection]);

  const replaceSelection = useCallback((selection: ComposerSelection) => {
    setSelectedModel(selection.model);
    setSelectedEffort(selection.effort);
  }, []);

  return {
    selectedModel,
    selectedEffort,
    selectedModelOption,
    selectModel: setSelectedModel,
    selectEffort: setSelectedEffort,
    replaceSelection
  };
}
