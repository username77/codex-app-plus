use toml::{Table, Value as TomlValue};

use crate::error::{AppError, AppResult};

const DEFAULT_REQUIRES_OPENAI_AUTH: bool = true;
const DEFAULT_WIRE_API: &str = "responses";
const MODEL_PROVIDER_KEY: &str = "model_provider";
const MODEL_PROVIDERS_KEY: &str = "model_providers";
const PROVIDER_BASE_URL_KEY: &str = "base_url";
const PROVIDER_NAME_KEY: &str = "name";
const PROVIDER_REQUIRES_OPENAI_AUTH_KEY: &str = "requires_openai_auth";
const PROVIDER_WIRE_API_KEY: &str = "wire_api";

pub(super) fn parse_config_table(text: &str) -> AppResult<Table> {
    toml::from_str::<Table>(text).map_err(|error| AppError::InvalidInput(error.to_string()))
}

pub(super) fn build_provider_patch_from_text(
    text: &str,
    provider_key: &str,
    provider_name: &str,
    base_url: &str,
) -> AppResult<Table> {
    let source = parse_config_table(text)?;
    build_provider_patch(&source, provider_key, provider_name, base_url)
}

pub(super) fn merge_config_table(current: Table, template: Table) -> AppResult<Table> {
    let mut merged = current;
    for (key, value) in template {
        if key == MODEL_PROVIDERS_KEY {
            merged.insert(key, replace_model_providers(value)?);
            continue;
        }
        merged.insert(key, value);
    }
    Ok(merged)
}

fn build_provider_patch(
    source: &Table,
    provider_key: &str,
    provider_name: &str,
    base_url: &str,
) -> AppResult<Table> {
    let mut provider_config = find_source_provider(source, provider_key)?;
    provider_config.insert(
        PROVIDER_NAME_KEY.to_string(),
        TomlValue::String(provider_name.to_string()),
    );
    provider_config.insert(
        PROVIDER_BASE_URL_KEY.to_string(),
        TomlValue::String(base_url.to_string()),
    );
    ensure_provider_defaults(&mut provider_config);

    let mut providers = Table::new();
    providers.insert(provider_key.to_string(), TomlValue::Table(provider_config));

    let mut patch = Table::new();
    patch.insert(
        MODEL_PROVIDER_KEY.to_string(),
        TomlValue::String(provider_key.to_string()),
    );
    patch.insert(MODEL_PROVIDERS_KEY.to_string(), TomlValue::Table(providers));
    Ok(patch)
}

fn ensure_provider_defaults(provider_config: &mut Table) {
    if !matches!(
        provider_config.get(PROVIDER_WIRE_API_KEY),
        Some(TomlValue::String(_))
    ) {
        provider_config.insert(
            PROVIDER_WIRE_API_KEY.to_string(),
            TomlValue::String(DEFAULT_WIRE_API.to_string()),
        );
    }
    if !matches!(
        provider_config.get(PROVIDER_REQUIRES_OPENAI_AUTH_KEY),
        Some(TomlValue::Boolean(_))
    ) {
        provider_config.insert(
            PROVIDER_REQUIRES_OPENAI_AUTH_KEY.to_string(),
            TomlValue::Boolean(DEFAULT_REQUIRES_OPENAI_AUTH),
        );
    }
}

fn find_source_provider(source: &Table, provider_key: &str) -> AppResult<Table> {
    let providers = read_optional_table(
        source.get(MODEL_PROVIDERS_KEY),
        "config.toml 的 model_providers 必须是表",
    )?;
    if providers.is_empty() {
        return Err(AppError::InvalidInput(
            "config.toml 缺少当前 provider 配置".to_string(),
        ));
    }

    let direct = read_optional_table(providers.get(provider_key), "provider 配置必须是表")?;
    if !direct.is_empty() {
        return Ok(direct);
    }

    let active = source
        .get(MODEL_PROVIDER_KEY)
        .and_then(TomlValue::as_str)
        .unwrap_or_default()
        .trim();
    if !active.is_empty() && active != provider_key {
        let active_provider = read_optional_table(providers.get(active), "provider 配置必须是表")?;
        if !active_provider.is_empty() {
            return Ok(active_provider);
        }
    }

    first_provider_table(&providers)
}

fn first_provider_table(providers: &Table) -> AppResult<Table> {
    let Some((_, value)) = providers.iter().next() else {
        return Err(AppError::InvalidInput(
            "config.toml 缺少当前 provider 配置".to_string(),
        ));
    };
    value
        .as_table()
        .cloned()
        .ok_or_else(|| AppError::InvalidInput("provider 配置必须是表".to_string()))
}

fn read_optional_table(value: Option<&TomlValue>, message: &str) -> AppResult<Table> {
    match value {
        Some(item) => item
            .as_table()
            .cloned()
            .ok_or_else(|| AppError::InvalidInput(message.to_string())),
        None => Ok(Table::new()),
    }
}

fn replace_model_providers(template: TomlValue) -> AppResult<TomlValue> {
    let template_map = template.as_table().ok_or_else(|| {
        AppError::InvalidInput("config.toml 的 model_providers 必须是表".to_string())
    })?;
    Ok(TomlValue::Table(template_map.clone()))
}
