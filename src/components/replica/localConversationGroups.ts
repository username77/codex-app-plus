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
  TurnDiffSnapshotEntry,
  TurnPlanSnapshotEntry,
  WebSearchEntry,
} from "../../domain/timeline";

const REASONING_LABEL = "Reasoning";
const STREAMING_STATUS = "streaming";

export type TraceEntry =
  | CommandExecutionEntry
  | FileChangeEntry
  | McpToolCallEntry
  | DynamicToolCallEntry
  | CollabAgentToolCallEntry
  | WebSearchEntry
  | ImageViewEntry;

export type RequestBlock =
  | PendingApprovalEntry
  | PendingUserInputEntry
  | PendingToolCallEntry
  | PendingTokenRefreshEntry;

export type AuxiliaryBlock =
  | PlanEntry
  | TurnPlanSnapshotEntry
  | TurnDiffSnapshotEntry
  | ReviewModeEntry
  | ContextCompactionEntry
  | RawResponseEntry
  | SystemNoticeEntry
  | RealtimeSessionEntry
  | RealtimeAudioEntry
  | FuzzySearchEntry;

export interface ReasoningBlock {
  readonly id: string;
  readonly label: string;
  readonly summary: string | null;
}

export interface AssistantRenderMessage {
  readonly message: ConversationMessage;
  readonly showThinkingIndicator: boolean;
}

type AssistantFlowNode =
  | { readonly key: string; readonly kind: "assistantMessage"; readonly message: ConversationMessage; readonly showThinkingIndicator: boolean }
  | { readonly key: string; readonly kind: "reasoningBlock"; readonly block: ReasoningBlock }
  | { readonly key: string; readonly kind: "traceItem"; readonly item: TraceEntry }
  | { readonly key: string; readonly kind: "requestBlock"; readonly entry: RequestBlock }
  | { readonly key: string; readonly kind: "auxiliaryBlock"; readonly entry: AuxiliaryBlock };

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
  return groupActivitiesByTurn(entries.filter(isVisibleEntry))
    .map((group) => buildConversationRenderGroup(group, group[0]?.turnId === activeTurnId))
    .filter((group) => group.userBubble !== null || group.assistantFlow.length > 0);
}

export function flattenConversationRenderGroup(group: ConversationRenderGroup): Array<ConversationRenderNode> {
  const nodes = group.assistantFlow.map<ConversationRenderNode>((node) => node);
  return group.userBubble === null ? nodes : [{ key: group.userBubble.id, kind: "userBubble", message: group.userBubble }, ...nodes];
}

function isVisibleEntry(entry: TimelineEntry): boolean {
  return entry.kind !== "queuedFollowUp" && entry.kind !== "debug";
}

function groupActivitiesByTurn(entries: ReadonlyArray<TimelineEntry>): Array<Array<TimelineEntry>> {
  const groups: Array<Array<TimelineEntry>> = [];
  let currentGroup: Array<TimelineEntry> = [];
  let currentTurnId: string | null | undefined;

  for (const entry of entries) {
    if (currentGroup.length === 0 || entry.turnId === currentTurnId) {
      currentGroup.push(entry);
      currentTurnId = entry.turnId;
      continue;
    }
    groups.push(currentGroup);
    currentGroup = [entry];
    currentTurnId = entry.turnId;
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }
  return groups;
}

function buildConversationRenderGroup(items: ReadonlyArray<TimelineEntry>, activeTurn: boolean): ConversationRenderGroup {
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
  const nodes = items.flatMap((entry) => mapAssistantFlowNode(entry));
  if (!shouldShowThinkingIndicator(activeTurn, userBubble, nodes)) {
    return nodes;
  }
  const lastAssistantIndex = findLastAssistantIndex(nodes);
  return lastAssistantIndex >= 0
    ? nodes.map((node, index) => (index === lastAssistantIndex && node.kind === "assistantMessage" ? { ...node, showThinkingIndicator: true } : node))
    : [...nodes, createAssistantPlaceholder(items[0]?.threadId ?? "thread", items[0]?.turnId ?? null)];
}

