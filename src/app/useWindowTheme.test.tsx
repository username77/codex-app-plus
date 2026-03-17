import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { HostBridge } from "../bridge/types";
import type { ResolvedTheme } from "../domain/theme";
import { useWindowTheme } from "./useWindowTheme";

function createHostBridge(setWindowTheme: ReturnType<typeof vi.fn>): HostBridge {
  return {
    app: {
      setWindowTheme
    }
  } as unknown as HostBridge;
}

describe("useWindowTheme", () => {
  it("同步当前解析后的主题到窗口", () => {
    const setWindowTheme = vi.fn().mockResolvedValue(undefined);
    const hostBridge = createHostBridge(setWindowTheme);
    const { rerender } = renderHook(
      ({ theme }: { theme: ResolvedTheme }) => useWindowTheme(hostBridge, theme),
      { initialProps: { theme: "light" } }
    );

    expect(setWindowTheme).toHaveBeenCalledWith("light");

    rerender({ theme: "dark" });

    expect(setWindowTheme).toHaveBeenLastCalledWith("dark");
  });

  it("窗口主题同步失败时输出显式错误", async () => {
    const error = new Error("boom");
    const setWindowTheme = vi.fn().mockRejectedValue(error);
    const hostBridge = createHostBridge(setWindowTheme);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    renderHook(() => useWindowTheme(hostBridge, "dark"));

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith("同步窗口主题失败", error);
    });

    consoleError.mockRestore();
  });
});
