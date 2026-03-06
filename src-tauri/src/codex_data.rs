use std::fs::{self, File};
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};

use serde_json::Value;

use crate::error::{AppError, AppResult};
use crate::models::{CodexSessionMessage, CodexSessionReadInput, CodexSessionReadOutput, CodexSessionSummary};

pub fn list_codex_sessions() -> AppResult<Vec<CodexSessionSummary>> {
    let mut files = Vec::new();
    collect_session_files(&codex_sessions_root()?, &mut files)?;

    let mut sessions = Vec::new();
    for file in files {
        if let Some(summary) = read_session_summary(&file)? {
            sessions.push(summary);
        }
    }

    sessions.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
    Ok(sessions)
}

pub fn read_codex_session(input: CodexSessionReadInput) -> AppResult<CodexSessionReadOutput> {
    if input.thread_id.trim().is_empty() {
        return Err(AppError::InvalidInput("threadId 不能为空".to_string()));
    }

    let path = find_session_file(&input.thread_id)?;
    let messages = read_session_messages(&path, &input.thread_id)?;
    Ok(CodexSessionReadOutput { thread_id: input.thread_id, messages })
}

fn codex_sessions_root() -> AppResult<PathBuf> {
    let home = dirs::home_dir().ok_or_else(|| AppError::InvalidInput("无法解析用户目录".to_string()))?;
    Ok(home.join(".codex").join("sessions"))
}

fn collect_session_files(root: &Path, files: &mut Vec<PathBuf>) -> AppResult<()> {
    if !root.exists() {
        return Ok(());
    }

    for entry in fs::read_dir(root)? {
        let entry = entry?;
        let path = entry.path();
        if entry.file_type()?.is_dir() {
            collect_session_files(&path, files)?;
            continue;
        }
        if path.extension().and_then(|value| value.to_str()) == Some("jsonl") {
            files.push(path);
        }
    }
    Ok(())
}

fn read_session_summary(path: &Path) -> AppResult<Option<CodexSessionSummary>> {
    let mut session_id = None;
    let mut cwd = None;
    let mut title = None;
    let mut updated_at = None;

    for line in BufReader::new(File::open(path)?).lines() {
        let value = parse_line(&line?)?;
        if session_id.is_none() {
            session_id = read_session_id(&value);
            cwd = read_session_cwd(&value);
        }
        if title.is_none() {
            title = read_message_text(&value, "user").map(|text| summarize_message(&text));
        }
        updated_at = read_timestamp(&value).or(updated_at);
    }

    let Some(session_id) = session_id else {
        return Ok(None);
    };
    let Some(cwd) = cwd else {
        return Ok(None);
    };

    Ok(Some(CodexSessionSummary {
        id: session_id,
        title: title.unwrap_or_else(|| infer_name_from_path(&cwd)),
        cwd,
        updated_at: updated_at.unwrap_or_default(),
    }))
}

fn find_session_file(thread_id: &str) -> AppResult<PathBuf> {
    let mut files = Vec::new();
    collect_session_files(&codex_sessions_root()?, &mut files)?;

    for file in files {
        if session_file_matches(&file, thread_id)? {
            return Ok(file);
        }
    }

    Err(AppError::InvalidInput(format!("未找到会话: {thread_id}")))
}

fn session_file_matches(path: &Path, thread_id: &str) -> AppResult<bool> {
    for line in BufReader::new(File::open(path)?).lines().take(3) {
        let value = parse_line(&line?)?;
        if read_session_id(&value).as_deref() == Some(thread_id) {
            return Ok(true);
        }
    }
    Ok(false)
}

fn read_session_messages(path: &Path, thread_id: &str) -> AppResult<Vec<CodexSessionMessage>> {
    let mut messages = Vec::new();

    for (index, line) in BufReader::new(File::open(path)?).lines().enumerate() {
        let value = parse_line(&line?)?;
        let Some(role) = read_message_role(&value) else {
            continue;
        };
        let Some(text) = read_message_text(&value, role) else {
            continue;
        };
        if text.is_empty() {
            continue;
        }
        messages.push(CodexSessionMessage {
            id: format!("{thread_id}:local:{index}"),
            role: role.to_string(),
            text,
        });
    }

    Ok(messages)
}

fn parse_line(line: &str) -> AppResult<Value> {
    serde_json::from_str(line).map_err(Into::into)
}

fn read_timestamp(value: &Value) -> Option<String> {
    value.get("timestamp").and_then(Value::as_str).map(ToOwned::to_owned)
}

fn read_session_id(value: &Value) -> Option<String> {
    value.get("type").and_then(Value::as_str).filter(|kind| *kind == "session_meta")?;
    value.get("payload")?.get("id")?.as_str().map(ToOwned::to_owned)
}

fn read_session_cwd(value: &Value) -> Option<String> {
    value.get("type").and_then(Value::as_str).filter(|kind| *kind == "session_meta")?;
    value.get("payload")?.get("cwd")?.as_str().map(ToOwned::to_owned)
}

fn read_message_role(value: &Value) -> Option<&str> {
    value.get("type").and_then(Value::as_str).filter(|kind| *kind == "response_item")?;
    value.get("payload")?.get("type")?.as_str().filter(|kind| *kind == "message")?;
    value.get("payload")?.get("role")?.as_str()
}

fn read_message_text(value: &Value, role: &str) -> Option<String> {
    let content = value.get("payload")?.get("content")?.as_array()?;
    let expected_type = if role == "assistant" { "output_text" } else { "input_text" };
    let parts = content
        .iter()
        .filter(|item| item.get("type").and_then(Value::as_str) == Some(expected_type))
        .filter_map(|item| item.get("text").and_then(Value::as_str))
        .map(str::trim)
        .filter(|text| !text.is_empty())
        .collect::<Vec<_>>();
    if parts.is_empty() {
        return None;
    }
    Some(parts.join("\n"))
}

fn summarize_message(text: &str) -> String {
    let title = text
        .lines()
        .map(str::trim)
        .find(|line| !line.is_empty() && !line.starts_with('#') && !line.starts_with('<'))
        .unwrap_or(text.trim());
    truncate_text(title, 48)
}

fn infer_name_from_path(path: &str) -> String {
    path.replace('\\', "/")
        .split('/')
        .filter(|part| !part.is_empty())
        .next_back()
        .unwrap_or(path)
        .to_string()
}

fn truncate_text(text: &str, max_chars: usize) -> String {
    let truncated = text.chars().take(max_chars).collect::<String>();
    if text.chars().count() > max_chars {
        return format!("{truncated}…");
    }
    truncated
}

#[cfg(test)]
mod tests {
    use super::{infer_name_from_path, summarize_message};

    #[test]
    fn summarizes_first_meaningful_line() {
        let text = "# AGENTS\n\n修复登录问题\n详细说明";
        assert_eq!(summarize_message(text), "修复登录问题");
    }

    #[test]
    fn infers_name_from_windows_path() {
        assert_eq!(infer_name_from_path("e:\\code\\MathStudyPlatform"), "MathStudyPlatform");
    }
}
