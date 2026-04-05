import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import type {
  CodexProviderDraft,
  CodexProviderRecord,
} from "../../../bridge/types";

const DEFAULT_API_KEY = "";
const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "";
const DEFAULT_PROVIDER_KEY = "";
const DEFAULT_REQUIRES_OPENAI_AUTH = false;
const DEFAULT_WIRE_API = "responses";
const RESERVED_PROVIDER_KEYS = new Set(["openai", "ollama", "lmstudio"]);

type JsonObject = Record<string, unknown>;
type TomlObject = Record<string, unknown>;

interface ConfigTomlBasicsInput {
  readonly providerKey: string;
  readonly providerName: string;
  readonly model: string;
  readonly baseUrl: string;
}

export interface CodexProviderValidationErrors {
  name?: string;
  providerKey?: string;
  apiKey?: string;
  baseUrl?: string;
  authJsonText?: string;
  configTomlText?: string;
}

export interface CodexConfigFields {
  readonly providerKey: string;
  readonly providerName: string;
  readonly model: string;
  readonly baseUrl: string;
}

export function createEmptyCodexProviderDraft(): CodexProviderDraft {
  return {
    id: null,
    name: "",
    providerKey: DEFAULT_PROVIDER_KEY,
    model: DEFAULT_MODEL,
    apiKey: DEFAULT_API_KEY,
    baseUrl: DEFAULT_BASE_URL,
    authJsonText: createAuthJsonText(DEFAULT_API_KEY),
    configTomlText: createConfigTomlText({
      providerKey: DEFAULT_PROVIDER_KEY,
      providerName: DEFAULT_PROVIDER_KEY,
      model: DEFAULT_MODEL,
      baseUrl: DEFAULT_BASE_URL,
    }),
  };
}

export function createDraftFromRecord(record: CodexProviderRecord): CodexProviderDraft {
  return {
    id: record.id,
    name: record.name,
    providerKey: record.providerKey,
    model: record.model,
    apiKey: record.apiKey,
    baseUrl: record.baseUrl,
    authJsonText: record.authJsonText,
    configTomlText: tryNormalizeConfigTomlText(record.configTomlText, {
      providerKey: record.providerKey,
      providerName: record.name,
      model: record.model,
      baseUrl: record.baseUrl,
    }),
  };
}

export function createAuthJsonText(apiKey: string): string {
  return `${JSON.stringify({ OPENAI_API_KEY: apiKey }, null, 2)}\n`;
}

export function createConfigTomlText(input: ConfigTomlBasicsInput): string {
  if (!shouldGenerateProviderPatch(input.providerKey)) {
    return "";
  }
  return toToml(buildProviderPatch({}, input));
}

export function normalizeConfigTomlText(
  configTomlText: string,
  input: ConfigTomlBasicsInput,
): string {
  return updateConfigTomlWithBasics(parseConfigTomlText(configTomlText), input);
}

export function parseAuthJsonText(authJsonText: string): JsonObject {
  const parsed = JSON.parse(authJsonText) as unknown;
  if (!isRecord(parsed)) {
    throw new Error("auth.json must be a JSON object");
  }
  return parsed;
}

export function parseConfigTomlText(configTomlText: string): TomlObject {
  const parsed = parseToml(configTomlText) as unknown;
  if (!isRecord(parsed)) {
    throw new Error("config.toml must be a TOML table");
  }
  return parsed;
}

export function extractApiKeyFromAuthJson(authJsonText: string): string {
  const parsed = parseAuthJsonText(authJsonText);
  const apiKey = parsed.OPENAI_API_KEY;
  if (typeof apiKey !== "string") {
    throw new Error("auth.json is missing OPENAI_API_KEY");
  }
  return apiKey;
}

export function extractCodexConfigFields(configTomlText: string): CodexConfigFields {
  const parsed = parseConfigTomlText(configTomlText);
  const providerKey = readString(parsed, "model_provider", "config.toml is missing model_provider");
  const providerConfig = readProviderConfig(parsed, providerKey);
  return {
    providerKey,
    providerName: readString(providerConfig, "name", "config.toml is missing the current provider name"),
    model: readOptionalString(parsed, "model"),
    baseUrl: readString(providerConfig, "base_url", "config.toml is missing the current provider base_url"),
  };
}

export function updateAuthJsonWithApiKey(authObject: JsonObject, apiKey: string): string {
  return `${JSON.stringify({ ...authObject, OPENAI_API_KEY: apiKey }, null, 2)}\n`;
}

export function updateConfigTomlWithBasics(
  configObject: TomlObject,
  input: ConfigTomlBasicsInput,
): string {
  if (!shouldGenerateProviderPatch(input.providerKey)) {
    return toToml(configObject);
  }
  return toToml(buildProviderPatch(configObject, input));
}

