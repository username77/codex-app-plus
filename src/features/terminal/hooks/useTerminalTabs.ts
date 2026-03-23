import { useCallback, useMemo, useState } from "react";

const EMPTY_ROOT_KEY = "__terminal-root-empty__";

export interface TerminalTab {
  readonly id: string;
  readonly title: string;
}

interface TerminalTabRecord extends TerminalTab {
  readonly autoNamed: boolean;
}

interface UseTerminalTabsOptions {
  readonly activeRootId: string | null;
  readonly activeRootPath: string | null;
}

interface EnsureTerminalOptions {
  readonly rootKey: string;
  readonly terminalId: string;
  readonly title: string;
}

function createTerminalId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `terminal-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getRootKey(rootId: string | null, rootPath: string | null): string {
  return rootId ?? rootPath ?? EMPTY_ROOT_KEY;
}

function renumberAutoNamedTabs(
  tabs: ReadonlyArray<TerminalTabRecord>,
): ReadonlyArray<TerminalTabRecord> {
  let autoNamedIndex = 1;
  let changed = false;
  const nextTabs = tabs.map((tab) => {
    if (!tab.autoNamed) {
      return tab;
    }
    const nextTitle = `Terminal ${autoNamedIndex}`;
    autoNamedIndex += 1;
    if (tab.title === nextTitle) {
      return tab;
    }
    changed = true;
    return { ...tab, title: nextTitle };
  });
  return changed ? nextTabs : tabs;
}

function ensureTerminalRecord(
  tabs: ReadonlyArray<TerminalTabRecord>,
  terminalId: string,
  title: string,
): ReadonlyArray<TerminalTabRecord> {
  const index = tabs.findIndex((tab) => tab.id === terminalId);
  if (index === -1) {
    return [...tabs, { id: terminalId, title, autoNamed: false }];
  }
  const current = tabs[index];
  if (current.title === title && current.autoNamed === false) {
    return tabs;
  }
  return tabs.map((tab) => (
    tab.id === terminalId ? { ...tab, title, autoNamed: false } : tab
  ));
}

export function useTerminalTabs(options: UseTerminalTabsOptions) {
  const { activeRootId, activeRootPath } = options;
  const [tabsByRoot, setTabsByRoot] = useState<Record<string, ReadonlyArray<TerminalTabRecord>>>(
    {},
  );
  const [activeTabIdByRoot, setActiveTabIdByRoot] = useState<Record<string, string | null>>({});
  const activeRootKey = useMemo(
    () => getRootKey(activeRootId, activeRootPath),
    [activeRootId, activeRootPath],
  );
  const hasWorkspace = activeRootPath !== null;

  const createTerminal = useCallback((rootKey: string) => {
    const id = createTerminalId();
    setTabsByRoot((previous) => {
      const existing = previous[rootKey] ?? [];
      const nextTabs = renumberAutoNamedTabs([
        ...existing,
        { id, title: "", autoNamed: true },
      ]);
      return { ...previous, [rootKey]: nextTabs };
    });
    setActiveTabIdByRoot((previous) => ({ ...previous, [rootKey]: id }));
    return id;
  }, []);

  const closeTerminal = useCallback((rootKey: string, terminalId: string) => {
    setTabsByRoot((previous) => {
      const existing = previous[rootKey] ?? [];
      const nextTabs = renumberAutoNamedTabs(existing.filter((tab) => tab.id !== terminalId));
      setActiveTabIdByRoot((previousActive) => {
        const activeId = previousActive[rootKey];
        if (activeId !== terminalId) {
          return previousActive;
        }
        if (nextTabs.length === 0) {
          const { [rootKey]: _removed, ...rest } = previousActive;
          return rest;
        }
        return { ...previousActive, [rootKey]: nextTabs[nextTabs.length - 1]?.id ?? null };
      });
      if (nextTabs.length === 0) {
        const { [rootKey]: _removed, ...rest } = previous;
        return rest;
      }
      return { ...previous, [rootKey]: nextTabs };
    });
  }, []);

  const setActiveTerminal = useCallback((rootKey: string, terminalId: string) => {
    setActiveTabIdByRoot((previous) => ({ ...previous, [rootKey]: terminalId }));
  }, []);

  const ensureTerminal = useCallback((options: EnsureTerminalOptions) => {
    setTabsByRoot((previous) => {
      const existing = previous[options.rootKey] ?? [];
      const nextTabs = ensureTerminalRecord(
        existing,
        options.terminalId,
        options.title,
      );
      return nextTabs === existing
        ? previous
        : { ...previous, [options.rootKey]: nextTabs };
    });
    setActiveTabIdByRoot((previous) => ({
      ...previous,
      [options.rootKey]: options.terminalId,
    }));
    return options.terminalId;
  }, []);

  const terminals = useMemo(() => {
    if (!hasWorkspace) {
      return [];
    }
    return (tabsByRoot[activeRootKey] ?? []).map(({ id, title }) => ({ id, title }));
  }, [activeRootKey, hasWorkspace, tabsByRoot]);

  const activeTerminalId = useMemo(() => {
    if (!hasWorkspace) {
      return null;
    }
    return activeTabIdByRoot[activeRootKey] ?? null;
  }, [activeRootKey, activeTabIdByRoot, hasWorkspace]);

  return {
    activeRootKey,
    activeTerminalId,
    closeTerminal,
    createTerminal,
    ensureTerminal,
    hasWorkspace,
    setActiveTerminal,
    terminals,
  };
}
