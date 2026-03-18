import type { CodexProviderRecord } from "../../../bridge/types";
import { useI18n } from "../../../i18n";

interface CodexProviderDeleteDialogProps {
  readonly deleteTarget: CodexProviderRecord | null;
  readonly pendingProviderId: string | null;
  readonly onCancel: () => void;
  readonly onConfirm: () => Promise<void>;
}

export function CodexProviderDeleteDialog(
  props: CodexProviderDeleteDialogProps,
): JSX.Element | null {
  const { t } = useI18n();
  if (props.deleteTarget === null) {
    return null;
  }

  return (
    <div className="settings-dialog-backdrop" role="presentation" onClick={props.onCancel}>
      <section
        className="settings-dialog mcp-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("settings.config.providers.deleteTitle")}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="settings-dialog-header">
          <strong>{t("settings.config.providers.deleteTitle")}</strong>
          <button
            type="button"
            className="settings-dialog-close"
            onClick={props.onCancel}
            aria-label={t("settings.config.providers.closeAction")}
          >
            ×
          </button>
        </header>
        <div className="settings-dialog-body mcp-confirm-body">
          <p>{t("settings.config.providers.deleteDescription", { name: props.deleteTarget.name })}</p>
          <div className="mcp-form-actions">
            <button
              type="button"
              className="settings-action-btn"
              onClick={props.onCancel}
              disabled={props.pendingProviderId === props.deleteTarget.id}
            >
              {t("settings.config.providers.cancelAction")}
            </button>
            <button
              type="button"
              className="settings-action-btn settings-action-btn-primary"
              onClick={() => void props.onConfirm()}
              disabled={props.pendingProviderId === props.deleteTarget.id}
            >
              {props.pendingProviderId === props.deleteTarget.id
                ? t("settings.config.providers.deleting")
                : t("settings.config.providers.confirmDeleteAction")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
