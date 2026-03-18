import type { CodexAuthMode, CodexAuthModeStateOutput } from "../../../bridge/types";
import { useI18n } from "../../../i18n";
import type { ConfigValueWriteParams } from "../../../protocol/generated/v2/ConfigValueWriteParams";
import { readUserConfigWriteTarget } from "../config/configWriteTarget";

export function formatAuthModeSummary(
  t: ReturnType<typeof useI18n>["t"],
  state: CodexAuthModeStateOutput | null,
): string {
  if (state === null) {
    return t("settings.config.auth.loading");
  }
  if (state.activeMode === "apikey") {
    if (state.activeProviderKey !== null) {
      return t("settings.config.auth.modeApiKeyWithProvider", {
        providerKey: state.activeProviderKey,
      });
    }
    return t("settings.config.auth.modeApiKey");
  }
  return state.oauthSnapshotAvailable
    ? t("settings.config.auth.modeChatgptReady")
    : t("settings.config.auth.modeChatgptNeedsLogin");
}

export async function writeForcedLoginMethod(
  writeConfigValue: (params: ConfigValueWriteParams) => Promise<unknown>,
  configSnapshot: unknown,
  mode: CodexAuthMode,
): Promise<void> {
  const writeTarget = readUserConfigWriteTarget(configSnapshot);
  await writeConfigValue({
    keyPath: "forced_login_method",
    value: mode === "apikey" ? "api" : "chatgpt",
    mergeStrategy: "replace",
    filePath: writeTarget.filePath,
    expectedVersion: writeTarget.expectedVersion,
  });
}
