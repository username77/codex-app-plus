import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import type { HostBridge, WorkspacePersistenceState as PersistedWorkspaceState } from "../../../bridge/types";
import { inferWorkspaceNameFromPath, normalizeWorkspacePath, trimWorkspaceText } from "../model/workspacePath";
import {
  normalizeWorkspaceLaunchScriptConfig,
  type LaunchScriptEntry,
} from "../model/workspaceLaunchScripts";

const WORKSPACE_PERSISTENCE_VERSION = 1;
const EMPTY_ROOTS: ReadonlyArray<WorkspaceRoot> = [];
const EMPTY_MANAGED_WORKTREES: ReadonlyArray<ManagedWorktreeRecord> = [];

interface WorkspaceState {
  readonly roots: ReadonlyArray<WorkspaceRoot>;
  readonly managedWorktrees: ReadonlyArray<ManagedWorktreeRecord>;
  readonly selectedRootId: string | null;
}

export interface WorkspaceRoot {
  readonly id: string;
  readonly name: string;
  readonly path: string;
  readonly launchScript?: string | null;
  readonly launchScripts?: ReadonlyArray<LaunchScriptEntry> | null;
}

export interface ManagedWorktreeRecord {
  readonly path: string;
  readonly repoPath: string;
  readonly branch: string | null;
  readonly createdAt: string;
}

export interface AddWorkspaceRootInput {
  readonly name: string;
  readonly path: string;
}

export interface UpdateWorkspaceLaunchScriptsInput {
  readonly rootId: string;
  readonly launchScript: string | null;
  readonly launchScripts: ReadonlyArray<LaunchScriptEntry> | null;
}

export interface WorkspaceRootController {
  readonly roots: ReadonlyArray<WorkspaceRoot>;
  readonly managedWorktrees: ReadonlyArray<ManagedWorktreeRecord>;
  readonly selectedRoot: WorkspaceRoot | null;
  readonly selectedRootId: string | null;
  selectRoot: (rootId: string) => void;
  addRoot: (input: AddWorkspaceRootInput) => void;
  removeRoot: (rootId: string) => void;
  reorderRoots: (fromIndex: number, toIndex: number) => void;
  addManagedWorktree: (input: { readonly path: string; readonly repoPath: string; readonly branch: string | null }) => void;
  removeManagedWorktree: (path: string) => void;
  updateWorkspaceLaunchScripts: (input: UpdateWorkspaceLaunchScriptsInput) => void;
}

type WorkspacePersistenceBridge = Pick<HostBridge["app"], "readWorkspaceState" | "writeWorkspaceState">;

const EMPTY_WORKSPACE_STATE: WorkspaceState = {
  roots: EMPTY_ROOTS,
  managedWorktrees: EMPTY_MANAGED_WORKTREES,
  selectedRootId: null,
};

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

  return {
    id: record.id,
    name,
    path,
    ...normalizeWorkspaceLaunchScriptConfig(record),
  };
}

function parseStoredRootsValue(value: unknown): ReadonlyArray<WorkspaceRoot> {
  if (!Array.isArray(value)) {
    return EMPTY_ROOTS;
  }
  return value.map(normalizeStoredRoot).filter((root): root is WorkspaceRoot => root !== null);
}

function normalizeManagedWorktree(value: unknown): ManagedWorktreeRecord | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as { path?: unknown; repoPath?: unknown; branch?: unknown; createdAt?: unknown };
  const path = typeof record.path === "string" ? trimWorkspaceText(record.path) : "";
  const repoPath = typeof record.repoPath === "string" ? trimWorkspaceText(record.repoPath) : "";
  if (path.length === 0 || repoPath.length === 0) {
    return null;
  }
  return {
    path,
    repoPath,
    branch: typeof record.branch === "string" ? record.branch : null,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : new Date(0).toISOString(),
  };
}

function parseManagedWorktreesValue(value: unknown): ReadonlyArray<ManagedWorktreeRecord> {
  if (!Array.isArray(value)) {
    return EMPTY_MANAGED_WORKTREES;
  }
  return value.map(normalizeManagedWorktree).filter((item): item is ManagedWorktreeRecord => item !== null);
}

function parsePersistedWorkspaceState(value: unknown): WorkspaceState {
  if (typeof value !== "object" || value === null) {
    return EMPTY_WORKSPACE_STATE;
  }
  const record = value as {
    readonly roots?: unknown;
    readonly managedWorktrees?: unknown;
    readonly selectedRootId?: unknown;
  };
  return normalizeWorkspaceState({
    roots: parseStoredRootsValue(record.roots),
    managedWorktrees: parseManagedWorktreesValue(record.managedWorktrees),
    selectedRootId: typeof record.selectedRootId === "string" ? record.selectedRootId : null,
  });
}

function createPersistedWorkspaceState(state: WorkspaceState): PersistedWorkspaceState {
  return {
    version: WORKSPACE_PERSISTENCE_VERSION,
    roots: state.roots,
    managedWorktrees: state.managedWorktrees,
    selectedRootId: state.selectedRootId,
  };
}

