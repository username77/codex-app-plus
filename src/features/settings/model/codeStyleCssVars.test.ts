import { beforeEach, describe, expect, it } from "vitest";
import { getCodeStyleTheme } from "./codeStyleCatalog";
import {
  APP_CODE_STYLE_BORDER_VAR,
  APP_CODE_STYLE_COMMENT_VAR,
  APP_CODE_STYLE_DIFF_ADD_ACCENT_VAR,
  APP_CODE_STYLE_DIFF_DELETE_ACCENT_VAR,
  APP_CODE_STYLE_KEYWORD_VAR,
  APP_CODE_STYLE_NUMBER_VAR,
  APP_CODE_STYLE_STRING_VAR,
  APP_CODE_STYLE_TEXT_VAR,
  APP_CODE_STYLE_TITLE_VAR,
  APP_CODE_STYLE_SURFACE_VAR,
  applyCodeStyleVariables,
} from "./codeStyleCssVars";

describe("codeStyleCssVars", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-code-style");
    document.documentElement.style.removeProperty(APP_CODE_STYLE_BORDER_VAR);
    document.documentElement.style.removeProperty(APP_CODE_STYLE_COMMENT_VAR);
    document.documentElement.style.removeProperty(APP_CODE_STYLE_DIFF_ADD_ACCENT_VAR);
    document.documentElement.style.removeProperty(APP_CODE_STYLE_DIFF_DELETE_ACCENT_VAR);
    document.documentElement.style.removeProperty(APP_CODE_STYLE_KEYWORD_VAR);
    document.documentElement.style.removeProperty(APP_CODE_STYLE_SURFACE_VAR);
    document.documentElement.style.removeProperty(APP_CODE_STYLE_TEXT_VAR);
  });

  it("applies the selected code style to the document root in dark mode", () => {
    const theme = getCodeStyleTheme("Dracula");

    applyCodeStyleVariables(document.documentElement, "Dracula", "dark");

    expect(document.documentElement.dataset.codeStyle).toBe(theme.slug);
    expect(
      document.documentElement.style.getPropertyValue(APP_CODE_STYLE_SURFACE_VAR),
    ).toBe(theme.surface);
    expect(
      document.documentElement.style.getPropertyValue(APP_CODE_STYLE_COMMENT_VAR),
    ).toBe(theme.comment);
    expect(
      document.documentElement.style.getPropertyValue(APP_CODE_STYLE_KEYWORD_VAR),
    ).toBe(theme.keyword);
    expect(
      document.documentElement.style.getPropertyValue(APP_CODE_STYLE_DIFF_ADD_ACCENT_VAR),
    ).toBe("#22c55e");
    expect(
      document.documentElement.style.getPropertyValue(APP_CODE_STYLE_DIFF_DELETE_ACCENT_VAR),
    ).toBe("#ef4444");
  });

  it("uses a light code surface palette in light mode", () => {
    const theme = getCodeStyleTheme("Codex");

    applyCodeStyleVariables(document.documentElement, "Codex", "light");

    expect(
      document.documentElement.style.getPropertyValue(APP_CODE_STYLE_SURFACE_VAR),
    ).toBe("#f7f8fa");
    expect(
      document.documentElement.style.getPropertyValue(APP_CODE_STYLE_BORDER_VAR),
    ).toBe("#d8dee8");
    expect(
      document.documentElement.style.getPropertyValue(APP_CODE_STYLE_TEXT_VAR),
    ).toBe("#1f2328");
    expect(
      document.documentElement.style.getPropertyValue(APP_CODE_STYLE_COMMENT_VAR),
    ).toBe("#6e7781");
    expect(
      document.documentElement.style.getPropertyValue(APP_CODE_STYLE_KEYWORD_VAR),
    ).not.toBe(theme.keyword);
    expect(
      document.documentElement.style.getPropertyValue(APP_CODE_STYLE_STRING_VAR),
    ).not.toBe(theme.string);
    expect(
      document.documentElement.style.getPropertyValue(APP_CODE_STYLE_NUMBER_VAR),
    ).not.toBe(theme.number);
    expect(
      document.documentElement.style.getPropertyValue(APP_CODE_STYLE_TITLE_VAR),
    ).not.toBe(theme.title);
  });
});
