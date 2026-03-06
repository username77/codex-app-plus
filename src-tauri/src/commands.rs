use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

use tauri::{AppHandle, Emitter, State};

use crate::error::{AppError, AppResult};
use crate::events::{EVENT_CONTEXT_MENU_REQUESTED, EVENT_NOTIFICATION_REQUESTED};
use crate::models::{
    AppServerStartInput, ImportOfficialDataInput, OpenWorkspaceInput, RpcCancelInput,
    RpcRequestInput, RpcRequestOutput, ServerRequestResolveInput, ShowContextMenuInput,
    ShowNotificationInput, TerminalCloseInput, TerminalCreateInput, TerminalCreateOutput,
    TerminalResizeInput, TerminalWriteInput, WorkspaceOpener,
};
use crate::process_manager::ProcessManager;
use crate::terminal_manager::TerminalManager;

#[cfg(target_os = "windows")]
const DETACHED_PROCESS: u32 = 0x0000_0008;
#[cfg(target_os = "windows")]
const CREATE_NEW_PROCESS_GROUP: u32 = 0x0000_0200;

fn to_result<T>(result: AppResult<T>) -> Result<T, String> {
    result.map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn app_server_start(
    app: AppHandle,
    state: State<'_, ProcessManager>,
    input: AppServerStartInput,
) -> Result<(), String> {
    to_result(state.start(app, input).await)
}

#[tauri::command]
pub async fn app_server_stop(app: AppHandle, state: State<'_, ProcessManager>) -> Result<(), String> {
    to_result(state.stop(app).await)
}

#[tauri::command]
pub async fn app_server_restart(
    app: AppHandle,
    state: State<'_, ProcessManager>,
    input: AppServerStartInput,
) -> Result<(), String> {
    to_result(state.restart(app, input).await)
}

#[tauri::command]
pub async fn rpc_request(
    state: State<'_, ProcessManager>,
    input: RpcRequestInput,
) -> Result<RpcRequestOutput, String> {
    to_result(state.rpc_request(input).await)
}

#[tauri::command]
pub async fn rpc_cancel(state: State<'_, ProcessManager>, input: RpcCancelInput) -> Result<(), String> {
    to_result(state.rpc_cancel(input).await)
}

#[tauri::command]
pub async fn server_request_resolve(
    state: State<'_, ProcessManager>,
    input: ServerRequestResolveInput,
) -> Result<(), String> {
    to_result(state.resolve_server_request(input).await)
}

#[tauri::command]
pub fn app_open_external(url: String) -> Result<(), String> {
    if url.trim().is_empty() {
        return Err("url must not be empty".to_string());
    }
    to_result(open::that_detached(url).map_err(|error| AppError::Io(error.to_string())))
}

#[tauri::command]
pub fn app_open_workspace(input: OpenWorkspaceInput) -> Result<(), String> {
    to_result(open_workspace(input))
}

#[tauri::command]
pub fn app_open_codex_config_toml() -> Result<(), String> {
    let home = dirs::home_dir().ok_or_else(|| "failed to resolve home directory".to_string())?;
    let config_path = home.join(".codex").join("config.toml");
    if !config_path.exists() {
        return Err(format!("config.toml not found: {}", config_path.display()));
    }
    to_result(open::that_detached(config_path).map_err(|error| AppError::Io(error.to_string())))
}

#[tauri::command]
pub fn app_show_notification(app: AppHandle, input: ShowNotificationInput) -> Result<(), String> {
    if input.title.trim().is_empty() {
        return Err("notification.title must not be empty".to_string());
    }
    app.emit(EVENT_NOTIFICATION_REQUESTED, input)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn app_show_context_menu(app: AppHandle, input: ShowContextMenuInput) -> Result<(), String> {
    if input.items.is_empty() {
        return Err("context menu items must not be empty".to_string());
    }
    app.emit(EVENT_CONTEXT_MENU_REQUESTED, input)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn app_import_official_data(input: ImportOfficialDataInput) -> Result<(), String> {
    to_result(import_official_data(input))
}

#[tauri::command]
pub fn terminal_create_session(
    app: AppHandle,
    state: State<'_, TerminalManager>,
    input: TerminalCreateInput,
) -> Result<TerminalCreateOutput, String> {
    to_result(state.create_session(app, input))
}

#[tauri::command]
pub fn terminal_write(
    state: State<'_, TerminalManager>,
    input: TerminalWriteInput,
) -> Result<(), String> {
    to_result(state.write(input))
}

#[tauri::command]
pub fn terminal_resize(
    state: State<'_, TerminalManager>,
    input: TerminalResizeInput,
) -> Result<(), String> {
    to_result(state.resize(input))
}

#[tauri::command]
pub fn terminal_close_session(
    state: State<'_, TerminalManager>,
    input: TerminalCloseInput,
) -> Result<(), String> {
    to_result(state.close(input))
}

fn import_official_data(input: ImportOfficialDataInput) -> AppResult<()> {
    if input.source_path.trim().is_empty() {
        return Err(AppError::InvalidInput("sourcePath must not be empty".to_string()));
    }
    let source = PathBuf::from(input.source_path);
    if !source.exists() {
        return Err(AppError::InvalidInput("sourcePath does not exist".to_string()));
    }
    let local_data = dirs::data_local_dir()
        .ok_or_else(|| AppError::InvalidInput("failed to resolve LOCALAPPDATA".to_string()))?;
    let destination = local_data.join("CodexAppPlus").join("imported-official");
    copy_directory(&source, &destination)
}

fn open_workspace(input: OpenWorkspaceInput) -> AppResult<()> {
    if input.path.trim().is_empty() {
        return Err(AppError::InvalidInput("workspace path must not be empty".to_string()));
    }

    let workspace_path = PathBuf::from(input.path.trim());
    if !workspace_path.exists() {
        return Err(AppError::InvalidInput(format!(
            "workspace path does not exist: {}",
            workspace_path.display()
        )));
    }
    if !workspace_path.is_dir() {
        return Err(AppError::InvalidInput(format!(
            "workspace path is not a directory: {}",
            workspace_path.display()
        )));
    }

    match input.opener {
        WorkspaceOpener::Vscode => open::that_detached(create_vscode_workspace_url(&workspace_path))
            .map_err(|error| AppError::Io(error.to_string())),
        WorkspaceOpener::VisualStudio => {
            let program = resolve_visual_studio_program()?;
            spawn_detached(&program, &[workspace_path.display().to_string()], None)
        }
        WorkspaceOpener::GithubDesktop => {
            spawn_detached(Path::new("github"), &[".".to_string()], Some(&workspace_path))
        }
        WorkspaceOpener::Explorer => {
            open::that_detached(&workspace_path).map_err(|error| AppError::Io(error.to_string()))
        }
        WorkspaceOpener::Terminal => {
            let program = resolve_windows_terminal_program();
            spawn_detached(&program, &["-d".to_string(), workspace_path.display().to_string()], None)
        }
        WorkspaceOpener::GitBash => {
            let program = resolve_git_bash_program();
            spawn_detached(
                &program,
                &[format!("--cd={}", workspace_path.display())],
                None,
            )
        }
    }
}

fn create_vscode_workspace_url(workspace_path: &Path) -> String {
    format!("vscode://file/{}", encode_file_url_path(workspace_path))
}

fn encode_file_url_path(workspace_path: &Path) -> String {
    workspace_path
        .to_string_lossy()
        .replace('\\', "/")
        .split('/')
        .filter(|segment| !segment.is_empty())
        .enumerate()
        .map(|(index, segment)| encode_file_url_segment(segment, index == 0))
        .collect::<Vec<_>>()
        .join("/")
}

fn encode_file_url_segment(segment: &str, first_segment: bool) -> String {
    if first_segment && segment.ends_with(':') {
        return segment.to_string();
    }

    let mut encoded = String::new();
    for byte in segment.as_bytes() {
        if byte.is_ascii_alphanumeric() || matches!(*byte, b'-' | b'_' | b'.' | b'~') {
            encoded.push(*byte as char);
        } else {
            encoded.push_str(&format!("%{byte:02X}"));
        }
    }
    encoded
}

fn resolve_visual_studio_program() -> AppResult<PathBuf> {
    let Some(program_files_x86) = std::env::var_os("ProgramFiles(x86)") else {
        return Ok(PathBuf::from("devenv.exe"));
    };

    let vswhere_path = PathBuf::from(program_files_x86)
        .join("Microsoft Visual Studio")
        .join("Installer")
        .join("vswhere.exe");
    if !vswhere_path.exists() {
        return Ok(PathBuf::from("devenv.exe"));
    }

    let output = Command::new(vswhere_path)
        .args(["-latest", "-products", "*", "-find", r"Common7\IDE\devenv.exe"])
        .output()?;
    if !output.status.success() {
        return Ok(PathBuf::from("devenv.exe"));
    }

    let executable = String::from_utf8_lossy(&output.stdout)
        .lines()
        .find(|line| !line.trim().is_empty())
        .map(PathBuf::from);
    Ok(executable.unwrap_or_else(|| PathBuf::from("devenv.exe")))
}

fn resolve_windows_terminal_program() -> PathBuf {
    let candidate = dirs::data_local_dir()
        .unwrap_or_default()
        .join("Microsoft")
        .join("WindowsApps")
        .join("wt.exe");
    if candidate.exists() {
        candidate
    } else {
        PathBuf::from("wt.exe")
    }
}

fn resolve_git_bash_program() -> PathBuf {
    let candidates = [
        std::env::var_os("ProgramFiles").map(|value| PathBuf::from(value).join("Git").join("git-bash.exe")),
        std::env::var_os("ProgramFiles(x86)")
            .map(|value| PathBuf::from(value).join("Git").join("git-bash.exe")),
        dirs::data_local_dir().map(|path| path.join("Programs").join("Git").join("git-bash.exe")),
    ];

    candidates
        .into_iter()
        .flatten()
        .find(|path| path.exists())
        .unwrap_or_else(|| PathBuf::from("git-bash.exe"))
}

fn spawn_detached(program: &Path, args: &[String], current_dir: Option<&Path>) -> AppResult<()> {
    let mut command = Command::new(program);
    command
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());

    if let Some(path) = current_dir {
        command.current_dir(path);
    }

    #[cfg(target_os = "windows")]
    {
        command.creation_flags(DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP);
    }

    command
        .spawn()
        .map(|_| ())
        .map_err(|error| AppError::Io(error.to_string()))
}

fn copy_directory(source: &Path, destination: &Path) -> AppResult<()> {
    std::fs::create_dir_all(destination)?;
    for entry in std::fs::read_dir(source)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let target = destination.join(entry.file_name());
        if file_type.is_dir() {
            copy_directory(&entry.path(), &target)?;
        } else if file_type.is_file() {
            std::fs::copy(entry.path(), target)?;
        }
    }
    Ok(())
}
