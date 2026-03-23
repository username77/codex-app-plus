import type { LaunchScriptIconId } from "../../workspace/model/workspaceLaunchScripts";
import {
  LAUNCH_SCRIPT_ICON_OPTIONS,
  LaunchScriptIcon,
} from "./launchScriptIcons";

interface LaunchScriptIconPickerProps {
  readonly value: LaunchScriptIconId;
  readonly onChange: (value: LaunchScriptIconId) => void;
}

export function LaunchScriptIconPicker(
  props: LaunchScriptIconPickerProps,
): JSX.Element {
  return (
    <div className="launch-script-icon-picker" role="list" aria-label="启动脚本图标">
      {LAUNCH_SCRIPT_ICON_OPTIONS.map((option) => {
        const selected = option.id === props.value;
        return (
          <button
            key={option.id}
            type="button"
            className={`launch-script-icon-option${selected ? " is-selected" : ""}`}
            aria-pressed={selected}
            aria-label={`选择图标：${option.label}`}
            onClick={() => props.onChange(option.id)}
          >
            <LaunchScriptIcon icon={option.id} className="toolbar-action-icon" />
          </button>
        );
      })}
    </div>
  );
}
