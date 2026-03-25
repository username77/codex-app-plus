use std::fs;
use std::io::ErrorKind;
use std::path::Path;

use crate::agent_environment::resolve_codex_home_relative_path;
use crate::error::AppResult;
use crate::models::{CustomPromptOutput, ListCustomPromptsInput};

const PROMPTS_DIR: &str = ".codex/prompts";

pub fn list_custom_prompts(input: ListCustomPromptsInput) -> AppResult<Vec<CustomPromptOutput>> {
    let prompts_dir =
        resolve_codex_home_relative_path(input.agent_environment, PROMPTS_DIR)?;
    discover_prompts_in(&prompts_dir.display_path, &prompts_dir.host_path)
}

fn discover_prompts_in(display_dir: &str, host_dir: &Path) -> AppResult<Vec<CustomPromptOutput>> {
    let mut prompts = Vec::new();
    let entries = match fs::read_dir(host_dir) {
        Ok(entries) => entries,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(prompts),
        Err(error) => return Err(error.into()),
    };

    for entry in entries {
        let Ok(entry) = entry else {
            continue;
        };
        let path = entry.path();
        let Ok(file_type) = entry.file_type() else {
            continue;
        };
        if !file_type.is_file() || !is_markdown_file(&path) {
            continue;
        }

        let Some(name) = path
            .file_stem()
            .and_then(|stem| stem.to_str())
            .map(str::to_string)
        else {
            continue;
        };

        let Ok(content) = fs::read_to_string(&path) else {
            continue;
        };
        let (description, argument_hint, body) = parse_frontmatter(&content);
        prompts.push(CustomPromptOutput {
            name,
            path: join_display_path(display_dir, entry.file_name()),
            content: body,
            description,
            argument_hint,
        });
    }

    prompts.sort_by(|left, right| left.name.cmp(&right.name));
    Ok(prompts)
}

fn is_markdown_file(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.eq_ignore_ascii_case("md"))
        .unwrap_or(false)
}

fn join_display_path(display_dir: &str, file_name: std::ffi::OsString) -> String {
    let name = file_name.to_string_lossy();
    if display_dir.ends_with('/') || display_dir.ends_with('\\') {
        return format!("{display_dir}{name}");
    }
    let separator = if display_dir.contains('/') { "/" } else { "\\" };
    format!("{display_dir}{separator}{name}")
}

fn parse_frontmatter(content: &str) -> (Option<String>, Option<String>, String) {
    let mut segments = content.split_inclusive('\n');
    let Some(first_segment) = segments.next() else {
        return (None, None, String::new());
    };
    if first_segment.trim_end_matches(['\r', '\n']).trim() != "---" {
        return (None, None, content.to_string());
    }

    let mut description = None;
    let mut argument_hint = None;
    let mut consumed = first_segment.len();
    let mut closed = false;

    for segment in segments {
        let trimmed = segment.trim_end_matches(['\r', '\n']).trim();
        if trimmed == "---" {
            consumed += segment.len();
            closed = true;
            break;
        }
        if trimmed.is_empty() || trimmed.starts_with('#') {
            consumed += segment.len();
            continue;
        }

        if let Some((key, value)) = trimmed.split_once(':') {
            let normalized_key = key.trim().to_ascii_lowercase();
            let normalized_value = trim_wrapping_quotes(value.trim());
            match normalized_key.as_str() {
                "description" => description = Some(normalized_value),
                "argument-hint" | "argument_hint" => argument_hint = Some(normalized_value),
                _ => {}
            }
        }
        consumed += segment.len();
    }

    if !closed {
        return (None, None, content.to_string());
    }

    let body = if consumed >= content.len() {
        String::new()
    } else {
        content[consumed..].to_string()
    };
    (description, argument_hint, body)
}

fn trim_wrapping_quotes(value: &str) -> String {
    let bytes = value.as_bytes();
    if bytes.len() >= 2
        && ((bytes[0] == b'"' && bytes[bytes.len() - 1] == b'"')
            || (bytes[0] == b'\'' && bytes[bytes.len() - 1] == b'\''))
    {
        return value[1..value.len() - 1].to_string();
    }
    value.to_string()
}

#[cfg(test)]
mod tests {
    use super::{discover_prompts_in, parse_frontmatter};
    use std::fs;
    use std::path::{Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};

    fn unique_path(name: &str) -> PathBuf {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time before unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("codex-app-plus-{name}-{timestamp}"))
    }

    fn cleanup(path: &Path) {
        if path.is_dir() {
            let _ = fs::remove_dir_all(path);
            return;
        }
        let _ = fs::remove_file(path);
    }

    #[test]
    fn parse_frontmatter_reads_supported_keys() {
        let input = "---\n\
description: Review current branch\n\
argument-hint: USER BRANCH\n\
---\n\
Review $USER changes on $BRANCH\n";

        let (description, argument_hint, body) = parse_frontmatter(input);

        assert_eq!(description.as_deref(), Some("Review current branch"));
        assert_eq!(argument_hint.as_deref(), Some("USER BRANCH"));
        assert_eq!(body, "Review $USER changes on $BRANCH\n");
    }

    #[test]
    fn parse_frontmatter_keeps_original_text_when_unterminated() {
        let input = "---\n\
description: Broken\n";

        let (description, argument_hint, body) = parse_frontmatter(input);

        assert_eq!(description, None);
        assert_eq!(argument_hint, None);
        assert_eq!(body, input);
    }

    #[test]
    fn discover_prompts_returns_sorted_markdown_prompts() {
        let dir = unique_path("custom-prompts");
        fs::create_dir_all(&dir).expect("create prompts dir");
        fs::write(
            dir.join("review.md"),
            "---\n\
description: Review current branch\n\
argument_hint: USER BRANCH\n\
---\n\
Review $USER changes on $BRANCH\n",
        )
        .expect("write review prompt");
        fs::write(dir.join("zzz.md"), "Plain body\n").expect("write second prompt");
        fs::write(dir.join("notes.txt"), "ignore").expect("write ignored file");

        let prompts =
            discover_prompts_in("~/.codex/prompts", &dir).expect("discover custom prompts");

        assert_eq!(prompts.len(), 2);
        assert_eq!(prompts[0].name, "review");
        assert_eq!(prompts[0].path, "~/.codex/prompts/review.md");
        assert_eq!(
            prompts[0].description.as_deref(),
            Some("Review current branch")
        );
        assert_eq!(prompts[0].argument_hint.as_deref(), Some("USER BRANCH"));
        assert_eq!(prompts[0].content, "Review $USER changes on $BRANCH\n");
        assert_eq!(prompts[1].name, "zzz");
        cleanup(&dir);
    }

    #[test]
    fn discover_prompts_returns_empty_when_directory_is_missing() {
        let dir = unique_path("missing-custom-prompts");
        let prompts =
            discover_prompts_in("~/.codex/prompts", &dir).expect("missing dir should not fail");

        assert!(prompts.is_empty());
    }
}
