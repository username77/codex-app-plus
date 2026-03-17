import { useLayoutEffect } from "react";
import type { HostBridge } from "../bridge/types";
import type { ResolvedTheme } from "../domain/theme";

export function useWindowTheme(
  hostBridge: Pick<HostBridge, "app">,
  theme: ResolvedTheme
): void {
  useLayoutEffect(() => {
    void hostBridge.app.setWindowTheme(theme).catch((error: unknown) => {
      console.error("同步窗口主题失败", error);
    });
  }, [hostBridge, theme]);
}
