import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

type MenuPlacement = "down" | "up";

export interface MenuLayout {
  readonly placement: MenuPlacement;
  readonly maxHeight: number;
  readonly left: number;
  readonly top: number;
  readonly width: number;
}

export interface SelectMenuMetrics {
  readonly gap: number;
  readonly headerHeight: number;
  readonly maxHeight: number;
  readonly maxWidth: number;
  readonly minHeight: number;
  readonly minWidth: number;
  readonly rowHeight: number;
  readonly verticalPadding: number;
  readonly viewportPadding: number;
}

export const DEFAULT_SELECT_MENU_METRICS: SelectMenuMetrics = {
  gap: 8,
  headerHeight: 36,
  maxHeight: 320,
  maxWidth: 320,
  minHeight: 120,
  minWidth: 240,
  rowHeight: 40,
  verticalPadding: 18,
  viewportPadding: 12,
};

const DEFAULT_MENU_LAYOUT: MenuLayout = {
  placement: "down",
  maxHeight: DEFAULT_SELECT_MENU_METRICS.maxHeight,
  left: DEFAULT_SELECT_MENU_METRICS.viewportPadding,
  top: DEFAULT_SELECT_MENU_METRICS.viewportPadding,
  width: DEFAULT_SELECT_MENU_METRICS.minWidth,
};

function isScrollableElement(element: HTMLElement): boolean {
  const styles = window.getComputedStyle(element);
  return [styles.overflowY, styles.overflow].some(
    (value) => value === "auto" || value === "scroll" || value === "overlay",
  );
}

function getMenuViewportBounds(
  container: HTMLDivElement,
): { readonly top: number; readonly bottom: number } {
  let current = container.parentElement;

  while (current !== null) {
    if (isScrollableElement(current)) {
      const bounds = current.getBoundingClientRect();
      return { top: bounds.top, bottom: bounds.bottom };
    }
    current = current.parentElement;
  }

  return { top: 0, bottom: window.innerHeight };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function measureMenuWidth(
  bounds: DOMRect,
  metrics: SelectMenuMetrics,
): number {
  const maxViewportWidth = Math.max(
    window.innerWidth - metrics.viewportPadding * 2,
    metrics.minWidth,
  );
  const cappedWidth = Math.min(metrics.maxWidth, maxViewportWidth);
  return clamp(bounds.width, metrics.minWidth, cappedWidth);
}

function measureMenuLeft(
  bounds: DOMRect,
  width: number,
  metrics: SelectMenuMetrics,
): number {
  const maxLeft = Math.max(
    window.innerWidth - metrics.viewportPadding - width,
    metrics.viewportPadding,
  );
  return clamp(bounds.right - width, metrics.viewportPadding, maxLeft);
}

function measureMenuTop(
  bounds: DOMRect,
  viewportBounds: { readonly top: number; readonly bottom: number },
  placement: MenuPlacement,
  maxHeight: number,
  metrics: SelectMenuMetrics,
): number {
  if (placement === "up") {
    return Math.max(
      viewportBounds.top + metrics.viewportPadding,
      bounds.top - maxHeight - metrics.gap,
    );
  }

  return Math.min(
    bounds.bottom + metrics.gap,
    viewportBounds.bottom - metrics.viewportPadding - maxHeight,
  );
}

function measureMenuLayout(
  container: HTMLDivElement,
  optionCount: number,
  metrics: SelectMenuMetrics,
): MenuLayout {
  const bounds = container.getBoundingClientRect();
  const viewportBounds = getMenuViewportBounds(container);
  const estimatedHeight =
    metrics.headerHeight + metrics.verticalPadding + optionCount * metrics.rowHeight;
  const availableBelow = Math.max(
    viewportBounds.bottom - bounds.bottom - metrics.viewportPadding,
    metrics.minHeight,
  );
  const availableAbove = Math.max(
    bounds.top - viewportBounds.top - metrics.viewportPadding,
    metrics.minHeight,
  );
  const shouldOpenUp =
    availableBelow < estimatedHeight && availableAbove >= availableBelow;
  const placement = shouldOpenUp ? "up" : "down";
  const availableHeight = shouldOpenUp ? availableAbove : availableBelow;
  const maxHeight = Math.max(
    Math.min(availableHeight - metrics.gap, metrics.maxHeight),
    metrics.minHeight,
  );
  const width = measureMenuWidth(bounds, metrics);

  return {
    placement,
    maxHeight,
    left: measureMenuLeft(bounds, width, metrics),
    top: measureMenuTop(bounds, viewportBounds, placement, maxHeight, metrics),
    width,
  };
}

export function useSettingsSelectMenuLayout(options: {
  readonly menuOpen: boolean;
  readonly metrics?: Partial<SelectMenuMetrics>;
  readonly optionCount: number;
}) {
  const metrics = useMemo(
    () => ({ ...DEFAULT_SELECT_MENU_METRICS, ...options.metrics }),
    [options.metrics],
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const [menuLayout, setMenuLayout] = useState<MenuLayout>(DEFAULT_MENU_LAYOUT);
  const updateMenuLayout = useCallback(() => {
    const container = containerRef.current;
    if (container !== null) {
      setMenuLayout(measureMenuLayout(container, options.optionCount, metrics));
    }
  }, [metrics, options.optionCount]);

  useLayoutEffect(() => {
    if (!options.menuOpen) {
      return undefined;
    }
    updateMenuLayout();
    window.addEventListener("resize", updateMenuLayout);
    window.addEventListener("scroll", updateMenuLayout, true);
    return () => {
      window.removeEventListener("resize", updateMenuLayout);
      window.removeEventListener("scroll", updateMenuLayout, true);
    };
  }, [options.menuOpen, updateMenuLayout]);

  return { containerRef, menuLayout, updateMenuLayout };
}
