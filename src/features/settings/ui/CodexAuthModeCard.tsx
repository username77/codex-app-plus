import type { CodexAuthModeStateOutput } from "../../../bridge/types";
import { useI18n } from "../../../i18n";
import { formatAuthModeSummary } from "./configAuthMode";

interface CodexAuthModeCardProps {
  readonly busy: boolean;
  readonly authLoading: boolean;
  readonly authModeState: CodexAuthModeStateOutput | null;
  readonly authActionPending: "chatgpt" | "login" | null;
  readonly onActivateChatgpt: () => Promise<void>;
  readonly onLogin: () => Promise<void>;
}

export function CodexAuthModeCard(props: CodexAuthModeCardProps): JSX.Element {
  const { t } = useI18n();

  return (
    <section className="settings-card settings-config-card">
      <div className="settings-section-head">
        <strong>{t("settings.config.auth.title")}</strong>
      </div>
      <p className="settings-note settings-note-pad">{t("settings.config.auth.description")}</p>
      <div className="settings-row">
        <div className="settings-row-copy">
          <div className="settings-row-heading">{t("settings.config.auth.currentModeLabel")}</div>
          <p className="settings-row-meta">{formatAuthModeSummary(t, props.authModeState)}</p>
          {props.authLoading ? (
            <p className="settings-row-meta">{t("settings.config.auth.loading")}</p>
          ) : null}
        </div>
        <div className="codex-provider-actions">
          <button
            type="button"
            className="settings-action-btn settings-action-btn-sm"
            disabled={props.busy || props.authActionPending !== null}
            onClick={() => void props.onActivateChatgpt()}
          >
            {props.authActionPending === "chatgpt"
              ? t("settings.config.auth.switching")
              : t("settings.config.auth.switchAction")}
          </button>
          <button
            type="button"
            className="settings-action-btn settings-action-btn-sm settings-action-btn-primary"
            disabled={props.busy || props.authActionPending !== null}
            onClick={() => void props.onLogin()}
          >
            {props.authActionPending === "login"
              ? t("settings.config.auth.loggingIn")
              : t("settings.config.auth.loginAction")}
          </button>
        </div>
      </div>
    </section>
  );
}
