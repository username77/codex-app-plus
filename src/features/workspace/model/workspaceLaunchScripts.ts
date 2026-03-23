export const LAUNCH_SCRIPT_ICON_IDS = [
  "play",
  "server",
  "globe",
  "terminal",
] as const;

export type LaunchScriptIconId = (typeof LAUNCH_SCRIPT_ICON_IDS)[number];

export interface LaunchScriptEntry {
  readonly id: string;
  readonly script: string;
  readonly icon: LaunchScriptIconId;
  readonly label: string | null;
}

export interface WorkspaceLaunchScriptConfig {
  readonly launchScript: string | null;
  readonly launchScripts: ReadonlyArray<LaunchScriptEntry> | null;
}

export const DEFAULT_LAUNCH_SCRIPT_ICON: LaunchScriptIconId = "play";

export function getLaunchScriptIconLabel(icon: LaunchScriptIconId): string {
  if (icon === "server") {
    return "服务";
  }
  if (icon === "globe") {
    return "网页";
  }
  if (icon === "terminal") {
    return "终端";
  }
  return "运行";
}

function normalizeLaunchScriptText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  return value.trim().length > 0 ? value : null;
}

function normalizeLaunchScriptLabel(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function coerceLaunchScriptIconId(value: unknown): LaunchScriptIconId {
  return LAUNCH_SCRIPT_ICON_IDS.includes(value as LaunchScriptIconId)
    ? (value as LaunchScriptIconId)
    : DEFAULT_LAUNCH_SCRIPT_ICON;
}

function normalizeLaunchScriptEntry(value: unknown): LaunchScriptEntry | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as {
    readonly icon?: unknown;
    readonly id?: unknown;
    readonly label?: unknown;
    readonly script?: unknown;
  };
  if (typeof record.id !== "string" || record.id.trim().length === 0) {
    return null;
  }
  const script = normalizeLaunchScriptText(record.script);
  if (script === null) {
    return null;
  }
  return {
    id: record.id,
    script,
    icon: coerceLaunchScriptIconId(record.icon),
    label: normalizeLaunchScriptLabel(record.label),
  };
}

function normalizeLaunchScriptEntries(
  value: unknown,
): ReadonlyArray<LaunchScriptEntry> | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const entries = value
    .map(normalizeLaunchScriptEntry)
    .filter((entry): entry is LaunchScriptEntry => entry !== null);
  return entries.length > 0 ? entries : null;
}

export function normalizeWorkspaceLaunchScriptConfig(
  value: unknown,
): WorkspaceLaunchScriptConfig {
  if (typeof value !== "object" || value === null) {
    return {
      launchScript: null,
      launchScripts: null,
    };
  }
  const record = value as {
    readonly launchScript?: unknown;
    readonly launchScripts?: unknown;
  };
  return {
    launchScript: normalizeLaunchScriptText(record.launchScript),
    launchScripts: normalizeLaunchScriptEntries(record.launchScripts),
  };
}

export function createLaunchScriptEntryId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `launch-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
