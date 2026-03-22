mod live;
mod live_io;
mod storage;
mod types;

#[cfg(test)]
mod tests;

use std::path::Path;

use crate::agent_environment::resolve_agent_environment;
use crate::codex_provider::{apply_codex_provider, list_codex_providers, upsert_codex_provider};
use crate::error::{AppError, AppResult};
use crate::models::{
    ActivateCodexChatgptInput, ApplyCodexProviderInput, CaptureCodexOauthSnapshotInput,
    CodexAuthMode, CodexAuthModeStateOutput, CodexAuthSwitchResult, CodexProviderApplyResult,
    CodexProviderRecord, GetCodexAuthModeStateInput,
};

use live::{
    build_oauth_snapshot_from_api_key_live, build_provider_input_from_live,
    build_snapshot_from_live, clear_oauth_snapshot_auth, detect_active_context, read_live_files,
    write_snapshot_to_live, LiveFiles,
};
use storage::{
    persist_mode_state, read_oauth_snapshot, read_oauth_snapshot_at, read_persisted_mode_state,
    write_oauth_snapshot, write_oauth_snapshot_at,
};
use types::{ActiveContext, CodexOauthSnapshot};

pub fn get_codex_auth_mode_state(
    input: GetCodexAuthModeStateInput,
) -> AppResult<CodexAuthModeStateOutput> {
    let live = read_live_files(resolve_agent_environment(input.agent_environment))?;
    let providers = list_codex_providers()?.providers;
    let persisted = read_persisted_mode_state()?;
    let current = detect_active_context(&providers, &live, persisted.clone());
    let snapshot = read_oauth_snapshot()?;
    Ok(CodexAuthModeStateOutput {
        active_mode: current.mode,
        active_provider_id: current.provider_id.or_else(|| {
            persisted
                .as_ref()
                .and_then(|entry| entry.active_provider_id.clone())
        }),
        active_provider_key: current.provider_key.or_else(|| {
            persisted
                .as_ref()
                .and_then(|entry| entry.active_provider_key.clone())
        }),
        oauth_snapshot_available: snapshot.is_some(),
    })
}

pub fn capture_codex_oauth_snapshot(
    input: CaptureCodexOauthSnapshotInput,
) -> AppResult<CodexAuthModeStateOutput> {
    let live = read_live_files(resolve_agent_environment(input.agent_environment))?;
    write_oauth_snapshot(&build_snapshot_from_live(&live))?;
    persist_mode_state(CodexAuthMode::Chatgpt, None, None)?;
    get_codex_auth_mode_state(GetCodexAuthModeStateInput {
        agent_environment: input.agent_environment,
    })
}

pub fn activate_codex_chatgpt(
    input: ActivateCodexChatgptInput,
) -> AppResult<CodexAuthSwitchResult> {
    let live = read_live_files(resolve_agent_environment(input.agent_environment))?;
    let providers = list_codex_providers()?.providers;
    let current = detect_active_context(&providers, &live, read_persisted_mode_state()?);
    backfill_current_mode_if_needed(&current, &providers, &live)?;
    let snapshot = resolve_target_oauth_snapshot(&live)?;
    write_snapshot_to_live(&live, &snapshot)?;
    persist_mode_state(CodexAuthMode::Chatgpt, None, None)?;
    Ok(CodexAuthSwitchResult {
        mode: CodexAuthMode::Chatgpt,
        provider_id: None,
        provider_key: None,
        auth_path: live.auth_path.display_path,
        config_path: live.config_path.display_path,
        restored_from_snapshot: read_oauth_snapshot()?.is_some(),
    })
}

pub fn activate_codex_provider(
    input: ApplyCodexProviderInput,
) -> AppResult<CodexProviderApplyResult> {
    let live = read_live_files(resolve_agent_environment(input.agent_environment))?;
    let providers = list_codex_providers()?.providers;
    let current = detect_active_context(&providers, &live, read_persisted_mode_state()?);
    backfill_current_mode_if_needed(&current, &providers, &live)?;
    persist_oauth_snapshot_if_needed(&current, &live)?;
    let target_provider = target_provider(&providers, &input.id)?;
    let result = apply_codex_provider(input)?;
    persist_mode_state(
        CodexAuthMode::Apikey,
        Some(target_provider.id),
        Some(target_provider.provider_key),
    )?;
    Ok(result)
}

pub(crate) fn clear_oauth_snapshot_auth_state_in_root(root: &Path) -> AppResult<()> {
    let Some(snapshot) = read_oauth_snapshot_at(root)? else {
        return Ok(());
    };
    write_oauth_snapshot_at(root, &clear_oauth_snapshot_auth(&snapshot)?)
}

fn backfill_current_mode_if_needed(
    current: &ActiveContext,
    providers: &[CodexProviderRecord],
    live: &LiveFiles,
) -> AppResult<()> {
    if current.mode != CodexAuthMode::Apikey {
        return Ok(());
    }
    let provider = resolve_current_provider(current, providers)?;
    let draft = build_provider_input_from_live(&provider, live)?;
    let _ = upsert_codex_provider(draft)?;
    Ok(())
}

fn persist_oauth_snapshot_if_needed(current: &ActiveContext, live: &LiveFiles) -> AppResult<()> {
    if current.mode == CodexAuthMode::Chatgpt {
        write_oauth_snapshot(&build_snapshot_from_live(live))?;
    }
    Ok(())
}

fn resolve_target_oauth_snapshot(live: &LiveFiles) -> AppResult<CodexOauthSnapshot> {
    if let Some(snapshot) = read_oauth_snapshot()? {
        return Ok(snapshot);
    }
    let snapshot = build_oauth_snapshot_from_api_key_live(live)?;
    write_oauth_snapshot(&snapshot)?;
    Ok(snapshot)
}

fn target_provider(
    providers: &[CodexProviderRecord],
    provider_id: &str,
) -> AppResult<CodexProviderRecord> {
    providers
        .iter()
        .find(|provider| provider.id == provider_id)
        .cloned()
        .ok_or_else(|| AppError::InvalidInput("未找到要应用的提供商".to_string()))
}

fn resolve_current_provider(
    current: &ActiveContext,
    providers: &[CodexProviderRecord],
) -> AppResult<CodexProviderRecord> {
    if let Some(provider_id) = current.provider_id.as_ref() {
        if let Some(provider) = providers.iter().find(|entry| entry.id == *provider_id) {
            return Ok(provider.clone());
        }
    }
    if let Some(provider_key) = current.provider_key.as_ref() {
        if let Some(provider) = providers
            .iter()
            .find(|entry| entry.provider_key == *provider_key)
        {
            return Ok(provider.clone());
        }
    }
    Err(AppError::InvalidInput(
        "当前 API Key live 配置未绑定到已保存的提供商，无法切换模式".to_string(),
    ))
}
