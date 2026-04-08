import type { TimelineEntry } from "../../../domain/timeline";
import type { ConversationTurnState } from "../../../domain/conversation";

const PROPOSED_PLAN_CLOSE_TAG = "</proposed_plan>";
const PROPOSED_PLAN_OPEN_TAG = "<proposed_plan>";

export interface PlanModePromptModel {
  readonly entryId: string;
  readonly turnId: string;
  readonly markdown: string;
}

interface TurnPlanModePromptMatch {
  readonly turnId: string;
  readonly markdown: string;
}

export function selectLatestPlanModePrompt(entries: ReadonlyArray<TimelineEntry>): PlanModePromptModel | null {
  const latestTurnId = selectLatestTurnId(entries);
  if (latestTurnId === null) {
    return null;
  }
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry.turnId !== latestTurnId) {
      continue;
    }
    if (entry.kind === "plan" && entry.status === "done") {
      return { entryId: entry.id, turnId: entry.turnId, markdown: entry.text.trim() };
    }
    if (entry.kind === "agentMessage" && entry.status === "done") {
      const markdown = extractProposedPlanMarkdown(entry.text);
      if (markdown !== null) {
        return { entryId: entry.id, turnId: entry.turnId, markdown };
      }
    }
  }
  return null;
}

export function selectLatestPlanModePromptFromTurns(
  turns: ReadonlyArray<Pick<ConversationTurnState, "turnId" | "status" | "items">>,
): TurnPlanModePromptMatch | null {
  const latestTurn = selectLatestTurnWithId(turns);
  if (latestTurn === null || latestTurn.status === "inProgress") {
    return null;
  }
  const turnId = latestTurn.turnId;
  if (turnId === null) {
    return null;
  }

  for (let index = latestTurn.items.length - 1; index >= 0; index -= 1) {
    const item = latestTurn.items[index]?.item;
    if (item === undefined) {
      continue;
    }
    if (item.type === "plan") {
      return { turnId, markdown: item.text.trim() };
    }
    if (item.type === "agentMessage") {
      const markdown = extractProposedPlanMarkdown(item.text);
      if (markdown !== null) {
        return { turnId, markdown };
      }
    }
  }

  return null;
}

function selectLatestTurnId(entries: ReadonlyArray<TimelineEntry>): string | null {
  return selectLatestTurnWithId(entries)?.turnId ?? null;
}

function selectLatestTurnWithId<T extends { readonly turnId: string | null }>(
  entries: ReadonlyArray<T>,
): T | null {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    const turnId = entry?.turnId ?? null;
    if (turnId !== null) {
      return entry;
    }
  }
  return null;
}

export function extractProposedPlanMarkdown(text: string): string | null {
  const openIndex = text.indexOf(PROPOSED_PLAN_OPEN_TAG);
  if (openIndex < 0) {
    return null;
  }
  const planStart = openIndex + PROPOSED_PLAN_OPEN_TAG.length;
  const closeIndex = text.indexOf(PROPOSED_PLAN_CLOSE_TAG, planStart);
  if (closeIndex < 0) {
    return null;
  }
  const markdown = text.slice(planStart, closeIndex).trim();
  return markdown.length === 0 ? null : markdown;
}
