import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyResolvedTheme, useResolvedTheme } from "./useResolvedTheme";

function installMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: "(prefers-color-scheme: dark)",
      addEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.add(listener);
      },
      removeEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.delete(listener);
      }
    }))
  });

  return {
    setMatches(nextMatches: boolean) {
      matches = nextMatches;
      const event = { matches: nextMatches } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    }
  };
}

describe("useResolvedTheme", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "";
  });

  afterEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: originalMatchMedia
    });
  });

  it("resolves dark when the user selects dark", () => {
    installMatchMedia(false);

    const { result } = renderHook(() => useResolvedTheme("dark"));

    expect(result.current).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("follows system color scheme changes in system mode", () => {
    const media = installMatchMedia(false);
    const { result } = renderHook(() => useResolvedTheme("system"));

    expect(result.current).toBe("light");

    act(() => {
      media.setMatches(true);
    });

    expect(result.current).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });
});

describe("applyResolvedTheme", () => {
  it("updates the document theme markers", () => {
    applyResolvedTheme("light");

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
  });
});
