export type WorkspaceOpener =
  | "vscode"
  | "visualStudio"
  | "githubDesktop"
  | "explorer"
  | "terminal"
  | "gitBash";

export type AgentEnvironment = "windowsNative" | "wsl";

export type EmbeddedTerminalShell = "powerShell" | "commandPrompt" | "gitBash";
