import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { useCallback, useEffect, useRef } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { HostBridge } from "../../bridge/types";

const DEFAULT_COLUMNS = 120;
const DEFAULT_ROWS = 32;
export type TerminalStatus = "idle" | "starting" | "ready" | "exited" | "error";

interface UseMountedTerminalOptions {
  readonly hostBridge: HostBridge;
  readonly reportError: (title: string, error: unknown) => void;
  readonly sessionIdRef: MutableRefObject<string | null>;
}

interface UseTerminalEventOptions {
  readonly hostBridge: HostBridge;
  readonly reportError: (title: string, error: unknown) => void;
  readonly sessionIdRef: MutableRefObject<string | null>;
  readonly setStatus: Dispatch<SetStateAction<TerminalStatus>>;
  readonly terminalRef: MutableRefObject<Terminal | null>;
}

interface UseResizeObserverOptions {
  readonly containerRef: MutableRefObject<HTMLDivElement | null>;
  readonly open: boolean;
  readonly scheduleTerminalLayout: () => void;
}

interface UseTerminalSyncSizeOptions {
  readonly fitAddonRef: MutableRefObject<FitAddon | null>;
  readonly hostBridge: HostBridge;
  readonly open: boolean;
  readonly reportError: (title: string, error: unknown) => void;
  readonly sessionIdRef: MutableRefObject<string | null>;
  readonly terminalRef: MutableRefObject<Terminal | null>;
}

interface UseTerminalOpenActionOptions {
  readonly creatingRef: MutableRefObject<boolean>;
  readonly cwd: string | null;
  readonly hostBridge: HostBridge;
  readonly mountedRef: MutableRefObject<boolean>;
  readonly open: boolean;
  readonly reportError: (title: string, error: unknown) => void;
  readonly sessionIdRef: MutableRefObject<string | null>;
  readonly setErrorMessage: Dispatch<SetStateAction<string | null>>;
  readonly setShellLabel: Dispatch<SetStateAction<string>>;
  readonly setStatus: Dispatch<SetStateAction<TerminalStatus>>;
  readonly syncTerminalSize: () => Promise<void>;
  readonly terminalRef: MutableRefObject<Terminal | null>;
}

interface UseScheduledLayoutOptions {
  readonly focusTerminal: () => void;
  readonly syncTerminalSize: () => Promise<void>;
}

function createTerminalInstance(): { readonly terminal: Terminal; readonly fitAddon: FitAddon } {
  const terminal = new Terminal({
    allowTransparency: false,
    convertEol: true,
    cursorBlink: true,
    fontFamily: 'Consolas, "Cascadia Mono", "Courier New", monospace',
    fontSize: 13,
    scrollback: 5000,
    theme: { background: "#ffffff", foreground: "#1f1f1f", cursor: "#1f1f1f" }
  });
  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);
  return { fitAddon, terminal };
}

function readTerminalSize(terminal: Terminal): { readonly cols: number; readonly rows: number } {
  return {
    cols: Math.max(terminal.cols, DEFAULT_COLUMNS),
    rows: Math.max(terminal.rows, DEFAULT_ROWS)
  };
}

export function getStatusLabel(status: TerminalStatus): string {
  if (status === "starting") return "Starting";
  if (status === "ready") return "Running";
  if (status === "exited") return "Exited";
  if (status === "error") return "Error";
  return "Idle";
}

export function buildSubTitle(shellLabel: string, cwdLabel: string): string {
  if (cwdLabel.trim().length === 0) {
    return shellLabel;
  }
  return `${shellLabel} - ${cwdLabel}`;
}

export function useMountedTerminal(options: UseMountedTerminalOptions) {
  const { hostBridge, reportError, sessionIdRef } = options;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    const container = containerRef.current;
    if (container === null) {
      return undefined;
    }
    const { fitAddon, terminal } = createTerminalInstance();
    const disposable = terminal.onData((data) => {
      const sessionId = sessionIdRef.current;
      if (sessionId === null) {
        return;
      }
      void hostBridge.terminal.write({ data, sessionId }).catch((error) => reportError("failed to write terminal input", error));
    });
    terminal.open(container);
    fitAddonRef.current = fitAddon;
    terminalRef.current = terminal;

    return () => {
      mountedRef.current = false;
      disposable.dispose();
      terminal.dispose();
      fitAddonRef.current = null;
      terminalRef.current = null;
      const sessionId = sessionIdRef.current;
      sessionIdRef.current = null;
      if (sessionId !== null) {
        void hostBridge.terminal.closeSession({ sessionId });
      }
    };
  }, [hostBridge.terminal, reportError, sessionIdRef]);

  return { containerRef, fitAddonRef, mountedRef, terminalRef };
}

