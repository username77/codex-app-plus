import { produce } from "immer";
import { appendAssistantDelta, completeTurnMessages, replaceThreadMessages, upsertThreadSummary } from "../app/conversationMessages";
import type { AppAction, AppState } from "../domain/types";
import { INITIAL_STATE } from "../domain/types";

const MAX_NOTIFICATION_LOG = 500;
const MAX_MESSAGES = 1000;

function pushBounded<T>(items: Array<T>, next: T, max: number): void {
  items.push(next);
  if (items.length > max) {
    items.splice(0, items.length - max);
  }
}

export function appReducer(state: AppState, action: AppAction): AppState {
  return produce(state, (draft) => {
    switch (action.type) {
      case "connection/changed":
        draft.connectionStatus = action.status;
        if (action.status !== "error") {
          draft.fatalError = null;
        }
        return;
      case "fatal/error":
        draft.connectionStatus = "error";
        draft.fatalError = action.message;
        draft.initialized = false;
        return;
      case "view/changed":
        draft.activeView = action.view;
        return;
      case "threads/loaded":
        draft.threads = [...action.threads];
        return;
      case "thread/upserted":
        draft.threads = [...upsertThreadSummary(draft.threads, action.thread)];
        return;
      case "thread/touched":
        draft.threads = draft.threads.map((thread) =>
          thread.id === action.threadId ? { ...thread, updatedAt: action.updatedAt } : thread
        );
        return;
      case "thread/selected":
        draft.selectedThreadId = action.threadId;
        return;
      case "thread/messagesLoaded":
        draft.messages = [...replaceThreadMessages(draft.messages, action.threadId, action.messages)];
        return;
      case "message/added":
        pushBounded(draft.messages as Array<typeof action.message>, action.message, MAX_MESSAGES);
        return;
      case "message/assistantDelta":
        draft.messages = [...appendAssistantDelta(draft.messages, action.threadId, action.turnId, action.itemId, action.delta)];
        return;
      case "turn/completed":
        draft.messages = [...completeTurnMessages(draft.messages, action.threadId, action.turnId)];
        return;
      case "serverRequest/received":
        draft.pendingServerRequests = [...draft.pendingServerRequests, action.request];
        return;
      case "serverRequest/resolved":
        draft.pendingServerRequests = draft.pendingServerRequests.filter((request) => request.id !== action.requestId);
        return;
      case "notification/received":
        pushBounded(draft.notifications as Array<typeof action.notification>, action.notification, MAX_NOTIFICATION_LOG);
        return;
      case "models/loaded":
        draft.models = [...action.models];
        return;
      case "config/loaded":
        draft.configSnapshot = action.config;
        return;
      case "auth/changed":
        draft.authStatus = action.status;
        draft.authMode = action.mode;
        return;
      case "initialized/changed":
        draft.initialized = action.ready;
        return;
      case "retry/scheduled":
        draft.retryScheduledAt = action.at;
        return;
      case "input/changed":
        draft.inputText = action.value;
        return;
      case "busy/changed":
        draft.busy = action.busy;
        return;
      default:
        return;
    }
  });
}

export function createInitialState(): AppState {
  return INITIAL_STATE;
}
