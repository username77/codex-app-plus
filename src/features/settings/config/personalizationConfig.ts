import type { Personality } from "../../../protocol/generated/Personality";
import type { ConfigReadResponse } from "../../../protocol/generated/v2/ConfigReadResponse";

export interface PersonalizationConfigView {
  readonly personality: Personality;
}

const DEFAULT_PERSONALITY: Personality = "pragmatic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTypedConfig(value: unknown): value is ConfigReadResponse {
  return isRecord(value) && isRecord(value.config);
}

function toPersonality(value: unknown): Personality {
  if (value === "none" || value === "friendly" || value === "pragmatic") {
    return value;
  }
  return DEFAULT_PERSONALITY;
}

export function readPersonalizationConfigView(snapshot: unknown): PersonalizationConfigView {
  if (!isTypedConfig(snapshot)) {
    return { personality: DEFAULT_PERSONALITY };
  }

  const config = snapshot.config as Record<string, unknown>;
  return { personality: toPersonality(config.personality) };
}
