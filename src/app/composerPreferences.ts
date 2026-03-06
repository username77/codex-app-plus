import type { HostBridge } from "../bridge/types";
import type { ReasoningEffort } from "../protocol/generated/ReasoningEffort";
import type { Model } from "../protocol/generated/v2/Model";
import type { ModelListResponse } from "../protocol/generated/v2/ModelListResponse";

const MODEL_PAGE_SIZE = 100;
const REASONING_EFFORT_VALUES = ["none", "minimal", "low", "medium", "high", "xhigh"] as const satisfies ReadonlyArray<ReasoningEffort>;
const REASONING_EFFORT_SET = new Set<ReasoningEffort>(REASONING_EFFORT_VALUES);

export const DEFAULT_COMPOSER_MODEL_LABEL = "GPT-5.2";

export interface ComposerSelection {
  readonly model: string | null;
  readonly effort: ReasoningEffort | null;
}

export interface ComposerModelOption {
  readonly id: string;
  readonly value: string;
  readonly label: string;
  readonly defaultEffort: ReasoningEffort;
  readonly supportedEfforts: ReadonlyArray<ReasoningEffort>;
  readonly isDefault: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toReasoningEffort(value: unknown): ReasoningEffort | null {
  return typeof value === "string" && REASONING_EFFORT_SET.has(value as ReasoningEffort)
    ? (value as ReasoningEffort)
    : null;
}

function collectSupportedEfforts(model: Model): ReadonlyArray<ReasoningEffort> {
  const supported = model.supportedReasoningEfforts.map((item) => item.reasoningEffort);
  return Array.from(new Set([model.defaultReasoningEffort, ...supported]));
}

function toComposerModelOption(model: Model): ComposerModelOption {
  return {
    id: model.id,
    value: model.model,
    label: model.displayName.trim().length > 0 ? model.displayName : model.model,
    defaultEffort: model.defaultReasoningEffort,
    supportedEfforts: collectSupportedEfforts(model),
    isDefault: model.isDefault
  };
}

export function readComposerSelectionFromConfig(configSnapshot: unknown): ComposerSelection {
  if (!isRecord(configSnapshot) || !isRecord(configSnapshot.config)) {
    return { model: null, effort: null };
  }

  return {
    model: typeof configSnapshot.config.model === "string" ? configSnapshot.config.model : null,
    effort: toReasoningEffort(configSnapshot.config.model_reasoning_effort)
  };
}

export function resolveComposerModel(
  models: ReadonlyArray<ComposerModelOption>,
  preferredModel: string | null
): ComposerModelOption | null {
  if (preferredModel !== null) {
    const preferred = models.find((model) => model.value === preferredModel);
    if (preferred !== undefined) {
      return preferred;
    }
  }

  return models.find((model) => model.isDefault) ?? models[0] ?? null;
}

export function resolveComposerEffort(
  model: ComposerModelOption | null,
  preferredEffort: ReasoningEffort | null
): ReasoningEffort | null {
  if (model === null) {
    return preferredEffort;
  }
  if (preferredEffort !== null && model.supportedEfforts.includes(preferredEffort)) {
    return preferredEffort;
  }
  return model.defaultEffort;
}

export function getComposerModelLabel(models: ReadonlyArray<ComposerModelOption>, value: string | null): string {
  const matched = value === null ? null : models.find((model) => model.value === value) ?? null;
  return matched?.label ?? value ?? DEFAULT_COMPOSER_MODEL_LABEL;
}

export async function listComposerModels(hostBridge: HostBridge): Promise<ReadonlyArray<ComposerModelOption>> {
  const models: Array<ComposerModelOption> = [];
  let cursor: string | null = null;

  do {
    const response = (await hostBridge.rpc.request({
      method: "model/list",
      params: { cursor, includeHidden: true, limit: MODEL_PAGE_SIZE }
    })).result as ModelListResponse;

    models.push(...response.data.map(toComposerModelOption));
    cursor = response.nextCursor;
  } while (cursor !== null);

  return models;
}
