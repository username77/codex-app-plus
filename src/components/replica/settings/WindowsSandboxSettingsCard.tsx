import { useMemo } from "react";
import { readWindowsSandboxConfigView } from "../../../app/windowsSandboxConfig";
import type { WindowsSandboxSetupState } from "../../../domain/types";
import type { WindowsSandboxSetupMode } from "../../../protocol/generated/v2/WindowsSandboxSetupMode";

interface WindowsSandboxSettingsCardProps {
  readonly busy: boolean;
  readonly configSnapshot: unknown;
  readonly setupState: WindowsSandboxSetupState;
  readonly onStartSetup: (mode: WindowsSandboxSetupMode) => Promise<unknown>;
}

function modeLabel(mode: "disabled" | WindowsSandboxSetupMode): string {
  if (mode === "elevated") return "Elevated";
  if (mode === "unelevated") return "Unelevated";
  return "Disabled";
}

function resultMessage(state: WindowsSandboxSetupState): string | null {
  if (state.pending && state.mode !== null) {
    return `Running ${state.mode} setup...`;
  }
  if (state.success === true && state.mode !== null) {
    return `${modeLabel(state.mode)} setup completed.`;
  }
  if (state.success === false && state.mode !== null) {
    return state.error ?? `${modeLabel(state.mode)} setup failed.`;
  }
  return null;
}

function SetupButton(props: {
  readonly busy: boolean;
  readonly currentMode: WindowsSandboxSetupState["mode"];
  readonly mode: WindowsSandboxSetupMode;
  readonly onStartSetup: (mode: WindowsSandboxSetupMode) => Promise<unknown>;
}): JSX.Element {
  const running = props.busy && props.currentMode === props.mode;
  return (
    <button type="button" className="settings-action-btn settings-action-btn-sm settings-action-btn-primary" disabled={props.busy} onClick={() => void props.onStartSetup(props.mode)}>
      {running ? "Setting up..." : `Run ${modeLabel(props.mode)} setup`}
    </button>
  );
}

export function WindowsSandboxSettingsCard(props: WindowsSandboxSettingsCardProps): JSX.Element {
  const view = useMemo(() => readWindowsSandboxConfigView(props.configSnapshot), [props.configSnapshot]);
  const result = resultMessage(props.setupState);
  const actionsDisabled = props.busy || props.setupState.pending || !view.canRunSetup;
  const resultClass = props.setupState.success === false
    ? "settings-status-note settings-status-note-error"
    : props.setupState.pending
      ? "settings-status-note"
      : "settings-status-note settings-status-note-success";

  return (
    <section className="settings-card">
      <div className="settings-section-head">
        <strong>Windows Sandbox</strong>
      </div>
      <p className="settings-note">Enable the official Windows sandbox setup flow for safer tool execution without changing existing composer permissions.</p>
      <div className="settings-row">
        <div>
          <strong>Current mode</strong>
          <p>{view.source ?? "No Windows sandbox mode is configured yet."}</p>
        </div>
        <span className="settings-chip settings-chip-sm">{modeLabel(view.mode)}</span>
      </div>
      {view.isLegacy ? <p className="settings-status-note">This mode currently comes from legacy feature flags.</p> : null}
      {!view.canRunSetup ? <p className="settings-status-note settings-status-note-error">Windows sandbox setup is only available on Windows.</p> : null}
      {result ? <p className={resultClass}>{result}</p> : null}
      <div className="codex-provider-actions">
        <SetupButton busy={actionsDisabled} currentMode={props.setupState.mode} mode="unelevated" onStartSetup={props.onStartSetup} />
        <SetupButton busy={actionsDisabled} currentMode={props.setupState.mode} mode="elevated" onStartSetup={props.onStartSetup} />
      </div>
    </section>
  );
}
