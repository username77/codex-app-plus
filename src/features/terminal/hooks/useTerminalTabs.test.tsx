import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTerminalTabs } from "./useTerminalTabs";

describe("useTerminalTabs", () => {
  it("creates and activates a terminal tab for the active root", () => {
    const { result } = renderHook(() =>
      useTerminalTabs({
        activeRootId: "root-1",
        activeRootPath: "E:/code/workspace-a",
      }),
    );

    let terminalId = "";
    act(() => {
      terminalId = result.current.createTerminal("root-1");
    });

    expect(terminalId).not.toBe("");
    expect(result.current.terminals).toEqual([{ id: terminalId, title: "Terminal 1" }]);
    expect(result.current.activeTerminalId).toBe(terminalId);
  });

  it("renumbers auto-named tabs after closing a tab", () => {
    const { result } = renderHook(() =>
      useTerminalTabs({
        activeRootId: "root-1",
        activeRootPath: "E:/code/workspace-a",
      }),
    );

    let firstTerminalId = "";
    act(() => {
      firstTerminalId = result.current.createTerminal("root-1");
      result.current.createTerminal("root-1");
    });

    act(() => {
      result.current.closeTerminal("root-1", firstTerminalId);
    });

    expect(result.current.terminals).toEqual([{ id: result.current.terminals[0]?.id ?? "", title: "Terminal 1" }]);
  });

  it("keeps tabs isolated between roots", () => {
    const { result, rerender } = renderHook(
      ({
        activeRootId,
        activeRootPath,
      }: {
        readonly activeRootId: string;
        readonly activeRootPath: string;
      }) =>
        useTerminalTabs({
          activeRootId,
          activeRootPath,
        }),
      {
        initialProps: {
          activeRootId: "root-1",
          activeRootPath: "E:/code/workspace-a",
        },
      },
    );

    act(() => {
      result.current.createTerminal("root-1");
    });

    rerender({
      activeRootId: "root-2",
      activeRootPath: "E:/code/workspace-b",
    });

    act(() => {
      result.current.createTerminal("root-2");
    });

    expect(result.current.terminals).toHaveLength(1);
    expect(result.current.activeRootKey).toBe("root-2");
  });
});
