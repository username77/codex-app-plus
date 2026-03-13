import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { JsonObject, McpConfigServerView } from "../../settings/config/mcpConfig";
import { useI18n, type MessageKey } from "../../../i18n";
import {
  buildMcpServerConfigValue,
  createMcpServerFormState,
  type McpServerFormMessages,
  type McpServerFormErrors,
  type McpServerFormState,
  validateMcpServerForm
} from "../model/mcpFormModel";

const TRANSPORT_LABEL_KEYS: Record<McpServerFormState["type"], MessageKey> = {
  stdio: "settings.mcp.transport.stdio",
  http: "settings.mcp.transport.http",
  sse: "settings.mcp.transport.sse"
};

interface McpServerDialogProps {
  readonly open: boolean;
  readonly saving: boolean;
  readonly server: McpConfigServerView | null;
  readonly submitError: string | null;
  onClose: () => void;
  onSubmit: (serverId: string, value: JsonObject) => Promise<void>;
}

function FieldShell(props: { readonly label: string; readonly error?: string; readonly children: JSX.Element }): JSX.Element {
  return (
    <label className="mcp-form-field">
      <span className="mcp-form-label">{props.label}</span>
      {props.children}
      {props.error ? <span className="mcp-form-error">{props.error}</span> : null}
    </label>
  );
}

function TextField(props: {
  readonly label: string;
  readonly value: string;
  readonly disabled?: boolean;
  readonly error?: string;
  readonly onChange: (value: string) => void;
}): JSX.Element {
  return (
    <FieldShell label={props.label} error={props.error}>
      <input className="mcp-form-input" type="text" value={props.value} disabled={props.disabled} onChange={(event) => props.onChange(event.target.value)} />
    </FieldShell>
  );
}

function TextAreaField(props: {
  readonly label: string;
  readonly value: string;
  readonly rows?: number;
  readonly error?: string;
  readonly onChange: (value: string) => void;
}): JSX.Element {
  return (
    <FieldShell label={props.label} error={props.error}>
      <textarea className="mcp-form-textarea" rows={props.rows ?? 4} value={props.value} onChange={(event) => props.onChange(event.target.value)} />
    </FieldShell>
  );
}

function TypeSpecificFields(props: {
  readonly form: McpServerFormState;
  readonly errors: McpServerFormErrors;
  readonly labels: {
    readonly command: string;
    readonly args: string;
    readonly cwd: string;
    readonly env: string;
    readonly url: string;
    readonly headers: string;
  };
  readonly onChange: <K extends keyof McpServerFormState>(key: K, value: McpServerFormState[K]) => void;
}): JSX.Element {
  if (props.form.type === "stdio") {
    return (
      <>
        <TextField label={props.labels.command} value={props.form.command} error={props.errors.command} onChange={(value) => props.onChange("command", value)} />
        <TextAreaField label={props.labels.args} value={props.form.argsText} rows={4} onChange={(value) => props.onChange("argsText", value)} />
        <TextField label={props.labels.cwd} value={props.form.cwd} onChange={(value) => props.onChange("cwd", value)} />
        <TextAreaField label={props.labels.env} value={props.form.envText} rows={4} error={props.errors.envText} onChange={(value) => props.onChange("envText", value)} />
      </>
    );
  }
  return (
    <>
      <TextField label={props.labels.url} value={props.form.url} error={props.errors.url} onChange={(value) => props.onChange("url", value)} />
      <TextAreaField label={props.labels.headers} value={props.form.headersText} rows={4} error={props.errors.headersText} onChange={(value) => props.onChange("headersText", value)} />
    </>
  );
}

