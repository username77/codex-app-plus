import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AgentEnvironment,
  ReadProxySettingsOutput,
  UpdateProxySettingsInput,
  UpdateProxySettingsOutput,
} from "../../../bridge/types";
import { useI18n, type MessageKey } from "../../../i18n";
import {
  buildProxySettingsInput,
  EMPTY_PROXY_SETTINGS,
  hasProxySettingsChanges,
  isProxyUrl,
} from "../config/proxySettings";

interface ProxySettingsCardProps {
  readonly agentEnvironment: AgentEnvironment;
  readonly busy: boolean;
  readonly readProxySettings: (
    input: { readonly agentEnvironment: AgentEnvironment }
  ) => Promise<ReadProxySettingsOutput>;
  readonly writeProxySettings: (
    input: UpdateProxySettingsInput
  ) => Promise<UpdateProxySettingsOutput>;
}

interface Feedback {
  readonly kind: "idle" | "error" | "success";
  readonly message: string;
}

const EMPTY_FEEDBACK: Feedback = { kind: "idle", message: "" };

const AGENT_ENVIRONMENT_LABEL_KEYS: Record<AgentEnvironment, MessageKey> = {
  windowsNative: "settings.general.agentEnvironment.options.windowsNative",
  wsl: "settings.general.agentEnvironment.options.wsl",
};

