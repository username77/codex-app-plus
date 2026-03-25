import { describe, expect, it } from "vitest";
import type { CustomPromptOutput } from "../../../bridge/types";
import {
  createCustomPromptCommandInsert,
  expandCustomPromptCommand,
  promptArgumentNames,
  promptHasNumericPlaceholders,
} from "./customPromptTemplate";

function createPrompt(overrides: Partial<CustomPromptOutput>): CustomPromptOutput {
  return {
    name: "review-branch",
    path: "~/.codex/prompts/review-branch.md",
    content: "Review $USER changes on $BRANCH",
    description: "Review the current branch",
    argumentHint: null,
    ...overrides,
  };
}

describe("customPromptTemplate", () => {
  it("extracts named placeholder arguments once", () => {
    expect(promptArgumentNames("Review $USER on $BRANCH with $$USER and $USER")).toEqual([
      "USER",
      "BRANCH",
    ]);
  });

  it("detects numeric placeholders", () => {
    expect(promptHasNumericPlaceholders("Summarize $1 and $ARGUMENTS")).toBe(true);
    expect(promptHasNumericPlaceholders("Review $USER changes")).toBe(false);
  });

  it("creates a named-argument command skeleton", () => {
    const insert = createCustomPromptCommandInsert(createPrompt({}));

    expect(insert).toEqual({
      text: '/prompts:review-branch USER="" BRANCH=""',
      cursor: 29,
    });
  });

  it("expands named arguments before send", () => {
    const expanded = expandCustomPromptCommand(
      '/prompts:review-branch USER="Alice Smith" BRANCH=main',
      [createPrompt({})],
    );

    expect(expanded).toBe("Review Alice Smith changes on main");
  });

  it("expands positional arguments and $ARGUMENTS", () => {
    const expanded = expandCustomPromptCommand(
      "/prompts:summary alpha beta",
      [createPrompt({
        name: "summary",
        content: "First=$1 Rest=$ARGUMENTS",
      })],
    );

    expect(expanded).toBe("First=alpha Rest=alpha beta");
  });

  it("returns null for unknown prompts so regular text still sends", () => {
    expect(expandCustomPromptCommand("/prompts:missing USER=Alice", [createPrompt({})])).toBeNull();
  });

  it("throws a visible error when required args are missing", () => {
    expect(() => expandCustomPromptCommand("/prompts:review-branch USER=Alice", [createPrompt({})]))
      .toThrow("缺少必填参数");
  });
});