function createWorkspaceStateSignature(state: WorkspaceState): string {
  return JSON.stringify(createPersistedWorkspaceState(state));
}

function rootKey(root: Pick<WorkspaceRoot, "name" | "path">): string {
  const pathKey = normalizeWorkspacePath(root.path);
  return pathKey.length > 0 ? pathKey : trimWorkspaceText(root.name).toLowerCase();
}

function mergeRoots(
  first: ReadonlyArray<WorkspaceRoot>,
  second: ReadonlyArray<WorkspaceRoot>
): ReadonlyArray<WorkspaceRoot> {
  const merged = new Map<string, WorkspaceRoot>();
  for (const root of [...first, ...second]) {
    const key = rootKey(root);
    if (!merged.has(key)) {
      merged.set(key, root);
    }
  }
  return [...merged.values()];
}

function mergeManagedWorktrees(
  first: ReadonlyArray<ManagedWorktreeRecord>,
  second: ReadonlyArray<ManagedWorktreeRecord>,
): ReadonlyArray<ManagedWorktreeRecord> {
  const merged = new Map<string, ManagedWorktreeRecord>();
  for (const item of [...first, ...second]) {
    const key = normalizeWorkspacePath(item.path);
    if (!merged.has(key)) {
      merged.set(key, item);
    }
  }
  return [...merged.values()];
}

function mergeWorkspaceState(
  current: WorkspaceState,
  loaded: WorkspaceState,
): WorkspaceState {
  return normalizeWorkspaceState({
    roots: mergeRoots(current.roots, loaded.roots),
    managedWorktrees: mergeManagedWorktrees(current.managedWorktrees, loaded.managedWorktrees),
    selectedRootId: current.selectedRootId ?? loaded.selectedRootId,
  });
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

  return {
    id: crypto.randomUUID(),
    name,
    path,
    launchScript: null,
    launchScripts: null,
  };
}

function removeRootByKey(roots: ReadonlyArray<WorkspaceRoot>, key: string): ReadonlyArray<WorkspaceRoot> {
  return roots.filter((root) => rootKey(root) !== key);
}

function normalizeWorkspaceState(state: WorkspaceState): WorkspaceState {
  if (state.selectedRootId !== null && state.roots.some((root) => root.id === state.selectedRootId)) {
    return state;
  }
  return {
    ...state,
    selectedRootId: state.roots[0]?.id ?? null,
  };
}

function clampIndex(index: number, max: number): number {
  if (max <= 0) {
    return 0;
  }
  if (index < 0) {
    return 0;
  }
  if (index > max) {
    return max;
  }
  return index;
}

function reorderRootsByIndex(
  roots: ReadonlyArray<WorkspaceRoot>,
  fromIndex: number,
  toIndex: number
): ReadonlyArray<WorkspaceRoot> {
  if (roots.length < 2) {
    return roots;
  }
  if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) {
    return roots;
  }
  if (fromIndex < 0 || fromIndex >= roots.length) {
    return roots;
  }

  const targetIndex = clampIndex(toIndex, roots.length - 1);
  if (targetIndex === fromIndex) {
    return roots;
  }

  const next = [...roots];
  const [moved] = next.splice(fromIndex, 1);
  if (moved === undefined) {
    return roots;
  }
  next.splice(targetIndex, 0, moved);
  return next;
}

function markDirtyBeforeLoad(loaded: boolean, dirtyBeforeLoadRef: MutableRefObject<boolean>): void {
  if (!loaded) {
    dirtyBeforeLoadRef.current = true;
  }
}

