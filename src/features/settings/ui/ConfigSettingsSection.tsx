import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import type {
  AgentEnvironment,
  CodexAuthModeStateOutput,
  CodexAuthSwitchResult,
  CodexProviderApplyResult,
  CodexProviderDraft,
  CodexProviderRecord,
  CodexProviderStore,
  DeleteCodexProviderInput,
  ReadProxySettingsOutput,
  UpdateProxySettingsInput,
  UpdateProxySettingsOutput,
} from "../../../bridge/types";
import type { WindowsSandboxSetupState } from "../../../domain/types";
import { useI18n } from "../../../i18n";
import type { ConfigBatchWriteParams } from "../../../protocol/generated/v2/ConfigBatchWriteParams";
import type { ConfigValueWriteParams } from "../../../protocol/generated/v2/ConfigValueWriteParams";
import {
  createDraftFromRecord,
  createEmptyCodexProviderDraft,
  readCurrentCodexProviderKey,
} from "../config/codexProviderConfig";
import { createWindowsSandboxConfigWriteParams } from "../sandbox/windowsSandboxSetup";
import { CodexAuthModeCard } from "./CodexAuthModeCard";
import { CodexProviderDialog } from "./CodexProviderDialog";
import { CodexProviderDeleteDialog } from "./CodexProviderDeleteDialog";
import { CodexProviderListCard } from "./CodexProviderListCard";
import { ProxySettingsCard } from "./ProxySettingsCard";
import { WindowsSandboxSettingsCard } from "./WindowsSandboxSettingsCard";
import { writeForcedLoginMethod } from "./configAuthMode";

const LazyOpenSourceLicensesDialog = lazy(async () => {
  const module = await import("../../shared/ui/OpenSourceLicensesDialog");
  return { default: module.OpenSourceLicensesDialog };
});

