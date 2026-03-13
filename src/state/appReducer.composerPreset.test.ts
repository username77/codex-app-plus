import { describe, expect, it } from "vitest";
import { createConversationFromThreadSummary } from "../features/conversation/model/conversationState";
import { appReducer, createInitialState } from "./appReducer";

function createSummary(id: string) {
  return {
    id,
    title: id,
    branch: null,
    cwd: "E:/code/project",
    archived: false,
    updatedAt: "2026-03-12T10:00:00.000Z",
    source: "rpc" as const,
    agentEnvironment: "windowsNative" as const,
    status: "idle" as const,
    activeFlags: [],
    queuedCount: 0,
  };
}

describe("appReducer composer collaboration presets", () => {
  it("keeps thread presets isolated by conversation id", () => {
    let state = createInitialState();

    state = appReducer(state, {
      type: "composer/threadCollaborationPresetSelected",
      conversationId: "thread-1",
      preset: "plan",
    });
    state = appReducer(state, {
      type: "composer/threadCollaborationPresetSelected",
      conversationId: "thread-2",
      preset: "default",
    });

    expect(state.composerUi.threadCollaborationPresets).toEqual({
      "thread-1": "plan",
      "thread-2": "default",
    });
  });

  it("transfers the draft preset into the created thread and resets the draft preset", () => {
    let state = createInitialState();

    state = appReducer(state, {
      type: "composer/draftCollaborationPresetSelected",
      preset: "plan",
    });
    state = appReducer(state, {
      type: "composer/draftCollaborationPresetTransferred",
      conversationId: "thread-1",
    });

    expect(state.composerUi.threadCollaborationPresets["thread-1"]).toBe("plan");
    expect(state.composerUi.draftCollaborationPreset).toBe("default");
  });

  it("prunes presets for threads missing from the refreshed catalog", () => {
    let state = createInitialState();

    state = appReducer(state, {
      type: "composer/threadCollaborationPresetSelected",
      conversationId: "thread-1",
      preset: "plan",
    });
    state = appReducer(state, {
      type: "composer/threadCollaborationPresetSelected",
      conversationId: "thread-2",
      preset: "plan",
    });
    state = appReducer(state, {
      type: "conversations/catalogLoaded",
      conversations: [createConversationFromThreadSummary(createSummary("thread-2"))],
    });

    expect(state.composerUi.threadCollaborationPresets).toEqual({ "thread-2": "plan" });
  });
});
