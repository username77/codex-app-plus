import { useEffect, useRef, useState } from "react";
import { normalizeAppearanceColor } from "../model/appearancePreferences";

interface AppearanceColorControlProps {
  readonly label: string;
  readonly pickerLabel: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
}

function normalizeDraftValue(value: string): string {
  return value.toUpperCase();
}

export function AppearanceColorControl(
  props: AppearanceColorControlProps,
): JSX.Element {
  const colorInputRef = useRef<HTMLInputElement | null>(null);
  const [draftValue, setDraftValue] = useState(props.value);

  useEffect(() => {
    setDraftValue(props.value);
  }, [props.value]);

  const commitDraft = (nextDraftValue: string) => {
    const normalized = normalizeAppearanceColor(nextDraftValue, props.value);
    setDraftValue(normalized);
    if (normalized !== props.value) {
      props.onChange(normalized);
    }
  };

  const openPicker = () => {
    const pickerInput = colorInputRef.current as
      | (HTMLInputElement & { showPicker?: () => void })
      | null;
    if (pickerInput === null) {
      return;
    }
    if (typeof pickerInput.showPicker === "function") {
      pickerInput.showPicker();
      return;
    }
    pickerInput.click();
  };

  return (
    <div className="color-input-wrapper">
      <button
        type="button"
        aria-label={props.pickerLabel}
        className="color-circle-button"
        onClick={openPicker}
      >
        <span
          className="color-circle"
          style={{ backgroundColor: props.value }}
        />
      </button>
      <input
        aria-label={props.label}
        autoCapitalize="characters"
        className="color-text-input"
        spellCheck={false}
        type="text"
        value={draftValue}
        onBlur={() => commitDraft(draftValue)}
        onChange={(event) =>
          setDraftValue(normalizeDraftValue(event.target.value))
        }
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitDraft(draftValue);
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setDraftValue(props.value);
            event.currentTarget.blur();
          }
        }}
      />
      <input
        ref={colorInputRef}
        aria-hidden="true"
        className="color-picker-input"
        tabIndex={-1}
        type="color"
        value={props.value}
        onChange={(event) => commitDraft(event.target.value)}
      />
    </div>
  );
}
