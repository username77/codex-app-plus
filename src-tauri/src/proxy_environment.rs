use portable_pty::CommandBuilder;
use std::process::Command as StdCommand;

use crate::models::ProxySettings;

const HTTP_PROXY_KEYS: [&str; 2] = ["HTTP_PROXY", "http_proxy"];
const HTTPS_PROXY_KEYS: [&str; 2] = ["HTTPS_PROXY", "https_proxy"];
const NO_PROXY_KEYS: [&str; 2] = ["NO_PROXY", "no_proxy"];

pub(crate) fn proxy_environment_assignments(
    settings: &ProxySettings,
) -> Vec<(&'static str, String)> {
    if !settings.enabled {
        return Vec::new();
    }

    let mut assignments = Vec::new();
    extend_assignments(
        &mut assignments,
        &HTTP_PROXY_KEYS,
        settings.http_proxy.trim(),
    );
    extend_assignments(
        &mut assignments,
        &HTTPS_PROXY_KEYS,
        settings.https_proxy.trim(),
    );
    extend_assignments(&mut assignments, &NO_PROXY_KEYS, settings.no_proxy.trim());
    assignments
}

pub(crate) fn apply_std_proxy_environment(
    command: &mut StdCommand,
    settings: &ProxySettings,
) {
    for (key, value) in proxy_environment_assignments(settings) {
        command.env(key, value);
    }
}

pub(crate) fn apply_terminal_proxy_environment(
    command: &mut CommandBuilder,
    settings: &ProxySettings,
) {
    for (key, value) in proxy_environment_assignments(settings) {
        command.env(key, value);
    }
}

fn extend_assignments(
    assignments: &mut Vec<(&'static str, String)>,
    keys: &[&'static str],
    value: &str,
) {
    if value.is_empty() {
        return;
    }
    for key in keys {
        assignments.push((*key, value.to_string()));
    }
}

#[cfg(test)]
mod tests {
    use super::{apply_std_proxy_environment, proxy_environment_assignments};
    use crate::models::ProxySettings;
    use std::collections::BTreeMap;
    use std::process::Command as StdCommand;

    fn enabled_settings() -> ProxySettings {
        ProxySettings {
            enabled: true,
            http_proxy: "http://127.0.0.1:8080".to_string(),
            https_proxy: "https://127.0.0.1:8443".to_string(),
            no_proxy: "localhost,127.0.0.1".to_string(),
        }
    }

    #[test]
    fn returns_no_assignments_when_proxy_is_disabled() {
        assert!(proxy_environment_assignments(&ProxySettings::default()).is_empty());
    }

    #[test]
    fn builds_uppercase_and_lowercase_proxy_environment() {
        let assignments = proxy_environment_assignments(&enabled_settings());

        assert_eq!(
            assignments,
            vec![
                ("HTTP_PROXY", "http://127.0.0.1:8080".to_string()),
                ("http_proxy", "http://127.0.0.1:8080".to_string()),
                ("HTTPS_PROXY", "https://127.0.0.1:8443".to_string()),
                ("https_proxy", "https://127.0.0.1:8443".to_string()),
                ("NO_PROXY", "localhost,127.0.0.1".to_string()),
                ("no_proxy", "localhost,127.0.0.1".to_string()),
            ]
        );
    }

    #[test]
    fn applies_proxy_environment_to_std_command() {
        let mut command = StdCommand::new("git");
        apply_std_proxy_environment(&mut command, &enabled_settings());

        let env_map = command
            .get_envs()
            .map(|(key, value)| {
                (
                    key.to_string_lossy().to_string(),
                    value
                        .map(|item| item.to_string_lossy().to_string())
                        .unwrap_or_default(),
                )
            })
            .collect::<BTreeMap<_, _>>();

        assert_eq!(
            env_map.get("HTTP_PROXY"),
            Some(&"http://127.0.0.1:8080".to_string())
        );
        assert_eq!(
            env_map
                .get("https_proxy")
                .or_else(|| env_map.get("HTTPS_PROXY")),
            Some(&"https://127.0.0.1:8443".to_string())
        );
    }
}
