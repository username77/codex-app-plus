import { useEffect } from "react";
import type { ResolvedTheme } from "../domain/theme";
import type { AppPreferences } from "../features/settings/hooks/useAppPreferences";
import { getAppearanceThemeColors } from "../features/settings/model/appearanceColorScheme";
import { applyAppAppearanceVariables } from "../features/settings/model/appearanceCssVars";

type AppAppearancePreferences = Pick<
  AppPreferences,
  "appearanceColors" | "contrast"
>;

export function useAppAppearanceVariables(
  preferences: AppAppearancePreferences,
  resolvedTheme: ResolvedTheme,
): void {
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    applyAppAppearanceVariables(
      document.documentElement,
      {
        colors: getAppearanceThemeColors(
          preferences.appearanceColors,
          resolvedTheme,
        ),
        contrast: preferences.contrast,
      },
      resolvedTheme,
    );
  }, [preferences, resolvedTheme]);
}
