import { useCallback, useEffect, useMemo, useState } from "react";
import type { ConfigMutationResult, McpRefreshResult } from "../../settings/config/configOperations";
import { omitServer, readMcpConfigView, type JsonObject, type McpConfigServerView } from "../../settings/config/mcpConfig";
import { MCP_RECOMMENDED_PRESETS } from "../../settings/config/mcpPresets";
import type { ConfigBatchWriteParams } from "../../../protocol/generated/v2/ConfigBatchWriteParams";
import type { ConfigValueWriteParams } from "../../../protocol/generated/v2/ConfigValueWriteParams";
import type { McpAuthStatus } from "../../../protocol/generated/v2/McpAuthStatus";
import type { McpServerStatus } from "../../../protocol/generated/v2/McpServerStatus";
import { useI18n, type MessageKey } from "../../../i18n";
import { McpServerDialog } from "./McpServerDialog";

interface McpSettingsPanelProps {
  readonly busy: boolean;
  readonly configSnapshot: unknown;
  readonly ready?: boolean;
  refreshMcpData: () => Promise<McpRefreshResult>;
  writeConfigValue: (params: ConfigValueWriteParams) => Promise<ConfigMutationResult>;
  batchWriteConfig: (params: ConfigBatchWriteParams) => Promise<ConfigMutationResult>;
}

function ToggleSwitch(props: { readonly checked: boolean; readonly disabled?: boolean; readonly onClick: () => void }): JSX.Element {
  return (
    <button type="button" className={props.checked ? "settings-toggle settings-toggle-on" : "settings-toggle"} role="switch" aria-checked={props.checked} disabled={props.disabled} onClick={props.onClick}>
      <span className="settings-toggle-knob" />
    </button>
  );
}

const ORIGIN_LABEL_KEYS: Record<NonNullable<McpConfigServerView["originType"]>, MessageKey> = {
  user: "settings.mcp.origin.user",
  project: "settings.mcp.origin.project",
  system: "settings.mcp.origin.system",
  mdm: "settings.mcp.origin.mdm",
  sessionFlags: "settings.mcp.origin.sessionFlags",
  legacyManagedConfigTomlFromFile: "settings.mcp.origin.legacyManagedConfigTomlFromFile",
  legacyManagedConfigTomlFromMdm: "settings.mcp.origin.legacyManagedConfigTomlFromMdm"
};
const AUTH_STATUS_LABEL_KEYS: Record<McpAuthStatus, MessageKey> = {
  unsupported: "settings.mcp.authStatus.unsupported",
  notLoggedIn: "settings.mcp.authStatus.notLoggedIn",
  bearerToken: "settings.mcp.authStatus.bearerToken",
  oAuth: "settings.mcp.authStatus.oAuth"
};
const TRANSPORT_LABEL_KEYS: Record<McpConfigServerView["type"], MessageKey> = {
  stdio: "settings.mcp.transport.stdio",
  http: "settings.mcp.transport.http",
  sse: "settings.mcp.transport.sse"
};

function getOriginLabel(
  t: ReturnType<typeof useI18n>["t"],
  originType: McpConfigServerView["originType"]
): string {
  if (originType === null) {
    return t("settings.mcp.origin.unknown");
  }
  return t(ORIGIN_LABEL_KEYS[originType]);
}

function getTransportLabel(
  t: ReturnType<typeof useI18n>["t"],
  type: McpConfigServerView["type"]
): string {
  return t(TRANSPORT_LABEL_KEYS[type]);
}

function getAuthStatusLabel(
  t: ReturnType<typeof useI18n>["t"],
  status: McpAuthStatus
): string {
  return t(AUTH_STATUS_LABEL_KEYS[status]);
}

function RuntimeMeta(props: { readonly server: McpConfigServerView }): JSX.Element {
  const { t } = useI18n();
  const runtime = props.server.runtime;
  if (runtime === null) {
    return <span className="mcp-runtime-badge">{t("settings.mcp.runtime.unloaded")}</span>;
  }
  return (
    <span className="mcp-runtime-badge">
      {t("settings.mcp.runtime.summary", {
        toolCount: runtime.toolCount,
        resourceCount: runtime.resourceCount,
        authStatus: getAuthStatusLabel(t, runtime.authStatus)
      })}
    </span>
  );
}

