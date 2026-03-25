import {
  canonicalizeComposerSlashCommand,
  DEFAULT_COMPOSER_SLASH_CAPABILITIES,
  findComposerSlashDefinition,
  listComposerSlashDefinitions,
  type ComposerSlashAction,
  type ComposerSlashCapabilitySnapshot,
  type ComposerSlashCommandFlavor,
  type ComposerSlashDefinition,
} from "./composerSlashCommandCatalog";

export interface ComposerSlashCommand {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly flavor: ComposerSlashCommandFlavor;
  readonly action: ComposerSlashAction | null;
  readonly disabledReason: string | null;
  readonly metaLabel: string;
  readonly availableDuringTask: boolean;
  readonly supportsInlineArgs: boolean;
}

export interface ComposerSlashQuery {
  readonly raw: string;
  readonly search: string;
  readonly typedCommandId: string | null;
  readonly commandId: string | null;
  readonly argumentsText: string;
  readonly matchedAlias: string | null;
}

export interface ComposerSlashCommandContext {
  readonly hasThread: boolean;
  readonly hasWorkspace: boolean;
  readonly realtimeActive: boolean;
  readonly taskRunning: boolean;
  readonly capabilities: ComposerSlashCapabilitySnapshot;
}

const COMMAND_RUNNING_REASON = "当前有任务正在执行，官方不允许这条命令在运行中使用。";
const MISSING_THREAD_REASON = "请先打开一个线程。";
const MISSING_WORKSPACE_REASON = "请先选择工作区。";

export function parseComposerSlashQuery(query: string): ComposerSlashQuery {
  const trimmed = query.trim();
  const separator = trimmed.indexOf(" ");
  if (separator === -1) {
    const normalized = canonicalizeComposerSlashCommand(trimmed);
    return {
      raw: query,
      search: trimmed.toLowerCase(),
      typedCommandId: trimmed.length === 0 ? null : trimmed.toLowerCase(),
      commandId: normalized.commandId,
      argumentsText: "",
      matchedAlias: normalized.alias,
    };
  }
  const typedCommandId = trimmed.slice(0, separator).toLowerCase();
  const argumentsText = trimmed.slice(separator + 1).trim();
  const normalized = canonicalizeComposerSlashCommand(typedCommandId);
  return {
    raw: query,
    search: trimmed.toLowerCase(),
    typedCommandId,
    commandId: normalized.commandId,
    argumentsText,
    matchedAlias: normalized.alias,
  };
}

export function findComposerSlashCommand(id: string): ComposerSlashCommand | null {
  const match = listComposerSlashCommands(id, {
    hasThread: true,
    hasWorkspace: true,
    realtimeActive: false,
    taskRunning: false,
    capabilities: DEFAULT_COMPOSER_SLASH_CAPABILITIES,
  })
    .find((command) => command.id === id);
  return match ?? null;
}

export function listComposerSlashCommands(
  query: string,
  context: ComposerSlashCommandContext,
): ReadonlyArray<ComposerSlashCommand> {
  const parsed = parseComposerSlashQuery(query);
  const filtered = selectDefinitions(parsed, context.capabilities);
  return filtered.map((command) => createSlashCommand(command, parsed, context));
}

function selectDefinitions(
  parsed: ComposerSlashQuery,
  capabilities: ComposerSlashCapabilitySnapshot,
): ReadonlyArray<ComposerSlashDefinition> {
  if (parsed.commandId !== null) {
    const exact = findComposerSlashDefinition(parsed.commandId, capabilities);
    if (exact !== null) {
      return [exact];
    }
  }
  return filterDefinitions(parsed.search, capabilities);
}

function filterDefinitions(
  search: string,
  capabilities: ComposerSlashCapabilitySnapshot,
): ReadonlyArray<ComposerSlashDefinition> {
  const commands = listComposerSlashDefinitions(capabilities);
  if (search.length === 0) {
    return commands;
  }
  return commands.filter((command) => `${command.id} ${command.description}`.toLowerCase().includes(search));
}

function createSlashCommand(
  command: ComposerSlashDefinition,
  parsed: ComposerSlashQuery,
  context: ComposerSlashCommandContext,
): ComposerSlashCommand {
  return {
    id: command.id,
    name: `/${command.id}`,
    description: command.description,
    flavor: command.flavor,
    action: command.action,
    disabledReason: resolveDisabledReason(command, parsed, context),
    metaLabel: resolveMetaLabel(command, parsed),
    availableDuringTask: command.availableDuringTask,
    supportsInlineArgs: command.supportsInlineArgs,
  };
}

function resolveDisabledReason(
  command: ComposerSlashDefinition,
  parsed: ComposerSlashQuery,
  context: ComposerSlashCommandContext,
): string | null {
  if (command.unavailableReason !== undefined) {
    return command.unavailableReason;
  }
  if (command.requiresThread === true && !context.hasThread) {
    return MISSING_THREAD_REASON;
  }
  if (command.requiresWorkspace === true && !context.hasWorkspace) {
    return MISSING_WORKSPACE_REASON;
  }
  if (context.taskRunning && !command.availableDuringTask) {
    return COMMAND_RUNNING_REASON;
  }
  if (command.id === "realtime" && context.realtimeActive) {
    return null;
  }
  if (command.requiresArguments === true && parsed.commandId === command.id && parsed.argumentsText.length === 0) {
    return command.argumentHint ?? "请在命令后补充参数。";
  }
  if (command.inlineArgsDisabledReason !== undefined && parsed.commandId === command.id && parsed.argumentsText.length > 0) {
    return command.inlineArgsDisabledReason;
  }
  return null;
}

function resolveMetaLabel(command: ComposerSlashDefinition, parsed: ComposerSlashQuery): string {
  if (command.unavailableReason !== undefined) {
    return "Unavailable";
  }
  if (parsed.matchedAlias !== null && parsed.commandId === command.id) {
    return "Alias";
  }
  return command.flavor === "local" ? "Local" : "Official";
}