export function useWorkspaceRoots(appBridge: WorkspacePersistenceBridge): WorkspaceRootController {
  const [state, setState] = useState<WorkspaceState>(EMPTY_WORKSPACE_STATE);
  const [loaded, setLoaded] = useState(false);
  const dirtyBeforeLoadRef = useRef(false);
  const persistedSignatureRef = useRef<string | null>(null);
  const queuedSnapshotRef = useRef<PersistedWorkspaceState | null>(null);
  const queuedSignatureRef = useRef<string | null>(null);
  const saveInFlightRef = useRef(false);

  const flushQueuedSave = useCallback(() => {
    if (!loaded || saveInFlightRef.current) {
      return;
    }

    const nextSnapshot = queuedSnapshotRef.current;
    const nextSignature = queuedSignatureRef.current;
    if (nextSnapshot === null || nextSignature === null || nextSignature === persistedSignatureRef.current) {
      return;
    }

    saveInFlightRef.current = true;
    void appBridge.writeWorkspaceState(nextSnapshot)
      .then(() => {
        persistedSignatureRef.current = nextSignature;
      })
      .catch((error: unknown) => {
        console.error("保存工作区状态失败", error);
      })
      .finally(() => {
        saveInFlightRef.current = false;
        if (queuedSignatureRef.current !== persistedSignatureRef.current) {
          flushQueuedSave();
        }
      });
  }, [appBridge, loaded]);

  useEffect(() => {
    let cancelled = false;

    void appBridge.readWorkspaceState()
      .then((value) => {
        if (cancelled) {
          return;
        }
        const loadedState = value === null ? EMPTY_WORKSPACE_STATE : parsePersistedWorkspaceState(value);
        persistedSignatureRef.current = createWorkspaceStateSignature(loadedState);
        setState((current) => (
          dirtyBeforeLoadRef.current ? mergeWorkspaceState(current, loadedState) : loadedState
        ));
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          console.error("读取工作区状态失败", error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [appBridge]);

  useEffect(() => {
    if (!loaded) {
      return;
    }
    const nextSnapshot = createPersistedWorkspaceState(state);
    queuedSnapshotRef.current = nextSnapshot;
    queuedSignatureRef.current = JSON.stringify(nextSnapshot);
    flushQueuedSave();
  }, [flushQueuedSave, loaded, state]);

  const addRoot = useCallback(
    (input: AddWorkspaceRootInput) => {
      markDirtyBeforeLoad(loaded, dirtyBeforeLoadRef);
      const root = sanitizeInput(input);
      if (root === null) {
        return;
      }

      setState((current) => {
        const key = rootKey(root);
        const existingRoot = current.roots.find((item) => rootKey(item) === key);
        return normalizeWorkspaceState({
          ...current,
          roots: mergeRoots(current.roots, [root]),
          selectedRootId: existingRoot?.id ?? root.id,
        });
      });
    },
    [loaded],
  );

  const removeRoot = useCallback(
    (rootId: string) => {
      markDirtyBeforeLoad(loaded, dirtyBeforeLoadRef);
      setState((current) => {
        const root = current.roots.find((item) => item.id === rootId);
        if (root === undefined) {
          return current;
        }
        return normalizeWorkspaceState({
          ...current,
          roots: removeRootByKey(current.roots, rootKey(root)),
        });
      });
    },
    [loaded],
  );

  const updateWorkspaceLaunchScripts = useCallback(
    (input: UpdateWorkspaceLaunchScriptsInput) => {
      markDirtyBeforeLoad(loaded, dirtyBeforeLoadRef);
      setState((current) => normalizeWorkspaceState({
        ...current,
        roots: current.roots.map((root) => {
          if (root.id !== input.rootId) {
            return root;
          }
          return {
            ...root,
            launchScript: input.launchScript,
            launchScripts: input.launchScripts,
          };
        }),
      }));
    },
    [loaded],
  );

  const reorderRoots = useCallback((fromIndex: number, toIndex: number) => {
    markDirtyBeforeLoad(loaded, dirtyBeforeLoadRef);
    setState((current) => normalizeWorkspaceState({
      ...current,
      roots: reorderRootsByIndex(current.roots, fromIndex, toIndex),
    }));
  }, [loaded]);

  const addManagedWorktree = useCallback((input: { readonly path: string; readonly repoPath: string; readonly branch: string | null }) => {
    markDirtyBeforeLoad(loaded, dirtyBeforeLoadRef);
    const normalizedPath = trimWorkspaceText(input.path);
    const normalizedRepoPath = trimWorkspaceText(input.repoPath);
    if (normalizedPath.length === 0 || normalizedRepoPath.length === 0) {
      return;
    }
    setState((current) => normalizeWorkspaceState({
      ...current,
      managedWorktrees: (() => {
        const pathKey = normalizeWorkspacePath(normalizedPath);
        const remaining = current.managedWorktrees.filter((item) => normalizeWorkspacePath(item.path) !== pathKey);
        return [...remaining, {
          path: normalizedPath,
          repoPath: normalizedRepoPath,
          branch: input.branch,
          createdAt: new Date().toISOString(),
        }];
      })(),
    }));
  }, [loaded]);

  const removeManagedWorktree = useCallback((path: string) => {
    markDirtyBeforeLoad(loaded, dirtyBeforeLoadRef);
    const pathKey = normalizeWorkspacePath(path);
    setState((current) => normalizeWorkspaceState({
      ...current,
      managedWorktrees: current.managedWorktrees.filter((item) => normalizeWorkspacePath(item.path) !== pathKey),
    }));
  }, [loaded]);

  const selectRoot = useCallback((rootId: string) => {
    markDirtyBeforeLoad(loaded, dirtyBeforeLoadRef);
    setState((current) => normalizeWorkspaceState({
      ...current,
      selectedRootId: rootId,
    }));
  }, [loaded]);

  const selectedRoot = useMemo(
    () => state.roots.find((root) => root.id === state.selectedRootId) ?? null,
    [state.roots, state.selectedRootId],
  );

  return useMemo(
    () => ({
      roots: state.roots,
      managedWorktrees: state.managedWorktrees,
      selectedRoot,
      selectedRootId: state.selectedRootId,
      selectRoot,
      addRoot,
      removeRoot,
      reorderRoots,
      addManagedWorktree,
      removeManagedWorktree,
      updateWorkspaceLaunchScripts,
    }),
    [
      addManagedWorktree,
      addRoot,
      removeManagedWorktree,
      removeRoot,
      reorderRoots,
      selectRoot,
      selectedRoot,
      state.managedWorktrees,
      state.roots,
      state.selectedRootId,
      updateWorkspaceLaunchScripts,
    ],
  );
}
