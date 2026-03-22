import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  APP_PREFERENCES_STORAGE_KEY,
  DEFAULT_APP_PREFERENCES,
  useAppPreferences,
} from "./useAppPreferences";
import {
  DEFAULT_APPEARANCE_COLOR_SCHEME,
  DEFAULT_LIGHT_APPEARANCE_THEME_COLORS,
} from "../model/appearanceColorScheme";
import {
  APP_CONTRAST_DEFAULT,
  APP_CONTRAST_MAX,
} from "../model/appearancePreferences";

describe("useAppPreferences appearance colors", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("falls back invalid stored appearance colors to defaults", () => {
    window.localStorage.setItem(
      APP_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        ...DEFAULT_APP_PREFERENCES,
        contrast: 999,
        appearanceColors: {
          light: {
            accent: "blue",
            background: 42,
            foreground: "#XYZXYZ",
          },
          dark: "bad-value",
        },
      }),
    );

    const { result } = renderHook(() => useAppPreferences());

    expect(result.current.contrast).toBe(APP_CONTRAST_MAX);
    expect(result.current.appearanceColors).toEqual(DEFAULT_APPEARANCE_COLOR_SCHEME);
  });

  it("migrates legacy single appearance colors into both theme buckets", () => {
    window.localStorage.setItem(
      APP_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        agentEnvironment: DEFAULT_APP_PREFERENCES.agentEnvironment,
        workspaceOpener: DEFAULT_APP_PREFERENCES.workspaceOpener,
        embeddedTerminalShell: DEFAULT_APP_PREFERENCES.embeddedTerminalShell,
        embeddedTerminalUtf8: DEFAULT_APP_PREFERENCES.embeddedTerminalUtf8,
        themeMode: DEFAULT_APP_PREFERENCES.themeMode,
        uiLanguage: DEFAULT_APP_PREFERENCES.uiLanguage,
        threadDetailLevel: DEFAULT_APP_PREFERENCES.threadDetailLevel,
        followUpQueueMode: DEFAULT_APP_PREFERENCES.followUpQueueMode,
        composerEnterBehavior: DEFAULT_APP_PREFERENCES.composerEnterBehavior,
        composerPermissionLevel: DEFAULT_APP_PREFERENCES.composerPermissionLevel,
        composerDefaultApprovalPolicy: DEFAULT_APP_PREFERENCES.composerDefaultApprovalPolicy,
        composerDefaultSandboxMode: DEFAULT_APP_PREFERENCES.composerDefaultSandboxMode,
        composerFullApprovalPolicy: DEFAULT_APP_PREFERENCES.composerFullApprovalPolicy,
        composerFullSandboxMode: DEFAULT_APP_PREFERENCES.composerFullSandboxMode,
        uiFontFamily: DEFAULT_APP_PREFERENCES.uiFontFamily,
        uiFontSize: DEFAULT_APP_PREFERENCES.uiFontSize,
        codeFontFamily: DEFAULT_APP_PREFERENCES.codeFontFamily,
        codeFontSize: DEFAULT_APP_PREFERENCES.codeFontSize,
        gitBranchPrefix: DEFAULT_APP_PREFERENCES.gitBranchPrefix,
        gitPushForceWithLease: DEFAULT_APP_PREFERENCES.gitPushForceWithLease,
        contrast: DEFAULT_APP_PREFERENCES.contrast,
        codeStyle: DEFAULT_APP_PREFERENCES.codeStyle,
        accentColor: "#224466",
        backgroundColor: "#0A1B2C",
        foregroundColor: "#F8FAFC",
      }),
    );

    const { result } = renderHook(() => useAppPreferences());

    expect(result.current.appearanceColors.light).toEqual({
      accent: "#224466",
      background: "#0A1B2C",
      foreground: "#F8FAFC",
    });
    expect(result.current.appearanceColors.dark).toEqual({
      accent: "#224466",
      background: "#0A1B2C",
      foreground: "#F8FAFC",
    });
  });

  it("normalizes updated appearance preferences before storing them", () => {
    const { result } = renderHook(() => useAppPreferences());

    act(() => {
      result.current.setAppearanceThemeColors("light", {
        accent: "not-a-color",
        background: "#0a1b2c",
        foreground: "invalid",
      });
      result.current.setContrast(999);
    });

    expect(result.current.appearanceColors.light).toEqual({
      accent: DEFAULT_LIGHT_APPEARANCE_THEME_COLORS.accent,
      background: "#0A1B2C",
      foreground: DEFAULT_LIGHT_APPEARANCE_THEME_COLORS.foreground,
    });
    expect(result.current.contrast).toBe(APP_CONTRAST_MAX);
  });

  it("preserves the last valid accent color when the next update is invalid", () => {
    const { result } = renderHook(() => useAppPreferences());

    act(() => {
      result.current.setAppearanceThemeColors("dark", { accent: "#224466" });
      result.current.setAppearanceThemeColors("dark", { accent: "bad-value" });
    });

    expect(result.current.appearanceColors.dark.accent).toBe("#224466");
    expect(result.current.contrast).toBe(APP_CONTRAST_DEFAULT);
  });
});
