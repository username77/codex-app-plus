import type { ReviewDecision } from "../../../protocol/generated/ReviewDecision";
import type { CommandExecutionApprovalDecision } from "../../../protocol/generated/v2/CommandExecutionApprovalDecision";
import type { ReceivedServerRequest, ServerRequestResolution } from "../../../domain/types";

export interface RequestAction {
  readonly key: string;
  readonly label: string;
  readonly primary?: boolean;
  readonly resolution: ServerRequestResolution;
}

const DEFAULT_COMMAND_APPROVAL_DECISIONS: ReadonlyArray<CommandExecutionApprovalDecision> = Object.freeze([
  "accept",
  "acceptForSession",
  "decline",
  "cancel",
]);

function createDecisionKey(decision: CommandExecutionApprovalDecision): string {
  return typeof decision === "string" ? decision : JSON.stringify(decision);
}

function isExecPolicyDecision(
  decision: CommandExecutionApprovalDecision,
): decision is Extract<CommandExecutionApprovalDecision, { acceptWithExecpolicyAmendment: unknown }> {
  return typeof decision === "object" && decision !== null && "acceptWithExecpolicyAmendment" in decision;
}

function isNetworkPolicyDecision(
  decision: CommandExecutionApprovalDecision,
): decision is Extract<CommandExecutionApprovalDecision, { applyNetworkPolicyAmendment: unknown }> {
  return typeof decision === "object" && decision !== null && "applyNetworkPolicyAmendment" in decision;
}

function createCommandAction(
  requestId: string,
  decision: CommandExecutionApprovalDecision,
): RequestAction {
  if (decision === "accept") {
    return { key: "accept", label: "Allow", primary: true, resolution: { kind: "commandApproval", requestId, decision } };
  }
  if (decision === "acceptForSession") {
    return { key: "acceptForSession", label: "Allow for session", primary: true, resolution: { kind: "commandApproval", requestId, decision } };
  }
  if (decision === "decline") {
    return { key: "decline", label: "Decline", resolution: { kind: "commandApproval", requestId, decision } };
  }
  if (decision === "cancel") {
    return { key: "cancel", label: "Cancel", resolution: { kind: "commandApproval", requestId, decision } };
  }
  if (isExecPolicyDecision(decision)) {
    return {
      key: createDecisionKey(decision),
      label: "Always allow similar commands",
      primary: true,
      resolution: { kind: "commandApproval", requestId, decision },
    };
  }
  if (isNetworkPolicyDecision(decision)) {
    const { action, host } = decision.applyNetworkPolicyAmendment.network_policy_amendment;
    return {
      key: createDecisionKey(decision),
      label: action === "allow" ? `Always allow ${host}` : `Always deny ${host}`,
      primary: true,
      resolution: { kind: "commandApproval", requestId, decision },
    };
  }
  return { key: createDecisionKey(decision), label: "Allow", primary: true, resolution: { kind: "commandApproval", requestId, decision } };
}

function createLegacyActions(requestId: string): ReadonlyArray<RequestAction> {
  return [
    { key: "approved", label: "Approve", primary: true, resolution: { kind: "legacyApproval", requestId, decision: "approved" satisfies ReviewDecision } },
    { key: "approved_for_session", label: "Approve for session", primary: true, resolution: { kind: "legacyApproval", requestId, decision: "approved_for_session" satisfies ReviewDecision } },
    { key: "denied", label: "Deny", resolution: { kind: "legacyApproval", requestId, decision: "denied" satisfies ReviewDecision } },
    { key: "abort", label: "Abort", resolution: { kind: "legacyApproval", requestId, decision: "abort" satisfies ReviewDecision } },
  ];
}

export function createRequestActions(request: ReceivedServerRequest): ReadonlyArray<RequestAction> {
  if (request.kind === "commandApproval") {
    const decisions = request.params.availableDecisions;
    const availableDecisions = decisions !== null && decisions !== undefined && decisions.length > 0
      ? decisions
      : DEFAULT_COMMAND_APPROVAL_DECISIONS;
    return availableDecisions.map((decision) => createCommandAction(request.id, decision));
  }
  if (request.kind === "fileApproval") {
    return [
      { key: "accept", label: "Apply", primary: true, resolution: { kind: "fileApproval", requestId: request.id, decision: "accept" } },
      { key: "acceptForSession", label: "Apply for session", primary: true, resolution: { kind: "fileApproval", requestId: request.id, decision: "acceptForSession" } },
      { key: "decline", label: "Decline", resolution: { kind: "fileApproval", requestId: request.id, decision: "decline" } },
    ];
  }
  if (request.kind === "legacyCommandApproval" || request.kind === "legacyPatchApproval") {
    return createLegacyActions(request.id);
  }
  return [];
}