function ServerRow(props: {
  readonly server: McpConfigServerView;
  readonly pending: boolean;
  readonly readOnly?: boolean;
  onToggle?: (server: McpConfigServerView, enabled: boolean) => void;
  onEdit?: (server: McpConfigServerView) => void;
  onDelete?: (server: McpConfigServerView) => void;
}): JSX.Element {
  const { t } = useI18n();

  return (
    <div className="mcp-server-row">
      <div className="mcp-server-main">
        <div className="mcp-server-title-row"><strong>{props.server.name}</strong><span className="mcp-chip">{props.server.id}</span><span className="mcp-chip">{getOriginLabel(t, props.server.originType)}</span><span className="mcp-chip">{getTransportLabel(t, props.server.type)}</span></div>
        <div className="mcp-server-meta-row"><RuntimeMeta server={props.server} /></div>
      </div>
      <div className="mcp-server-actions">
        {props.readOnly ? <span className="mcp-readonly-label">{t("settings.mcp.readOnlyBadge")}</span> : <ToggleSwitch checked={props.server.enabled} disabled={props.pending} onClick={() => props.onToggle?.(props.server, !props.server.enabled)} />}
        {!props.readOnly ? <button type="button" className="settings-action-btn settings-action-btn-sm" disabled={props.pending} onClick={() => props.onEdit?.(props.server)}>{t("settings.mcp.editAction")}</button> : null}
        {!props.readOnly ? <button type="button" className="settings-action-btn settings-action-btn-sm mcp-danger-btn" disabled={props.pending} onClick={() => props.onDelete?.(props.server)}>{t("settings.mcp.deleteAction")}</button> : null}
      </div>
    </div>
  );
}

function DeleteDialog(props: { readonly server: McpConfigServerView | null; readonly pending: boolean; onCancel: () => void; onConfirm: (server: McpConfigServerView) => void }): JSX.Element | null {
  const { t } = useI18n();
  const server = props.server;
  if (server === null) {
    return null;
  }
  return (
    <div className="settings-dialog-backdrop" role="presentation" onClick={props.onCancel}>
      <section className="settings-dialog mcp-confirm-dialog" role="dialog" aria-modal="true" aria-label={t("settings.mcp.deleteDialog.title")} onClick={(event) => event.stopPropagation()}>
        <header className="settings-dialog-header"><strong>{t("settings.mcp.deleteDialog.title")}</strong><button type="button" className="settings-dialog-close" onClick={props.onCancel} aria-label={t("settings.mcp.deleteDialog.closeAction")}>×</button></header>
        <div className="settings-dialog-body mcp-confirm-body">
          <p>{t("settings.mcp.deleteDialog.description", { name: server.name, id: server.id })}</p>
          <div className="mcp-form-actions"><button type="button" className="settings-action-btn" onClick={props.onCancel} disabled={props.pending}>{t("settings.mcp.deleteDialog.cancelAction")}</button><button type="button" className="settings-action-btn settings-action-btn-primary" onClick={() => props.onConfirm(server)} disabled={props.pending}>{props.pending ? t("settings.mcp.deleteDialog.deleting") : t("settings.mcp.deleteDialog.confirmAction")}</button></div>
        </div>
      </section>
    </div>
  );
}

