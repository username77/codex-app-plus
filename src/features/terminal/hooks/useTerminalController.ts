import { useCallback, useState } from "react";
import type { EmbeddedTerminalShell, HostBridge } from "../../../bridge/types";
import type { ResolvedTheme } from "../../../domain/theme";
import { useTerminalSession } from "./useTerminalSession";
import { useTerminalTabs } from "./useTerminalTabs";
import type { TerminalTab } from "./useTerminalTabs";

interface UseTerminalControllerOptions {
  readonly activeRootId: string | null;
  readonly activeRootPath: string | null;
  readonly hostBridge: HostBridge;
  readonly isOpen: boolean;
  readonly onHidePanel?: () => void;
  readonly onShowPanel?: () => void;
  readonly resolvedTheme: ResolvedTheme;
  readonly shell: EmbeddedTerminalShell;
  readonly enforceUtf8: boolean;
}

function resolveTerminalToActivate(
  activeTerminalId: string | null,
  terminals: ReadonlyArray<TerminalTab>,
): string | null {
  if (activeTerminalId !== null) {
    return activeTerminalId;
  }
  return terminals[terminals.length - 1]?.id ?? null;
}

export function useTerminalController(options: UseTerminalControllerOptions) {
  const {
    activeRootId,
    activeRootPath,
    hostBridge,
    isOpen,
    onHidePanel,
    onShowPanel,
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
    hasWorkspace,
    setActiveTerminal,
    terminals,
  } = useTerminalTabs({ activeRootId, activeRootPath });

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
      const shouldHidePanel = rootKey === activeRootKey && terminals.length === 1;
      closeTerminal(rootKey, terminalId);
      if (shouldHidePanel) {
        onHidePanel?.();
      }
    },
  });

  const showPanel = useCallback(() => {
    const nextTerminalId = resolveTerminalToActivate(activeTerminalId, terminals);
    onShowPanel?.();
    if (!hasWorkspace) {
      return;
    }
    requestTerminalFocus();
    if (nextTerminalId !== null) {
      setActiveTerminal(activeRootKey, nextTerminalId);
      return;
    }
    if (!isOpen) {
      createTerminal(activeRootKey);
    }
  }, [
    activeRootKey,
    activeTerminalId,
    createTerminal,
    hasWorkspace,
    isOpen,
    onShowPanel,
    requestTerminalFocus,
    setActiveTerminal,
    terminals,
  ]);

  const hidePanel = useCallback(() => {
    onHidePanel?.();
  }, [onHidePanel]);

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
      const shouldHidePanel = terminals.length === 1 && terminals[0]?.id === terminalId;
      void terminalState
        .closeTerminalSession(`${activeRootKey}:${terminalId}`)
        .catch(() => undefined)
        .finally(() => {
          closeTerminal(activeRootKey, terminalId);
          if (shouldHidePanel) {
            onHidePanel?.();
          }
        });
    },
    [activeRootKey, closeTerminal, onHidePanel, terminalState, terminals],
  );

  return {
    activeTerminalId,
    hasWorkspace,
    hidePanel,
    onCloseTerminal,
    onNewTerminal,
    onSelectTerminal,
    requestTerminalFocus,
    showPanel,
    terminalState,
    terminals,
  };
}
