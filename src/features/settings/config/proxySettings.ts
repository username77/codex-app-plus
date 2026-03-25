import type {
  AgentEnvironment,
  ProxySettings,
  UpdateProxySettingsInput,
} from "../../../bridge/types";

export const EMPTY_PROXY_SETTINGS: ProxySettings = {
  enabled: false,
  httpProxy: "",
  httpsProxy: "",
  noProxy: "",
};

export function normalizeProxySettings(settings: ProxySettings): ProxySettings {
  return {
    enabled: settings.enabled,
    httpProxy: settings.httpProxy.trim(),
    httpsProxy: settings.httpsProxy.trim(),
    noProxy: settings.noProxy.trim(),
  };
}

export function hasProxySettingsChanges(
  saved: ProxySettings,
  draft: ProxySettings,
): boolean {
  const normalizedSaved = normalizeProxySettings(saved);
  const normalizedDraft = normalizeProxySettings(draft);
  return normalizedSaved.enabled !== normalizedDraft.enabled
    || normalizedSaved.httpProxy !== normalizedDraft.httpProxy
    || normalizedSaved.httpsProxy !== normalizedDraft.httpsProxy
    || normalizedSaved.noProxy !== normalizedDraft.noProxy;
}

export function isProxyUrl(value: string): boolean {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return true;
  }
  if (/\s/.test(normalized)) {
    return false;
  }
  const [scheme, rest] = normalized.split("://");
  if (scheme === undefined || rest === undefined) {
    return false;
  }
  return scheme.length > 0 && rest.length > 0;
}

export function buildProxySettingsInput(
  agentEnvironment: AgentEnvironment,
  settings: ProxySettings,
): UpdateProxySettingsInput {
  return {
    agentEnvironment,
    ...normalizeProxySettings(settings),
  };
}
