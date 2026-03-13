import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import type {
  CodexProviderApplyResult,
  CodexProviderDraft,
  CodexProviderRecord,
  CodexProviderStore,
  DeleteCodexProviderInput,
} from "../../../bridge/types";
import type { WindowsSandboxSetupState } from "../../../domain/types";
import type { WindowsSandboxSetupMode } from "../../../protocol/generated/v2/WindowsSandboxSetupMode";
import { useI18n } from "../../../i18n";
import {
  createEmptyCodexProviderDraft,
  createDraftFromRecord,
  readCurrentCodexProviderKey,
} from "../config/codexProviderConfig";
import { CodexProviderDialog } from "./CodexProviderDialog";
import { WindowsSandboxSettingsCard } from "./WindowsSandboxSettingsCard";

const LazyOpenSourceLicensesDialog = lazy(async () => {
  const module = await import("../../shared/ui/OpenSourceLicensesDialog");
  return { default: module.OpenSourceLicensesDialog };
});

interface ConfigSettingsSectionProps {
  readonly busy: boolean;
  readonly configSnapshot: unknown;
  onOpenConfigToml: () => Promise<void>;
  refreshConfigSnapshot: () => Promise<unknown>;
  refreshAuthState: () => Promise<void>;
  listCodexProviders: () => Promise<CodexProviderStore>;
  upsertCodexProvider: (input: CodexProviderDraft) => Promise<CodexProviderRecord>;
  deleteCodexProvider: (input: DeleteCodexProviderInput) => Promise<CodexProviderStore>;
  applyCodexProvider: (input: { readonly id: string }) => Promise<CodexProviderApplyResult>;
  readonly windowsSandboxSetup: WindowsSandboxSetupState;
  readonly startWindowsSandboxSetup: (mode: WindowsSandboxSetupMode) => Promise<unknown>;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function ConfigSettingsSection(props: ConfigSettingsSectionProps): JSX.Element {
  const { t } = useI18n();
  const [licensesOpen, setLicensesOpen] = useState(false);
  const [providers, setProviders] = useState<ReadonlyArray<CodexProviderRecord>>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<CodexProviderDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CodexProviderRecord | null>(null);
  const [pendingProviderId, setPendingProviderId] = useState<string | null>(null);

  const currentProviderKey = useMemo(
    () => readCurrentCodexProviderKey(props.configSnapshot),
    [props.configSnapshot]
  );

  const loadProviders = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const store = await props.listCodexProviders();
      setProviders(store.providers);
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [props.listCodexProviders]);

  useEffect(() => {
    void loadProviders();
  }, [loadProviders]);

