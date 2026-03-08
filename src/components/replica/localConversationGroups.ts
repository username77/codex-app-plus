import type {
  CollabAgentToolCallEntry,
  CommandExecutionEntry,
  ContextCompactionEntry,
  ConversationMessage,
  DynamicToolCallEntry,
  FileChangeEntry,
  FuzzySearchEntry,
  ImageViewEntry,
  McpToolCallEntry,
  PendingApprovalEntry,
  PendingTokenRefreshEntry,
  PendingToolCallEntry,
  PendingUserInputEntry,
  PlanEntry,
  RawResponseEntry,
  ReasoningEntry,
  RealtimeAudioEntry,
  RealtimeSessionEntry,
  ReviewModeEntry,
  SystemNoticeEntry,
  TimelineEntry,
  TokenUsageEntry,
  TurnDiffSnapshotEntry,
  TurnPlanSnapshotEntry,
  WebSearchEntry,
} from "../../domain/timeline";

const REASONING_LABEL = "Reasoning";

export type TraceEntry = CommandExecutionEntry | FileChangeEntry | McpToolCallEntry | DynamicToolCallEntry | CollabAgentToolCallEntry | WebSearchEntry | ImageViewEntry;
export type RequestBlock = PendingApprovalEntry | PendingUserInputEntry | PendingToolCallEntry | PendingTokenRefreshEntry;
export type AuxiliaryBlock = PlanEntry | TurnPlanSnapshotEntry | TurnDiffSnapshotEntry | ReviewModeEntry | ContextCompactionEntry | RawResponseEntry | SystemNoticeEntry | TokenUsageEntry | RealtimeSessionEntry | RealtimeAudioEntry | FuzzySearchEntry;

export interface ReasoningBlock {
  readonly id: string;
  readonly label: string;
  readonly summary: string | null;
}

type AssistantFlowNode =
  | { readonly key: string; readonly kind: "assistantMessage"; readonly message: ConversationMessage }
  | { readonly key: string; readonly kind: "reasoningBlock"; readonly block: ReasoningBlock }
  | { readonly key: string; readonly kind: "traceItem"; readonly item: TraceEntry }
  | { readonly key: string; readonly kind: "requestBlock"; readonly entry: RequestBlock }
  | { readonly key: string; readonly kind: "auxiliaryBlock"; readonly entry: AuxiliaryBlock }
  | { readonly key: string; readonly kind: "assistantThinking"; readonly message: ConversationMessage };

export interface ConversationRenderGroup {
  readonly key: string;
  readonly turnId: string | null;
  readonly userBubble: ConversationMessage | null;
  readonly assistantFlow: ReadonlyArray<AssistantFlowNode>;
}

export type ConversationRenderNode =
  | { readonly key: string; readonly kind: "userBubble"; readonly message: ConversationMessage }
  | AssistantFlowNode;

export function splitActivitiesIntoRenderGroups(
  entries: ReadonlyArray<TimelineEntry>,
  activeTurnId: string | null,
): Array<ConversationRenderGroup> {
  const visibleEntries = entries.filter(isVisibleEntry);
  return groupActivitiesByTurn(visibleEntries)
    .map((group) => buildConversationRenderGroup(group, group[0]?.turnId === activeTurnId))
    .filter((group) => group.userBubble !== null || group.assistantFlow.length > 0);
}

export function flattenConversationRenderGroup(group: ConversationRenderGroup): Array<ConversationRenderNode> {
  const nodes: Array<ConversationRenderNode> = [];
  if (group.userBubble !== null) {
    nodes.push({ key: group.userBubble.id, kind: "userBubble", message: group.userBubble });
  }
  nodes.push(...group.assistantFlow);
  return nodes;
}

function isVisibleEntry(entry: TimelineEntry): boolean {
  return entry.kind !== "queuedFollowUp" && entry.kind !== "debug";
}

function groupActivitiesByTurn(entries: ReadonlyArray<TimelineEntry>): Array<Array<TimelineEntry>> {
  const groups: Array<Array<TimelineEntry>> = [];
  let current: Array<TimelineEntry> = [];
  let currentTurnId: string | null | undefined;

  for (const entry of entries) {
    if (current.length === 0) {
      current = [entry];
      currentTurnId = entry.turnId;
      continue;
    }
    if (entry.turnId === currentTurnId) {
      current.push(entry);
      continue;
    }
    groups.push(current);
    current = [entry];
    currentTurnId = entry.turnId;
  }

  if (current.length > 0) {
    groups.push(current);
  }
  return groups;
}

