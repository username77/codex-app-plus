interface SettingsToggleButtonOption<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly disabled?: boolean;
}

interface SettingsToggleButtonGroupProps<T extends string> {
  readonly label: string;
  readonly description: string;
  readonly value: T;
  readonly options: ReadonlyArray<SettingsToggleButtonOption<T>>;
  readonly onChange: (value: T) => void;
  readonly statusNote?: string;
  readonly disabled?: boolean;
}

export function SettingsToggleButtonGroup<T extends string>(
  props: SettingsToggleButtonGroupProps<T>
): JSX.Element {
  return (
    <div className="settings-row">
      <div className="settings-row-copy">
        <strong>{props.label}</strong>
        <p>{props.description}</p>
        {props.statusNote ? <p className="settings-row-note">{props.statusNote}</p> : null}
      </div>
      <div className="settings-row-control">
        <div className="settings-toggle-button-group">
          {props.options.map((option) => {
            const isActive = option.value === props.value;
            const isDisabled = props.disabled || option.disabled;
            return (
              <button
                key={option.value}
                type="button"
                className={
                  isActive
                    ? "settings-toggle-button settings-toggle-button-active"
                    : "settings-toggle-button"
                }
                disabled={isDisabled}
                onClick={() => props.onChange(option.value)}
                aria-pressed={isActive}
                aria-label={option.label}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