export function useTerminalEvents(options: UseTerminalEventOptions): void {
  const { hostBridge, reportError, sessionIdRef, setStatus, terminalRef } = options;

  useEffect(() => {
    let active = true;
    let unlistenOutput: (() => void) | null = null;
    let unlistenExit: (() => void) | null = null;

    async function subscribe(): Promise<void> {
      unlistenOutput = await hostBridge.subscribe("terminal-output", (payload) => {
        if (active && payload.sessionId === sessionIdRef.current) {
          terminalRef.current?.write(payload.data);
        }
      });
      unlistenExit = await hostBridge.subscribe("terminal-exit", (payload) => {
        if (!active || payload.sessionId !== sessionIdRef.current) {
          return;
        }
        sessionIdRef.current = null;
        setStatus("exited");
        const suffix = payload.exitCode == null ? "" : `, exit code ${payload.exitCode}`;
        terminalRef.current?.writeln(`\r\n\r\n[terminal exited${suffix}]`);
      });
    }

    void subscribe().catch((error) => reportError("failed to subscribe terminal events", error));
    return () => {
      active = false;
      unlistenOutput?.();
      unlistenExit?.();
    };
  }, [hostBridge, reportError, sessionIdRef, setStatus, terminalRef]);
}

export function useResizeObserver(options: UseResizeObserverOptions): void {
  const { containerRef, open, scheduleTerminalLayout } = options;

  useEffect(() => {
    const container = containerRef.current;
    if (container === null || typeof ResizeObserver === "undefined") {
      return undefined;
    }
    const observer = new ResizeObserver(() => {
      if (open) {
        scheduleTerminalLayout();
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, open, scheduleTerminalLayout]);
}

export function useTerminalSyncSize(options: UseTerminalSyncSizeOptions) {
  const { fitAddonRef, hostBridge, open, reportError, sessionIdRef, terminalRef } = options;

  return useCallback(async () => {
    const terminal = terminalRef.current;
    const fitAddon = fitAddonRef.current;
    const sessionId = sessionIdRef.current;
    if (!open || terminal === null || fitAddon === null) {
      return;
    }
    fitAddon.fit();
    if (sessionId === null) {
      return;
    }
    const { cols, rows } = readTerminalSize(terminal);
    try {
      await hostBridge.terminal.resize({ cols, rows, sessionId });
    } catch (error) {
      reportError("failed to sync terminal size", error);
    }
  }, [fitAddonRef, hostBridge.terminal, open, reportError, sessionIdRef, terminalRef]);
}

export function useTerminalOpenAction(options: UseTerminalOpenActionOptions) {
  const {
    creatingRef,
    cwd,
    hostBridge,
    mountedRef,
    open,
    reportError,
    sessionIdRef,
    setErrorMessage,
    setShellLabel,
    setStatus,
    syncTerminalSize,
    terminalRef
  } = options;

  return useCallback(async () => {
    if (!open || creatingRef.current || sessionIdRef.current !== null) {
      return;
    }
    creatingRef.current = true;
    setStatus("starting");
    setErrorMessage(null);
    try {
      const terminal = terminalRef.current;
      const size = terminal === null ? { cols: DEFAULT_COLUMNS, rows: DEFAULT_ROWS } : readTerminalSize(terminal);
      const result = await hostBridge.terminal.createSession({ cwd: cwd ?? undefined, cols: size.cols, rows: size.rows });
      if (!mountedRef.current) {
        await hostBridge.terminal.closeSession({ sessionId: result.sessionId });
        return;
      }
      sessionIdRef.current = result.sessionId;
      setShellLabel(result.shell);
      setStatus("ready");
      await syncTerminalSize();
    } catch (error) {
      reportError("failed to start terminal", error);
    } finally {
      creatingRef.current = false;
    }
  }, [creatingRef, cwd, hostBridge.terminal, mountedRef, open, reportError, sessionIdRef, setErrorMessage, setShellLabel, setStatus, syncTerminalSize, terminalRef]);
}

export function useScheduledLayout(options: UseScheduledLayoutOptions): () => void {
  const { focusTerminal, syncTerminalSize } = options;
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
    }
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      void syncTerminalSize();
      focusTerminal();
    });
  }, [focusTerminal, syncTerminalSize]);
}