interface ConfigSettingsSectionProps {
  readonly agentEnvironment: AgentEnvironment;
  readonly busy: boolean;
  readonly configSnapshot: unknown;
  readonly windowsSandboxSetup: WindowsSandboxSetupState;
  onOpenConfigToml: () => Promise<void>;
  refreshConfigSnapshot: () => Promise<unknown>;
  refreshAuthState: () => Promise<void>;
  login: () => Promise<void>;
  readProxySettings: (
    input: { readonly agentEnvironment: AgentEnvironment }
  ) => Promise<ReadProxySettingsOutput>;
  listCodexProviders: () => Promise<CodexProviderStore>;
  upsertCodexProvider: (input: CodexProviderDraft) => Promise<CodexProviderRecord>;
  deleteCodexProvider: (input: DeleteCodexProviderInput) => Promise<CodexProviderStore>;
  applyCodexProvider: (input: { readonly id: string }) => Promise<CodexProviderApplyResult>;
  getCodexAuthModeState: () => Promise<CodexAuthModeStateOutput>;
  activateCodexChatgpt: () => Promise<CodexAuthSwitchResult>;
  writeProxySettings: (input: UpdateProxySettingsInput) => Promise<UpdateProxySettingsOutput>;
  batchWriteConfig: (params: ConfigBatchWriteParams) => Promise<unknown>;
  writeConfigValue: (params: ConfigValueWriteParams) => Promise<unknown>;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function useConfigSettingsSectionController(
  props: ConfigSettingsSectionProps,
  t: ReturnType<typeof useI18n>["t"],
) {
  const [licensesOpen, setLicensesOpen] = useState(false);
  const [providers, setProviders] = useState<ReadonlyArray<CodexProviderRecord>>([]);
  const [authModeState, setAuthModeState] = useState<CodexAuthModeStateOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<CodexProviderDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CodexProviderRecord | null>(null);
  const [pendingProviderId, setPendingProviderId] = useState<string | null>(null);
  const [authActionPending, setAuthActionPending] = useState<"chatgpt" | "login" | null>(null);

  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const store = await props.listCodexProviders();
      setProviders(store.providers);
    } finally {
      setLoading(false);
    }
  }, [props.listCodexProviders]);

  const loadAuthModeState = useCallback(async () => {
    setAuthLoading(true);
    try {
      setAuthModeState(await props.getCodexAuthModeState());
    } finally {
      setAuthLoading(false);
    }
  }, [props.getCodexAuthModeState]);

  const refreshSection = useCallback(async () => {
    await Promise.all([
      loadProviders(),
      loadAuthModeState(),
      props.refreshConfigSnapshot(),
      props.refreshAuthState(),
    ]);
  }, [loadAuthModeState, loadProviders, props.refreshAuthState, props.refreshConfigSnapshot]);

  useEffect(() => {
    void (async () => {
      setErrorMessage(null);
      try {
        await Promise.all([loadProviders(), loadAuthModeState()]);
      } catch (error) {
        setErrorMessage(toErrorMessage(error));
      }
    })();
  }, [loadAuthModeState, loadProviders]);

  const handleSave = useCallback(async (draft: CodexProviderDraft, applyAfterSave: boolean) => {
    setSaving(true);
    setSubmitError(null);
    setNoticeMessage(null);
    try {
      const saved = await props.upsertCodexProvider(draft);
      if (!applyAfterSave) {
        await loadProviders();
        setNoticeMessage(t("settings.config.providers.savedMessage", { name: saved.name }));
        setEditingDraft(null);
        return;
      }
      await props.applyCodexProvider({ id: saved.id });
      await writeForcedLoginMethod(props.writeConfigValue, props.configSnapshot, "apikey");
      await refreshSection();
      setNoticeMessage(t("settings.config.providers.appliedMessage", { name: saved.name }));
      setEditingDraft(null);
    } catch (error) {
      setSubmitError(toErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }, [loadProviders, props.applyCodexProvider, props.configSnapshot, props.upsertCodexProvider, props.writeConfigValue, refreshSection, t]);

  const handleApply = useCallback(async (provider: CodexProviderRecord) => {
    setPendingProviderId(provider.id);
    setNoticeMessage(null);
    setErrorMessage(null);
    try {
      await props.applyCodexProvider({ id: provider.id });
      await writeForcedLoginMethod(props.writeConfigValue, props.configSnapshot, "apikey");
      await refreshSection();
      setNoticeMessage(t("settings.config.providers.appliedMessage", { name: provider.name }));
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setPendingProviderId(null);
    }
  }, [props.applyCodexProvider, props.configSnapshot, props.writeConfigValue, refreshSection, t]);

  const handleActivateChatgpt = useCallback(async () => {
    setAuthActionPending("chatgpt");
    setNoticeMessage(null);
    setErrorMessage(null);
    try {
      const result = await props.activateCodexChatgpt();
      await writeForcedLoginMethod(props.writeConfigValue, props.configSnapshot, "chatgpt");
      await refreshSection();
      const key = result.restoredFromSnapshot
        ? "settings.config.auth.switchedMessage"
        : "settings.config.auth.switchedNeedsLoginMessage";
      setNoticeMessage(t(key));
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setAuthActionPending(null);
    }
  }, [props.activateCodexChatgpt, props.configSnapshot, props.writeConfigValue, refreshSection, t]);

  const handleChatgptLogin = useCallback(async () => {
    setAuthActionPending("login");
    setNoticeMessage(null);
    setErrorMessage(null);
    try {
      await props.login();
      await Promise.all([props.refreshAuthState(), loadAuthModeState()]);
      setNoticeMessage(t("settings.config.auth.loginStartedMessage"));
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setAuthActionPending(null);
    }
  }, [loadAuthModeState, props.login, props.refreshAuthState, t]);

  const handleDelete = useCallback(async () => {
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
      await loadAuthModeState();
      setNoticeMessage(t("settings.config.providers.deletedMessage", { name: deleteTarget.name }));
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setPendingProviderId(null);
    }
  }, [deleteTarget, loadAuthModeState, props.deleteCodexProvider, t]);

  const handleWindowsSandboxToggle = useCallback(async (enabled: boolean) => {
    setNoticeMessage(null);
    setErrorMessage(null);
    try {
      await props.batchWriteConfig(createWindowsSandboxConfigWriteParams(props.configSnapshot, enabled));
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    }
  }, [props.batchWriteConfig, props.configSnapshot]);

  const handleAddProvider = useCallback(() => {
    setEditingDraft(createEmptyCodexProviderDraft());
    setSubmitError(null);
  }, []);

  const handleEditProvider = useCallback((provider: CodexProviderRecord) => {
    setEditingDraft(createDraftFromRecord(provider));
    setSubmitError(null);
  }, []);

  const handleCloseDialog = useCallback(() => {
    if (!saving) {
      setEditingDraft(null);
      setSubmitError(null);
    }
  }, [saving]);

  const handleCancelDelete = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  const closeLicenses = useCallback(() => {
    setLicensesOpen(false);
  }, []);

  const openLicenses = useCallback(() => {
    setLicensesOpen(true);
  }, []);

  return {
    authActionPending,
    authLoading,
    authModeState,
    closeLicenses,
    deleteTarget,
    editingDraft,
    errorMessage,
    handleActivateChatgpt,
    handleAddProvider,
    handleApply,
    handleCancelDelete,
    handleChatgptLogin,
    handleCloseDialog,
    handleDelete,
    handleEditProvider,
    handleSave,
    handleWindowsSandboxToggle,
    licensesOpen,
    loading,
    noticeMessage,
    openLicenses,
    pendingProviderId,
    providers,
    saving,
    setDeleteTarget,
    submitError,
  };
}

