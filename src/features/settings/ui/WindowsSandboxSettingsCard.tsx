import { useMemo } from "react";
import { readWindowsSandboxConfigView } from "../sandbox/windowsSandboxConfig";
import type { WindowsSandboxSetupState } from "../../../domain/types";
import type { WindowsSandboxSetupMode } from "../../../protocol/generated/v2/WindowsSandboxSetupMode";
import { useI18n, type MessageKey } from "../../../i18n";

interface WindowsSandboxSettingsCardProps {
  readonly busy: boolean;
  readonly configSnapshot: unknown;
  readonly setupState: WindowsSandboxSetupState;
  readonly onStartSetup: (mode: WindowsSandboxSetupMode) => Promise<unknown>;
}

const MODE_LABEL_KEYS: Record<"disabled" | WindowsSandboxSetupMode, MessageKey> = {
  disabled: "settings.windowsSandbox.disabledMode",
  unelevated: "settings.windowsSandbox.unelevatedMode",
  elevated: "settings.windowsSandbox.elevatedMode"
};

function modeLabel(
  mode: "disabled" | WindowsSandboxSetupMode,
  t: (key: MessageKey) => string
): string {
  return t(MODE_LABEL_KEYS[mode]);
}

function resultMessage(
  state: WindowsSandboxSetupState,
  t: (key: MessageKey, params?: Record<string, string>) => string
): string | null {
  if (state.pending && state.mode !== null) {
    return t("settings.windowsSandbox.pendingMessage", { mode: modeLabel(state.mode, t) });
  }
  if (state.success === true && state.mode !== null) {
    return t("settings.windowsSandbox.successMessage", { mode: modeLabel(state.mode, t) });
  }
  if (state.success === false && state.mode !== null) {
    return state.error ?? t("settings.windowsSandbox.failureMessage", { mode: modeLabel(state.mode, t) });
  }
  return null;
}

function SetupAction(props: {
  readonly busy: boolean;
  readonly currentMode: WindowsSandboxSetupState["mode"];
  readonly mode: WindowsSandboxSetupMode;
  readonly title: string;
  readonly description: string;
  readonly runningLabel: string;
  readonly primary?: boolean;
  readonly onStartSetup: (mode: WindowsSandboxSetupMode) => Promise<unknown>;
}): JSX.Element {
  const running = props.busy && props.currentMode === props.mode;
  const className = props.primary
    ? "windows-sandbox-action windows-sandbox-action-primary"
    : "windows-sandbox-action";

  return (
    <button type="button" className={className} disabled={props.busy} onClick={() => void props.onStartSetup(props.mode)}>
      <span className="windows-sandbox-action-title">{running ? props.runningLabel : props.title}</span>
      <span className="windows-sandbox-action-copy">{props.description}</span>
    </button>
  );
}

export function WindowsSandboxSettingsCard(props: WindowsSandboxSettingsCardProps): JSX.Element {
  const { t } = useI18n();
  const view = useMemo(() => readWindowsSandboxConfigView(props.configSnapshot), [props.configSnapshot]);
  const result = resultMessage(props.setupState, t);
  const actionsDisabled = props.busy || props.setupState.pending || !view.canRunSetup;
  const resultClass = props.setupState.success === false
    ? "settings-status-note settings-status-note-error windows-sandbox-status"
    : props.setupState.pending
      ? "settings-status-note windows-sandbox-status"
      : "settings-status-note settings-status-note-success windows-sandbox-status";

  return (
    <section className="settings-card windows-sandbox-card">
      <div className="windows-sandbox-head">
        <div className="windows-sandbox-head-main">
          <strong>{t("settings.windowsSandbox.title")}</strong>
          <p className="windows-sandbox-summary-copy">
            {t("settings.windowsSandbox.summary")}
          </p>
        </div>
        <span className="settings-chip settings-chip-sm windows-sandbox-chip">{modeLabel(view.mode, t)}</span>
      </div>

      <div className="windows-sandbox-meta">
        <div className="windows-sandbox-meta-block">
          <span className="windows-sandbox-meta-label">{t("settings.windowsSandbox.currentStatusLabel")}</span>
          <strong>{modeLabel(view.mode, t)}</strong>
          <p>{view.source ?? t("settings.windowsSandbox.noSource")}</p>
        </div>
      </div>

      {view.isLegacy ? <p className="settings-status-note windows-sandbox-status">{t("settings.windowsSandbox.legacyNote")}</p> : null}
      {!view.canRunSetup ? <p className="settings-status-note settings-status-note-error windows-sandbox-status">{t("settings.windowsSandbox.unavailableNote")}</p> : null}
      {result ? <p className={resultClass}>{result}</p> : null}

      <div className="windows-sandbox-actions">
        <SetupAction
          busy={actionsDisabled}
          currentMode={props.setupState.mode}
          mode="unelevated"
          title={t("settings.windowsSandbox.unelevatedTitle")}
          description={t("settings.windowsSandbox.unelevatedDescription")}
          runningLabel={t("settings.windowsSandbox.runningAction")}
          primary
          onStartSetup={props.onStartSetup}
        />
        <SetupAction
          busy={actionsDisabled}
          currentMode={props.setupState.mode}
          mode="elevated"
          title={t("settings.windowsSandbox.elevatedTitle")}
          description={t("settings.windowsSandbox.elevatedDescription")}
          runningLabel={t("settings.windowsSandbox.runningAction")}
          onStartSetup={props.onStartSetup}
        />
      </div>
    </section>
  );
}
