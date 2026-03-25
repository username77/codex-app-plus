import { describe, expect, it } from "vitest";
import type { CustomPromptOutput } from "../../../bridge/types";
import {
  createCustomPromptPaletteItems,
  customPromptNameFromPaletteKey,
  toCustomPromptPaletteKey,
} from "./customPromptPalette";

function createPrompt(name: string, description: string | null = null): CustomPromptOutput {
  return {
    name,
    path: `~/.codex/prompts/${name}.md`,
    content: `Prompt ${name}`,
    description,
    argumentHint: null,
  };
}

describe("customPromptPalette", () => {
  it("lists prompts after builtins and hides builtin name collisions", () => {
    const items = createCustomPromptPaletteItems("", [
      createPrompt("review"),
      createPrompt("draft-pr", "Create a draft PR"),
    ], ["review", "new"]);

    expect(items).toEqual([{
      key: "custom-prompt:draft-pr",
      label: "/prompts:draft-pr",
      description: "Create a draft PR",
      disabled: false,
      meta: "Prompt",
    }]);
  });

  it("matches by bare name and prompts prefix", () => {
    const prompts = [createPrompt("draft-pr"), createPrompt("release-note")];

    expect(createCustomPromptPaletteItems("draft", prompts, []).map((item) => item.label)).toEqual([
      "/prompts:draft-pr",
    ]);
    expect(createCustomPromptPaletteItems("prompts:release", prompts, []).map((item) => item.label)).toEqual([
      "/prompts:release-note",
    ]);
  });

  it("encodes and decodes palette keys", () => {
    const key = toCustomPromptPaletteKey("draft-pr");

    expect(customPromptNameFromPaletteKey(key)).toBe("draft-pr");
    expect(customPromptNameFromPaletteKey("review")).toBeNull();
  });
});
