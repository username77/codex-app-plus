import type { LaunchScriptIconId } from "../../workspace/model/workspaceLaunchScripts";
import {
  DEFAULT_LAUNCH_SCRIPT_ICON,
  LAUNCH_SCRIPT_ICON_IDS,
  getLaunchScriptIconLabel,
} from "../../workspace/model/workspaceLaunchScripts";

export interface LaunchScriptIconOption {
  readonly id: LaunchScriptIconId;
  readonly label: string;
}

export const LAUNCH_SCRIPT_ICON_OPTIONS: ReadonlyArray<LaunchScriptIconOption> =
  LAUNCH_SCRIPT_ICON_IDS.map((id) => ({
    id,
    label: getLaunchScriptIconLabel(id),
  }));

function LaunchScriptSvg(props: {
  readonly children: JSX.Element | ReadonlyArray<JSX.Element>;
  readonly className?: string;
}): JSX.Element {
  return (
    <svg
      className={props.className}
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {props.children}
    </svg>
  );
}

export function LaunchScriptIcon(props: {
  readonly icon: LaunchScriptIconId;
  readonly className?: string;
}): JSX.Element {
  if (props.icon === "server") {
    return (
      <LaunchScriptSvg className={props.className}>
        <g fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round">
          <rect x="4.25" y="3.75" width="11.5" height="4.5" rx="1.2" />
          <rect x="4.25" y="11.75" width="11.5" height="4.5" rx="1.2" />
          <path d="M7 6h.01M7 14h.01M10.2 6h4M10.2 14h4" />
        </g>
      </LaunchScriptSvg>
    );
  }
  if (props.icon === "globe") {
    return (
      <LaunchScriptSvg className={props.className}>
        <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
          <circle cx="10" cy="10" r="6.2" />
          <path d="M3.8 10h12.4M10 3.8c1.8 1.7 2.8 4 2.8 6.2S11.8 14.5 10 16.2M10 3.8c-1.8 1.7-2.8 4-2.8 6.2s1 4.5 2.8 6.2" />
        </g>
      </LaunchScriptSvg>
    );
  }
  if (props.icon === "terminal") {
    return (
      <LaunchScriptSvg className={props.className}>
        <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
          <rect x="3.75" y="4.25" width="12.5" height="11.5" rx="1.8" />
          <path d="M6.6 8.1 8.9 10 6.6 11.9M10.2 12h3.4" strokeLinejoin="round" />
        </g>
      </LaunchScriptSvg>
    );
  }
  return (
    <LaunchScriptSvg className={props.className}>
      <path
        d="m7 5.6 6.2 4.4L7 14.4V5.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
    </LaunchScriptSvg>
  );
}

export { DEFAULT_LAUNCH_SCRIPT_ICON };
