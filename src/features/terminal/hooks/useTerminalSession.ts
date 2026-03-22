import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import type { EmbeddedTerminalShell, HostBridge } from "../../../bridge/types";
import type { ResolvedTheme } from "../../../domain/theme";
import type { TerminalStatus } from "../model/terminalRuntime";
import {
  buildTabKey,
  EMPTY_MESSAGE,
  FAILURE_MESSAGE,
  PREPARING_MESSAGE,
  READY_MESSAGE,
  STARTING_MESSAGE,
} from "./terminalSessionModel";
import {
  useTerminalEventSubscriptions,
  useTerminalInstance,
} from "./useTerminalSessionServices";

interface UseTerminalSessionOptions {
  readonly activeRootKey: string;
  readonly activeRootPath: string | null;
  readonly activeTerminalId: string | null;
  readonly focusRequestVersion: number;
  readonly hostBridge: HostBridge;
  readonly isVisible: boolean;
  readonly shell: EmbeddedTerminalShell;
  readonly enforceUtf8: boolean;
  readonly resolvedTheme: ResolvedTheme;
  readonly onSessionExit?: (rootKey: string, terminalId: string) => void;
}

export interface TerminalSessionState {
  readonly containerRef: RefCallback<HTMLDivElement>;
  readonly focusTerminal: () => void;
  readonly message: string;
  readonly restartSession: () => Promise<void>;
  readonly status: TerminalStatus;
  readonly closeTerminalSession: (tabKey: string) => Promise<void>;
}