  const handleSave = async (draft: CodexProviderDraft, applyAfterSave: boolean) => {
    setSaving(true);
    setSubmitError(null);
    setNoticeMessage(null);
    try {
      const saved = await props.upsertCodexProvider(draft);
      if (applyAfterSave) {
        await props.applyCodexProvider({ id: saved.id });
        await Promise.all([props.refreshConfigSnapshot(), props.refreshAuthState()]);
        setNoticeMessage(t("settings.config.providers.appliedMessage", { name: saved.name }));
      } else {
        setNoticeMessage(t("settings.config.providers.savedMessage", { name: saved.name }));
      }
      await loadProviders();
      setEditingDraft(null);
    } catch (error) {
      setSubmitError(toErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleApply = async (provider: CodexProviderRecord) => {
    setPendingProviderId(provider.id);
    setNoticeMessage(null);
    setErrorMessage(null);
    try {
      await props.applyCodexProvider({ id: provider.id });
      await Promise.all([props.refreshConfigSnapshot(), props.refreshAuthState()]);
      setNoticeMessage(t("settings.config.providers.appliedMessage", { name: provider.name }));
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setPendingProviderId(null);
    }
  };

  const handleDelete = async () => {
    if (deleteTarget === null) {
      return;
    }
    setPendingProviderId(deleteTarget.id);
    setNoticeMessage(null);
    setErrorMessage(null);
    try {
      const store = await props.deleteCodexProvider({ id: deleteTarget.id });
      setProviders(store.providers);
      setDeleteTarget(null);
      setNoticeMessage(t("settings.config.providers.deletedMessage", { name: deleteTarget.name }));
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setPendingProviderId(null);
    }
  };

  return (
    <div className="settings-panel-group">
      <header className="settings-title-wrap">
        <h1 className="settings-page-title">{t("settings.config.title")}</h1>
        <p className="settings-subtitle">{t("settings.config.subtitle")}</p>
      </header>
      <section className="settings-card settings-config-card">
        <div className="settings-row">
          <div className="settings-row-copy">
            <div className="settings-row-heading">{t("settings.config.userConfig.label")}</div>
            <p className="settings-row-meta">{t("settings.config.userConfig.description")}</p>
          </div>
          <button type="button" className="settings-action-btn" onClick={() => void props.onOpenConfigToml()}>
            {t("settings.config.userConfig.action")}
          </button>
        </div>
        <div className="settings-row">
          <div className="settings-row-copy">
            <div className="settings-row-heading">{t("settings.config.licenses.label")}</div>
            <p className="settings-row-meta">{t("settings.config.licenses.description")}</p>
          </div>
          <button type="button" className="settings-action-btn" onClick={() => setLicensesOpen(true)}>
            {t("settings.config.licenses.action")}
          </button>
        </div>
      </section>
      <WindowsSandboxSettingsCard busy={props.busy} configSnapshot={props.configSnapshot} setupState={props.windowsSandboxSetup} onStartSetup={props.startWindowsSandboxSetup} />
      <section className="settings-card codex-provider-card">
        <div className="settings-section-head">
          <strong>{t("settings.config.providers.title")}</strong>
          <button type="button" className="settings-head-action" onClick={() => {
            setEditingDraft(createEmptyCodexProviderDraft());
            setSubmitError(null);
          }}>
            {t("settings.config.providers.addAction")}
          </button>
        </div>
        <p className="settings-note settings-note-pad">{t("settings.config.providers.description")}</p>
        {noticeMessage ? <p className="settings-status-note settings-status-note-success">{noticeMessage}</p> : null}
        {errorMessage ? <p className="settings-status-note settings-status-note-error">{errorMessage}</p> : null}
        {loading ? <div className="settings-empty">{t("settings.config.providers.loading")}</div> : null}
        {!loading && providers.length === 0 ? <div className="settings-empty">{t("settings.config.providers.empty")}</div> : null}
        {!loading
          ? providers.map((provider) => (
              <div key={provider.id} className="codex-provider-row">
                <div className="codex-provider-main">
                  <div className="codex-provider-title-row">
                    <strong>{provider.name}</strong>
                    <span className="settings-chip settings-chip-sm">{provider.providerKey}</span>
                    {provider.providerKey === currentProviderKey ? (
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
                  <button type="button" className="settings-action-btn settings-action-btn-sm" disabled={props.busy || pendingProviderId === provider.id} onClick={() => {
                    setEditingDraft(createDraftFromRecord(provider));
                    setSubmitError(null);
                  }}>
                    {t("settings.config.providers.editAction")}
                  </button>
                  <button type="button" className="settings-action-btn settings-action-btn-sm" disabled={props.busy || pendingProviderId === provider.id} onClick={() => setDeleteTarget(provider)}>
                    {t("settings.config.providers.deleteAction")}
                  </button>
                  <button type="button" className="settings-action-btn settings-action-btn-sm settings-action-btn-primary" disabled={props.busy || pendingProviderId === provider.id} onClick={() => void handleApply(provider)}>
                    {pendingProviderId === provider.id ? t("settings.config.providers.applying") : t("settings.config.providers.applyAction")}
                  </button>
                </div>
              </div>
            ))
          : null}
      </section>
      {licensesOpen ? (
        <Suspense fallback={null}>
          <LazyOpenSourceLicensesDialog open={licensesOpen} onClose={() => setLicensesOpen(false)} />
        </Suspense>
      ) : null}
      <CodexProviderDialog
        open={editingDraft !== null}
        initialDraft={editingDraft}
        providers={providers}
        saving={saving}
        submitError={submitError}
        onClose={() => {
          if (!saving) {
            setEditingDraft(null);
            setSubmitError(null);
          }
        }}
        onSave={handleSave}
      />
      {deleteTarget !== null ? (
        <div className="settings-dialog-backdrop" role="presentation" onClick={() => setDeleteTarget(null)}>
          <section className="settings-dialog mcp-confirm-dialog" role="dialog" aria-modal="true" aria-label={t("settings.config.providers.deleteTitle")} onClick={(event) => event.stopPropagation()}>
            <header className="settings-dialog-header">
              <strong>{t("settings.config.providers.deleteTitle")}</strong>
              <button type="button" className="settings-dialog-close" onClick={() => setDeleteTarget(null)} aria-label={t("settings.config.providers.closeAction")}>×</button>
            </header>
            <div className="settings-dialog-body mcp-confirm-body">
              <p>{t("settings.config.providers.deleteDescription", { name: deleteTarget.name })}</p>
              <div className="mcp-form-actions">
                <button type="button" className="settings-action-btn" onClick={() => setDeleteTarget(null)} disabled={pendingProviderId === deleteTarget.id}>{t("settings.config.providers.cancelAction")}</button>
                <button type="button" className="settings-action-btn settings-action-btn-primary" onClick={() => void handleDelete()} disabled={pendingProviderId === deleteTarget.id}>{pendingProviderId === deleteTarget.id ? t("settings.config.providers.deleting") : t("settings.config.providers.confirmDeleteAction")}</button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
