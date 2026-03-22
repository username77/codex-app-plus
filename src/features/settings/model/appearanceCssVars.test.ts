import { describe, expect, it } from "vitest";
import {
  DEFAULT_DARK_APPEARANCE_THEME_COLORS,
  DEFAULT_LIGHT_APPEARANCE_THEME_COLORS,
} from "./appearanceColorScheme";
import {
  applyAppAppearanceVariables,
  getAppAppearanceVariables,
} from "./appearanceCssVars";

describe("appearanceCssVars", () => {
  it("uses the exact selected dark background and foreground as main tokens", () => {
    const variables = getAppAppearanceVariables(
      {
        colors: {
          accent: "#123456",
          background: "#0D0D0D",
          foreground: "#FFFFFF",
        },
        contrast: 80,
      },
      "dark",
    );

    expect(variables["--accent-color"]).toBe("#123456");
    expect(variables["--bg-main"]).toBe("#0D0D0D");
    expect(variables["--surface-canvas"]).toBe("#0D0D0D");
    expect(variables["--surface-panel"]).toBe("#0D0D0D");
    expect(variables["--text-main"]).toBe("#FFFFFF");
    expect(variables["--surface-panel-muted"]).not.toBe("#0D0D0D");
  });

  it("uses the exact selected light background and foreground as main tokens", () => {
    const variables = getAppAppearanceVariables(
      {
        colors: {
          ...DEFAULT_LIGHT_APPEARANCE_THEME_COLORS,
          background: "#FFFFFF",
          foreground: "#0D0D0D",
        },
        contrast: 20,
      },
      "light",
    );

    expect(variables["--bg-main"]).toBe("#FFFFFF");
    expect(variables["--surface-canvas"]).toBe("#FFFFFF");
    expect(variables["--surface-panel"]).toBe("#FFFFFF");
    expect(variables["--text-main"]).toBe("#0D0D0D");
    expect(variables["--surface-panel-muted"]).not.toBe("#FFFFFF");
  });

  it("keeps main tokens stable across contrast changes", () => {
    const lowContrast = getAppAppearanceVariables(
      {
        colors: {
          ...DEFAULT_DARK_APPEARANCE_THEME_COLORS,
          background: "#0D0D0D",
          foreground: "#FFFFFF",
        },
        contrast: 0,
      },
      "dark",
    );
    const highContrast = getAppAppearanceVariables(
      {
        colors: {
          ...DEFAULT_DARK_APPEARANCE_THEME_COLORS,
          background: "#0D0D0D",
          foreground: "#FFFFFF",
        },
        contrast: 100,
      },
      "dark",
    );

    expect(lowContrast["--surface-panel"]).toBe("#0D0D0D");
    expect(highContrast["--surface-panel"]).toBe("#0D0D0D");
    expect(lowContrast["--text-main"]).toBe("#FFFFFF");
    expect(highContrast["--text-main"]).toBe("#FFFFFF");
    expect(lowContrast["--surface-panel-muted"]).not.toBe(
      highContrast["--surface-panel-muted"],
    );
  });

  it("applies the generated appearance variables to the root element", () => {
    applyAppAppearanceVariables(
      document.documentElement,
      {
        colors: {
          ...DEFAULT_DARK_APPEARANCE_THEME_COLORS,
          accent: "#2468AC",
          background: "#0D0D0D",
          foreground: "#FFFFFF",
        },
        contrast: 68,
      },
      "dark",
    );

    expect(document.documentElement.style.getPropertyValue("--accent-color")).toBe(
      "#2468AC",
    );
    expect(document.documentElement.style.getPropertyValue("--surface-panel")).toBe(
      "#0D0D0D",
    );
    expect(document.documentElement.style.getPropertyValue("--text-main")).toBe(
      "#FFFFFF",
    );
  });
});