function mapAssistantFlowNode(entry: TimelineEntry): Array<AssistantFlowNode> {
  if (isUserMessage(entry)) {
    return [];
  }
  if (isAssistantMessage(entry)) {
    return [{ key: entry.id, kind: "assistantMessage", message: entry, showThinkingIndicator: false }];
  }
  if (isReasoningEntry(entry)) {
    return [{ key: entry.id, kind: "reasoningBlock", block: createReasoningBlock(entry) }];
  }
  if (isTraceEntry(entry)) {
    return [{ key: entry.id, kind: "traceItem", item: entry }];
  }
  if (isRequestBlock(entry)) {
    return [{ key: entry.id, kind: "requestBlock", entry }];
  }
  if (isAuxiliaryBlock(entry)) {
    return [{ key: entry.id, kind: "auxiliaryBlock", entry }];
  }
  return [];
}

function createReasoningBlock(entry: ReasoningEntry): ReasoningBlock {
  return {
    id: entry.id,
    label: REASONING_LABEL,
    summary: entry.summary.map((item) => item.trim()).filter(Boolean).join("\n") || null,
  };
}

function shouldShowThinkingIndicator(
  activeTurn: boolean,
  userBubble: ConversationMessage | null,
  nodes: ReadonlyArray<AssistantFlowNode>,
): boolean {
  return activeTurn && userBubble !== null && nodes.every((node) => node.kind !== "requestBlock");
}

function findLastAssistantIndex(nodes: ReadonlyArray<AssistantFlowNode>): number {
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    if (nodes[index]?.kind === "assistantMessage") {
      return index;
    }
  }
  return -1;
}

function createAssistantPlaceholder(threadId: string, turnId: string | null): AssistantFlowNode {
  return {
    key: `${turnId ?? "turn"}:assistant:placeholder`,
    kind: "assistantMessage",
    showThinkingIndicator: true,
    message: {
      id: `${turnId ?? "turn"}:assistant:placeholder`,
      kind: "agentMessage",
      role: "assistant",
      threadId,
      turnId,
      itemId: null,
      text: "",
      status: STREAMING_STATUS,
    },
  };
}

function isUserMessage(entry: TimelineEntry): entry is ConversationMessage & { kind: "userMessage"; role: "user" } {
  return entry.kind === "userMessage";
}

function isAssistantMessage(entry: TimelineEntry): entry is ConversationMessage & { kind: "agentMessage"; role: "assistant" } {
  return entry.kind === "agentMessage";
}

function isReasoningEntry(entry: TimelineEntry): entry is ReasoningEntry {
  return entry.kind === "reasoning";
}

function isTraceEntry(entry: TimelineEntry): entry is TraceEntry {
  return entry.kind === "commandExecution"
    || entry.kind === "fileChange"
    || entry.kind === "mcpToolCall"
    || entry.kind === "dynamicToolCall"
    || entry.kind === "collabAgentToolCall"
    || entry.kind === "webSearch"
    || entry.kind === "imageView";
}

function isRequestBlock(entry: TimelineEntry): entry is RequestBlock {
  return entry.kind === "pendingApproval"
    || entry.kind === "pendingUserInput"
    || entry.kind === "pendingToolCall"
    || entry.kind === "pendingTokenRefresh";
}

function isAuxiliaryBlock(entry: TimelineEntry): entry is AuxiliaryBlock {
  return entry.kind === "plan"
    || entry.kind === "turnPlanSnapshot"
    || entry.kind === "turnDiffSnapshot"
    || entry.kind === "reviewMode"
    || entry.kind === "contextCompaction"
    || entry.kind === "rawResponse"
    || entry.kind === "systemNotice"
    || entry.kind === "realtimeSession"
    || entry.kind === "realtimeAudio"
    || entry.kind === "fuzzySearch";
}
