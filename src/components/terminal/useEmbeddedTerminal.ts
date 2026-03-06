import { useCallback, useEffect, useRef, useState } from "react";
import type { EmbeddedTerminalShell, HostBridge } from "../../bridge/types";
import {
  buildSubTitle,
  getStatusLabel,
  type TerminalStatus,
  useMountedTerminal,
  useResizeObserver,
  useScheduledLayout,
  useTerminalEvents,
  useTerminalOpenAction,
  useTerminalSyncSize
} from "./terminalRuntime";

interface UseEmbeddedTerminalOptions {
  readonly cwd: string | null;
  readonly cwdLabel: string;
  readonly hostBridge: HostBridge;
  readonly open: boolean;
  readonly shell: EmbeddedTerminalShell;
}

export interface EmbeddedTerminalController {
  readonly className: string;
  readonly containerRef: React.MutableRefObject<HTMLDivElement | null>;
  readonly errorMessage: string | null;
  readonly focusTerminal: () => void;
  readonly openTerminal: () => Promise<void>;
  readonly shellLabel: string;
  readonly showRestartAction: boolean;
  readonly status: TerminalStatus;
  readonly statusLabel: string;
  readonly subtitle: string;
}

function getEmbeddedTerminalShellLabel(shell: EmbeddedTerminalShell): string {
  if (shell === "commandPrompt") {
    return "Command Prompt";
  }
  if (shell === "gitBash") {
    return "Git Bash";
  }
  return "PowerShell";
}

export function useEmbeddedTerminal(options: UseEmbeddedTerminalOptions): EmbeddedTerminalController {
  const { cwd, cwdLabel, hostBridge, open, shell } = options;
  const sessionKey = `${cwd ?? ""}::${shell}`;
  const sessionIdRef = useRef<string | null>(null);
  const creatingRef = useRef(false);
  const lastSessionKeyRef = useRef(sessionKey);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shellLabel, setShellLabel] = useState(() => getEmbeddedTerminalShellLabel(shell));
  const [status, setStatus] = useState<TerminalStatus>("idle");
  const reportError = useCallback((title: string, error: unknown) => {
    const message = `${title}: ${error instanceof Error ? error.message : String(error)}`;
    setStatus("error");
    setErrorMessage(message);
    terminalRef.current?.writeln(`\r\n${message}`);
  }, []);
  const { containerRef, fitAddonRef, mountedRef, terminalRef } = useMountedTerminal({ hostBridge, reportError, sessionIdRef });
  const focusTerminal = useCallback(() => {
    terminalRef.current?.focus();
  }, [terminalRef]);
  const syncTerminalSize = useTerminalSyncSize({ fitAddonRef, hostBridge, open, reportError, sessionIdRef, terminalRef });
  const openTerminal = useTerminalOpenAction({ creatingRef, cwd, hostBridge, mountedRef, open, reportError, sessionIdRef, setErrorMessage, setShellLabel, setStatus, shell, syncTerminalSize, terminalRef });
  const scheduleTerminalLayout = useScheduledLayout({ focusTerminal, syncTerminalSize });

  useTerminalEvents({ hostBridge, reportError, sessionIdRef, setStatus, terminalRef });
  useResizeObserver({ containerRef, open, scheduleTerminalLayout });

  useEffect(() => {
    if (lastSessionKeyRef.current === sessionKey) {
      return;
    }
    lastSessionKeyRef.current = sessionKey;
    setErrorMessage(null);
    setShellLabel(getEmbeddedTerminalShellLabel(shell));
    setStatus("idle");
    terminalRef.current?.reset();
    const sessionId = sessionIdRef.current;
    sessionIdRef.current = null;
    if (sessionId !== null) {
      void hostBridge.terminal.closeSession({ sessionId }).catch((error) => reportError("failed to close previous terminal session", error));
    }
  }, [hostBridge.terminal, reportError, sessionKey, shell, terminalRef]);

  useEffect(() => {
    if (open) {
      scheduleTerminalLayout();
      void openTerminal();
    }
  }, [open, openTerminal, scheduleTerminalLayout, sessionKey]);

  return {
    className: open ? "replica-terminal" : "replica-terminal replica-terminal-hidden",
    containerRef,
    errorMessage,
    focusTerminal,
    openTerminal,
    shellLabel,
    showRestartAction: status === "idle" || status === "exited" || status === "error",
    status,
    statusLabel: getStatusLabel(status),
    subtitle: buildSubTitle(shellLabel, cwdLabel)
  };
}
