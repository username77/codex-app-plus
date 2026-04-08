import { describe, expect, it } from "vitest";
import type { ConversationState, ConversationTurnState } from "../../../domain/conversation";
import type { ReceivedServerRequest } from "../../../domain/serverRequests";
import { INITIAL_STATE, type AppState } from "../../../domain/types";
import type { ThreadItem } from "../../../protocol/generated/v2/ThreadItem";
import { createVisibleThreadsSelector } from "./workspaceConversationSelectors";

function createItemState(item: ThreadItem): ConversationTurnState["items"][number] {
  return {
    item,
    approvalRequestId: null,
    outputText: "",
    terminalInteractions: [],
    rawResponse: null,
    progressMessages: [],
  };
}

function createTurn(
  turnId: string | null,
  status: ConversationTurnState["status"],
  items: ReadonlyArray<ThreadItem>,
): ConversationTurnState {
  return {
    localId: turnId ?? "local-turn",
    turnId,
    status,
    error: null,
    params: null,
    items: items.map(createItemState),
    turnStartedAtMs: Date.now(),
    planExplanation: null,
    planSteps: [],
    diff: null,
    rawResponses: [],
    notices: [],
    reviewStates: [],
    contextCompactions: [],
    tokenUsage: null,
  };
}

function createConversation(overrides?: Partial<ConversationState>): ConversationState {
  return {
    id: "thread-1",
    title: "Plan thread",
    branch: null,
    cwd: "E:/code/FPGA",
    updatedAt: "2026-04-08T10:00:00.000Z",
    source: "appServer",
    agentEnvironment: "windowsNative",
    status: "idle",
    activeFlags: [],
    resumeState: "resumed",
    turns: [],
    queuedFollowUps: [],
    interruptRequestedTurnId: null,
    hidden: false,
    ...overrides,
  };
}

function createState(
  conversation: ConversationState,
  pendingRequests: ReadonlyArray<ReceivedServerRequest> = [],
): AppState {
  return {
    ...INITIAL_STATE,
    conversationsById: { [conversation.id]: conversation },
    orderedConversationIds: [conversation.id],
    pendingRequestsByConversationId: pendingRequests.length > 0
      ? { [conversation.id]: pendingRequests }
      : {},
  };
}

describe("workspaceConversationSelectors", () => {
  it("marks threads with attention active flags as awaiting reply", () => {
    const selector = createVisibleThreadsSelector("windowsNative");
    const conversation = createConversation({
      status: "active",
      activeFlags: ["waitingOnUserInput"],
    });

    const summary = selector(createState(conversation))[0];

    expect(summary?.requiresUserAttention).toBe(true);
  });

  it("marks threads with unresolved approval requests as awaiting reply", () => {
    const selector = createVisibleThreadsSelector("windowsNative");
    const conversation = createConversation();
    const request: ReceivedServerRequest = {
      id: "request-1",
      rpcId: "1",
      kind: "unknown",
      method: "item/permissions/requestApproval",
      threadId: conversation.id,
      turnId: "turn-1",
      itemId: "item-1",
      params: {},
    };

    const summary = selector(createState(conversation, [request]))[0];

    expect(summary?.requiresUserAttention).toBe(true);
  });

  it("marks threads with the latest proposed plan as awaiting reply and clears after the next turn starts", () => {
    const selector = createVisibleThreadsSelector("windowsNative");
    const proposedPlanConversation = createConversation({
      turns: [
        createTurn("turn-1", "completed", [{
          type: "agentMessage",
          id: "assistant-1",
          text: "<proposed_plan>\n\n## 计划书\n- 第一步\n</proposed_plan>",
          phase: null,
          memoryCitation: null,
        }]),
      ],
    });

    const proposedPlanSummary = selector(createState(proposedPlanConversation))[0];
    expect(proposedPlanSummary?.requiresUserAttention).toBe(true);

    const nextTurnConversation = createConversation({
      turns: [
        ...proposedPlanConversation.turns,
        createTurn("turn-2", "inProgress", [{
          type: "userMessage",
          id: "user-2",
          content: [{ type: "text", text: "Implement the plan.", text_elements: [] }],
        }]),
      ],
    });

    const nextTurnSummary = selector(createState(nextTurnConversation))[0];
    expect(nextTurnSummary?.requiresUserAttention).toBeUndefined();
  });
});
