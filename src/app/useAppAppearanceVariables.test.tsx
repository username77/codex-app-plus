import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DEFAULT_APP_PREFERENCES } from "../features/settings/hooks/useAppPreferences";
import { useAppAppearanceVariables } from "./useAppAppearanceVariables";

describe("useAppAppearanceVariables", () => {
  it("writes appearance variables for the resolved theme to the document root", () => {
    renderHook(() =>
      useAppAppearanceVariables(
        {
          ...DEFAULT_APP_PREFERENCES,
          appearanceColors: {
            ...DEFAULT_APP_PREFERENCES.appearanceColors,
            dark: {
              accent: "#123456",
              background: "#0D0D0D",
              foreground: "#FFFFFF",
            },
          },
          contrast: 77,
        },
        "dark",
      ),
    );

    const rootStyle = document.documentElement.style;
    expect(rootStyle.getPropertyValue("--accent-color")).toBe("#123456");
    expect(rootStyle.getPropertyValue("--surface-panel")).toBe("#0D0D0D");
    expect(rootStyle.getPropertyValue("--bg-main")).toBe("#0D0D0D");
    expect(rootStyle.getPropertyValue("--text-main")).toBe("#FFFFFF");
  });
});
