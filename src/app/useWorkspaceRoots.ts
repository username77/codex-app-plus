import { useCallback, useEffect, useMemo, useState } from "react";
import type { ThreadSummary } from "../domain/types";
import { inferWorkspaceNameFromPath, normalizeWorkspacePath, trimWorkspaceText } from "./workspacePath";

const ROOTS_STORAGE_KEY = "codex-app-plus.workspace-roots";
const DISMISSED_ROOT_KEYS_STORAGE_KEY = "codex-app-plus.workspace-root-dismissed-keys";
const EMPTY_KEYS: ReadonlyArray<string> = [];
const EMPTY_ROOTS: ReadonlyArray<WorkspaceRoot> = [];

export interface WorkspaceRoot {
  readonly id: string;
  readonly name: string;
  readonly path: string;
}

export interface AddWorkspaceRootInput {
  readonly name: string;
  readonly path: string;
}

function normalizeStoredRoot(value: unknown): WorkspaceRoot | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as { id?: unknown; name?: unknown; path?: unknown };
  if (typeof record.id !== "string") {
    return null;
  }

  const rawPath = typeof record.path === "string" ? record.path : record.name;
  if (typeof rawPath !== "string") {
    return null;
  }

  const path = trimWorkspaceText(rawPath);
  if (path.length === 0) {
    return null;
  }

  const rawName = typeof record.name === "string" ? record.name : inferWorkspaceNameFromPath(path);
  const name = trimWorkspaceText(rawName);
  if (name.length === 0) {
    return null;
  }
  return { id: record.id, name, path };
}

function parseStoredRoots(raw: string | null): ReadonlyArray<WorkspaceRoot> {
  if (raw === null) {
    return EMPTY_ROOTS;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return EMPTY_ROOTS;
    }
    return parsed.map(normalizeStoredRoot).filter((root): root is WorkspaceRoot => root !== null);
  } catch {
    return EMPTY_ROOTS;
  }
}

function normalizeStoredKey(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = trimWorkspaceText(value).toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function parseStoredKeys(raw: string | null): ReadonlyArray<string> {
  if (raw === null) {
    return EMPTY_KEYS;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return EMPTY_KEYS;
    }
    return [...new Set(parsed.map(normalizeStoredKey).filter((key): key is string => key !== null))];
  } catch {
    return EMPTY_KEYS;
  }
}

function rootKey(root: Pick<WorkspaceRoot, "path" | "name">): string {
  const pathKey = normalizeWorkspacePath(root.path);
  return pathKey.length > 0 ? pathKey : trimWorkspaceText(root.name).toLowerCase();
}

function createRootFromThread(thread: ThreadSummary): WorkspaceRoot | null {
  const path = trimWorkspaceText(thread.cwd ?? "");
  if (path.length === 0) {
    return null;
  }

  const name = inferWorkspaceNameFromPath(path);
  return { id: `thread-${rootKey({ name, path })}`, name, path };
}

function mergeRoots(
  first: ReadonlyArray<WorkspaceRoot>,
  second: ReadonlyArray<WorkspaceRoot>
): ReadonlyArray<WorkspaceRoot> {
  const seen = new Set<string>();
  const merged: Array<WorkspaceRoot> = [];
  for (const root of [...first, ...second]) {
    const key = rootKey(root);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(root);
  }
  return merged;
}

function sanitizeInput(input: AddWorkspaceRootInput): WorkspaceRoot | null {
  const path = trimWorkspaceText(input.path);
  if (path.length === 0) {
    return null;
  }

  const explicitName = trimWorkspaceText(input.name);
  const name = explicitName.length > 0 ? explicitName : inferWorkspaceNameFromPath(path);
  if (name.length === 0) {
    return null;
  }
  return { id: crypto.randomUUID(), name, path };
}

function appendRootKey(keys: ReadonlyArray<string>, key: string): ReadonlyArray<string> {
  return keys.includes(key) ? keys : [...keys, key];
}

function removeStoredRootKey(keys: ReadonlyArray<string>, key: string): ReadonlyArray<string> {
  return keys.filter((item) => item !== key);
}

function removeRootByKey(roots: ReadonlyArray<WorkspaceRoot>, key: string): ReadonlyArray<WorkspaceRoot> {
  return roots.filter((root) => rootKey(root) !== key);
}

function filterVisibleRoots(
  roots: ReadonlyArray<WorkspaceRoot>,
  dismissedRootKeys: ReadonlyArray<string>
): ReadonlyArray<WorkspaceRoot> {
  if (dismissedRootKeys.length === 0) {
    return roots;
  }

  const dismissedSet = new Set(dismissedRootKeys);
  return roots.filter((root) => !dismissedSet.has(rootKey(root)));
}

export interface WorkspaceRootController {
  readonly roots: ReadonlyArray<WorkspaceRoot>;
  readonly selectedRootId: string | null;
  selectRoot: (rootId: string) => void;
  addRoot: (input: AddWorkspaceRootInput) => void;
  removeRoot: (rootId: string) => void;
}

export function useWorkspaceRoots(threads: ReadonlyArray<ThreadSummary>): WorkspaceRootController {
  const [manualRoots, setManualRoots] = useState<ReadonlyArray<WorkspaceRoot>>(() =>
    parseStoredRoots(window.localStorage.getItem(ROOTS_STORAGE_KEY))
  );
  const [dismissedRootKeys, setDismissedRootKeys] = useState<ReadonlyArray<string>>(() =>
    parseStoredKeys(window.localStorage.getItem(DISMISSED_ROOT_KEYS_STORAGE_KEY))
  );
  const [selectedRootId, setSelectedRootId] = useState<string | null>(null);

  const roots = useMemo(() => {
    const threadRoots = threads
      .map((thread) => createRootFromThread(thread))
      .filter((root): root is WorkspaceRoot => root !== null);
    return filterVisibleRoots(mergeRoots(manualRoots, threadRoots), dismissedRootKeys);
  }, [dismissedRootKeys, manualRoots, threads]);

  useEffect(() => {
    window.localStorage.setItem(ROOTS_STORAGE_KEY, JSON.stringify(manualRoots));
  }, [manualRoots]);

  useEffect(() => {
    window.localStorage.setItem(DISMISSED_ROOT_KEYS_STORAGE_KEY, JSON.stringify(dismissedRootKeys));
  }, [dismissedRootKeys]);

  useEffect(() => {
    if (selectedRootId !== null && roots.some((root) => root.id === selectedRootId)) {
      return;
    }
    setSelectedRootId(roots[0]?.id ?? null);
  }, [roots, selectedRootId]);

  const addRoot = useCallback(
    (input: AddWorkspaceRootInput) => {
      const root = sanitizeInput(input);
      if (root === null) {
        return;
      }
      const key = rootKey(root);
      const existingManualRoot = manualRoots.find((item) => rootKey(item) === key);
      setManualRoots((current) => mergeRoots(current, [root]));
      setDismissedRootKeys((current) => removeStoredRootKey(current, key));
      setSelectedRootId(existingManualRoot?.id ?? root.id);
    },
    [manualRoots]
  );

  const removeRoot = useCallback(
    (rootId: string) => {
      const root = roots.find((item) => item.id === rootId);
      if (root === undefined) {
        return;
      }
      const key = rootKey(root);
      setManualRoots((current) => removeRootByKey(current, key));
      setDismissedRootKeys((current) => appendRootKey(current, key));
    },
    [roots]
  );

  return useMemo(
    () => ({ roots, selectedRootId, selectRoot: setSelectedRootId, addRoot, removeRoot }),
    [addRoot, removeRoot, roots, selectedRootId]
  );
}
