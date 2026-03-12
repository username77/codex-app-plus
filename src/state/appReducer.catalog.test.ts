import { describe, expect, it } from "vitest";
import { createInitialState, appReducer } from "./appReducer";
import type { ConversationState } from "../domain/conversation";

function createConversation(id: string, agentEnvironment: ConversationState["agentEnvironment"]): ConversationState {
  return {
    id,
    title: id,
    branch: null,
    cwd: "E:/code/project",
    updatedAt: "2026-03-12T10:00:00.000Z",
    source: "rpc",
    agentEnvironment,
    status: "idle",
    activeFlags: [],
    resumeState: "needs_resume",
    turns: [],
    queuedFollowUps: [],
    interruptRequestedTurnId: null,
    hidden: false,
  };
}

describe("appReducer catalog replacement", () => {
  it("rebuilds the catalog instead of keeping conversations from another environment", () => {
    const initialState = appReducer(createInitialState(), {
      type: "conversations/catalogLoaded",
      conversations: [createConversation("thread-win", "windowsNative")],
    });
    const selectedState = appReducer(initialState, {
      type: "conversation/selected",
      conversationId: "thread-win",
    });

    const nextState = appReducer(selectedState, {
      type: "conversations/catalogLoaded",
      conversations: [createConversation("thread-wsl", "wsl")],
    });

    expect(nextState.orderedConversationIds).toEqual(["thread-wsl"]);
    expect(nextState.conversationsById["thread-win"]).toBeUndefined();
    expect(nextState.selectedConversationId).toBeNull();
  });
});
