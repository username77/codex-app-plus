import { useCallback, useLayoutEffect, useRef, type RefObject } from "react";

const DEFAULT_LINE_HEIGHT_PX = 20;

interface UseComposerTextareaAutosizeOptions {
  readonly textareaRef: RefObject<HTMLTextAreaElement>;
  readonly value: string;
  readonly maxExtraRows: number;
}

export function useComposerTextareaAutosize(options: UseComposerTextareaAutosizeOptions): void {
  const minHeightRef = useRef<number | null>(null);
  const lineHeightRef = useRef(DEFAULT_LINE_HEIGHT_PX);
  const adjustHeight = useCallback(() => {
    const textarea = options.textareaRef.current;
    if (textarea === null) {
      return;
    }

    minHeightRef.current ??= textarea.offsetHeight;
    lineHeightRef.current = readLineHeightPx(window.getComputedStyle(textarea));

    const minHeight = minHeightRef.current;
    const maxHeight = minHeight + (lineHeightRef.current * options.maxExtraRows);

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [options.maxExtraRows, options.textareaRef]);

  useLayoutEffect(() => {
    adjustHeight();
  }, [adjustHeight, options.value]);

  useLayoutEffect(() => {
    window.addEventListener("resize", adjustHeight);
    return () => window.removeEventListener("resize", adjustHeight);
  }, [adjustHeight]);
}

function readLineHeightPx(styles: CSSStyleDeclaration): number {
  const parsed = Number.parseFloat(styles.lineHeight);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_LINE_HEIGHT_PX;
}
