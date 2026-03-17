import { useEffect, useState } from "react";
import { resolveThemeMode, type ResolvedTheme, type ThemeMode } from "../domain/theme";

const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)";

function readPrefersDark(): boolean {
  if (typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(COLOR_SCHEME_QUERY).matches;
}

function readThemeState(themeMode: ThemeMode): ResolvedTheme {
  return resolveThemeMode(themeMode, readPrefersDark());
}

export function applyResolvedTheme(theme: ResolvedTheme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function useResolvedTheme(themeMode: ThemeMode): ResolvedTheme {
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => readThemeState(themeMode));

  useEffect(() => {
    setResolvedTheme(readThemeState(themeMode));
    if (themeMode !== "system" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(COLOR_SCHEME_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setResolvedTheme(resolveThemeMode(themeMode, event.matches));
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [themeMode]);

  useEffect(() => {
    applyResolvedTheme(resolvedTheme);
  }, [resolvedTheme]);

  return resolvedTheme;
}
