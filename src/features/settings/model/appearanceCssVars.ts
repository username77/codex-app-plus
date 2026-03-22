import type { ResolvedTheme } from "../../../domain/theme";
import type { AppearanceThemeColors } from "./appearanceColorScheme";
import { APP_CONTRAST_DEFAULT, clampContrast } from "./appearancePreferences";
import { clampUnit, mixHexColors, rgbaString } from "./appearanceColorUtils";

export interface AppAppearanceSettings {
  readonly colors: AppearanceThemeColors;
  readonly contrast: number;
}

interface ThemeBaseTokens {
  readonly overlaySource: string;
  readonly surfaceInverse: string;
  readonly textInverse: string;
}

const LIGHT_THEME_BASE: ThemeBaseTokens = {
  overlaySource: "#0F172A",
  surfaceInverse: "#0F172A",
  textInverse: "#F8FAFC",
};
const DARK_THEME_BASE: ThemeBaseTokens = {
  overlaySource: "#000000",
  surfaceInverse: "#F1F1F1",
  textInverse: "#171717",
};

function selectThemeBase(resolvedTheme: ResolvedTheme): ThemeBaseTokens {
  return resolvedTheme === "dark" ? DARK_THEME_BASE : LIGHT_THEME_BASE;
}

function createLayerScale(contrast: number): number {
  const normalized = clampUnit(
    clampContrast(contrast) / APP_CONTRAST_DEFAULT / 2,
  );
  return 0.5 + normalized;
}

function createSurfaceLayer(
  backgroundColor: string,
  resolvedTheme: ResolvedTheme,
  layerScale: number,
  weight: number,
): string {
  const layerTarget = resolvedTheme === "dark" ? "#FFFFFF" : "#000000";
  return mixHexColors(
    layerTarget,
    backgroundColor,
    clampUnit(weight * layerScale),
  );
}

function createBorderColor(
  backgroundColor: string,
  foregroundColor: string,
  layerScale: number,
  weight: number,
): string {
  return mixHexColors(
    foregroundColor,
    backgroundColor,
    clampUnit(weight * layerScale),
  );
}

function createTextAlpha(baseAlpha: number, layerScale: number): number {
  return clampUnit(baseAlpha - (layerScale - 1) * 0.12);
}

function createAccentVariables(
  accentColor: string,
  resolvedTheme: ResolvedTheme,
): Readonly<Record<string, string>> {
  const accentStrongBase = resolvedTheme === "dark" ? "#FFFFFF" : "#000000";
  const accentStrongWeight = resolvedTheme === "dark" ? 0.22 : 0.18;
  return {
    "--accent-color": accentColor,
    "--accent-soft": rgbaString(
      accentColor,
      resolvedTheme === "dark" ? 0.18 : 0.12,
    ),
    "--accent-strong": mixHexColors(
      accentStrongBase,
      accentColor,
      accentStrongWeight,
    ),
    "--focus-ring": rgbaString(
      accentColor,
      resolvedTheme === "dark" ? 0.32 : 0.24,
    ),
  };
}

function createSurfaceVariables(
  backgroundColor: string,
  foregroundColor: string,
  layerScale: number,
  resolvedTheme: ResolvedTheme,
): Readonly<Record<string, string>> {
  const mutedWeight = resolvedTheme === "dark" ? 0.04 : 0.02;
  const softWeight = resolvedTheme === "dark" ? 0.06 : 0.04;
  const hoverWeight = resolvedTheme === "dark" ? 0.08 : 0.06;
  const activeWeight = resolvedTheme === "dark" ? 0.12 : 0.1;
  return {
    "--bg-main": backgroundColor,
    "--border-light": createBorderColor(
      backgroundColor,
      foregroundColor,
      layerScale,
      resolvedTheme === "dark" ? 0.12 : 0.08,
    ),
    "--border-strong": createBorderColor(
      backgroundColor,
      foregroundColor,
      layerScale,
      resolvedTheme === "dark" ? 0.2 : 0.16,
    ),
    "--scrollbar-track": createSurfaceLayer(
      backgroundColor,
      resolvedTheme,
      layerScale,
      mutedWeight,
    ),
    "--surface-active": createSurfaceLayer(
      backgroundColor,
      resolvedTheme,
      layerScale,
      activeWeight,
    ),
    "--surface-canvas": backgroundColor,
    "--surface-hover": createSurfaceLayer(
      backgroundColor,
      resolvedTheme,
      layerScale,
      hoverWeight,
    ),
    "--surface-panel": backgroundColor,
    "--surface-panel-muted": createSurfaceLayer(
      backgroundColor,
      resolvedTheme,
      layerScale,
      mutedWeight,
    ),
    "--surface-panel-soft": createSurfaceLayer(
      backgroundColor,
      resolvedTheme,
      layerScale,
      softWeight,
    ),
    "--terminal-bg": backgroundColor,
    "--terminal-toolbar-bg": backgroundColor,
  };
}

function createTextVariables(
  foregroundColor: string,
  layerScale: number,
  base: ThemeBaseTokens,
  resolvedTheme: ResolvedTheme,
): Readonly<Record<string, string>> {
  const scrollbarAlpha = resolvedTheme === "dark" ? 0.28 : 0.16;
  const scrollbarHoverAlpha = resolvedTheme === "dark" ? 0.42 : 0.28;
  return {
    "--scrollbar-thumb": rgbaString(
      foregroundColor,
      createTextAlpha(scrollbarAlpha, layerScale),
    ),
    "--scrollbar-thumb-hover": rgbaString(
      foregroundColor,
      createTextAlpha(scrollbarHoverAlpha, layerScale),
    ),
    "--surface-inverse": base.surfaceInverse,
    "--surface-overlay": rgbaString(
      base.overlaySource,
      resolvedTheme === "dark" ? 0.56 : 0.36,
    ),
    "--surface-overlay-strong": rgbaString(
      base.overlaySource,
      resolvedTheme === "dark" ? 0.74 : 0.62,
    ),
    "--text-inverse": base.textInverse,
    "--text-main": foregroundColor,
    "--text-muted": rgbaString(
      foregroundColor,
      createTextAlpha(0.72, layerScale),
    ),
    "--text-soft": rgbaString(
      foregroundColor,
      createTextAlpha(0.84, layerScale),
    ),
    "--text-subtle": rgbaString(
      foregroundColor,
      createTextAlpha(0.58, layerScale),
    ),
  };
}

export function getAppAppearanceVariables(
  settings: AppAppearanceSettings,
  resolvedTheme: ResolvedTheme,
): Readonly<Record<string, string>> {
  const layerScale = createLayerScale(settings.contrast);
  const base = selectThemeBase(resolvedTheme);
  return {
    ...createAccentVariables(settings.colors.accent, resolvedTheme),
    ...createSurfaceVariables(
      settings.colors.background,
      settings.colors.foreground,
      layerScale,
      resolvedTheme,
    ),
    ...createTextVariables(
      settings.colors.foreground,
      layerScale,
      base,
      resolvedTheme,
    ),
  };
}

export function applyAppAppearanceVariables(
  root: HTMLElement,
  settings: AppAppearanceSettings,
  resolvedTheme: ResolvedTheme,
): void {
  const variables = getAppAppearanceVariables(settings, resolvedTheme);
  for (const [name, value] of Object.entries(variables)) {
    root.style.setProperty(name, value);
  }
}
