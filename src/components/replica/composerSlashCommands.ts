export type ComposerSlashAction =
  | "createThread"
  | "toggleDiff"
  | "openMention"
  | "openModel"
  | "openPermissions";

export interface ComposerSlashCommand {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly action: ComposerSlashAction | null;
  readonly disabledReason: string | null;
}

const NOT_WIRED_REASON = "This official command is not wired in Codex App Plus yet.";

const COMMANDS: ReadonlyArray<ComposerSlashCommand> = [
  { id: "clear", name: "/clear", description: "Start a fresh thread draft.", action: "createThread", disabledReason: null },
  { id: "diff", name: "/diff", description: "Toggle the workspace diff sidebar.", action: "toggleDiff", disabledReason: null },
  { id: "mention", name: "/mention", description: "Search files and add a file mention.", action: "openMention", disabledReason: null },
  { id: "model", name: "/model", description: "Choose the model for the next turn.", action: "openModel", disabledReason: null },
  { id: "permissions", name: "/permissions", description: "Choose command permissions.", action: "openPermissions", disabledReason: null },
  { id: "compact", name: "/compact", description: "Compact thread context.", action: null, disabledReason: NOT_WIRED_REASON },
  { id: "config", name: "/config", description: "Edit client configuration.", action: null, disabledReason: NOT_WIRED_REASON },
  { id: "cost", name: "/cost", description: "Inspect token and cost usage.", action: null, disabledReason: NOT_WIRED_REASON },
  { id: "doctor", name: "/doctor", description: "Run environment diagnostics.", action: null, disabledReason: NOT_WIRED_REASON },
  { id: "help", name: "/help", description: "Show slash command help.", action: null, disabledReason: NOT_WIRED_REASON },
  { id: "history", name: "/history", description: "Browse recent thread history.", action: null, disabledReason: NOT_WIRED_REASON },
  { id: "init", name: "/init", description: "Generate project instructions.", action: null, disabledReason: NOT_WIRED_REASON },
  { id: "login", name: "/login", description: "Log in to the configured provider.", action: null, disabledReason: NOT_WIRED_REASON },
  { id: "logout", name: "/logout", description: "Log out of the current account.", action: null, disabledReason: NOT_WIRED_REASON },
  { id: "mcp", name: "/mcp", description: "Inspect MCP servers and tools.", action: null, disabledReason: NOT_WIRED_REASON },
  { id: "memory", name: "/memory", description: "Inspect or update memory state.", action: null, disabledReason: NOT_WIRED_REASON },
  { id: "review", name: "/review", description: "Enter review mode.", action: null, disabledReason: NOT_WIRED_REASON },
  { id: "status", name: "/status", description: "Show client and connection status.", action: null, disabledReason: NOT_WIRED_REASON },
  { id: "terminal-setup", name: "/terminal-setup", description: "Set up the terminal bridge.", action: null, disabledReason: NOT_WIRED_REASON },
  { id: "upgrade", name: "/upgrade", description: "Upgrade the installed Codex app.", action: null, disabledReason: NOT_WIRED_REASON },
  { id: "vim", name: "/vim", description: "Toggle Vim keybindings.", action: null, disabledReason: NOT_WIRED_REASON },
];

export function listComposerSlashCommands(query: string): ReadonlyArray<ComposerSlashCommand> {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length === 0) {
    return COMMANDS;
  }

  return COMMANDS.filter((command) => {
    const haystack = `${command.name} ${command.description}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}
