export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";
export type MessageStatus = "streaming" | "done";
export type AuthStatus = "unknown" | "authenticated" | "needs_login";

export type WorkspaceView = "conversation" | "settings" | "skills" | "mcp" | "worktrees";

export interface ThreadSummary {
  readonly id: string;
  readonly title: string;
  readonly cwd: string | null;
  readonly archived: boolean;
  readonly updatedAt: string;
  readonly source?: "rpc" | "codexData";
}

export interface ConversationMessage {
  readonly id: string;
  readonly threadId: string | null;
  readonly turnId: string | null;
  readonly itemId: string | null;
  readonly role: "user" | "assistant" | "system";
  readonly text: string;
  readonly status: MessageStatus;
}

export type TimelineItem = ConversationMessage;

export interface ReceivedNotification {
  readonly method: string;
  readonly params: unknown;
}

export interface ReceivedServerRequest {
  readonly id: string;
  readonly method: string;
  readonly params: unknown;
}

export interface AppState {
  readonly connectionStatus: ConnectionStatus;
  readonly fatalError: string | null;
  readonly activeView: WorkspaceView;
  readonly threads: ReadonlyArray<ThreadSummary>;
  readonly selectedThreadId: string | null;
  readonly messages: ReadonlyArray<ConversationMessage>;
  readonly pendingServerRequests: ReadonlyArray<ReceivedServerRequest>;
  readonly notifications: ReadonlyArray<ReceivedNotification>;
  readonly models: ReadonlyArray<string>;
  readonly configSnapshot: unknown;
  readonly authStatus: AuthStatus;
  readonly authMode: string | null;
  readonly initialized: boolean;
  readonly retryScheduledAt: number | null;
  readonly inputText: string;
  readonly busy: boolean;
}

export type AppAction =
  | { type: "connection/changed"; status: ConnectionStatus }
  | { type: "fatal/error"; message: string }
  | { type: "view/changed"; view: WorkspaceView }
  | { type: "threads/loaded"; threads: ReadonlyArray<ThreadSummary> }
  | { type: "thread/upserted"; thread: ThreadSummary }
  | { type: "thread/touched"; threadId: string; updatedAt: string }
  | { type: "thread/selected"; threadId: string | null }
  | { type: "thread/messagesLoaded"; threadId: string; messages: ReadonlyArray<ConversationMessage> }
  | { type: "message/added"; message: ConversationMessage }
  | { type: "message/assistantDelta"; threadId: string; turnId: string; itemId: string; delta: string }
  | { type: "turn/completed"; threadId: string; turnId: string }
  | { type: "serverRequest/received"; request: ReceivedServerRequest }
  | { type: "serverRequest/resolved"; requestId: string }
  | { type: "notification/received"; notification: ReceivedNotification }
  | { type: "models/loaded"; models: ReadonlyArray<string> }
  | { type: "config/loaded"; config: unknown }
  | { type: "auth/changed"; status: AuthStatus; mode: string | null }
  | { type: "initialized/changed"; ready: boolean }
  | { type: "retry/scheduled"; at: number | null }
  | { type: "input/changed"; value: string }
  | { type: "busy/changed"; busy: boolean };

export const INITIAL_STATE: AppState = {
  connectionStatus: "disconnected",
  fatalError: null,
  activeView: "conversation",
  threads: [],
  selectedThreadId: null,
  messages: [],
  pendingServerRequests: [],
  notifications: [],
  models: [],
  configSnapshot: null,
  authStatus: "unknown",
  authMode: null,
  initialized: false,
  retryScheduledAt: null,
  inputText: "",
  busy: false
};
