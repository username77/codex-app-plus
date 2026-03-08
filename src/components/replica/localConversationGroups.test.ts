import { describe, expect, it } from "vitest";
import type { TimelineEntry } from "../../domain/timeline";
import { flattenConversationRenderGroup, splitActivitiesIntoRenderGroups } from "./localConversationGroups";

function createUserMessage(): TimelineEntry {
  return { id: "user-1", kind: "userMessage", role: "user", threadId: "thread-1", turnId: "turn-1", itemId: "item-user", text: "检查当前会话流", status: "done" };
}

function createAssistantMessage(id = "assistant-1", text = "先给出结论"): TimelineEntry {
  return { id, kind: "agentMessage", role: "assistant", threadId: "thread-1", turnId: "turn-1", itemId: id, text, status: "done" };
}

function createReasoning(): TimelineEntry {
  return { id: "reasoning-1", kind: "reasoning", threadId: "thread-1", turnId: "turn-1", itemId: "item-reasoning", summary: ["先确认 turn 内原始顺序"], content: ["详细推理"] };
}

function createCommand(): TimelineEntry {
  return { id: "command-1", kind: "commandExecution", threadId: "thread-1", turnId: "turn-1", itemId: "item-command", command: "pnpm test", cwd: "E:/code/codex-app-plus", processId: "proc-1", status: "inProgress", commandActions: [], output: "running...", exitCode: null, durationMs: null, terminalInteractions: [], approvalRequestId: null };
}

function createFileChange(): TimelineEntry {
  return { id: "file-1", kind: "fileChange", threadId: "thread-1", turnId: "turn-1", itemId: "item-file", changes: [{ path: "src/App.tsx", kind: { type: "update", move_path: null }, diff: "@@ -1 +1 @@" }], status: "completed", output: "patched", approvalRequestId: null };
}

function createDynamicToolCall(): TimelineEntry {
  return { id: "dynamic-1", kind: "dynamicToolCall", threadId: "thread-1", turnId: "turn-1", itemId: "item-dynamic", tool: "browser.run", arguments: { task: "open" }, status: "completed", contentItems: [{ type: "inputText", text: "done" }], success: true, durationMs: 1200 };
}

function createCollabToolCall(): TimelineEntry {
  return { id: "collab-1", kind: "collabAgentToolCall", threadId: "thread-1", turnId: "turn-1", itemId: "item-collab", tool: "spawnAgent", status: "completed", senderThreadId: "thread-1", receiverThreadIds: ["thread-2"], prompt: "check ui", agentsStates: { "thread-2": { status: "completed", message: "ok" } } };
}

function createWebSearch(): TimelineEntry {
  return { id: "web-1", kind: "webSearch", threadId: "thread-1", turnId: "turn-1", itemId: "item-web", query: "latest docs", action: { type: "search", query: "latest docs", queries: ["latest docs"] } };
}

function createUserInputRequest(): TimelineEntry {
  return { id: "request-1", kind: "pendingUserInput", threadId: "thread-1", turnId: "turn-1", itemId: "item-request", requestId: "request-1", request: { kind: "userInput", id: "request-1", method: "item/tool/requestUserInput", threadId: "thread-1", turnId: "turn-1", itemId: "item-request", params: { threadId: "thread-1", turnId: "turn-1", itemId: "item-request", questions: [{ id: "scope", header: "范围", question: "请选择处理范围", isOther: false, isSecret: false, options: [{ label: "主界面", description: "只改主界面" }] }] }, questions: [{ id: "scope", header: "范围", question: "请选择处理范围", isOther: false, isSecret: false, options: [{ label: "主界面", description: "只改主界面" }] }] } };
}

describe("localConversationGroups", () => {
  it("为进行中的 turn 追加独立 thinking 行", () => {
    const [group] = splitActivitiesIntoRenderGroups([createUserMessage()], "turn-1");

    expect(flattenConversationRenderGroup(group).map((node) => node.kind)).toEqual(["userBubble", "assistantThinking"]);
  });

  it("保持 assistant 文本与 trace 的原始顺序", () => {
    const entries = [createUserMessage(), createAssistantMessage("assistant-1", "先同步计划"), createCommand(), createFileChange(), createAssistantMessage("assistant-2", "已完成修改")];
    const [group] = splitActivitiesIntoRenderGroups(entries, null);

    expect(flattenConversationRenderGroup(group).map((node) => node.kind)).toEqual(["userBubble", "assistantMessage", "traceItem", "traceItem", "assistantMessage"]);
  });

  it("turn 未处于 thread active 时也能显示 reasoning、trace 和 thinking", () => {
    const [group] = splitActivitiesIntoRenderGroups([createUserMessage(), createReasoning(), createCommand()], "turn-1");

    expect(flattenConversationRenderGroup(group).map((node) => node.kind)).toEqual(["userBubble", "reasoningBlock", "traceItem", "assistantThinking"]);
  });

  it("有阻塞 request 时不再追加 thinking 行", () => {
    const [group] = splitActivitiesIntoRenderGroups([createUserMessage(), createUserInputRequest()], "turn-1");

    expect(flattenConversationRenderGroup(group).map((node) => node.kind)).toEqual(["userBubble", "requestBlock"]);
  });

  it("将 dynamicToolCall、collabAgentToolCall 与 webSearch 纳入 assistant flow", () => {
    const entries = [createUserMessage(), createDynamicToolCall(), createCollabToolCall(), createWebSearch()];
    const [group] = splitActivitiesIntoRenderGroups(entries, null);
    const flowKinds = group.assistantFlow.filter((node) => node.kind === "traceItem").map((node) => node.item.kind);

    expect(flowKinds).toEqual(["dynamicToolCall", "collabAgentToolCall", "webSearch"]);
    expect(flattenConversationRenderGroup(group).map((node) => node.kind)).toEqual(["userBubble", "traceItem", "traceItem", "traceItem"]);
  });
});
