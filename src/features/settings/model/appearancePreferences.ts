const HEX_COLOR_PATTERN = /^#[\da-fA-F]{6}$/;
const FALLBACK_COLOR = "#000000";

export const ACCENT_COLOR_DEFAULT = "#0169CC";
export const BACKGROUND_COLOR_DEFAULT = "#111111";
export const FOREGROUND_COLOR_DEFAULT = "#FCFCFC";
export const APP_CONTRAST_MIN = 0;
export const APP_CONTRAST_MAX = 100;
export const APP_CONTRAST_DEFAULT = 53;

function normalizeFallbackColor(fallback: string): string {
  return HEX_COLOR_PATTERN.test(fallback) ? fallback.toUpperCase() : FALLBACK_COLOR;
}

export function normalizeAppearanceColor(
  value: unknown,
  fallback: string,
): string {
  if (typeof value !== "string") {
    return normalizeFallbackColor(fallback);
  }
  const normalized = value.trim().toUpperCase();
  return HEX_COLOR_PATTERN.test(normalized)
    ? normalized
    : normalizeFallbackColor(fallback);
}

export function clampContrast(value: number): number {
  if (!Number.isFinite(value)) {
    return APP_CONTRAST_DEFAULT;
  }
  const rounded = Math.round(value);
  return Math.min(Math.max(rounded, APP_CONTRAST_MIN), APP_CONTRAST_MAX);
}
