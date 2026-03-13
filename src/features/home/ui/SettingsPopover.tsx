import type { AuthStatus } from "../../../domain/types";
import { useI18n } from "../../../i18n";
import "../../../styles/replica/replica-settings-popover.css";

interface SettingsPopoverProps {
  readonly authStatus: AuthStatus;
  readonly authMode: string | null;
  readonly authBusy: boolean;
  readonly authLoginPending: boolean;
  readonly onOpenSettings: () => void;
  readonly onLogin: () => Promise<void>;
  readonly onLogout: () => Promise<void>;
}

function authStatusLabel(status: AuthStatus, mode: string | null, t: ReturnType<typeof useI18n>["t"]): string {
  if (status === "authenticated") {
    if (mode === "chatgpt") return t("home.settingsPopover.authStatus.chatgpt");
    if (mode === "apikey") return t("home.settingsPopover.authStatus.apiKey");
    return t("home.settingsPopover.authStatus.authenticated");
  }
  if (status === "needs_login") {
    return t("home.settingsPopover.authStatus.needsLogin");
  }
  return t("home.settingsPopover.authStatus.unknown");
}

export function SettingsPopover(props: SettingsPopoverProps): JSX.Element {
  const { t } = useI18n();
  const showLogin = props.authStatus !== "authenticated";

  return (
    <div className="settings-popover" role="menu" aria-label={t("home.settingsPopover.menuLabel")}>
      <div className="settings-popover-status">● {authStatusLabel(props.authStatus, props.authMode, t)}</div>
      <button type="button" className="settings-popover-item" onClick={props.onOpenSettings}>
        <span>⚙ {t("home.settingsPopover.settings.action")}</span>
      </button>
      <button type="button" className="settings-popover-item" disabled>
        <span>● {t("home.settingsPopover.language.action")}</span>
        <span>›</span>
      </button>
      {showLogin ? (
        <button type="button" className="settings-popover-item" onClick={() => void props.onLogin()} disabled={props.authBusy}>
          <span>{props.authLoginPending ? `→ ${t("home.settingsPopover.login.pending")}` : `→ ${t("home.settingsPopover.login.action")}`}</span>
        </button>
      ) : (
        <button type="button" className="settings-popover-item settings-popover-danger" onClick={() => void props.onLogout()} disabled={props.authBusy}>
          <span>{`→ ${t("home.settingsPopover.logout.action")}`}</span>
        </button>
      )}
    </div>
  );
}
