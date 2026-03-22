import type { ResolvedTheme } from "../../../domain/theme";
import type { CodeStyleId, CodeStyleTheme } from "./codeStyleCatalog";
import { getCodeStyleTheme } from "./codeStyleCatalog";

export const APP_CODE_STYLE_SURFACE_VAR = "--app-code-style-surface";
export const APP_CODE_STYLE_SURFACE_ELEVATED_VAR =
  "--app-code-style-surface-elevated";
export const APP_CODE_STYLE_BORDER_VAR = "--app-code-style-border";
export const APP_CODE_STYLE_GUTTER_VAR = "--app-code-style-gutter";
export const APP_CODE_STYLE_GUTTER_BORDER_VAR = "--app-code-style-gutter-border";
export const APP_CODE_STYLE_LINE_NUMBER_VAR = "--app-code-style-line-number";
export const APP_CODE_STYLE_TEXT_VAR = "--app-code-style-text";
export const APP_CODE_STYLE_COMMENT_VAR = "--app-code-style-comment";
export const APP_CODE_STYLE_KEYWORD_VAR = "--app-code-style-keyword";
export const APP_CODE_STYLE_STRING_VAR = "--app-code-style-string";
export const APP_CODE_STYLE_NUMBER_VAR = "--app-code-style-number";
export const APP_CODE_STYLE_TITLE_VAR = "--app-code-style-title";
export const APP_CODE_STYLE_PUNCTUATION_VAR = "--app-code-style-punctuation";
export const APP_CODE_STYLE_DIFF_ADD_ACCENT_VAR =
  "--app-code-style-diff-add-accent";
export const APP_CODE_STYLE_DIFF_ADD_SURFACE_VAR =
  "--app-code-style-diff-add-surface";
export const APP_CODE_STYLE_DIFF_DELETE_ACCENT_VAR =
  "--app-code-style-diff-delete-accent";
export const APP_CODE_STYLE_DIFF_DELETE_SURFACE_VAR =
  "--app-code-style-diff-delete-surface";
const APP_CODE_BG_VAR = "--code-bg";
const APP_CODE_INLINE_BG_VAR = "--code-inline-bg";

export type CodeStyleCssVariables = Readonly<Record<string, string>>;

const DIFF_ADD_ACCENT = "#22c55e";
const DIFF_ADD_SURFACE = "rgba(34, 197, 94, 0.16)";
const DIFF_DELETE_ACCENT = "#ef4444";
const DIFF_DELETE_SURFACE = "rgba(239, 68, 68, 0.18)";
const LIGHT_CODE_SURFACE = "#f7f8fa";
const LIGHT_CODE_SURFACE_ELEVATED = "#f0f2f5";
const LIGHT_CODE_BORDER = "#d8dee8";
const LIGHT_CODE_GUTTER = "#eceff3";
const LIGHT_CODE_GUTTER_BORDER = "#dde3ea";
const LIGHT_CODE_LINE_NUMBER = "#7b8494";
const LIGHT_CODE_TEXT = "#1f2328";
const LIGHT_CODE_COMMENT = "#6e7781";
const LIGHT_CODE_PUNCTUATION = "#57606a";
const LIGHT_CODE_BG = "#f6f8fa";
const LIGHT_CODE_INLINE_BG = "#eef2f6";
const LIGHT_TOKEN_DARK_BASE = "#1f2328";
const DARK_CODE_BG_MIX = "color-mix(in srgb, var(--app-code-style-surface-elevated) 92%, black)";
const DARK_CODE_INLINE_BG_MIX = "color-mix(in srgb, var(--app-code-style-surface-elevated) 74%, var(--app-code-style-gutter))";

function parseHexColor(value: string): readonly [number, number, number] | null {
  const normalized = value.trim();
  if (!/^#[\da-fA-F]{6}$/.test(normalized)) {
    return null;
  }
  return [
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16),
  ];
}

function formatHexColor(value: number): string {
  return value.toString(16).padStart(2, "0");
}

function mixHexColors(
  foreground: string,
  background: string,
  foregroundWeight: number,
): string {
  const foregroundRgb = parseHexColor(foreground);
  const backgroundRgb = parseHexColor(background);
  if (foregroundRgb === null || backgroundRgb === null) {
    return foreground;
  }
  const weight = Math.min(Math.max(foregroundWeight, 0), 1);
  const channelValues = foregroundRgb.map((channel, index) =>
    Math.round(channel * weight + backgroundRgb[index]! * (1 - weight)),
  );
  return `#${channelValues.map(formatHexColor).join("")}`;
}

function resolveLightKeywordColor(theme: CodeStyleTheme): string {
  return mixHexColors(theme.keyword, LIGHT_TOKEN_DARK_BASE, 0.68);
}

function resolveLightNumberColor(theme: CodeStyleTheme): string {
  return mixHexColors(theme.number, LIGHT_TOKEN_DARK_BASE, 0.62);
}

function resolveLightStringColor(theme: CodeStyleTheme): string {
  return mixHexColors(theme.string, LIGHT_TOKEN_DARK_BASE, 0.62);
}

