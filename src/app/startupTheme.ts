import { DEFAULT_THEME_MODE, isThemeMode, resolveThemeMode, type ResolvedTheme, type ThemeMode } from "../domain/theme";

type ThemeErrorReporter = (error: unknown) => void;

function readThemeModeRecord(value: unknown): ThemeMode {
  if (typeof value !== "object" || value === null) {
    return DEFAULT_THEME_MODE;
  }

  const themeMode = (value as Record<string, unknown>).themeMode;
  return isThemeMode(themeMode) ? themeMode : DEFAULT_THEME_MODE;
}

export function readStoredThemeMode(rawValue: string | null, reportError?: ThemeErrorReporter): ThemeMode {
  if (rawValue === null) {
    return DEFAULT_THEME_MODE;
  }

  try {
    return readThemeModeRecord(JSON.parse(rawValue) as unknown);
  } catch (error) {
    reportError?.(error);
    return DEFAULT_THEME_MODE;
  }
}

export function resolveStoredTheme(
  rawValue: string | null,
  prefersDark: boolean,
  reportError?: ThemeErrorReporter
): ResolvedTheme {
  const themeMode = readStoredThemeMode(rawValue, reportError);
  return resolveThemeMode(themeMode, prefersDark);
}

export function applyResolvedTheme(theme: ResolvedTheme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}
