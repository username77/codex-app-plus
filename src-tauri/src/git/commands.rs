use crate::error::AppResult;

use super::models::{
    GitCheckoutInput, GitCommitInput, GitDiffInput, GitDiffOutput, GitDiscardInput, GitPathsInput,
    GitRepoInput, GitStatusOutput,
};
use super::service;

async fn run_blocking<T, F>(task: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> AppResult<T> + Send + 'static,
{
    let result = tokio::task::spawn_blocking(task)
        .await
        .map_err(|error| error.to_string())?;
    result.map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn git_get_status(input: GitRepoInput) -> Result<GitStatusOutput, String> {
    run_blocking(move || service::get_status(input)).await
}

#[tauri::command]
pub async fn git_get_diff(input: GitDiffInput) -> Result<GitDiffOutput, String> {
    run_blocking(move || service::get_diff(input)).await
}

#[tauri::command]
pub async fn git_init_repository(input: GitRepoInput) -> Result<(), String> {
    run_blocking(move || service::init_repository(input)).await
}

#[tauri::command]
pub async fn git_stage_paths(input: GitPathsInput) -> Result<(), String> {
    run_blocking(move || service::stage_paths(input)).await
}

#[tauri::command]
pub async fn git_unstage_paths(input: GitPathsInput) -> Result<(), String> {
    run_blocking(move || service::unstage_paths(input)).await
}

#[tauri::command]
pub async fn git_discard_paths(input: GitDiscardInput) -> Result<(), String> {
    run_blocking(move || service::discard_paths(input)).await
}

#[tauri::command]
pub async fn git_commit(input: GitCommitInput) -> Result<(), String> {
    run_blocking(move || service::commit(input)).await
}

#[tauri::command]
pub async fn git_fetch(input: GitRepoInput) -> Result<(), String> {
    run_blocking(move || service::fetch(input)).await
}

#[tauri::command]
pub async fn git_pull(input: GitRepoInput) -> Result<(), String> {
    run_blocking(move || service::pull(input)).await
}

#[tauri::command]
pub async fn git_push(input: GitRepoInput) -> Result<(), String> {
    run_blocking(move || service::push(input)).await
}

#[tauri::command]
pub async fn git_checkout(input: GitCheckoutInput) -> Result<(), String> {
    run_blocking(move || service::checkout(input)).await
}
