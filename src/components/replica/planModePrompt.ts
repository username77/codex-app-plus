import type { PendingUserInputEntry, TimelineEntry } from "../../domain/timeline";

const PROPOSED_PLAN_TAG = "<proposed_plan>";

export function selectActivePlanModeRequest(entries: ReadonlyArray<TimelineEntry>): PendingUserInputEntry | null {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry.kind !== "pendingUserInput") {
      continue;
    }
    if (turnContainsPlanDraft(entries, entry.turnId)) {
      return entry;
    }
  }
  return null;
}

export function removeTimelineEntryById<T extends TimelineEntry>(entries: ReadonlyArray<T>, entryId: string | null): Array<T> {
  return entryId === null ? [...entries] : entries.filter((entry) => entry.id !== entryId);
}

function turnContainsPlanDraft(entries: ReadonlyArray<TimelineEntry>, turnId: string): boolean {
  return entries.some((entry) => entry.turnId === turnId && (entry.kind === "plan" || isAgentPlanMessage(entry)));
}

function isAgentPlanMessage(entry: TimelineEntry): boolean {
  return entry.kind === "agentMessage" && entry.text.includes(PROPOSED_PLAN_TAG);
}
