import { useI18n } from "../../../i18n";

interface AuthChoiceViewProps {
  readonly busy: boolean;
  readonly loginPending: boolean;
  readonly onLogin: () => Promise<void>;
  readonly onUseApiKey: () => void;
}

export function AuthChoiceView(props: AuthChoiceViewProps): JSX.Element {
  const { t } = useI18n();

  return (
    <main className="auth-choice-layout" aria-label={t("auth.choice.ariaLabel")}>
      <section className="auth-choice-card">
        <div className="auth-choice-copy">
          <span className="auth-choice-badge">Codex App Plus</span>
          <h1 className="auth-choice-title">{t("auth.choice.title")}</h1>
          <p className="auth-choice-subtitle">{t("auth.choice.subtitle")}</p>
        </div>
        <div className="auth-choice-actions">
          <button type="button" className="auth-choice-button auth-choice-button-primary" onClick={() => void props.onLogin()} disabled={props.busy}>
            {props.loginPending ? t("auth.choice.login.pending") : t("auth.choice.login.action")}
          </button>
          <button type="button" className="auth-choice-button" onClick={props.onUseApiKey} disabled={props.busy}>
            {t("auth.choice.apiKey.action")}
          </button>
        </div>
      </section>
    </main>
  );
}
