import { describe, expect, it } from "vitest";
import { appendAssistantDelta, completeTurnMessages, mapThreadHistoryToMessages } from "./conversationMessages";

describe("conversationMessages", () => {
  it("maps thread history into user and assistant messages", () => {
    const thread = {
      id: "thread-1",
      turns: [
        {
          id: "turn-1",
          items: [
            { type: "userMessage", id: "user-1", content: [{ type: "text", text: "hello", text_elements: [] }] },
            { type: "agentMessage", id: "assistant-1", text: "world", phase: null }
          ]
        }
      ]
    } as const;

    expect(mapThreadHistoryToMessages(thread as never).map((message) => `${message.role}:${message.text}`)).toEqual([
      "user:hello",
      "assistant:world"
    ]);
  });

  it("aggregates assistant delta into one message bubble", () => {
    const messages = appendAssistantDelta([], "thread-1", "turn-1", "item-1", "Hello");
    const merged = appendAssistantDelta(messages, "thread-1", "turn-1", "item-1", " world");

    expect(merged).toHaveLength(1);
    expect(merged[0]?.text).toBe("Hello world");
    expect(merged[0]?.status).toBe("streaming");
  });

  it("marks assistant messages as done when turn completes", () => {
    const messages = appendAssistantDelta([], "thread-1", "turn-1", "item-1", "Hello");
    const completed = completeTurnMessages(messages, "thread-1", "turn-1");

    expect(completed[0]?.status).toBe("done");
  });
});
