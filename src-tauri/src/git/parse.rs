use crate::error::{AppError, AppResult};

use super::models::{GitBranchRef, GitBranchSummary, GitStatusEntry};

const ORDINARY_PART_COUNT: usize = 8;
const RENAME_PART_COUNT: usize = 9;
const UNMERGED_PART_COUNT: usize = 10;
const INDEX_STATUS_POSITION: usize = 0;
const WORKTREE_STATUS_POSITION: usize = 1;

pub(crate) struct ParsedGitStatus {
    pub branch: GitBranchSummary,
    pub staged: Vec<GitStatusEntry>,
    pub unstaged: Vec<GitStatusEntry>,
    pub untracked: Vec<GitStatusEntry>,
    pub conflicted: Vec<GitStatusEntry>,
}

pub(crate) fn parse_status_output(output: &str) -> AppResult<ParsedGitStatus> {
    let mut branch = GitBranchSummary::default();
    let mut staged = Vec::new();
    let mut unstaged = Vec::new();
    let mut untracked = Vec::new();
    let mut conflicted = Vec::new();

    for line in output.lines() {
        if let Some(header) = line.strip_prefix("# ") {
            parse_branch_header(header, &mut branch)?;
            continue;
        }
        if let Some(path) = line.strip_prefix("? ") {
            untracked.push(GitStatusEntry {
                path: path.to_string(),
                original_path: None,
                index_status: "?".to_string(),
                worktree_status: "?".to_string(),
            });
            continue;
        }
        if line.starts_with("! ") {
            continue;
        }
        if line.starts_with("1 ") {
            classify_entry(
                parse_ordinary_entry(line)?,
                &mut staged,
                &mut unstaged,
                &mut conflicted,
            );
            continue;
        }
        if line.starts_with("2 ") {
            classify_entry(
                parse_rename_entry(line)?,
                &mut staged,
                &mut unstaged,
                &mut conflicted,
            );
            continue;
        }
        if line.starts_with("u ") {
            conflicted.push(parse_unmerged_entry(line)?);
            continue;
        }
        return Err(AppError::Protocol(format!(
            "unsupported git status line: {line}"
        )));
    }

    Ok(ParsedGitStatus {
        branch,
        staged,
        unstaged,
        untracked,
        conflicted,
    })
}

pub(crate) fn parse_branch_refs(output: &str) -> AppResult<Vec<GitBranchRef>> {
    let mut branches = Vec::new();
    for line in output.lines().filter(|line| !line.trim().is_empty()) {
        let mut fields = line.split('\t');
        let name = fields
            .next()
            .filter(|value| !value.trim().is_empty())
            .ok_or_else(|| AppError::Protocol(format!("invalid git branch line: {line}")))?;
        let upstream = fields
            .next()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string);
        let is_current = fields.next().map(str::trim) == Some("*");
        branches.push(GitBranchRef {
            name: name.to_string(),
            upstream,
            is_current,
        });
    }
    Ok(branches)
}

fn parse_branch_header(header: &str, branch: &mut GitBranchSummary) -> AppResult<()> {
    if let Some(head) = header.strip_prefix("branch.head ") {
        if head == "(detached)" {
            branch.detached = true;
            branch.head = None;
            return Ok(());
        }
        branch.head = Some(head.to_string());
        return Ok(());
    }
    if let Some(upstream) = header.strip_prefix("branch.upstream ") {
        branch.upstream = Some(upstream.to_string());
        return Ok(());
    }
    if let Some(values) = header.strip_prefix("branch.ab ") {
        parse_ahead_behind(values, branch)?;
    }
    Ok(())
}

fn parse_ahead_behind(values: &str, branch: &mut GitBranchSummary) -> AppResult<()> {
    for token in values.split_whitespace() {
        if let Some(number) = token.strip_prefix('+') {
            branch.ahead = number
                .parse::<usize>()
                .map_err(|error| AppError::Protocol(error.to_string()))?;
            continue;
        }
        if let Some(number) = token.strip_prefix('-') {
            branch.behind = number
                .parse::<usize>()
                .map_err(|error| AppError::Protocol(error.to_string()))?;
        }
    }
    Ok(())
}

fn parse_ordinary_entry(line: &str) -> AppResult<GitStatusEntry> {
    let rest = line
        .strip_prefix("1 ")
        .ok_or_else(|| AppError::Protocol(format!("invalid ordinary status line: {line}")))?;
    let parts = rest.splitn(ORDINARY_PART_COUNT, ' ').collect::<Vec<_>>();
    if parts.len() != ORDINARY_PART_COUNT {
        return Err(AppError::Protocol(format!(
            "invalid ordinary status line: {line}"
        )));
    }
    build_entry(parts[0], parts[ORDINARY_PART_COUNT - 1], None)
}

