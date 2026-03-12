use std::ffi::OsString;
use std::path::{Path, PathBuf};

use crate::error::{AppError, AppResult};

use super::diff::get_diff_preview;
use super::models::{
    GitBranchRef, GitCheckoutInput, GitCommitInput, GitDiffInput, GitDiffOutput, GitDiscardInput,
    GitPathsInput, GitRepoInput, GitStatusOutput,
};
use super::parse::{parse_branch_refs, parse_status_output};
use super::process::{has_head, run_git};

const GIT_DIR_NAME: &str = ".git";
const STATUS_ARGS: [&str; 4] = [
    "status",
    "--porcelain=v2",
    "--branch",
    "--untracked-files=all",
];
const BRANCH_ARGS: [&str; 3] = [
    "branch",
    "--list",
    "--format=%(refname:short)%09%(upstream:short)%09%(HEAD)",
];
const FETCH_ARGS: [&str; 3] = ["fetch", "--all", "--prune"];
const PULL_ARGS: [&str; 1] = ["pull"];
const PUSH_ARGS: [&str; 1] = ["push"];
const INIT_ARGS: [&str; 1] = ["init"];

#[derive(Debug)]
struct RepositoryContext {
    repo_root: PathBuf,
}

pub fn get_status(input: GitRepoInput) -> AppResult<GitStatusOutput> {
    let workspace_path = resolve_workspace_path(&input.repo_path)?;
    let Some(repo_root) = find_repository_root(&workspace_path) else {
        return Ok(GitStatusOutput::not_repository());
    };

    let branch_output = run_git(&repo_root, &to_args(&BRANCH_ARGS))?;
    let status_output = run_git(&repo_root, &to_args(&STATUS_ARGS))?;
    let parsed_status = parse_status_output(&status_output)?;
    let branches = ensure_current_branch(parse_branch_refs(&branch_output)?, &parsed_status.branch);
    let remote_name = resolve_remote_name(&parsed_status.branch, &branches);
    let remote_url = remote_name
        .as_ref()
        .map(|name| {
            run_git(
                &repo_root,
                &vec![
                    OsString::from("remote"),
                    OsString::from("get-url"),
                    OsString::from(name),
                ],
            )
        })
        .transpose()?;
    let is_clean = parsed_status.staged.is_empty()
        && parsed_status.unstaged.is_empty()
        && parsed_status.untracked.is_empty()
        && parsed_status.conflicted.is_empty();

    Ok(GitStatusOutput {
        is_repository: true,
        repo_root: Some(repo_root.to_string_lossy().to_string()),
        branch: Some(parsed_status.branch),
        remote_name,
        remote_url,
        branches,
        staged: parsed_status.staged,
        unstaged: parsed_status.unstaged,
        untracked: parsed_status.untracked,
        conflicted: parsed_status.conflicted,
        is_clean,
    })
}

pub fn get_diff(input: GitDiffInput) -> AppResult<GitDiffOutput> {
    let context = require_repository_context(&input.repo_path)?;
    let path = validate_pathspec(&input.path)?;
    Ok(GitDiffOutput {
        path: path.clone(),
        staged: input.staged,
        diff: get_diff_preview(&context.repo_root, &path, input.staged)?,
    })
}

pub fn init_repository(input: GitRepoInput) -> AppResult<()> {
    let workspace_path = resolve_workspace_path(&input.repo_path)?;
    if find_repository_root(&workspace_path).is_some() {
        return Err(AppError::InvalidInput(
            "当前工作区已经是 Git 仓库。".to_string(),
        ));
    }
    run_git(&workspace_path, &to_args(&INIT_ARGS)).map(|_| ())
}

pub fn stage_paths(input: GitPathsInput) -> AppResult<()> {
    run_path_command(&input.repo_path, &["add", "--"], &input.paths)
}

pub fn unstage_paths(input: GitPathsInput) -> AppResult<()> {
    let context = require_repository_context(&input.repo_path)?;
    let paths = validate_paths(&input.paths)?;
    if has_head(&context.repo_root) {
        let mut args = vec![
            OsString::from("reset"),
            OsString::from("HEAD"),
            OsString::from("--"),
        ];
        args.extend(paths);
        return run_git(&context.repo_root, &args).map(|_| ());
    }

    let mut args = vec![
        OsString::from("rm"),
        OsString::from("--cached"),
        OsString::from("-r"),
        OsString::from("--"),
    ];
    args.extend(paths);
    run_git(&context.repo_root, &args).map(|_| ())
}

pub fn discard_paths(input: GitDiscardInput) -> AppResult<()> {
    let context = require_repository_context(&input.repo_path)?;
    let paths = validate_paths(&input.paths)?;
    let mut args = if input.delete_untracked {
        vec![
            OsString::from("clean"),
            OsString::from("-f"),
            OsString::from("--"),
        ]
    } else {
        vec![
            OsString::from("restore"),
            OsString::from("--worktree"),
            OsString::from("--"),
        ]
    };
    args.extend(paths);
    run_git(&context.repo_root, &args).map(|_| ())
}

