import type { PendingUserInputEntry, TimelineEntry } from "../../../domain/timeline";
import type { ThreadSummary, UiBanner } from "../../../domain/types";
import {
  createTurnPlanModel,
  type TurnPlanModel,
} from "../../conversation/model/homeTurnPlanModel";
import { selectLatestPendingUserInput } from "../../conversation/model/homeUserInputPromptModel";
import {
  selectLatestPlanModePrompt,
  type PlanModePromptModel,
} from "../../composer/model/planModePrompt";
import { selectVisibleHomeBanners } from "../ui/HomeBannerStack";

interface HomeConversationPlaceholder {
  readonly title: string;
  readonly body: string;
}

interface DeriveHomeViewMainContentStateOptions {
  readonly activities: ReadonlyArray<TimelineEntry>;
  readonly banners: ReadonlyArray<UiBanner>;
  readonly selectedConversationLoading: boolean;
  readonly selectedThread: ThreadSummary | null;
}

export interface HomeViewMainContentState {
  readonly conversationActive: boolean;
  readonly currentTurnPlan: TurnPlanModel | null;
  readonly latestPlanPrompt: PlanModePromptModel | null;
  readonly pendingUserInput: PendingUserInputEntry | null;
  readonly placeholder: HomeConversationPlaceholder | null;
  readonly renderableActivities: ReadonlyArray<TimelineEntry>;
  readonly visibleBanners: ReadonlyArray<UiBanner>;
}

const LOADING_PLACEHOLDER: HomeConversationPlaceholder = {
  title: "Loading thread",
  body: "Historical turns and items are being restored.",
};

const OPEN_THREAD_PLACEHOLDER: HomeConversationPlaceholder = {
  title: "Thread opened",
  body: "New plans, tools, approvals, realtime updates, and file changes appear here.",
};

export function deriveHomeViewMainContentState(
  options: DeriveHomeViewMainContentStateOptions,
): HomeViewMainContentState {
  const { activities, banners, selectedConversationLoading, selectedThread } = options;
  const renderableActivities: TimelineEntry[] = [];
  let currentTurnPlan: TurnPlanModel | null = null;

  for (let index = 0; index < activities.length; index += 1) {
    const entry = activities[index];
    if (entry.kind === "turnPlanSnapshot") {
      currentTurnPlan = createTurnPlanModel(entry);
      continue;
    }
    renderableActivities.push(entry);
  }

  const pendingUserInput = selectLatestPendingUserInput(activities);
  const latestPlanPrompt = selectLatestPlanModePrompt(activities);

  return {
    conversationActive: selectedConversationLoading
      || selectedThread !== null
      || activities.length > 0,
    currentTurnPlan,
    latestPlanPrompt,
    pendingUserInput,
    placeholder: selectedConversationLoading
      ? LOADING_PLACEHOLDER
      : selectedThread !== null
        ? OPEN_THREAD_PLACEHOLDER
        : null,
    renderableActivities,
    visibleBanners: selectVisibleHomeBanners(banners),
  };
}

export function createTurnPlanChangeKey(
  plan: Pick<TurnPlanModel, "entry" | "totalSteps" | "completedSteps">,
): string {
  return `${plan.entry.id}:${plan.totalSteps}:${plan.completedSteps}`;
}
