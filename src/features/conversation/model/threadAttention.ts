import type { ConversationState } from "../../../domain/conversation";
import type { ReceivedServerRequest } from "../../../domain/serverRequests";
import type { ThreadActiveFlag, ThreadSummary } from "../../../domain/timeline";
import { selectLatestPlanModePromptFromTurns } from "../../composer/model/planModePrompt";

const ATTENTION_REQUEST_METHODS = new Set([
  "item/commandExecution/requestApproval",
  "item/fileChange/requestApproval",
  "item/tool/requestUserInput",
  "item/permissions/requestApproval",
  "mcpServer/elicitation/request",
  "applyPatchApproval",
  "execCommandApproval",
]);

export function hasAttentionActiveFlag(
  activeFlags: ReadonlyArray<ThreadActiveFlag>,
): boolean {
  return activeFlags.includes("waitingOnApproval")
    || activeFlags.includes("waitingOnUserInput");
}

export function hasAttentionPendingRequest(
  requests: ReadonlyArray<ReceivedServerRequest>,
): boolean {
  return requests.some((request) => ATTENTION_REQUEST_METHODS.has(request.method));
}

export function hasPendingPlanAttention(
  conversation: Pick<ConversationState, "turns">,
): boolean {
  return selectLatestPlanModePromptFromTurns(conversation.turns) !== null;
}

export function conversationRequiresUserAttention(
  conversation: Pick<ConversationState, "activeFlags" | "turns">,
  pendingRequests: ReadonlyArray<ReceivedServerRequest>,
): boolean {
  return hasAttentionActiveFlag(conversation.activeFlags)
    || hasAttentionPendingRequest(pendingRequests)
    || hasPendingPlanAttention(conversation);
}

export function threadSummaryRequiresUserAttention(
  thread: Pick<ThreadSummary, "activeFlags" | "requiresUserAttention">,
): boolean {
  return thread.requiresUserAttention === true || hasAttentionActiveFlag(thread.activeFlags);
}
