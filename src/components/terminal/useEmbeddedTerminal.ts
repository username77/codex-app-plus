import { useCallback, useEffect, useRef, useState } from "react";
import type { HostBridge } from "../../bridge/types";
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

export function useEmbeddedTerminal(options: UseEmbeddedTerminalOptions): EmbeddedTerminalController {
  const { cwd, cwdLabel, hostBridge, open } = options;
  const sessionIdRef = useRef<string | null>(null);
  const creatingRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shellLabel, setShellLabel] = useState("PowerShell");
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
  const openTerminal = useTerminalOpenAction({ creatingRef, cwd, hostBridge, mountedRef, open, reportError, sessionIdRef, setErrorMessage, setShellLabel, setStatus, syncTerminalSize, terminalRef });
  const scheduleTerminalLayout = useScheduledLayout({ focusTerminal, syncTerminalSize });

  useTerminalEvents({ hostBridge, reportError, sessionIdRef, setStatus, terminalRef });
  useResizeObserver({ containerRef, open, scheduleTerminalLayout });

  useEffect(() => {
    if (open) {
      scheduleTerminalLayout();
      void openTerminal();
    }
  }, [open, openTerminal, scheduleTerminalLayout]);

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
