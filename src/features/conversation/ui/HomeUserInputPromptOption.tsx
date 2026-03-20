import { useId, useState } from "react";

interface HomeUserInputPromptOptionProps {
  readonly index: number;
  readonly label: string;
  readonly description: string;
  readonly selected: boolean;
  readonly disabled: boolean;
  readonly onClick: () => void;
}

export function HomeUserInputPromptOption(props: HomeUserInputPromptOptionProps): JSX.Element {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const tooltipId = useId();
  const hasDescription = props.description.trim().length > 0;

  return (
    <div className="home-user-input-option-row">
      <button
        type="button"
        className="plan-request-option home-user-input-option"
        data-selected={props.selected ? "true" : undefined}
        aria-describedby={hasDescription && tooltipOpen ? tooltipId : undefined}
        disabled={props.disabled}
        onMouseEnter={() => {
          if (hasDescription) {
            setTooltipOpen(true);
          }
        }}
        onMouseLeave={() => setTooltipOpen(false)}
        onFocus={() => {
          if (hasDescription) {
            setTooltipOpen(true);
          }
        }}
        onBlur={() => setTooltipOpen(false)}
        onClick={props.onClick}
      >
        <span className="home-user-input-option-index">{props.index}</span>
        <span className="home-user-input-option-copy">
          <strong>{props.label}</strong>
        </span>
      </button>
      {hasDescription && tooltipOpen ? (
        <div id={tooltipId} className="home-user-input-option-tooltip" role="tooltip">
          {props.description}
        </div>
      ) : null}
    </div>
  );
}
