use std::collections::HashMap;
#[path = "terminal_output_decoder.rs"]
mod terminal_output_decoder;
use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex, MutexGuard};
use portable_pty::{
    native_pty_system, Child, ChildKiller, CommandBuilder, MasterPty, PtySize,
};
use terminal_output_decoder::Utf8ChunkDecoder;
use tauri::AppHandle;
use crate::error::{AppError, AppResult};
use crate::events::{emit_fatal, emit_terminal_exit, emit_terminal_output};
use crate::models::{
    TerminalCloseInput, TerminalCreateInput, TerminalCreateOutput, TerminalResizeInput,
    TerminalWriteInput,
};
const DEFAULT_COLUMNS: u16 = 120;
const DEFAULT_ROWS: u16 = 32;
const OUTPUT_BUFFER_SIZE: usize = 4096;
const ZERO_PIXELS: u16 = 0;
const WINDOWS_POWERSHELL_UTF8_INIT: &str = "[Console]::InputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); $OutputEncoding = [Console]::OutputEncoding; chcp.com 65001 > $null";
type SessionMap = Arc<Mutex<HashMap<String, Arc<TerminalSession>>>>;
struct TerminalSession {
    master: Mutex<Box<dyn MasterPty + Send>>,
    writer: Mutex<Box<dyn Write + Send>>,
    killer: Mutex<Box<dyn ChildKiller + Send + Sync>>,
}
impl TerminalSession {
    fn new(
        master: Box<dyn MasterPty + Send>,
        writer: Box<dyn Write + Send>,
        killer: Box<dyn ChildKiller + Send + Sync>,
    ) -> Self {
        Self {
            master: Mutex::new(master),
            writer: Mutex::new(writer),
            killer: Mutex::new(killer),
        }
    }
}
struct ShellConfig {
    program: String,
    args: Vec<String>,
    label: String,
}
pub struct TerminalManager {
    next_session_id: AtomicU64,
    sessions: SessionMap,
}
impl TerminalManager {
    pub fn new() -> Self {
        Self {
            next_session_id: AtomicU64::new(1),
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }
    pub fn create_session(
        &self,
        app: AppHandle,
        input: TerminalCreateInput,
    ) -> AppResult<TerminalCreateOutput> {
        let session_id = self.allocate_session_id();
        let shell = resolve_shell_config();
        let pty_pair = create_pty_pair(input.cols, input.rows)?;
        let reader = pty_pair
            .master
            .try_clone_reader()
            .map_err(map_terminal_error)?;
        let writer = pty_pair.master.take_writer().map_err(map_terminal_error)?;
        let child = spawn_shell_process(pty_pair.slave, &shell, input.cwd)?;
        let killer = child.clone_killer();
        let session = Arc::new(TerminalSession::new(
            pty_pair.master,
            writer,
            killer,
        ));
        insert_session(&self.sessions, session_id.clone(), session);
        spawn_output_thread(app.clone(), session_id.clone(), reader);
        spawn_wait_thread(app, self.sessions.clone(), session_id.clone(), child);
        Ok(TerminalCreateOutput {
            session_id,
            shell: shell.label,
        })
    }
    pub fn write(&self, input: TerminalWriteInput) -> AppResult<()> {
        if input.data.is_empty() {
            return Ok(());
        }
        let session = get_session(&self.sessions, &input.session_id)?;
        let mut writer = lock_mutex(&session.writer, "terminal writer")?;
        writer.write_all(input.data.as_bytes())?;
        writer.flush()?;
        Ok(())
    }
    pub fn resize(&self, input: TerminalResizeInput) -> AppResult<()> {
        let session = get_session(&self.sessions, &input.session_id)?;
        let size = to_pty_size(input.cols, input.rows);
        let master = lock_mutex(&session.master, "terminal master")?;
        master.resize(size).map_err(map_terminal_error)
    }
    pub fn close(&self, input: TerminalCloseInput) -> AppResult<()> {
        let Some(session) = take_session(&self.sessions, &input.session_id)? else {
            return Ok(());
        };
        kill_session(session)
    }

    fn allocate_session_id(&self) -> String {
        let value = self.next_session_id.fetch_add(1, Ordering::Relaxed);
        format!("terminal-{value}")
    }

    fn close_all(&self) {
        let sessions = drain_sessions(&self.sessions);
        for session in sessions {
            if let Ok(mut killer) = session.killer.lock() {
                let _ = killer.kill();
            }
        }
    }
}

impl Drop for TerminalManager {
    fn drop(&mut self) {
        self.close_all();
    }
}

fn create_pty_pair(cols: Option<u16>, rows: Option<u16>) -> AppResult<portable_pty::PtyPair> {
    let size = to_pty_size(cols.unwrap_or(DEFAULT_COLUMNS), rows.unwrap_or(DEFAULT_ROWS));
    native_pty_system().openpty(size).map_err(map_terminal_error)
}

fn spawn_shell_process(
    slave: Box<dyn portable_pty::SlavePty + Send>,
    shell: &ShellConfig,
    cwd: Option<String>,
) -> AppResult<Box<dyn Child + Send + Sync>> {
    let mut command = CommandBuilder::new(&shell.program);
    command.args(&shell.args);
    if let Some(path) = normalize_cwd(cwd)? {
        command.cwd(path);
    }
    slave.spawn_command(command).map_err(map_terminal_error)
}

fn normalize_cwd(cwd: Option<String>) -> AppResult<Option<PathBuf>> {
    let Some(value) = cwd.map(|item| item.trim().to_string()) else {
        return Ok(None);
    };
    if value.is_empty() {
        return Ok(None);
    }
    let path = PathBuf::from(value);
    if !path.exists() {
        return Err(AppError::InvalidInput(format!(
            "terminal cwd does not exist: {}",
            path.display()
        )));
    }
    if !path.is_dir() {
        return Err(AppError::InvalidInput(format!(
            "terminal cwd is not a directory: {}",
            path.display()
        )));
    }
    Ok(Some(path))
}

fn resolve_shell_config() -> ShellConfig {
    if cfg!(target_os = "windows") {
        return ShellConfig {
            program: "powershell.exe".to_string(),
            args: vec![
                "-NoLogo".to_string(),
                "-NoExit".to_string(),
                "-Command".to_string(),
                WINDOWS_POWERSHELL_UTF8_INIT.to_string(),
            ],
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

fn spawn_output_thread(app: AppHandle, session_id: String, mut reader: Box<dyn Read + Send>) {
    std::thread::spawn(move || {
        let mut buffer = [0_u8; OUTPUT_BUFFER_SIZE];
        let mut decoder = Utf8ChunkDecoder::new();
        loop {
            match reader.read(&mut buffer) {
                Ok(0) => break,
                Ok(bytes_read) => {
                    if let Some(chunk) = decoder.decode(&buffer[..bytes_read]) {
                        let _ = emit_terminal_output(&app, session_id.clone(), chunk);
                    }
                }
                Err(error) if error.kind() == std::io::ErrorKind::Interrupted => continue,
                Err(_) => break,
            }
        }
        if let Some(chunk) = decoder.finish() {
            let _ = emit_terminal_output(&app, session_id, chunk);
        }
    });
}

fn spawn_wait_thread(
    app: AppHandle,
    sessions: SessionMap,
    session_id: String,
    mut child: Box<dyn Child + Send + Sync>,
) {
    std::thread::spawn(move || match child.wait() {
        Ok(status) => {
            remove_session_if_present(&sessions, &session_id);
            let _ = emit_terminal_exit(&app, session_id, Some(status.exit_code()));
        }
        Err(error) => {
            remove_session_if_present(&sessions, &session_id);
            let _ = emit_fatal(&app, format!("terminal process wait failed: {error}"));
        }
    });
}

fn get_session(sessions: &SessionMap, session_id: &str) -> AppResult<Arc<TerminalSession>> {
    let map = lock_mutex(sessions, "terminal session map")?;
    map.get(session_id)
        .cloned()
        .ok_or_else(|| AppError::InvalidInput(format!("terminal session not found: {session_id}")))
}

fn insert_session(sessions: &SessionMap, session_id: String, session: Arc<TerminalSession>) {
    if let Ok(mut map) = sessions.lock() {
        map.insert(session_id, session);
    }
}

fn take_session(sessions: &SessionMap, session_id: &str) -> AppResult<Option<Arc<TerminalSession>>> {
    let mut map = lock_mutex(sessions, "terminal session map")?;
    Ok(map.remove(session_id))
}

fn remove_session_if_present(sessions: &SessionMap, session_id: &str) {
    if let Ok(mut map) = sessions.lock() {
        map.remove(session_id);
    }
}

fn drain_sessions(sessions: &SessionMap) -> Vec<Arc<TerminalSession>> {
    if let Ok(mut map) = sessions.lock() {
        return map.drain().map(|(_, session)| session).collect();
    }
    Vec::new()
}

fn lock_mutex<'a, T>(mutex: &'a Mutex<T>, name: &str) -> AppResult<MutexGuard<'a, T>> {
    mutex
        .lock()
        .map_err(|_| AppError::Protocol(format!("{name} lock poisoned")))
}

fn map_terminal_error(error: impl std::fmt::Display) -> AppError {
    AppError::Io(error.to_string())
}

fn kill_session(session: Arc<TerminalSession>) -> AppResult<()> {
    let mut killer = lock_mutex(&session.killer, "terminal killer")?;
    match killer.kill() {
        Ok(()) => Ok(()),
        Err(error) if is_terminal_closed_error(&error) => Ok(()),
        Err(error) => Err(map_terminal_error(error)),
    }
}

fn is_terminal_closed_error(error: &std::io::Error) -> bool {
    error.kind() == std::io::ErrorKind::NotFound || error.raw_os_error() == Some(0)
}

fn to_pty_size(cols: u16, rows: u16) -> PtySize {
    PtySize {
        cols: cols.max(1),
        rows: rows.max(1),
        pixel_width: ZERO_PIXELS,
        pixel_height: ZERO_PIXELS,
    }
}
