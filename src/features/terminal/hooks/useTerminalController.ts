import { useCallback, useEffect, useState } from "react";
import type { EmbeddedTerminalShell, HostBridge } from "../../../bridge/types";
import type { ResolvedTheme } from "../../../domain/theme";
import { useTerminalSession } from "./useTerminalSession";
import { useTerminalTabs } from "./useTerminalTabs";

interface UseTerminalControllerOptions {
  readonly activeRootId: string | null;
  readonly activeRootPath: string | null;
  readonly hostBridge: HostBridge;
  readonly isOpen: boolean;
  readonly onClosePanel?: () => void;
  readonly resolvedTheme: ResolvedTheme;
  readonly shell: EmbeddedTerminalShell;
  readonly enforceUtf8: boolean;
}

export function useTerminalController(options: UseTerminalControllerOptions) {
  const {
    activeRootId,
    activeRootPath,
    hostBridge,
    isOpen,
    onClosePanel,
    resolvedTheme,
    shell,
    enforceUtf8,
  } = options;
  const [focusRequestVersion, setFocusRequestVersion] = useState(0);
  const requestTerminalFocus = useCallback(() => {
    setFocusRequestVersion((previous) => previous + 1);
  }, []);
  const {
    activeRootKey,
    activeTerminalId,
    closeTerminal,
    createTerminal,
    ensureTerminal,
    hasWorkspace,
    setActiveTerminal,
    terminals,
  } = useTerminalTabs({ activeRootId, activeRootPath });

  useEffect(() => {
    if (isOpen && hasWorkspace) {
      ensureTerminal(activeRootKey);
    }
  }, [activeRootKey, ensureTerminal, hasWorkspace, isOpen]);

  const terminalState = useTerminalSession({
    activeRootKey,
    activeRootPath,
    activeTerminalId,
    focusRequestVersion,
    hostBridge,
    isVisible: isOpen,
    shell,
    enforceUtf8,
    resolvedTheme,
    onSessionExit: (rootKey, terminalId) => {
      const shouldClosePanel = rootKey === activeRootKey && terminals.length === 1;
      closeTerminal(rootKey, terminalId);
      if (shouldClosePanel) {
        onClosePanel?.();
      }
    },
  });

  const onSelectTerminal = useCallback(
    (terminalId: string) => {
      if (!hasWorkspace) {
        return;
      }
      requestTerminalFocus();
      setActiveTerminal(activeRootKey, terminalId);
    },
    [activeRootKey, hasWorkspace, requestTerminalFocus, setActiveTerminal],
  );

  const onNewTerminal = useCallback(() => {
    if (!hasWorkspace) {
      return;
    }
    requestTerminalFocus();
    createTerminal(activeRootKey);
  }, [activeRootKey, createTerminal, hasWorkspace, requestTerminalFocus]);

  const onCloseTerminal = useCallback(
    (terminalId: string) => {
      const shouldClosePanel = terminals.length === 1 && terminals[0]?.id === terminalId;
      void terminalState
        .closeTerminalSession(`${activeRootKey}:${terminalId}`)
        .catch(() => undefined)
        .finally(() => {
          closeTerminal(activeRootKey, terminalId);
          if (shouldClosePanel) {
            onClosePanel?.();
          }
        });
    },
    [activeRootKey, closeTerminal, onClosePanel, terminalState, terminals],
  );

  return {
    activeTerminalId,
    hasWorkspace,
    onCloseTerminal,
    onNewTerminal,
    onSelectTerminal,
    requestTerminalFocus,
    terminalState,
    terminals,
  };
}