export function useTerminalSession(options: UseTerminalSessionOptions): TerminalSessionState {
  const {
    activeRootKey,
    activeRootPath,
    activeTerminalId,
    focusRequestVersion,
    hostBridge,
    isVisible,
    shell,
    enforceUtf8,
    resolvedTheme,
    onSessionExit,
  } = options;
  const containerElementRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const inputDisposableRef = useRef<{ dispose: () => void } | null>(null);
  const outputBuffersRef = useRef<Map<string, string>>(new Map());
  const pendingSessionTabKeysRef = useRef<Set<string>>(new Set());
  const sessionIdByTabKeyRef = useRef<Map<string, string>>(new Map());
  const tabKeyBySessionIdRef = useRef<Map<string, string>>(new Map());
  const orphanOutputBySessionIdRef = useRef<Map<string, string>>(new Map());
  const onSessionExitRef = useRef(onSessionExit);
  const activeTabKeyRef = useRef<string | null>(null);
  const renderedTabKeyRef = useRef<string | null>(null);
  const pendingFocusRef = useRef(false);
  const fitFrameRef = useRef<number | null>(null);
  const [status, setStatus] = useState<TerminalStatus>("idle");
  const [message, setMessage] = useState(EMPTY_MESSAGE);
  const [sessionResetVersion, setSessionResetVersion] = useState(0);
  const [containerVersion, setContainerVersion] = useState(0);

  const activeTabKey = useMemo(() => {
    if (activeTerminalId === null) {
      return null;
    }
    return buildTabKey(activeRootKey, activeTerminalId);
  }, [activeRootKey, activeTerminalId]);

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    containerElementRef.current = node;
    setContainerVersion((previous) => previous + 1);
  }, []);

  const focusTerminal = useCallback(() => {
    terminalRef.current?.focus();
  }, []);

  const focusTerminalIfRequested = useCallback(() => {
    if (!pendingFocusRef.current) {
      return;
    }
    pendingFocusRef.current = false;
    focusTerminal();
  }, [focusTerminal]);

  const refreshTerminal = useCallback(() => {
    const terminal = terminalRef.current;
    if (terminal === null) {
      return;
    }
    terminal.refresh(0, Math.max(0, terminal.rows - 1));
    focusTerminalIfRequested();
  }, [focusTerminalIfRequested]);

  const syncActiveBuffer = useCallback(
    (tabKey: string) => {
      const terminal = terminalRef.current;
      if (terminal === null) {
        return;
      }
      terminal.reset();
      const buffered = outputBuffersRef.current.get(tabKey);
      if (buffered) {
        terminal.write(buffered);
      }
      refreshTerminal();
    },
    [refreshTerminal],
  );

  const scheduleFit = useCallback((callback?: () => void) => {
    if (fitFrameRef.current !== null) {
      window.cancelAnimationFrame(fitFrameRef.current);
    }
    fitFrameRef.current = window.requestAnimationFrame(() => {
      fitFrameRef.current = null;
      fitAddonRef.current?.fit();
      callback?.();
    });
  }, []);

  const syncTerminalSize = useCallback((sessionId: string) => {
    const terminal = terminalRef.current;
    if (terminal === null) {
      return;
    }
    void hostBridge.terminal.resize({
      cols: terminal.cols,
      rows: terminal.rows,
      sessionId,
    }).catch(() => undefined);
  }, [hostBridge]);

  const scheduleSessionLayout = useCallback((sessionId: string) => {
    scheduleFit(() => {
      refreshTerminal();
      syncTerminalSize(sessionId);
    });
  }, [refreshTerminal, scheduleFit, syncTerminalSize]);

  const cleanupTerminalTab = useCallback(
    (tabKey: string) => {
      const sessionId = sessionIdByTabKeyRef.current.get(tabKey);
      outputBuffersRef.current.delete(tabKey);
      pendingSessionTabKeysRef.current.delete(tabKey);
      sessionIdByTabKeyRef.current.delete(tabKey);
      if (renderedTabKeyRef.current === tabKey) {
        renderedTabKeyRef.current = null;
      }
      if (sessionId) {
        tabKeyBySessionIdRef.current.delete(sessionId);
        orphanOutputBySessionIdRef.current.delete(sessionId);
      }
      setSessionResetVersion((previous) => previous + 1);
      if (activeTabKeyRef.current === tabKey) {
        terminalRef.current?.reset();
        setStatus("idle");
        setMessage(EMPTY_MESSAGE);
      }
    },
    [],
  );

  const closeTerminalSession = useCallback(
    async (tabKey: string) => {
      const sessionId = sessionIdByTabKeyRef.current.get(tabKey);
      cleanupTerminalTab(tabKey);
      if (sessionId !== undefined) {
        await hostBridge.terminal.closeSession({ sessionId });
      }
    },
    [cleanupTerminalTab, hostBridge],
  );

  const restartSession = useCallback(async () => {
    if (activeTabKey === null) {
      return;
    }
    const sessionId = sessionIdByTabKeyRef.current.get(activeTabKey);
    cleanupTerminalTab(activeTabKey);
    if (sessionId !== undefined) {
      await hostBridge.terminal.closeSession({ sessionId });
    }
  }, [activeTabKey, cleanupTerminalTab, hostBridge]);

  useEffect(() => {
    activeTabKeyRef.current = activeTabKey;
  }, [activeTabKey]);

  useEffect(() => {
    onSessionExitRef.current = onSessionExit;
  }, [onSessionExit]);

  useTerminalEventSubscriptions({
    activeTabKeyRef,
    cleanupTerminalTab,
    hostBridge,
    onSessionExitRef,
    orphanOutputBySessionIdRef,
    outputBuffersRef,
    setMessage,
    setStatus,
    tabKeyBySessionIdRef,
    terminalRef,
  });

  useTerminalInstance({
    activeTabKeyRef,
    containerElementRef,
    containerVersion,
    fitAddonRef,
    hostBridge,
    inputDisposableRef,
    isVisible,
    renderedTabKeyRef,
    resolvedTheme,
    scheduleFit,
    sessionIdByTabKeyRef,
    setContainerVersion,
    terminalRef,
  });

  useEffect(() => {
    return () => {
      if (fitFrameRef.current !== null) {
        window.cancelAnimationFrame(fitFrameRef.current);
      }
      inputDisposableRef.current?.dispose();
      terminalRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!isVisible) {
      setMessage(EMPTY_MESSAGE);
      return;
    }
    if (activeRootPath === null || activeTerminalId === null) {
      setStatus("idle");
      setMessage(EMPTY_MESSAGE);
      return;
    }
    if (terminalRef.current === null || fitAddonRef.current === null) {
      setStatus("idle");
      setMessage(PREPARING_MESSAGE);
      return;
    }
    const tabKey = buildTabKey(activeRootKey, activeTerminalId);
    const existingSessionId = sessionIdByTabKeyRef.current.get(tabKey);
    if (existingSessionId !== undefined) {
      setStatus("ready");
      setMessage(READY_MESSAGE);
      if (renderedTabKeyRef.current !== tabKey) {
        syncActiveBuffer(tabKey);
        renderedTabKeyRef.current = tabKey;
      }
      scheduleSessionLayout(existingSessionId);
      return;
    }
    if (pendingSessionTabKeysRef.current.has(tabKey)) {
      setStatus("starting");
      setMessage(STARTING_MESSAGE);
      return;
    }

    const openSession = async () => {
      pendingSessionTabKeysRef.current.add(tabKey);
      setStatus("starting");
      setMessage(STARTING_MESSAGE);
      const terminal = terminalRef.current;
      if (terminal === null) {
        return;
      }
      scheduleFit();
      const result = await hostBridge.terminal.createSession({
        cwd: activeRootPath,
        cols: terminal.cols,
        rows: terminal.rows,
        shell,
        enforceUtf8,
      });
      if (!pendingSessionTabKeysRef.current.has(tabKey)) {
        await hostBridge.terminal.closeSession({ sessionId: result.sessionId });
        return;
      }
      sessionIdByTabKeyRef.current.set(tabKey, result.sessionId);
      tabKeyBySessionIdRef.current.set(result.sessionId, tabKey);
      const orphan = orphanOutputBySessionIdRef.current.get(result.sessionId);
      if (orphan) {
        outputBuffersRef.current.set(tabKey, orphan);
        orphanOutputBySessionIdRef.current.delete(result.sessionId);
      }
      setStatus("ready");
      setMessage(READY_MESSAGE);
      syncActiveBuffer(tabKey);
      renderedTabKeyRef.current = tabKey;
      scheduleSessionLayout(result.sessionId);
    };

    void openSession().catch(() => {
      setStatus("error");
      setMessage(FAILURE_MESSAGE);
    }).finally(() => {
      pendingSessionTabKeysRef.current.delete(tabKey);
    });
  }, [
    activeRootKey,
    activeRootPath,
    activeTerminalId,
    enforceUtf8,
    hostBridge,
    isVisible,
    refreshTerminal,
    sessionResetVersion,
    shell,
    syncActiveBuffer,
    containerVersion,
    scheduleSessionLayout,
    scheduleFit,
  ]);

  useEffect(() => {
    if (!isVisible || focusRequestVersion === 0) {
      return;
    }
    pendingFocusRef.current = true;
    focusTerminalIfRequested();
  }, [focusRequestVersion, focusTerminalIfRequested, isVisible]);

  useEffect(() => {
    if (!isVisible || activeTabKey === null || fitAddonRef.current === null) {
      return;
    }
    scheduleFit(refreshTerminal);
  }, [activeTabKey, isVisible, refreshTerminal, scheduleFit]);

  useEffect(() => {
    if (!isVisible || activeTabKey === null || activeTerminalId === null || activeRootPath === null) {
      return;
    }
    const fitAddon = fitAddonRef.current;
    const terminal = terminalRef.current;
    if (fitAddon === null || terminal === null || containerElementRef.current === null) {
      return;
    }
    const resize = () => {
      fitAddon.fit();
      const sessionId = sessionIdByTabKeyRef.current.get(activeTabKey);
      if (sessionId === undefined) {
        return;
      }
      void hostBridge.terminal.resize({
        cols: terminal.cols,
        rows: terminal.rows,
        sessionId,
      });
    };
    const observer = new ResizeObserver(() => resize());
    observer.observe(containerElementRef.current);
    scheduleFit(resize);
    return () => observer.disconnect();
  }, [activeRootPath, activeTabKey, activeTerminalId, hostBridge, isVisible, scheduleFit]);

  return {
    closeTerminalSession,
    containerRef,
    focusTerminal,
    message,
    restartSession,
    status,
  };
}