function CustomServersSection(props: {
  readonly view: ReturnType<typeof readMcpConfigView>;
  readonly busy: boolean;
  readonly pendingKey: string | null;
  readonly loading: boolean;
  readonly errorMessage: string | null;
  readonly onAdd: () => void;
  readonly onRefresh: () => void;
  readonly onToggle: (server: McpConfigServerView, enabled: boolean) => void;
  readonly onEdit: (server: McpConfigServerView) => void;
  readonly onDelete: (server: McpConfigServerView) => void;
}): JSX.Element {
  const { t } = useI18n();
  const writeTargetPath = props.view.writeTarget.filePath ?? t("settings.mcp.defaultWriteTarget");

  return (
    <section className="settings-card">
      <div className="settings-section-head"><strong>{t("settings.mcp.customTitle")}</strong><div className="mcp-head-actions"><button type="button" className="settings-action-btn settings-action-btn-sm" onClick={props.onAdd} disabled={props.busy || props.pendingKey !== null}>{t("settings.mcp.addServerAction")}</button><button type="button" className="settings-action-btn settings-action-btn-sm" onClick={props.onRefresh} disabled={props.loading || props.pendingKey !== null}>{props.loading ? t("settings.mcp.refreshing") : t("settings.mcp.refreshAction")}</button></div></div>
      {props.errorMessage ? <p className="settings-note mcp-error-note">{props.errorMessage}</p> : null}
      <p className="settings-note">{t("settings.mcp.writeTarget", { path: writeTargetPath })}</p>
      {props.view.userServers.length === 0 ? <div className="settings-empty">{t("settings.mcp.emptyUserServers")}</div> : props.view.userServers.map((server) => <ServerRow key={server.id} server={server} pending={props.pendingKey === server.id || props.pendingKey === `delete:${server.id}` || props.pendingKey === `save:${server.id}`} onToggle={props.onToggle} onEdit={props.onEdit} onDelete={props.onDelete} />)}
    </section>
  );
}

function ReadOnlyServersSection(props: {
  readonly servers: ReadonlyArray<McpConfigServerView>;
}): JSX.Element {
  const { t } = useI18n();

  return (
    <section className="settings-card">
      <div className="settings-section-head"><strong>{t("settings.mcp.readOnlyTitle")}</strong></div>
      {props.servers.length === 0 ? <div className="settings-empty">{t("settings.mcp.emptyReadOnlyServers")}</div> : props.servers.map((server) => <ServerRow key={server.id} server={server} pending={false} readOnly />)}
    </section>
  );
}

function RecommendedServersSection(props: {
  readonly installedPresetIds: ReadonlySet<string>;
  readonly pendingKey: string | null;
  readonly onInstall: (presetId: string) => void;
}): JSX.Element {
  const { t } = useI18n();

  return (
    <section className="settings-card">
      <div className="settings-section-head"><strong>{t("settings.mcp.recommendedTitle")}</strong></div>
      {MCP_RECOMMENDED_PRESETS.map((preset) => (
        <div key={preset.id} className="settings-reco-row">
          <div className="settings-reco-avatar">{t("settings.mcp.presetAvatar")}</div>
          <div className="settings-reco-text"><strong>{preset.label} <span>{t("settings.mcp.vendorLabel", { vendor: preset.vendor })}</span></strong><p>{t(preset.descriptionKey)}</p></div>
          <button type="button" className="settings-mini-btn" disabled={props.installedPresetIds.has(preset.id) || props.pendingKey === `install:${preset.id}`} onClick={() => props.onInstall(preset.id)}>{props.installedPresetIds.has(preset.id) ? t("settings.mcp.installed") : props.pendingKey === `install:${preset.id}` ? t("settings.mcp.installing") : t("settings.mcp.installAction")}</button>
        </div>
      ))}
    </section>
  );
}

