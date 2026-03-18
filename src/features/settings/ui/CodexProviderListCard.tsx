import type { CodexAuthModeStateOutput, CodexProviderRecord } from "../../../bridge/types";
import { useI18n } from "../../../i18n";

interface CodexProviderListCardProps {
  readonly busy: boolean;
  readonly loading: boolean;
  readonly providers: ReadonlyArray<CodexProviderRecord>;
  readonly authModeState: CodexAuthModeStateOutput | null;
  readonly currentProviderKey: string | null;
  readonly pendingProviderId: string | null;
  readonly noticeMessage: string | null;
  readonly errorMessage: string | null;
  readonly onAdd: () => void;
  readonly onEdit: (provider: CodexProviderRecord) => void;
  readonly onDelete: (provider: CodexProviderRecord) => void;
  readonly onApply: (provider: CodexProviderRecord) => Promise<void>;
}

export function CodexProviderListCard(props: CodexProviderListCardProps): JSX.Element {
  const { t } = useI18n();

  return (
    <section className="settings-card codex-provider-card">
      <div className="settings-section-head">
        <strong>{t("settings.config.providers.title")}</strong>
        <button type="button" className="settings-head-action" onClick={props.onAdd}>
          {t("settings.config.providers.addAction")}
        </button>
      </div>
      <p className="settings-note settings-note-pad">{t("settings.config.providers.description")}</p>
      {props.noticeMessage ? (
        <p className="settings-status-note settings-status-note-success">{props.noticeMessage}</p>
      ) : null}
      {props.errorMessage ? (
        <p className="settings-status-note settings-status-note-error">{props.errorMessage}</p>
      ) : null}
      {props.loading ? (
        <div className="settings-empty">{t("settings.config.providers.loading")}</div>
      ) : null}
      {!props.loading && props.providers.length === 0 ? (
        <div className="settings-empty">{t("settings.config.providers.empty")}</div>
      ) : null}
      {!props.loading
        ? props.providers.map((provider) => {
            const isActiveProvider = props.authModeState?.activeProviderId === provider.id
              || provider.providerKey === props.currentProviderKey;
            return (
              <div key={provider.id} className="codex-provider-row">
                <div className="codex-provider-main">
                  <div className="codex-provider-title-row">
                    <strong>{provider.name}</strong>
                    <span className="settings-chip settings-chip-sm">{provider.providerKey}</span>
                    {isActiveProvider ? (
                      <span className="settings-chip settings-chip-sm codex-provider-current">
                        {t("settings.config.providers.current")}
                      </span>
                    ) : null}
                  </div>
                  <div className="codex-provider-meta-row">
                    <span>{provider.baseUrl}</span>
                  </div>
                </div>
                <div className="codex-provider-actions">
                  <button
                    type="button"
                    className="settings-action-btn settings-action-btn-sm"
                    disabled={props.busy || props.pendingProviderId === provider.id}
                    onClick={() => props.onEdit(provider)}
                  >
                    {t("settings.config.providers.editAction")}
                  </button>
                  <button
                    type="button"
                    className="settings-action-btn settings-action-btn-sm"
                    disabled={
                      props.busy
                      || props.pendingProviderId === provider.id
                      || isActiveProvider
                    }
                    onClick={() => props.onDelete(provider)}
                  >
                    {t("settings.config.providers.deleteAction")}
                  </button>
                  <button
                    type="button"
                    className="settings-action-btn settings-action-btn-sm settings-action-btn-primary"
                    disabled={props.busy || props.pendingProviderId === provider.id}
                    onClick={() => void props.onApply(provider)}
                  >
                    {props.pendingProviderId === provider.id
                      ? t("settings.config.providers.applying")
                      : t("settings.config.providers.applyAction")}
                  </button>
                </div>
              </div>
            );
          })
        : null}
    </section>
  );
}
