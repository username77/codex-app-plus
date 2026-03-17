import { describe, expect, it, vi } from "vitest";
import { readStoredThemeMode, resolveStoredTheme } from "./startupTheme";

describe("readStoredThemeMode", () => {
  it("returns the stored theme mode when it is valid", () => {
    expect(readStoredThemeMode(JSON.stringify({ themeMode: "dark" }))).toBe("dark");
  });

  it("falls back to system when the stored theme mode is invalid", () => {
    expect(readStoredThemeMode(JSON.stringify({ themeMode: "night" }))).toBe("system");
  });

  it("reports parse failures and falls back to system", () => {
    const reportError = vi.fn();

    expect(readStoredThemeMode("{", reportError)).toBe("system");
    expect(reportError).toHaveBeenCalledTimes(1);
  });
});

describe("resolveStoredTheme", () => {
  it("uses the explicit dark theme regardless of system preference", () => {
    expect(resolveStoredTheme(JSON.stringify({ themeMode: "dark" }), false)).toBe("dark");
  });

  it("uses the system preference when theme mode is system", () => {
    expect(resolveStoredTheme(JSON.stringify({ themeMode: "system" }), true)).toBe("dark");
  });
});
