import type { ResolvedTheme } from "../../../domain/theme";
import {
  ACCENT_COLOR_DEFAULT,
  BACKGROUND_COLOR_DEFAULT,
  FOREGROUND_COLOR_DEFAULT,
  normalizeAppearanceColor,
} from "./appearancePreferences";

export const APPEARANCE_THEMES = ["light", "dark"] as const;

export type AppearanceTheme = (typeof APPEARANCE_THEMES)[number];

export interface AppearanceThemeColors {
  readonly accent: string;
  readonly background: string;
  readonly foreground: string;
}

export interface AppearanceColorScheme {
  readonly light: AppearanceThemeColors;
  readonly dark: AppearanceThemeColors;
}

export const DEFAULT_LIGHT_APPEARANCE_THEME_COLORS: AppearanceThemeColors = {
  accent: ACCENT_COLOR_DEFAULT,
  background: "#FFFFFF",
  foreground: "#0F172A",
};

export const DEFAULT_DARK_APPEARANCE_THEME_COLORS: AppearanceThemeColors = {
  accent: ACCENT_COLOR_DEFAULT,
  background: BACKGROUND_COLOR_DEFAULT,
  foreground: FOREGROUND_COLOR_DEFAULT,
};

export const DEFAULT_APPEARANCE_COLOR_SCHEME: AppearanceColorScheme = {
  light: DEFAULT_LIGHT_APPEARANCE_THEME_COLORS,
  dark: DEFAULT_DARK_APPEARANCE_THEME_COLORS,
};

function normalizeAppearanceThemeColors(
  value: unknown,
  fallback: AppearanceThemeColors,
): AppearanceThemeColors {
  if (typeof value !== "object" || value === null) {
    return fallback;
  }
  const record = value as Record<string, unknown>;
  return {
    accent: normalizeAppearanceColor(record.accent, fallback.accent),
    background: normalizeAppearanceColor(record.background, fallback.background),
    foreground: normalizeAppearanceColor(record.foreground, fallback.foreground),
  };
}

function createLegacyAppearanceColorScheme(
  record: Record<string, unknown>,
): AppearanceColorScheme {
  return {
    light: {
      accent: normalizeAppearanceColor(
        record.accentColor,
        DEFAULT_LIGHT_APPEARANCE_THEME_COLORS.accent,
      ),
      background: normalizeAppearanceColor(
        record.backgroundColor,
        DEFAULT_LIGHT_APPEARANCE_THEME_COLORS.background,
      ),
      foreground: normalizeAppearanceColor(
        record.foregroundColor,
        DEFAULT_LIGHT_APPEARANCE_THEME_COLORS.foreground,
      ),
    },
    dark: {
      accent: normalizeAppearanceColor(
        record.accentColor,
        DEFAULT_DARK_APPEARANCE_THEME_COLORS.accent,
      ),
      background: normalizeAppearanceColor(
        record.backgroundColor,
        DEFAULT_DARK_APPEARANCE_THEME_COLORS.background,
      ),
      foreground: normalizeAppearanceColor(
        record.foregroundColor,
        DEFAULT_DARK_APPEARANCE_THEME_COLORS.foreground,
      ),
    },
  };
}

export function readStoredAppearanceColorScheme(
  record: Record<string, unknown>,
): AppearanceColorScheme {
  const fallback = createLegacyAppearanceColorScheme(record);
  if (typeof record.appearanceColors !== "object" || record.appearanceColors === null) {
    return fallback;
  }
  const value = record.appearanceColors as Record<string, unknown>;
  return {
    light: normalizeAppearanceThemeColors(value.light, fallback.light),
    dark: normalizeAppearanceThemeColors(value.dark, fallback.dark),
  };
}

export function updateAppearanceColorScheme(
  current: AppearanceColorScheme,
  theme: AppearanceTheme,
  colors: Partial<AppearanceThemeColors>,
): AppearanceColorScheme {
  const currentThemeColors = current[theme];
  const nextThemeColors = normalizeAppearanceThemeColors(
    { ...currentThemeColors, ...colors },
    currentThemeColors,
  );
  return { ...current, [theme]: nextThemeColors };
}

export function getAppearanceThemeColors(
  scheme: AppearanceColorScheme,
  theme: AppearanceTheme | ResolvedTheme,
): AppearanceThemeColors {
  return scheme[theme];
}
