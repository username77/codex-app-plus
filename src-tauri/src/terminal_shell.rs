use std::path::PathBuf;

use portable_pty::CommandBuilder;

const WINDOWS_POWERSHELL_UTF8_INIT: &str = "[Console]::InputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); $OutputEncoding = [Console]::OutputEncoding; chcp.com 65001 > $null";

pub struct ShellConfig {
    pub program: String,
    pub args: Vec<String>,
    pub label: String,
}

pub fn build_shell_command(shell: &ShellConfig, cwd: Option<&PathBuf>) -> CommandBuilder {
    let mut command = CommandBuilder::new(&shell.program);
    if cfg!(target_os = "windows") {
        command.args(build_windows_shell_args(cwd));
        return command;
    }
    command.args(&shell.args);
    command
}

pub fn resolve_shell_config() -> ShellConfig {
    if cfg!(target_os = "windows") {
        return ShellConfig {
            program: "powershell.exe".to_string(),
            args: Vec::new(),
            label: "PowerShell".to_string(),
        };
    }
    let shell_path = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string());
    let label = PathBuf::from(&shell_path)
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("shell")
        .to_string();
    ShellConfig {
        program: shell_path,
        args: Vec::new(),
        label,
    }
}

fn build_windows_shell_args(cwd: Option<&PathBuf>) -> Vec<String> {
    let mut script = WINDOWS_POWERSHELL_UTF8_INIT.to_string();
    if let Some(path) = cwd {
        script.push_str("; Set-Location -LiteralPath '");
        script.push_str(&path.display().to_string().replace('\'', "''"));
        script.push('\'');
    }
    vec!["-NoLogo".to_string(), "-NoExit".to_string(), "-Command".to_string(), script]
}