function ToggleSwitch(props: {
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly label: string;
  readonly onToggle: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      className={props.checked ? "settings-toggle settings-toggle-on" : "settings-toggle"}
      role="switch"
      aria-checked={props.checked}
      aria-label={props.label}
      disabled={props.disabled}
      onClick={props.onToggle}
    >
      <span className="settings-toggle-knob" />
    </button>
  );
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function feedbackClassName(kind: Feedback["kind"]): string {
  if (kind === "success") {
    return "settings-status-note settings-status-note-success";
  }
  if (kind === "error") {
    return "settings-status-note settings-status-note-error";
  }
  return "settings-status-note";
}

export function ProxySettingsCard(props: ProxySettingsCardProps): JSX.Element {
  const { t } = useI18n();
  const [savedSettings, setSavedSettings] = useState(EMPTY_PROXY_SETTINGS);
  const [draftSettings, setDraftSettings] = useState(EMPTY_PROXY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(EMPTY_FEEDBACK);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFeedback(EMPTY_FEEDBACK);
    void props.readProxySettings({ agentEnvironment: props.agentEnvironment })
      .then((output) => {
        if (!active) {
          return;
        }
        setSavedSettings(output.settings);
        setDraftSettings(output.settings);
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setSavedSettings(EMPTY_PROXY_SETTINGS);
        setDraftSettings(EMPTY_PROXY_SETTINGS);
        setFeedback({
          kind: "error",
          message: t("settings.config.proxy.loadFailed", {
            error: toErrorMessage(error),
          }),
        });
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [props.agentEnvironment, t]);

  const validationMessage = useMemo(() => {
    if (draftSettings.enabled
      && draftSettings.httpProxy.trim().length === 0
      && draftSettings.httpsProxy.trim().length === 0) {
      return t("settings.config.proxy.validationRequired");
    }
    if (!isProxyUrl(draftSettings.httpProxy)) {
      return t("settings.config.proxy.validationInvalidHttp");
    }
    if (!isProxyUrl(draftSettings.httpsProxy)) {
      return t("settings.config.proxy.validationInvalidHttps");
    }
    return null;
  }, [draftSettings, t]);
  const dirty = hasProxySettingsChanges(savedSettings, draftSettings);
  const actionDisabled = props.busy || loading || saving || validationMessage !== null || !dirty;
  const environmentLabel = t(AGENT_ENVIRONMENT_LABEL_KEYS[props.agentEnvironment]);

  const updateDraft = useCallback(
    (patch: Partial<typeof draftSettings>) => {
      setDraftSettings((current) => ({ ...current, ...patch }));
      setFeedback(EMPTY_FEEDBACK);
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (validationMessage !== null) {
      setFeedback({ kind: "error", message: validationMessage });
      return;
    }
    setSaving(true);
    setFeedback(EMPTY_FEEDBACK);
    try {
      const output = await props.writeProxySettings(
        buildProxySettingsInput(props.agentEnvironment, draftSettings),
      );
      setSavedSettings(output.settings);
      setDraftSettings(output.settings);
      setFeedback({
        kind: "success",
        message: t("settings.config.proxy.savedMessage"),
      });
    } catch (error) {
      setFeedback({ kind: "error", message: toErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  }, [
    draftSettings,
    props.agentEnvironment,
    props.writeProxySettings,
    t,
    validationMessage,
  ]);

  return (
    <section className="settings-card settings-config-card">
      <div className="settings-section-head">
        <strong>{t("settings.config.proxy.title")}</strong>
        <button
          type="button"
          className="settings-head-action"
          disabled={actionDisabled}
          onClick={() => void handleSave()}
        >
          {saving ? t("settings.config.proxy.saving") : t("settings.config.proxy.saveAction")}
        </button>
      </div>
      <p className="settings-note settings-note-pad">{t("settings.config.proxy.description")}</p>
      <p className="settings-note settings-note-pad">
        {t("settings.config.proxy.currentEnvironmentNote", { environment: environmentLabel })}
      </p>
      <div className="settings-row">
        <div className="settings-row-copy">
          <div className="settings-row-heading">{t("settings.config.proxy.enabledLabel")}</div>
          <p className="settings-row-meta">{t("settings.config.proxy.enabledDescription")}</p>
          <p className="settings-row-note">
            {draftSettings.enabled
              ? t("settings.config.proxy.enabledOnNote")
              : t("settings.config.proxy.enabledOffNote")}
          </p>
        </div>
        <div className="settings-row-control">
          <ToggleSwitch
            checked={draftSettings.enabled}
            disabled={props.busy || loading || saving}
            label={t("settings.config.proxy.enabledLabel")}
            onToggle={() => updateDraft({ enabled: !draftSettings.enabled })}
          />
        </div>
      </div>
      <div className="settings-row">
        <div className="settings-row-copy">
          <strong>{t("settings.config.proxy.httpLabel")}</strong>
          <p>{t("settings.config.proxy.httpDescription")}</p>
        </div>
        <div className="settings-row-control">
          <input
            type="url"
            className="settings-text-input settings-font-input"
            aria-label={t("settings.config.proxy.httpLabel")}
            placeholder="http://127.0.0.1:8080"
            value={draftSettings.httpProxy}
            disabled={props.busy || loading || saving}
            onChange={(event) => updateDraft({ httpProxy: event.currentTarget.value })}
          />
        </div>
      </div>
      <div className="settings-row">
        <div className="settings-row-copy">
          <strong>{t("settings.config.proxy.httpsLabel")}</strong>
          <p>{t("settings.config.proxy.httpsDescription")}</p>
        </div>
        <div className="settings-row-control">
          <input
            type="url"
            className="settings-text-input settings-font-input"
            aria-label={t("settings.config.proxy.httpsLabel")}
            placeholder="http://127.0.0.1:8080"
            value={draftSettings.httpsProxy}
            disabled={props.busy || loading || saving}
            onChange={(event) => updateDraft({ httpsProxy: event.currentTarget.value })}
          />
        </div>
      </div>
      <div className="settings-row">
        <div className="settings-row-copy">
          <strong>{t("settings.config.proxy.noProxyLabel")}</strong>
          <p>{t("settings.config.proxy.noProxyDescription")}</p>
        </div>
        <div className="settings-row-control">
          <input
            type="text"
            className="settings-text-input settings-font-input"
            aria-label={t("settings.config.proxy.noProxyLabel")}
            placeholder="localhost,127.0.0.1,.internal"
            value={draftSettings.noProxy}
            disabled={props.busy || loading || saving}
            onChange={(event) => updateDraft({ noProxy: event.currentTarget.value })}
          />
        </div>
      </div>
      <p className="settings-note settings-note-pad">{t("settings.config.proxy.hostRuntimeNote")}</p>
      <p className="settings-note settings-note-pad">{t("settings.config.proxy.manualRestartNote")}</p>
      {loading ? (
        <p className="settings-status-note">{t("settings.config.proxy.loading")}</p>
      ) : null}
      {validationMessage !== null && feedback.kind === "idle" ? (
        <p className="settings-status-note settings-status-note-error">{validationMessage}</p>
      ) : null}
      {feedback.kind !== "idle" ? (
        <p className={feedbackClassName(feedback.kind)}>{feedback.message}</p>
      ) : null}
    </section>
  );
}