function createFormMessages(t: ReturnType<typeof useI18n>["t"]): McpServerFormMessages {
  return {
    idRequired: t("settings.mcp.validation.idRequired"),
    idNoDot: t("settings.mcp.validation.idNoDot"),
    commandRequired: t("settings.mcp.validation.commandRequired"),
    urlRequired: (type) => t("settings.mcp.validation.urlRequired", {
      type: t(TRANSPORT_LABEL_KEYS[type])
    }),
    urlInvalid: t("settings.mcp.validation.urlInvalid"),
    envLabel: t("settings.mcp.dialog.envLabel"),
    headersLabel: t("settings.mcp.dialog.headersLabel"),
    keyValueFormat: (label) => t("settings.mcp.validation.keyValueFormat", { label }),
    keyValueEmptyKey: (label) => t("settings.mcp.validation.keyValueEmptyKey", { label })
  };
}

export function McpServerDialog(props: McpServerDialogProps): JSX.Element | null {
  const { t } = useI18n();
  const [form, setForm] = useState<McpServerFormState>(createMcpServerFormState(null));
  const [errors, setErrors] = useState<McpServerFormErrors>({});
  const messages = useMemo(() => createFormMessages(t), [t]);

  useEffect(() => {
    if (props.open) {
      setForm(createMcpServerFormState(props.server));
      setErrors({});
    }
  }, [props.open, props.server]);

  const title = useMemo(
    () => (props.server === null
      ? t("settings.mcp.dialog.addTitle")
      : t("settings.mcp.dialog.editTitle", { name: props.server.name })),
    [props.server, t]
  );
  if (!props.open) {
    return null;
  }

  const updateForm = <K extends keyof McpServerFormState>(key: K, value: McpServerFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateMcpServerForm(form, messages);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    await props.onSubmit(form.id.trim(), buildMcpServerConfigValue(form, messages, props.server?.config));
  };

  return (
    <div className="settings-dialog-backdrop" role="presentation" onClick={props.onClose}>
      <section className="settings-dialog mcp-dialog" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <header className="settings-dialog-header">
          <strong>{title}</strong>
          <button type="button" className="settings-dialog-close" onClick={props.onClose} aria-label={t("settings.mcp.dialog.closeAction")}>×</button>
        </header>
        <form className="settings-dialog-body mcp-form" onSubmit={handleSubmit}>
          <div className="mcp-form-grid">
            <TextField label={t("settings.mcp.dialog.serverIdLabel")} value={form.id} disabled={props.server !== null} error={errors.id} onChange={(value) => updateForm("id", value)} />
            <TextField label={t("settings.mcp.dialog.displayNameLabel")} value={form.name} onChange={(value) => updateForm("name", value)} />
            <FieldShell label={t("settings.mcp.dialog.transportLabel")}>
              <select className="mcp-form-select" value={form.type} onChange={(event) => updateForm("type", event.target.value as McpServerFormState["type"])}>
                <option value="stdio">{t("settings.mcp.transport.stdio")}</option>
                <option value="http">{t("settings.mcp.transport.http")}</option>
                <option value="sse">{t("settings.mcp.transport.sse")}</option>
              </select>
            </FieldShell>
            <label className="mcp-form-toggle-row">
              <input type="checkbox" checked={form.enabled} onChange={(event) => updateForm("enabled", event.target.checked)} />
              <span>{t("settings.mcp.dialog.enabledLabel")}</span>
            </label>
            <TypeSpecificFields
              form={form}
              errors={errors}
              labels={{
                command: t("settings.mcp.dialog.commandLabel"),
                args: t("settings.mcp.dialog.argsLabel"),
                cwd: t("settings.mcp.dialog.cwdLabel"),
                env: t("settings.mcp.dialog.envLabel"),
                url: t("settings.mcp.dialog.urlLabel"),
                headers: t("settings.mcp.dialog.headersLabel")
              }}
              onChange={updateForm}
            />
          </div>
          {props.submitError ? <div className="mcp-form-submit-error">{props.submitError}</div> : null}
          <div className="mcp-form-actions">
            <button type="button" className="settings-action-btn" onClick={props.onClose} disabled={props.saving}>{t("settings.mcp.dialog.cancelAction")}</button>
            <button type="submit" className="settings-action-btn settings-action-btn-primary" disabled={props.saving}>{props.saving ? t("settings.mcp.dialog.saving") : t("settings.mcp.dialog.saveAction")}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