function resolveLightTitleColor(theme: CodeStyleTheme): string {
  return mixHexColors(theme.title, LIGHT_TOKEN_DARK_BASE, 0.7);
}

function createCodeStyleVariableMap(
  theme: CodeStyleTheme,
  resolvedTheme: ResolvedTheme,
): CodeStyleCssVariables {
  if (resolvedTheme === "light") {
    return {
      [APP_CODE_BG_VAR]: LIGHT_CODE_BG,
      [APP_CODE_INLINE_BG_VAR]: LIGHT_CODE_INLINE_BG,
      [APP_CODE_STYLE_BORDER_VAR]: LIGHT_CODE_BORDER,
      [APP_CODE_STYLE_COMMENT_VAR]: LIGHT_CODE_COMMENT,
      [APP_CODE_STYLE_DIFF_ADD_ACCENT_VAR]: DIFF_ADD_ACCENT,
      [APP_CODE_STYLE_DIFF_ADD_SURFACE_VAR]: DIFF_ADD_SURFACE,
      [APP_CODE_STYLE_DIFF_DELETE_ACCENT_VAR]: DIFF_DELETE_ACCENT,
      [APP_CODE_STYLE_DIFF_DELETE_SURFACE_VAR]: DIFF_DELETE_SURFACE,
      [APP_CODE_STYLE_GUTTER_BORDER_VAR]: LIGHT_CODE_GUTTER_BORDER,
      [APP_CODE_STYLE_GUTTER_VAR]: LIGHT_CODE_GUTTER,
      [APP_CODE_STYLE_KEYWORD_VAR]: resolveLightKeywordColor(theme),
      [APP_CODE_STYLE_LINE_NUMBER_VAR]: LIGHT_CODE_LINE_NUMBER,
      [APP_CODE_STYLE_NUMBER_VAR]: resolveLightNumberColor(theme),
      [APP_CODE_STYLE_PUNCTUATION_VAR]: LIGHT_CODE_PUNCTUATION,
      [APP_CODE_STYLE_STRING_VAR]: resolveLightStringColor(theme),
      [APP_CODE_STYLE_SURFACE_ELEVATED_VAR]: LIGHT_CODE_SURFACE_ELEVATED,
      [APP_CODE_STYLE_SURFACE_VAR]: LIGHT_CODE_SURFACE,
      [APP_CODE_STYLE_TEXT_VAR]: LIGHT_CODE_TEXT,
      [APP_CODE_STYLE_TITLE_VAR]: resolveLightTitleColor(theme),
    };
  }

  return {
    [APP_CODE_BG_VAR]: DARK_CODE_BG_MIX,
    [APP_CODE_INLINE_BG_VAR]: DARK_CODE_INLINE_BG_MIX,
    [APP_CODE_STYLE_BORDER_VAR]: theme.border,
    [APP_CODE_STYLE_COMMENT_VAR]: theme.comment,
    [APP_CODE_STYLE_DIFF_ADD_ACCENT_VAR]: DIFF_ADD_ACCENT,
    [APP_CODE_STYLE_DIFF_ADD_SURFACE_VAR]: DIFF_ADD_SURFACE,
    [APP_CODE_STYLE_DIFF_DELETE_ACCENT_VAR]: DIFF_DELETE_ACCENT,
    [APP_CODE_STYLE_DIFF_DELETE_SURFACE_VAR]: DIFF_DELETE_SURFACE,
    [APP_CODE_STYLE_GUTTER_BORDER_VAR]: theme.gutterBorder,
    [APP_CODE_STYLE_GUTTER_VAR]: theme.gutter,
    [APP_CODE_STYLE_KEYWORD_VAR]: theme.keyword,
    [APP_CODE_STYLE_LINE_NUMBER_VAR]: theme.lineNumber,
    [APP_CODE_STYLE_NUMBER_VAR]: theme.number,
    [APP_CODE_STYLE_PUNCTUATION_VAR]: theme.punctuation,
    [APP_CODE_STYLE_STRING_VAR]: theme.string,
    [APP_CODE_STYLE_SURFACE_ELEVATED_VAR]: theme.surfaceElevated,
    [APP_CODE_STYLE_SURFACE_VAR]: theme.surface,
    [APP_CODE_STYLE_TEXT_VAR]: theme.text,
    [APP_CODE_STYLE_TITLE_VAR]: theme.title,
  };
}

export function getCodeStyleVariables(
  codeStyle: CodeStyleId,
  resolvedTheme: ResolvedTheme,
): CodeStyleCssVariables {
  return createCodeStyleVariableMap(getCodeStyleTheme(codeStyle), resolvedTheme);
}

export function applyCodeStyleVariables(
  root: HTMLElement,
  codeStyle: CodeStyleId,
  resolvedTheme: ResolvedTheme,
): void {
  const theme = getCodeStyleTheme(codeStyle);
  const variables = createCodeStyleVariableMap(theme, resolvedTheme);

  root.dataset.codeStyle = theme.slug;
  for (const [variableName, variableValue] of Object.entries(variables)) {
    root.style.setProperty(variableName, variableValue);
  }
}
