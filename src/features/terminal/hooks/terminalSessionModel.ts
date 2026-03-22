import type { ResolvedTheme } from "../../../domain/theme";

const MAX_BUFFER_CHARS = 200_000;

export const EMPTY_MESSAGE = "Open a terminal to start a session.";
export const FAILURE_MESSAGE = "Failed to start terminal session.";
export const PREPARING_MESSAGE = "Preparing terminal...";
export const READY_MESSAGE = "Terminal ready.";
export const STARTING_MESSAGE = "Starting terminal session...";
export const TERMINAL_EVENT_SUBSCRIPTION_FAILURE = "Failed to subscribe terminal events.";

export function buildTabKey(rootKey: string, terminalId: string): string {
  return `${rootKey}:${terminalId}`;
}

export function parseTabKey(
  tabKey: string,
): { readonly rootKey: string; readonly terminalId: string } {
  const separatorIndex = tabKey.lastIndexOf(":");
  if (separatorIndex === -1) {
    return { rootKey: "", terminalId: tabKey };
  }
  return {
    rootKey: tabKey.slice(0, separatorIndex),
    terminalId: tabKey.slice(separatorIndex + 1),
  };
}

export function appendBuffer(existing: string | undefined, data: string): string {
  const nextValue = `${existing ?? ""}${data}`;
  if (nextValue.length <= MAX_BUFFER_CHARS) {
    return nextValue;
  }
  return nextValue.slice(nextValue.length - MAX_BUFFER_CHARS);
}

export function createTerminalAppearance(theme: ResolvedTheme) {
  if (theme === "dark") {
    return {
      background: "#181818",
      foreground: "#f3f3f3",
      cursor: "#f1f1f1",
      selectionBackground: "#3a3a3a",
    };
  }
  return {
    background: "#ffffff",
    foreground: "#24292f",
    cursor: "#1f1f1f",
    selectionBackground: "#dbeafe",
  };
}
