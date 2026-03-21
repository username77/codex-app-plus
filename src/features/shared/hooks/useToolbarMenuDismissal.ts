import { useEffect } from "react";
import type { RefObject } from "react";

export function useToolbarMenuDismissal(
  menuOpen: boolean,
  containerRef: RefObject<HTMLDivElement>,
  onDismiss: () => void,
  additionalRefs: ReadonlyArray<RefObject<HTMLElement>> = []
): void {
  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const withinContainer = containerRef.current?.contains(target) ?? false;
      const withinAdditionalRefs = additionalRefs.some((ref) => ref.current?.contains(target) ?? false);
      if (!withinContainer && !withinAdditionalRefs) {
        onDismiss();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onDismiss();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [additionalRefs, containerRef, menuOpen, onDismiss]);
}