pub fn commit(input: GitCommitInput) -> AppResult<()> {
    let context = require_repository_context(&input.repo_path)?;
    let message = input.message.trim();
    if message.is_empty() {
        return Err(AppError::InvalidInput("提交说明不能为空。".to_string()));
    }
    let args = vec![
        OsString::from("commit"),
        OsString::from("-m"),
        OsString::from(message),
    ];
    run_git(&context.repo_root, &args).map(|_| ())
}

pub fn fetch(input: GitRepoInput) -> AppResult<()> {
    run_repo_command(&input.repo_path, &FETCH_ARGS)
}

pub fn pull(input: GitRepoInput) -> AppResult<()> {
    run_repo_command(&input.repo_path, &PULL_ARGS)
}

pub fn push(input: GitRepoInput) -> AppResult<()> {
    run_repo_command(&input.repo_path, &PUSH_ARGS)
}

pub fn checkout(input: GitCheckoutInput) -> AppResult<()> {
    let context = require_repository_context(&input.repo_path)?;
    let branch_name = input.branch_name.trim();
    if branch_name.is_empty() {
        return Err(AppError::InvalidInput("分支名称不能为空。".to_string()));
    }
    let args = if input.create {
        vec![
            OsString::from("checkout"),
            OsString::from("-b"),
            OsString::from(branch_name),
        ]
    } else {
        vec![OsString::from("checkout"), OsString::from(branch_name)]
    };
    run_git(&context.repo_root, &args).map(|_| ())
}

fn run_repo_command(repo_path: &str, args: &[&str]) -> AppResult<()> {
    let context = require_repository_context(repo_path)?;
    run_git(&context.repo_root, &to_args(args)).map(|_| ())
}

fn run_path_command(repo_path: &str, prefix_args: &[&str], paths: &[String]) -> AppResult<()> {
    let context = require_repository_context(repo_path)?;
    let mut args = to_args(prefix_args);
    args.extend(validate_paths(paths)?);
    run_git(&context.repo_root, &args).map(|_| ())
}

fn require_repository_context(repo_path: &str) -> AppResult<RepositoryContext> {
    let workspace_path = resolve_workspace_path(repo_path)?;
    let repo_root = find_repository_root(&workspace_path)
        .ok_or_else(|| AppError::InvalidInput("当前工作区不是 Git 仓库。".to_string()))?;
    Ok(RepositoryContext { repo_root })
}

fn resolve_workspace_path(repo_path: &str) -> AppResult<PathBuf> {
    let trimmed_path = repo_path.trim();
    if trimmed_path.is_empty() {
        return Err(AppError::InvalidInput("repoPath 不能为空。".to_string()));
    }
    let path = PathBuf::from(trimmed_path);
    if !path.exists() {
        return Err(AppError::InvalidInput(format!(
            "工作区不存在: {trimmed_path}"
        )));
    }
    if !path.is_dir() {
        return Err(AppError::InvalidInput(format!(
            "工作区不是目录: {trimmed_path}"
        )));
    }
    std::fs::canonicalize(path).map_err(AppError::from)
}

fn find_repository_root(workspace_path: &Path) -> Option<PathBuf> {
    workspace_path
        .ancestors()
        .find(|candidate| candidate.join(GIT_DIR_NAME).exists())
        .map(Path::to_path_buf)
}

fn validate_paths(paths: &[String]) -> AppResult<Vec<OsString>> {
    let validated = paths
        .iter()
        .map(|path| validate_pathspec(path).map(OsString::from))
        .collect::<AppResult<Vec<_>>>()?;
    if validated.is_empty() {
        return Err(AppError::InvalidInput("paths 不能为空。".to_string()));
    }
    Ok(validated)
}

fn validate_pathspec(path: &str) -> AppResult<String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err(AppError::InvalidInput("path 不能为空。".to_string()));
    }
    Ok(trimmed.to_string())
}

fn to_args(args: &[&str]) -> Vec<OsString> {
    args.iter().map(OsString::from).collect()
}

fn ensure_current_branch(
    mut branches: Vec<GitBranchRef>,
    branch: &super::models::GitBranchSummary,
) -> Vec<GitBranchRef> {
    let Some(head) = branch.head.as_ref() else {
        return branches;
    };
    if branches.iter().all(|item| item.name != *head) {
        branches.insert(
            0,
            GitBranchRef {
                name: head.clone(),
                upstream: branch.upstream.clone(),
                is_current: true,
            },
        );
    }
    branches
}

fn resolve_remote_name(
    branch: &super::models::GitBranchSummary,
    branches: &[GitBranchRef],
) -> Option<String> {
    branch
        .upstream
        .as_deref()
        .and_then(extract_remote_name)
        .map(str::to_string)
        .or_else(|| {
            branches
                .iter()
                .filter_map(|item| item.upstream.as_deref())
                .find_map(extract_remote_name)
                .map(str::to_string)
        })
}

fn extract_remote_name(upstream: &str) -> Option<&str> {
    upstream.split_once('/').map(|(name, _)| name)
}