export function validateCodexProviderDraft(
  draft: CodexProviderDraft,
  providers: ReadonlyArray<CodexProviderRecord>,
): CodexProviderValidationErrors {
  const errors: CodexProviderValidationErrors = {};
  const providerKey = draft.providerKey.trim();
  if (draft.name.trim().length === 0) errors.name = "Name is required";
  if (providerKey.length === 0) {
    errors.providerKey = "providerKey is required";
  } else if (isReservedProviderKey(providerKey)) {
    errors.providerKey = `providerKey cannot use a built-in id like ${providerKey}; try something like openai-custom`;
  }
  if (draft.apiKey.trim().length === 0) errors.apiKey = "API Key is required";
  if (draft.baseUrl.trim().length === 0) errors.baseUrl = "Base URL is required";

  const duplicated = errors.providerKey === undefined
    && providers.some((provider) => provider.providerKey === providerKey && provider.id !== draft.id);
  if (duplicated) {
    errors.providerKey = "providerKey already exists";
  }

  try {
    if (extractApiKeyFromAuthJson(draft.authJsonText) !== draft.apiKey.trim()) {
      errors.authJsonText = "auth.json does not match the API Key field";
    }
  } catch (error) {
    errors.authJsonText = toErrorMessage(error);
  }

  if (shouldValidateGeneratedConfig(draft)) {
    try {
      const fields = extractCodexConfigFields(draft.configTomlText);
      if (fields.providerKey !== providerKey) {
        errors.configTomlText = "config.toml does not match the providerKey field";
      } else if (fields.model !== draft.model.trim()) {
        errors.configTomlText = "config.toml does not match the Model field";
      } else if (fields.baseUrl !== draft.baseUrl.trim()) {
        errors.configTomlText = "config.toml does not match the Base URL field";
      } else if (draft.name.trim().length > 0 && fields.providerName !== draft.name.trim()) {
        errors.configTomlText = "config.toml does not match the Name field";
      }
    } catch (error) {
      errors.configTomlText = toErrorMessage(error);
    }
  }

  return errors;
}

export function readCurrentCodexProviderKey(configSnapshot: unknown): string | null {
  if (!isRecord(configSnapshot) || !isRecord(configSnapshot.config)) {
    return null;
  }

  return typeof configSnapshot.config.model_provider === "string"
    ? configSnapshot.config.model_provider
    : null;
}

function tryNormalizeConfigTomlText(
  configTomlText: string,
  input: ConfigTomlBasicsInput,
): string {
  try {
    return normalizeConfigTomlText(configTomlText, input);
  } catch {
    return configTomlText;
  }
}

function buildProviderPatch(source: TomlObject, input: ConfigTomlBasicsInput): TomlObject {
  const providerKey = input.providerKey.trim();
  const providerName = input.providerName.trim() || providerKey;
  const model = input.model.trim();
  const sourceProvider = findSourceProviderConfig(source, providerKey);
  const patch: TomlObject = {
    model_provider: providerKey,
    model_providers: {
      [providerKey]: {
        ...sourceProvider,
        name: providerName,
        base_url: input.baseUrl.trim(),
        wire_api: typeof sourceProvider.wire_api === "string" ? sourceProvider.wire_api : DEFAULT_WIRE_API,
        requires_openai_auth: typeof sourceProvider.requires_openai_auth === "boolean"
          ? sourceProvider.requires_openai_auth
          : DEFAULT_REQUIRES_OPENAI_AUTH,
      },
    },
  };
  if (model.length > 0) {
    patch.model = model;
  }
  return patch;
}

function shouldGenerateProviderPatch(providerKey: string): boolean {
  const normalized = providerKey.trim();
  return normalized.length > 0 && !isReservedProviderKey(normalized);
}

function shouldValidateGeneratedConfig(draft: CodexProviderDraft): boolean {
  return shouldGenerateProviderPatch(draft.providerKey)
    && draft.baseUrl.trim().length > 0
    && draft.configTomlText.trim().length > 0;
}

function isReservedProviderKey(providerKey: string): boolean {
  return RESERVED_PROVIDER_KEYS.has(providerKey.trim());
}

function findSourceProviderConfig(source: TomlObject, providerKey: string): JsonObject {
  const providers = readOptionalObject(source.model_providers, "config.toml model_providers must be a table");
  const direct = readOptionalObject(providers[providerKey], "provider config must be a table");
  if (Object.keys(direct).length > 0) {
    return direct;
  }

  const activeKey = typeof source.model_provider === "string" ? source.model_provider.trim() : "";
  if (activeKey.length > 0 && activeKey !== providerKey) {
    const active = readOptionalObject(providers[activeKey], "provider config must be a table");
    if (Object.keys(active).length > 0) {
      return active;
    }
  }

  return readFirstProviderConfig(providers);
}

function readFirstProviderConfig(providers: JsonObject): JsonObject {
  const [firstKey] = Object.keys(providers);
  if (firstKey === undefined) {
    return {};
  }
  return readOptionalObject(providers[firstKey], "provider config must be a table");
}

function readProviderConfig(source: JsonObject, providerKey: string): JsonObject {
  const providers = readOptionalObject(source.model_providers, "config.toml is missing model_providers");
  return readOptionalObject(providers[providerKey], "config.toml is missing the current provider config");
}

function readOptionalObject(value: unknown, message: string): JsonObject {
  if (value === undefined) {
    return {};
  }
  if (!isRecord(value)) {
    throw new Error(message);
  }
  return value;
}

function readString(source: JsonObject, key: string, message: string): string {
  const value = source[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(message);
  }
  return value.trim();
}

function readOptionalString(source: JsonObject, key: string): string {
  const value = source[key];
  return typeof value === "string" ? value.trim() : "";
}

function toToml(doc: TomlObject): string {
  return `${stringifyToml(doc)}\n`;
}

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