export function McpSettingsPanel(props: McpSettingsPanelProps): JSX.Element {
  const { t } = useI18n();
  const [statuses, setStatuses] = useState<ReadonlyArray<McpServerStatus>>([]);
  const [loading, setLoading] = useState(props.ready === false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dialogServer, setDialogServer] = useState<McpConfigServerView | null | undefined>(undefined);
  const [deleteServer, setDeleteServer] = useState<McpConfigServerView | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const view = useMemo(() => readMcpConfigView(props.configSnapshot, statuses), [props.configSnapshot, statuses]);
  const syncStatuses = useCallback((items: ReadonlyArray<McpServerStatus>) => {
    setStatuses(items);
    setErrorMessage(null);
  }, []);

  const handleRefresh = useCallback(async () => {
    if (props.ready === false) {
      return;
    }
    setLoading(true);
    try {
      const result = await props.refreshMcpData();
      syncStatuses(result.statuses);
    } catch (error) {
      setErrorMessage(String(error));
    } finally {
      setLoading(false);
    }
  }, [props.ready, props.refreshMcpData, syncStatuses]);

  useEffect(() => {
    if (props.ready === false) {
      setLoading(true);
      setErrorMessage(null);
      return;
    }
    void handleRefresh();
  }, [handleRefresh, props.ready]);

  const runMutation = useCallback(async (key: string, runner: () => Promise<ConfigMutationResult>) => {
    setPendingKey(key);
    setSubmitError(null);
    setErrorMessage(null);
    try {
      const result = await runner();
      syncStatuses(result.statuses);
      return result;
    } catch (error) {
      const message = String(error);
      setErrorMessage(message);
      setSubmitError(message);
      throw error;
    } finally {
      setPendingKey(null);
    }
  }, [syncStatuses]);

  const handleToggle = useCallback((server: McpConfigServerView, enabled: boolean) => {
    void runMutation(server.id, () => props.writeConfigValue({ keyPath: `mcp_servers.${server.id}.enabled`, value: enabled, mergeStrategy: "upsert", filePath: view.writeTarget.filePath, expectedVersion: view.writeTarget.expectedVersion }));
  }, [props.writeConfigValue, runMutation, view.writeTarget]);

  const handleDelete = useCallback((server: McpConfigServerView) => {
    void runMutation(`delete:${server.id}`, () => props.batchWriteConfig({ edits: [{ keyPath: "mcp_servers", value: omitServer(view.userServerMap, server.id), mergeStrategy: "replace" }], filePath: view.writeTarget.filePath, expectedVersion: view.writeTarget.expectedVersion })).then(() => setDeleteServer(null));
  }, [props.batchWriteConfig, runMutation, view.userServerMap, view.writeTarget]);

  const handleInstall = useCallback((presetId: string) => {
    const preset = MCP_RECOMMENDED_PRESETS.find((item) => item.id === presetId);
    if (preset === undefined) {
      return;
    }
    void runMutation(`install:${preset.id}`, () => props.writeConfigValue({ keyPath: `mcp_servers.${preset.id}`, value: preset.value, mergeStrategy: "upsert", filePath: view.writeTarget.filePath, expectedVersion: view.writeTarget.expectedVersion }));
  }, [props.writeConfigValue, runMutation, view.writeTarget]);

  const handleSubmit = useCallback(async (serverId: string, value: JsonObject) => {
    await runMutation(`save:${serverId}`, () => props.writeConfigValue({ keyPath: `mcp_servers.${serverId}`, value, mergeStrategy: "upsert", filePath: view.writeTarget.filePath, expectedVersion: view.writeTarget.expectedVersion }));
    setDialogServer(undefined);
    setSubmitError(null);
  }, [props.writeConfigValue, runMutation, view.writeTarget]);

  return (
    <div className="settings-panel-group">
      <header className="settings-title-wrap"><h1 className="settings-page-title">{t("settings.mcp.title")}</h1><p className="settings-subtitle">{t("settings.mcp.subtitle")}</p></header>
      <CustomServersSection view={view} busy={props.busy} pendingKey={pendingKey} loading={loading} errorMessage={errorMessage} onAdd={() => setDialogServer(null)} onRefresh={() => void handleRefresh()} onToggle={handleToggle} onEdit={setDialogServer} onDelete={setDeleteServer} />
      <ReadOnlyServersSection servers={view.readOnlyServers} />
      <RecommendedServersSection installedPresetIds={view.installedPresetIds} pendingKey={pendingKey} onInstall={handleInstall} />
      <McpServerDialog open={dialogServer !== undefined} saving={pendingKey !== null} server={dialogServer ?? null} submitError={submitError} onClose={() => { setDialogServer(undefined); setSubmitError(null); }} onSubmit={handleSubmit} />
      <DeleteDialog server={deleteServer} pending={pendingKey !== null} onCancel={() => setDeleteServer(null)} onConfirm={handleDelete} />
    </div>
  );
}
