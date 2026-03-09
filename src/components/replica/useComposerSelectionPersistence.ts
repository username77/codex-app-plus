import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  type ComposerModelOption,
  type ComposerSelection,
  findComposerModel,
  resolveComposerEffort,
  resolveConfiguredComposerSelection
} from "../../app/composerPreferences";
import type { ReasoningEffort } from "../../protocol/generated/ReasoningEffort";

const PERSIST_DELAY_MS = 250;

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sameSelection(left: ComposerSelection, right: ComposerSelection): boolean {
  return left.model === right.model && left.effort === right.effort;
}

interface UseComposerSelectionPersistenceOptions {
  readonly models: ReadonlyArray<ComposerModelOption>;
  readonly defaultModel: string | null;
  readonly defaultEffort: ReasoningEffort | null;
  readonly selectedModel: string | null;
  readonly selectedEffort: ReasoningEffort | null;
  readonly replaceSelection: (selection: ComposerSelection) => void;
  readonly persistSelection: (selection: ComposerSelection) => Promise<void>;
}

interface ComposerSelectionPersistence {
  readonly handleSelectModel: (model: string) => void;
  readonly handleSelectEffort: (effort: ReasoningEffort) => void;
}

export function useComposerSelectionPersistence(
  options: UseComposerSelectionPersistenceOptions
): ComposerSelectionPersistence {
  const persistedSelection = useMemo(
    () => resolveConfiguredComposerSelection(options.models, options.defaultModel, options.defaultEffort),
    [options.defaultEffort, options.defaultModel, options.models]
  );
  const lastPersistedSelectionRef = useRef<ComposerSelection>({
    model: persistedSelection.model,
    effort: persistedSelection.effort
  });
  const queuedSelectionRef = useRef<ComposerSelection | null>(null);
  const inFlightSelectionRef = useRef<ComposerSelection | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    lastPersistedSelectionRef.current = {
      model: persistedSelection.model,
      effort: persistedSelection.effort
    };
  }, [persistedSelection.effort, persistedSelection.model]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flushPersistQueue = useCallback(async () => {
    if (inFlightSelectionRef.current !== null || queuedSelectionRef.current === null) {
      return;
    }

    const nextSelection = queuedSelectionRef.current;
    queuedSelectionRef.current = null;
    inFlightSelectionRef.current = nextSelection;

    try {
      await options.persistSelection(nextSelection);
      lastPersistedSelectionRef.current = nextSelection;
    } catch (error) {
      queuedSelectionRef.current = null;
      options.replaceSelection(lastPersistedSelectionRef.current);
      console.error("保存 Composer 配置失败", error);
      window.alert(`保存 Composer 配置失败: ${toErrorMessage(error)}`);
    } finally {
      inFlightSelectionRef.current = null;
    }

    if (queuedSelectionRef.current !== null) {
      if (sameSelection(queuedSelectionRef.current, lastPersistedSelectionRef.current)) {
        queuedSelectionRef.current = null;
        return;
      }
      void flushPersistQueue();
    }
  }, [options]);

  const schedulePersist = useCallback((selection: ComposerSelection) => {
    queuedSelectionRef.current = selection;
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void flushPersistQueue();
    }, PERSIST_DELAY_MS);
  }, [clearTimer, flushPersistQueue]);

  useEffect(() => clearTimer, [clearTimer]);

  const handleSelectModel = useCallback((model: string) => {
    const nextModel = findComposerModel(options.models, model);
    const nextSelection = {
      model,
      effort: nextModel === null
        ? options.selectedEffort
        : resolveComposerEffort(nextModel, options.selectedEffort)
    };
    options.replaceSelection(nextSelection);
    if (sameSelection(nextSelection, lastPersistedSelectionRef.current)) {
      queuedSelectionRef.current = null;
      clearTimer();
      return;
    }
    schedulePersist(nextSelection);
  }, [clearTimer, options.models, options.replaceSelection, options.selectedEffort, schedulePersist]);

  const handleSelectEffort = useCallback((effort: ReasoningEffort) => {
    if (options.selectedModel === null) {
      return;
    }

    const nextSelection = {
      model: options.selectedModel,
      effort
    };
    options.replaceSelection(nextSelection);
    if (sameSelection(nextSelection, lastPersistedSelectionRef.current)) {
      queuedSelectionRef.current = null;
      clearTimer();
      return;
    }
    schedulePersist(nextSelection);
  }, [clearTimer, options.replaceSelection, options.selectedModel, schedulePersist]);

  return { handleSelectModel, handleSelectEffort };
}
