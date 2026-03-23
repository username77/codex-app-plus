use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

pub(crate) fn unique_temp_dir(prefix: &str, name: &str) -> PathBuf {
    unique_temp_path(prefix, name, None)
}

pub(crate) fn unique_temp_file(prefix: &str, name: &str, extension: &str) -> PathBuf {
    unique_temp_path(prefix, name, Some(extension))
}

fn unique_temp_path(prefix: &str, name: &str, extension: Option<&str>) -> PathBuf {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let suffix = extension
        .map(|value| format!(".{value}"))
        .unwrap_or_default();
    std::env::temp_dir().join(format!("{prefix}-{name}-{timestamp}{suffix}"))
}
