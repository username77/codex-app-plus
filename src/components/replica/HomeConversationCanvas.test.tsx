import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ThreadSummary } from "../../domain/types";
import type { TimelineEntry } from "../../domain/timeline";
import { HomeConversationCanvas } from "./HomeConversationCanvas";

function createThread(status: ThreadSummary["status"]): ThreadSummary {
  return { id: "thread-1", title: "Thread", cwd: "E:/code/codex-app-plus", archived: false, updatedAt: "2026-03-07T04:00:00.000Z", source: "rpc", status, activeFlags: [], queuedCount: 0 };
}

function renderCanvas(
  activities: ReadonlyArray<TimelineEntry>,
  options?: { readonly status?: ThreadSummary["status"]; readonly activeTurnId?: string | null },
) {
  return render(
    <HomeConversationCanvas
      activities={activities}
      selectedThread={createThread(options?.status ?? "idle")}
      activeTurnId={options?.activeTurnId ?? null}
      placeholder={null}
      onResolveServerRequest={vi.fn().mockResolvedValue(undefined)}
    />,
  );
}

const USER_MESSAGE: TimelineEntry = { id: "user-1", kind: "userMessage", role: "user", threadId: "thread-1", turnId: "turn-1", itemId: "item-user", text: "请继续", status: "done" };
const USER_IMAGE_MESSAGE: TimelineEntry = { id: "user-image-1", kind: "userMessage", role: "user", threadId: "thread-1", turnId: "turn-1", itemId: "item-user-image", text: "", status: "done", attachments: [{ kind: "image", source: "dataUrl", value: "data:image/png;base64,aGVsbG8=" }] };
const COMMAND_ENTRY: TimelineEntry = { id: "command-1", kind: "commandExecution", threadId: "thread-1", turnId: "turn-1", itemId: "item-command", command: "pnpm test", cwd: "E:/code/codex-app-plus", processId: "proc-1", status: "inProgress", commandActions: [], output: "running...", exitCode: null, durationMs: null, terminalInteractions: [], approvalRequestId: null };
const FILE_CHANGE_ENTRY: TimelineEntry = { id: "file-1", kind: "fileChange", threadId: "thread-1", turnId: "turn-1", itemId: "item-file", changes: [{ path: "src/App.tsx", kind: { type: "update", move_path: null }, diff: "@@ -1 +1 @@" }], status: "completed", output: "patched", approvalRequestId: null };
const ASSISTANT_PRELUDE: TimelineEntry = { id: "assistant-1", kind: "agentMessage", role: "assistant", threadId: "thread-1", turnId: "turn-1", itemId: "item-assistant-1", text: "我先检查顺序。", status: "done" };
const ASSISTANT_REPLY: TimelineEntry = { id: "assistant-2", kind: "agentMessage", role: "assistant", threadId: "thread-1", turnId: "turn-1", itemId: "item-assistant-2", text: "已经修好。", status: "done" };
const STREAMING_ASSISTANT_MESSAGE: TimelineEntry = { id: "assistant-streaming-1", kind: "agentMessage", role: "assistant", threadId: "thread-1", turnId: "turn-1", itemId: "item-assistant-streaming", text: "正在输出正文", status: "streaming" };
const REQUEST_ENTRY: TimelineEntry = { id: "request-1", kind: "pendingUserInput", threadId: "thread-1", turnId: "turn-1", itemId: "item-request", requestId: "request-1", request: { kind: "userInput", id: "request-1", method: "item/tool/requestUserInput", threadId: "thread-1", turnId: "turn-1", itemId: "item-request", params: { threadId: "thread-1", turnId: "turn-1", itemId: "item-request", questions: [{ id: "scope", header: "范围", question: "请选择处理范围", isOther: false, isSecret: false, options: [{ label: "主界面", description: "只改主界面" }] }] }, questions: [{ id: "scope", header: "范围", question: "请选择处理范围", isOther: false, isSecret: false, options: [{ label: "主界面", description: "只改主界面" }] }] } };

describe("HomeConversationCanvas", () => {
  it("thread 未激活但 activeTurnId 命中时仍显示 thinking", () => {
    const { container } = renderCanvas([USER_MESSAGE], { status: "idle", activeTurnId: "turn-1" });

    expect(screen.getByText("正在思考")).toBeInTheDocument();
    expect(container.querySelector(".home-chat-message-assistant .home-chat-thinking-footer")).not.toBeNull();
  });

  it("将 trace 行与 request 卡片按流程顺序渲染", () => {
    const { container } = renderCanvas([USER_MESSAGE, COMMAND_ENTRY, REQUEST_ENTRY], { status: "idle", activeTurnId: "turn-1" });

    expect(screen.getByText("Command execution")).toBeInTheDocument();
    expect(screen.getByText("Additional input required")).toBeInTheDocument();
    expect(screen.getByText("请选择处理范围")).toBeInTheDocument();
    expect(container.querySelector(".home-trace-entry")).not.toBeNull();
    expect(container.querySelector(".home-request-card")).not.toBeNull();
    expect(screen.queryByText("正在思考")).toBeNull();
  });

  it("保持 assistant 前导文本、trace 与最终回复的原始顺序", () => {
    const { container } = renderCanvas([USER_MESSAGE, ASSISTANT_PRELUDE, COMMAND_ENTRY, FILE_CHANGE_ENTRY, ASSISTANT_REPLY]);
    const group = container.querySelector(".home-turn-group");
    const classNames = Array.from(group?.children ?? []).map((element) => (element as HTMLElement).className);

    expect(classNames[0]).toContain("home-chat-message-user");
    expect(classNames[1]).toContain("home-chat-message-assistant");
    expect(classNames[2]).toContain("home-trace-entry");
    expect(classNames[3]).toContain("home-trace-entry");
    expect(classNames[4]).toContain("home-chat-message-assistant");
  });

  it("将 thinking 行追加在已有 assistant 内容之后", () => {
    const { container } = renderCanvas([USER_MESSAGE, COMMAND_ENTRY, STREAMING_ASSISTANT_MESSAGE], { activeTurnId: "turn-1" });
    const assistantMessages = container.querySelectorAll(".home-chat-message-assistant");

    expect(screen.getByText("正在输出正文")).toBeInTheDocument();
    expect(screen.getByText("正在思考")).toBeInTheDocument();
    expect(assistantMessages).toHaveLength(2);
    expect(assistantMessages[1]?.querySelector(".home-chat-thinking-footer")).not.toBeNull();
  });

  it("渲染用户图片预览而不把 base64 文本塞进气泡", () => {
    const { container } = renderCanvas([USER_IMAGE_MESSAGE]);

    expect(container.querySelector(".home-chat-attachments img")).not.toBeNull();
    expect(screen.queryByText(/data:image\/png;base64/i)).toBeNull();
  });
});
