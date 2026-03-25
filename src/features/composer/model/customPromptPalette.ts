import type { CustomPromptOutput } from "../../../bridge/types";
import type { ComposerCommandPaletteItem } from "../ui/ComposerCommandPalette";
import { CUSTOM_PROMPT_PREFIX } from "./customPromptTemplate";

const CUSTOM_PROMPT_ITEM_PREFIX = "custom-prompt:";
const CUSTOM_PROMPT_DESCRIPTION = "发送已保存 prompt。";
const CUSTOM_PROMPT_META = "Prompt";

export function createCustomPromptPaletteItems(
  query: string,
  prompts: ReadonlyArray<CustomPromptOutput>,
  builtinIds: ReadonlyArray<string>,
): ReadonlyArray<ComposerCommandPaletteItem> {
  return filterCustomPrompts(query, prompts, builtinIds).map((prompt) => ({
    key: toCustomPromptPaletteKey(prompt.name),
    label: `/${CUSTOM_PROMPT_PREFIX}:${prompt.name}`,
    description: prompt.description ?? CUSTOM_PROMPT_DESCRIPTION,
    disabled: false,
    meta: CUSTOM_PROMPT_META,
  }));
}

export function toCustomPromptPaletteKey(name: string): string {
  return `${CUSTOM_PROMPT_ITEM_PREFIX}${name}`;
}

export function customPromptNameFromPaletteKey(key: string): string | null {
  return key.startsWith(CUSTOM_PROMPT_ITEM_PREFIX)
    ? key.slice(CUSTOM_PROMPT_ITEM_PREFIX.length)
    : null;
}

function filterCustomPrompts(
  query: string,
  prompts: ReadonlyArray<CustomPromptOutput>,
  builtinIds: ReadonlyArray<string>,
): ReadonlyArray<CustomPromptOutput> {
  const builtinIdSet = new Set(builtinIds);
  const visiblePrompts = [...prompts]
    .filter((prompt) => !builtinIdSet.has(prompt.name))
    .sort((left, right) => left.name.localeCompare(right.name));
  const search = query.trim().split(/\s+/, 1)[0]?.toLowerCase() ?? "";
  if (search.length === 0) {
    return visiblePrompts;
  }

  const exact: Array<CustomPromptOutput> = [];
  const prefix: Array<CustomPromptOutput> = [];
  for (const prompt of visiblePrompts) {
    const promptName = prompt.name.toLowerCase();
    const displayName = `${CUSTOM_PROMPT_PREFIX}:${promptName}`;
    if (promptName === search || displayName === search) {
      exact.push(prompt);
      continue;
    }
    if (promptName.startsWith(search) || displayName.startsWith(search)) {
      prefix.push(prompt);
    }
  }
  return [...exact, ...prefix];
}
