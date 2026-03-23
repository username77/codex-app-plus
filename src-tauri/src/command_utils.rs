use std::ffi::OsStr;
use std::fmt::Display;
use std::process::Command;

use crate::error::{AppError, AppResult};

pub(crate) fn command_failure_detail(
    stderr: &[u8],
    stdout: &[u8],
    fallback_status: impl Into<String>,
) -> String {
    let stderr_text = String::from_utf8_lossy(stderr).trim().to_string();
    if !stderr_text.is_empty() {
        return stderr_text;
    }

    let stdout_text = String::from_utf8_lossy(stdout).trim().to_string();
    if !stdout_text.is_empty() {
        return stdout_text;
    }

    fallback_status.into()
}

pub(crate) fn io_error(error: impl Display) -> AppError {
    AppError::Io(error.to_string())
}

pub(crate) fn open_detached_target(target: impl AsRef<OsStr>) -> AppResult<()> {
    open::that_detached(target).map_err(io_error)?;
    Ok(())
}

pub(crate) fn spawn_background_command(command: &mut Command) -> AppResult<()> {
    command.spawn().map(|_| ()).map_err(io_error)
}

#[cfg(test)]
mod tests {
    use super::command_failure_detail;

    #[test]
    fn prefers_stderr_output() {
        let detail = command_failure_detail(b"stderr", b"stdout", "status");
        assert_eq!(detail, "stderr");
    }

    #[test]
    fn falls_back_to_status_when_streams_are_empty() {
        let detail = command_failure_detail(b"   ", b"", "exit 1");
        assert_eq!(detail, "exit 1");
    }
}