fn parse_rename_entry(line: &str) -> AppResult<GitStatusEntry> {
    let rest = line
        .strip_prefix("2 ")
        .ok_or_else(|| AppError::Protocol(format!("invalid rename status line: {line}")))?;
    let parts = rest.splitn(RENAME_PART_COUNT, ' ').collect::<Vec<_>>();
    if parts.len() != RENAME_PART_COUNT {
        return Err(AppError::Protocol(format!(
            "invalid rename status line: {line}"
        )));
    }
    let (path, original_path) = parts[RENAME_PART_COUNT - 1]
        .split_once('\t')
        .ok_or_else(|| AppError::Protocol(format!("invalid rename path section: {line}")))?;
    build_entry(parts[0], path, Some(original_path))
}

fn parse_unmerged_entry(line: &str) -> AppResult<GitStatusEntry> {
    let rest = line
        .strip_prefix("u ")
        .ok_or_else(|| AppError::Protocol(format!("invalid unmerged status line: {line}")))?;
    let parts = rest.splitn(UNMERGED_PART_COUNT, ' ').collect::<Vec<_>>();
    if parts.len() != UNMERGED_PART_COUNT {
        return Err(AppError::Protocol(format!(
            "invalid unmerged status line: {line}"
        )));
    }
    build_entry(parts[0], parts[UNMERGED_PART_COUNT - 1], None)
}

fn build_entry(status: &str, path: &str, original_path: Option<&str>) -> AppResult<GitStatusEntry> {
    let (index_status, worktree_status) = extract_status_pair(status)?;
    Ok(GitStatusEntry {
        path: path.to_string(),
        original_path: original_path.map(str::to_string),
        index_status: index_status.to_string(),
        worktree_status: worktree_status.to_string(),
    })
}

fn extract_status_pair(status: &str) -> AppResult<(char, char)> {
    let chars = status.chars().collect::<Vec<_>>();
    let index_status = chars
        .get(INDEX_STATUS_POSITION)
        .copied()
        .ok_or_else(|| AppError::Protocol(format!("missing index status in {status}")))?;
    let worktree_status = chars
        .get(WORKTREE_STATUS_POSITION)
        .copied()
        .ok_or_else(|| AppError::Protocol(format!("missing worktree status in {status}")))?;
    Ok((index_status, worktree_status))
}

fn classify_entry(
    entry: GitStatusEntry,
    staged: &mut Vec<GitStatusEntry>,
    unstaged: &mut Vec<GitStatusEntry>,
    conflicted: &mut Vec<GitStatusEntry>,
) {
    if entry.index_status == "U" || entry.worktree_status == "U" {
        conflicted.push(entry);
        return;
    }
    if entry.index_status != "." {
        staged.push(entry.clone());
    }
    if entry.worktree_status != "." {
        unstaged.push(entry);
    }
}

#[cfg(test)]
mod tests {
    use super::{parse_branch_refs, parse_status_output};

    #[test]
    fn parses_status_snapshot_with_branch_and_changes() {
        let output = [
            "# branch.head main",
            "# branch.upstream origin/main",
            "# branch.ab +2 -1",
            "1 M. N... 100644 100644 100644 abcdef1 abcdef2 src/main.rs",
            "1 .M N... 100644 100644 100644 abcdef1 abcdef2 src/lib.rs",
            "? src/new.rs",
            "u UU N... 100644 100644 100644 100644 abcdef1 abcdef2 abcdef3 src/conflict.rs",
        ]
        .join("\n");

        let parsed = parse_status_output(&output).expect("parse status output");

        assert_eq!(parsed.branch.head.as_deref(), Some("main"));
        assert_eq!(parsed.branch.upstream.as_deref(), Some("origin/main"));
        assert_eq!(parsed.branch.ahead, 2);
        assert_eq!(parsed.branch.behind, 1);
        assert_eq!(parsed.staged.len(), 1);
        assert_eq!(parsed.unstaged.len(), 1);
        assert_eq!(parsed.untracked.len(), 1);
        assert_eq!(parsed.conflicted.len(), 1);
    }

    #[test]
    fn parses_branch_refs_and_current_marker() {
        let output = ["main\torigin/main\t*", "feature/ui\t\t"].join("\n");

        let branches = parse_branch_refs(&output).expect("parse branch refs");

        assert_eq!(branches.len(), 2);
        assert_eq!(branches[0].name, "main");
        assert!(branches[0].is_current);
        assert_eq!(branches[1].name, "feature/ui");
        assert!(!branches[1].is_current);
    }
}