export function ConfigSettingsSection(props: ConfigSettingsSectionProps): JSX.Element {
  const { t } = useI18n();
  const controller = useConfigSettingsSectionController(props, t);
  const currentProviderKey = useMemo(
    () => readCurrentCodexProviderKey(props.configSnapshot),
    [props.configSnapshot],
  );

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
          <button
            type="button"
            className="settings-action-btn"
            onClick={() => void props.onOpenConfigToml()}
          >
            {t("settings.config.userConfig.action")}
          </button>
        </div>
        <div className="settings-row">
          <div className="settings-row-copy">
            <div className="settings-row-heading">{t("settings.config.licenses.label")}</div>
            <p className="settings-row-meta">{t("settings.config.licenses.description")}</p>
          </div>
          <button
            type="button"
            className="settings-action-btn"
            onClick={controller.openLicenses}
          >
            {t("settings.config.licenses.action")}
          </button>
        </div>
      </section>
      <ProxySettingsCard
        agentEnvironment={props.agentEnvironment}
        busy={props.busy}
        readProxySettings={props.readProxySettings}
        writeProxySettings={props.writeProxySettings}
      />
      <WindowsSandboxSettingsCard
        agentEnvironment={props.agentEnvironment}
        busy={props.busy}
        configSnapshot={props.configSnapshot}
        setupState={props.windowsSandboxSetup}
        onToggle={controller.handleWindowsSandboxToggle}
      />
      <CodexAuthModeCard
        busy={props.busy}
        authLoading={controller.authLoading}
        authModeState={controller.authModeState}
        authActionPending={controller.authActionPending}
        onActivateChatgpt={controller.handleActivateChatgpt}
        onLogin={controller.handleChatgptLogin}
      />
      <CodexProviderListCard
        busy={props.busy}
        loading={controller.loading}
        providers={controller.providers}
        authModeState={controller.authModeState}
        currentProviderKey={currentProviderKey}
        pendingProviderId={controller.pendingProviderId}
        noticeMessage={controller.noticeMessage}
        errorMessage={controller.errorMessage}
        onAdd={controller.handleAddProvider}
        onEdit={controller.handleEditProvider}
        onDelete={controller.setDeleteTarget}
        onApply={controller.handleApply}
      />
      {controller.licensesOpen ? (
        <Suspense fallback={null}>
          <LazyOpenSourceLicensesDialog
            open={controller.licensesOpen}
            onClose={controller.closeLicenses}
          />
        </Suspense>
      ) : null}
      <CodexProviderDialog
        open={controller.editingDraft !== null}
        initialDraft={controller.editingDraft}
        providers={controller.providers}
        saving={controller.saving}
        submitError={controller.submitError}
        onClose={controller.handleCloseDialog}
        onSave={controller.handleSave}
      />
      <CodexProviderDeleteDialog
        deleteTarget={controller.deleteTarget}
        pendingProviderId={controller.pendingProviderId}
        onCancel={controller.handleCancelDelete}
        onConfirm={controller.handleDelete}
      />
    </div>
  );
}
