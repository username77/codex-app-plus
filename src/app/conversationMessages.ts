import type { ConversationMessage, ThreadSummary } from "../domain/types";
import type { Thread } from "../protocol/generated/v2/Thread";
import type { Turn } from "../protocol/generated/v2/Turn";
import type { ThreadItem } from "../protocol/generated/v2/ThreadItem";
import type { UserInput } from "../protocol/generated/v2/UserInput";

const EMPTY_TEXT = "";

export function createMessageId(threadId: string, turnId: string, itemId: string): string {
  return `${threadId}:${turnId}:${itemId}`;
}

export function createUserConversationMessage(
  threadId: string,
  turnId: string,
  text: string
): ConversationMessage {
  return {
    id: createMessageId(threadId, turnId, `user-${turnId}`),
    threadId,
    turnId,
    itemId: `user-${turnId}`,
    role: "user",
    text,
    status: "done"
  };
}

export function mapThreadHistoryToMessages(thread: Thread): ReadonlyArray<ConversationMessage> {
  return thread.turns.flatMap((turn) => mapTurnToMessages(thread.id, turn));
}

export function replaceThreadMessages(
  messages: ReadonlyArray<ConversationMessage>,
  threadId: string,
  nextMessages: ReadonlyArray<ConversationMessage>
): ReadonlyArray<ConversationMessage> {
  return [...messages.filter((message) => message.threadId !== threadId), ...nextMessages];
}

export function appendAssistantDelta(
  messages: ReadonlyArray<ConversationMessage>,
  threadId: string,
  turnId: string,
  itemId: string,
  delta: string
): ReadonlyArray<ConversationMessage> {
  const id = createMessageId(threadId, turnId, itemId);
  const index = messages.findIndex((message) => message.id === id);
  if (index === -1) {
    return [
      ...messages,
      {
        id,
        threadId,
        turnId,
        itemId,
        role: "assistant",
        text: delta,
        status: "streaming"
      }
    ];
  }

  return messages.map((message, currentIndex) =>
    currentIndex === index
      ? {
          ...message,
          text: `${message.text}${delta}`,
          status: "streaming"
        }
      : message
  );
}

export function completeTurnMessages(
  messages: ReadonlyArray<ConversationMessage>,
  threadId: string,
  turnId: string
): ReadonlyArray<ConversationMessage> {
  return messages.map((message) => {
    if (message.threadId !== threadId || message.turnId !== turnId || message.role !== "assistant") {
      return message;
    }
    return { ...message, status: "done" };
  });
}

export function upsertThreadSummary(
  threads: ReadonlyArray<ThreadSummary>,
  nextThread: ThreadSummary
): ReadonlyArray<ThreadSummary> {
  return [nextThread, ...threads.filter((thread) => thread.id !== nextThread.id)];
}

function mapTurnToMessages(threadId: string, turn: Turn): ReadonlyArray<ConversationMessage> {
  return turn.items
    .map((item) => mapThreadItemToMessage(threadId, turn.id, item))
    .filter((message): message is ConversationMessage => message !== null);
}

function mapThreadItemToMessage(
  threadId: string,
  turnId: string,
  item: ThreadItem
): ConversationMessage | null {
  if (item.type === "userMessage") {
    return createUserConversationMessage(threadId, turnId, userInputText(item.content));
  }
  if (item.type === "agentMessage") {
    return {
      id: createMessageId(threadId, turnId, item.id),
      threadId,
      turnId,
      itemId: item.id,
      role: "assistant",
      text: item.text,
      status: "done"
    };
  }
  return null;
}

function userInputText(content: ReadonlyArray<UserInput>): string {
  const parts = content
    .map((input) => {
      if (input.type === "text") {
        return input.text;
      }
      if (input.type === "image") {
        return `[image] ${input.url}`;
      }
      if (input.type === "localImage") {
        return `[image] ${input.path}`;
      }
      return EMPTY_TEXT;
    })
    .filter((part) => part.length > 0);
  return parts.join("\n");
}
