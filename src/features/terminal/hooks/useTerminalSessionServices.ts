import {
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import type { HostBridge } from "../../../bridge/types";
import type { ResolvedTheme } from "../../../domain/theme";
import { readTerminalFontSettingsFromDocument } from "../../settings/model/fontCssVars";
import type { TerminalStatus } from "../model/terminalRuntime";
import {
  appendBuffer,
  createTerminalAppearance,
  parseTabKey,
  TERMINAL_EVENT_SUBSCRIPTION_FAILURE,
} from "./terminalSessionModel";

interface UseTerminalEventSubscriptionsOptions {
  readonly activeTabKeyRef: MutableRefObject<string | null>;
  readonly cleanupTerminalTab: (tabKey: string) => void;
  readonly hostBridge: HostBridge;
  readonly onSessionExitRef: MutableRefObject<((rootKey: string, terminalId: string) => void) | undefined>;
  readonly orphanOutputBySessionIdRef: MutableRefObject<Map<string, string>>;
  readonly outputBuffersRef: MutableRefObject<Map<string, string>>;
  readonly setMessage: Dispatch<SetStateAction<string>>;
  readonly setStatus: Dispatch<SetStateAction<TerminalStatus>>;
  readonly tabKeyBySessionIdRef: MutableRefObject<Map<string, string>>;
  readonly terminalRef: MutableRefObject<Terminal | null>;
}

interface UseTerminalInstanceOptions {
  readonly activeTabKeyRef: MutableRefObject<string | null>;
  readonly containerElementRef: MutableRefObject<HTMLDivElement | null>;
  readonly containerVersion: number;
  readonly fitAddonRef: MutableRefObject<FitAddon | null>;
  readonly hostBridge: HostBridge;
  readonly inputDisposableRef: MutableRefObject<{ dispose: () => void } | null>;
  readonly isVisible: boolean;
  readonly renderedTabKeyRef: MutableRefObject<string | null>;
  readonly resolvedTheme: ResolvedTheme;
  readonly scheduleFit: (callback?: () => void) => void;
  readonly sessionIdByTabKeyRef: MutableRefObject<Map<string, string>>;
  readonly setContainerVersion: Dispatch<SetStateAction<number>>;
  readonly terminalRef: MutableRefObject<Terminal | null>;
}

export function useTerminalEventSubscriptions(
  options: UseTerminalEventSubscriptionsOptions,
): void {
  const {
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
  } = options;

  useEffect(() => {
    let disposed = false;
    let disposeOutput: (() => void) | null = null;
    let disposeExit: (() => void) | null = null;

    const handleOutput = (payload: { readonly sessionId: string; readonly data: string }) => {
      const tabKey = tabKeyBySessionIdRef.current.get(payload.sessionId);
      if (tabKey === undefined) {
        const orphanBuffer = appendBuffer(
          orphanOutputBySessionIdRef.current.get(payload.sessionId),
          payload.data,
        );
        orphanOutputBySessionIdRef.current.set(payload.sessionId, orphanBuffer);
        return;
      }

      const nextBuffer = appendBuffer(
        outputBuffersRef.current.get(tabKey),
        payload.data,
      );
      outputBuffersRef.current.set(tabKey, nextBuffer);
      if (activeTabKeyRef.current === tabKey) {
        terminalRef.current?.write(payload.data);
      }
    };

    const handleExit = (payload: { readonly sessionId: string }) => {
      const tabKey = tabKeyBySessionIdRef.current.get(payload.sessionId);
      if (tabKey === undefined) {
        orphanOutputBySessionIdRef.current.delete(payload.sessionId);
        return;
      }

      tabKeyBySessionIdRef.current.delete(payload.sessionId);
      orphanOutputBySessionIdRef.current.delete(payload.sessionId);
      cleanupTerminalTab(tabKey);
      const parsedTabKey = parseTabKey(tabKey);
      onSessionExitRef.current?.(parsedTabKey.rootKey, parsedTabKey.terminalId);
    };

    void Promise.all([
      hostBridge.subscribe("terminal-output", handleOutput),
      hostBridge.subscribe("terminal-exit", handleExit),
    ]).then(([nextDisposeOutput, nextDisposeExit]) => {
      if (disposed) {
        nextDisposeOutput();
        nextDisposeExit();
        return;
      }
      disposeOutput = nextDisposeOutput;
      disposeExit = nextDisposeExit;
    }).catch((error) => {
      console.error("terminal event subscription failed", error);
      if (disposed) {
        return;
      }
      setStatus("error");
      setMessage(TERMINAL_EVENT_SUBSCRIPTION_FAILURE);
    });

    return () => {
      disposed = true;
      disposeOutput?.();
      disposeExit?.();
    };
  }, [
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
  ]);
}

export function useTerminalInstance(options: UseTerminalInstanceOptions): void {
  const {
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
  } = options;

  useEffect(() => {
    if (!isVisible) {
      inputDisposableRef.current?.dispose();
      inputDisposableRef.current = null;
      terminalRef.current?.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      renderedTabKeyRef.current = null;
      return;
    }

    if (terminalRef.current !== null || containerElementRef.current === null) {
      return;
    }

    const terminalFonts = readTerminalFontSettingsFromDocument();
    const terminal = new Terminal({
      allowTransparency: false,
      cursorBlink: true,
      fontFamily: terminalFonts.fontFamily,
      fontSize: terminalFonts.fontSize,
      scrollback: 5000,
      theme: createTerminalAppearance(resolvedTheme),
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerElementRef.current);
    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;
    scheduleFit();
    setContainerVersion((previousValue) => previousValue + 1);
    inputDisposableRef.current = terminal.onData((data) => {
      const activeTabKey = activeTabKeyRef.current;
      if (activeTabKey === null) {
        return;
      }
      const sessionId = sessionIdByTabKeyRef.current.get(activeTabKey);
      if (sessionId === undefined) {
        return;
      }
      void hostBridge.terminal.write({ data, sessionId }).catch(() => {
        sessionIdByTabKeyRef.current.delete(activeTabKey);
      });
    });
  }, [
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
  ]);
}