function buildConversationRenderGroup(
  items: ReadonlyArray<TimelineEntry>,
  activeTurn: boolean,
): ConversationRenderGroup {
  const turnId = items[0]?.turnId ?? null;
  const userBubble = items.find(isUserMessage) ?? null;
  return {
    key: turnId ?? `group-${items[0]?.id ?? "empty"}`,
    turnId,
    userBubble,
    assistantFlow: createAssistantFlow(items, activeTurn, userBubble),
  };
}

function createAssistantFlow(
  items: ReadonlyArray<TimelineEntry>,
  activeTurn: boolean,
  userBubble: ConversationMessage | null,
): Array<AssistantFlowNode> {
  const nodes: Array<AssistantFlowNode> = [];

  for (const item of items) {
    if (isUserMessage(item)) {
      continue;
    }

    const node = mapAssistantFlowNode(item);
    if (node !== null) {
      nodes.push(node);
    }
  }

  if (shouldAppendThinking(activeTurn, userBubble, items)) {
    nodes.push(createThinkingNode(items[0]?.threadId ?? "thread", items[0]?.turnId ?? null));
  }
  return nodes;
}

function mapAssistantFlowNode(entry: TimelineEntry): AssistantFlowNode | null {
  if (isAssistantMessage(entry)) {
    return { key: entry.id, kind: "assistantMessage", message: entry };
  }
  if (isReasoningEntry(entry)) {
    return { key: entry.id, kind: "reasoningBlock", block: createReasoningBlock(entry) };
  }
  if (isTraceEntry(entry)) {
    return { key: entry.id, kind: "traceItem", item: entry };
  }
  if (isRequestBlock(entry)) {
    return { key: entry.id, kind: "requestBlock", entry };
  }
  if (isAuxiliaryBlock(entry)) {
    return { key: entry.id, kind: "auxiliaryBlock", entry };
  }
  return null;
}

function createReasoningBlock(entry: ReasoningEntry): ReasoningBlock {
  const summary = entry.summary.map((item) => item.trim()).filter(Boolean).join("\n") || null;
  return { id: entry.id, label: REASONING_LABEL, summary };
}

function shouldAppendThinking(
  activeTurn: boolean,
  userBubble: ConversationMessage | null,
  items: ReadonlyArray<TimelineEntry>,
): boolean {
  return activeTurn && userBubble !== null && !items.some(isRequestBlock);
}

function createThinkingNode(
  threadId: string,
  turnId: string | null,
): Extract<AssistantFlowNode, { kind: "assistantThinking" }> {
  return {
    key: `${turnId ?? "turn"}:assistant:thinking`,
    kind: "assistantThinking",
    message: {
      id: `${turnId ?? "turn"}:assistant:thinking`,
      kind: "agentMessage",
      role: "assistant",
      threadId,
      turnId,
      itemId: null,
      text: "",
      status: "streaming",
    },
  };
}

function isUserMessage(entry: TimelineEntry): entry is ConversationMessage {
  return entry.kind === "userMessage";
}

function isAssistantMessage(entry: TimelineEntry): entry is ConversationMessage {
  return entry.kind === "agentMessage";
}

function isReasoningEntry(entry: TimelineEntry): entry is ReasoningEntry {
  return entry.kind === "reasoning";
}

function isTraceEntry(entry: TimelineEntry): entry is TraceEntry {
  return entry.kind === "commandExecution" || entry.kind === "fileChange" || entry.kind === "mcpToolCall" || entry.kind === "dynamicToolCall" || entry.kind === "collabAgentToolCall" || entry.kind === "webSearch" || entry.kind === "imageView";
}

function isRequestBlock(entry: TimelineEntry): entry is RequestBlock {
  return entry.kind === "pendingApproval" || entry.kind === "pendingUserInput" || entry.kind === "pendingToolCall" || entry.kind === "pendingTokenRefresh";
}

function isAuxiliaryBlock(entry: TimelineEntry): entry is AuxiliaryBlock {
  return entry.kind === "plan" || entry.kind === "turnPlanSnapshot" || entry.kind === "turnDiffSnapshot" || entry.kind === "reviewMode" || entry.kind === "contextCompaction" || entry.kind === "rawResponse" || entry.kind === "systemNotice" || entry.kind === "tokenUsage" || entry.kind === "realtimeSession" || entry.kind === "realtimeAudio" || entry.kind === "fuzzySearch";
}
