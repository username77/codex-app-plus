use serde::{Deserialize, Serialize};

use crate::models::CodexAuthMode;

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PersistedModeState {
    pub(crate) active_mode: CodexAuthMode,
    pub(crate) active_provider_id: Option<String>,
    pub(crate) active_provider_key: Option<String>,
    pub(crate) updated_at: i64,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CodexOauthSnapshot {
    pub(crate) auth_json_text: String,
    pub(crate) config_toml_text: String,
    pub(crate) updated_at: i64,
}

#[derive(Debug, Clone)]
pub(crate) struct ActiveContext {
    pub(crate) mode: CodexAuthMode,
    pub(crate) provider_id: Option<String>,
    pub(crate) provider_key: Option<String>,
}
