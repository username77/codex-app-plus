import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComposerPermissionLevel } from "../../composer/model/composerPermission";
import type { ComposerModelOption, ComposerSelection } from "../../composer/model/composerPreferences";
import type { ThreadDetailLevel } from "../../settings/hooks/useAppPreferences";
import type { SendTurnOptions } from "../../conversation/hooks/useWorkspaceConversation";
import type { HostBridge, WorkspaceOpener } from "../../../bridge/types";
import type {
  AccountSummary,
  ConnectionStatus,
  ServerRequestResolution,
  ThreadSummary,
  TimelineEntry,
  UiBanner,
  WorkspaceSwitchState,
} from "../../../domain/types";
import type {
  CollaborationPreset,
  ComposerEnterBehavior,
  FollowUpMode,
  QueuedFollowUp,
} from "../../../domain/timeline";
import type { AppServerClient } from "../../../protocol/appServerClient";
import type { TurnStatus } from "../../../protocol/generated/v2/TurnStatus";
import { HomeConversationCanvas } from "../../conversation/ui/HomeConversationCanvas";
import { HomeComposer } from "../../composer/ui/HomeComposer";
import { HomeMainToolbar } from "./HomeMainToolbar";
import { HomePlanRequestComposer } from "../../composer/ui/HomePlanRequestComposer";
import { HomeTurnPlanDrawer } from "../../conversation/ui/HomeTurnPlanDrawer";
import { HomeUserInputPrompt } from "../../conversation/ui/HomeUserInputPrompt";
import { createComposerCommandBridge } from "../../composer/service/composerCommandBridge";
import type { WorkspaceGitController } from "../../git/model/types";
import { GitCommitDialog } from "../../git/ui/GitCommitDialog";
import { extractConnectionRetryInfo } from "../model/homeConnectionRetry";
import {
  createTurnPlanChangeKey,
  deriveHomeViewMainContentState,
} from "../model/homeViewMainContentModel";
import { HomeBannerStack } from "./HomeBannerStack";
import { HomeWorkspaceEmptyState } from "./HomeWorkspaceEmptyState";
import type { WorkspaceRoot } from "../../workspace/hooks/useWorkspaceRoots";

interface PlanPromptTurnOptions {
  readonly text: string;
  readonly collaborationPreset: "default" | "plan";
  readonly collaborationModeOverridePreset?: "default" | "plan" | null;
}

export interface HomeViewMainContentProps {
  readonly appServerReady?: boolean;
  readonly busy: boolean;
  readonly appServerClient: AppServerClient;
  readonly hostBridge: HostBridge;
  readonly gitController: WorkspaceGitController;
  readonly inputText: string;
  readonly activities: ReadonlyArray<TimelineEntry>;
  readonly banners: ReadonlyArray<UiBanner>;
  readonly account: AccountSummary | null;
  readonly rateLimitSummary: string | null;
  readonly queuedFollowUps: ReadonlyArray<QueuedFollowUp>;
  readonly collaborationPreset: CollaborationPreset;
  readonly models: ReadonlyArray<ComposerModelOption>;
  readonly defaultModel: string | null;
  readonly defaultEffort: ComposerSelection["effort"];
  readonly defaultServiceTier?: ComposerSelection["serviceTier"];
  readonly workspaceOpener: WorkspaceOpener;
  readonly roots: ReadonlyArray<WorkspaceRoot>;
  readonly selectedRootId: string | null;
  readonly selectedRootName: string;
  readonly selectedRootPath: string | null;
  readonly selectedThread: ThreadSummary | null;
  readonly activeTurnId: string | null;
  readonly turnStatuses?: Readonly<Record<string, TurnStatus>>;
  readonly threadDetailLevel: ThreadDetailLevel;
  readonly isResponding: boolean;
  readonly interruptPending: boolean;
  readonly selectedConversationLoading: boolean;
  readonly workspaceSwitch: WorkspaceSwitchState;
  readonly terminalOpen: boolean;
  readonly diffOpen: boolean;
  readonly followUpQueueMode: FollowUpMode;
  readonly composerEnterBehavior: ComposerEnterBehavior;
  readonly composerPermissionLevel: ComposerPermissionLevel;
  readonly connectionStatus: ConnectionStatus;
  readonly connectionRetryInfo: ReturnType<typeof extractConnectionRetryInfo>["retryInfo"];
  readonly fatalError: string | null;
  readonly retryScheduledAt: number | null;
  readonly onSelectWorkspaceOpener: (opener: WorkspaceOpener) => void;
  readonly onSelectRoot: (rootId: string) => void;
  readonly onSelectCollaborationPreset: (preset: CollaborationPreset) => void;
  readonly onInputChange: (text: string) => void;
  readonly onSendTurn: (options: SendTurnOptions) => Promise<void>;
  readonly onPersistComposerSelection: (selection: ComposerSelection) => Promise<void>;
  readonly multiAgentAvailable?: boolean;
  readonly multiAgentEnabled?: boolean;
  readonly onSetMultiAgentEnabled?: (enabled: boolean) => Promise<void>;
  readonly onSelectComposerPermissionLevel: (level: ComposerPermissionLevel) => void;
  readonly onUpdateThreadBranch: (branch: string) => Promise<void>;
  readonly onInterruptTurn: () => Promise<void>;
  readonly onLogout: () => Promise<void>;
  readonly onResolveServerRequest: (resolution: ServerRequestResolution) => Promise<void>;
  readonly onPromoteQueuedFollowUp: (followUpId: string) => Promise<void>;
  readonly onRemoveQueuedFollowUp: (followUpId: string) => void;
  readonly onClearQueuedFollowUps: () => void;
  readonly onCreateThread: () => Promise<void>;
  readonly onToggleDiff: () => void;
  readonly onToggleTerminal: () => void;
  readonly onRetryConnection: () => Promise<void>;
  readonly onDismissBanner: (bannerId: string) => void;
}

export function HomeViewMainContent(props: HomeViewMainContentProps): JSX.Element {
  const composerCommandBridge = useMemo(
    () => createComposerCommandBridge(props.appServerClient),
    [props.appServerClient],
  );
  const derivedState = useMemo(
    () => deriveHomeViewMainContentState({
      activities: props.activities,
      banners: props.banners,
      selectedConversationLoading: props.selectedConversationLoading,
      selectedThread: props.selectedThread,
    }),
    [props.activities, props.banners, props.selectedConversationLoading, props.selectedThread],
  );
  const [planDrawerCollapsed, setPlanDrawerCollapsed] = useState(true);
  const [dismissedPlanPromptId, setDismissedPlanPromptId] = useState<string | null>(null);
  const planSnapshotKeyRef = useRef<string | null>(null);

  const workspaceSwitching = props.workspaceSwitch.phase === "switching";

  useEffect(() => {
    if (derivedState.currentTurnPlan === null) {
      setPlanDrawerCollapsed(true);
      planSnapshotKeyRef.current = null;
      return;
    }

    const nextKey = createTurnPlanChangeKey(derivedState.currentTurnPlan);
    if (nextKey !== planSnapshotKeyRef.current) {
      setPlanDrawerCollapsed(true);
      planSnapshotKeyRef.current = nextKey;
    }
  }, [derivedState.currentTurnPlan]);

  const showPlanPrompt = derivedState.latestPlanPrompt !== null
    && !props.isResponding
    && dismissedPlanPromptId !== derivedState.latestPlanPrompt.entryId;

  const sendPlanPromptTurn = useCallback(async (options: PlanPromptTurnOptions) => {
    setDismissedPlanPromptId(derivedState.latestPlanPrompt?.entryId ?? null);
    await props.onSendTurn({
      text: options.text,
      attachments: [],
      selection: {
        model: props.defaultModel,
        effort: props.defaultEffort,
        serviceTier: props.defaultServiceTier ?? null,
      },
      permissionLevel: props.composerPermissionLevel,
      collaborationPreset: options.collaborationPreset,
      collaborationModeOverridePreset: options.collaborationModeOverridePreset,
    });
  }, [
    derivedState.latestPlanPrompt,
    props.composerPermissionLevel,
    props.defaultEffort,
    props.defaultModel,
    props.defaultServiceTier,
    props.onSendTurn,
  ]);

  const dismissPlanPrompt = useCallback(() => {
    setDismissedPlanPromptId(derivedState.latestPlanPrompt?.entryId ?? null);
  }, [derivedState.latestPlanPrompt]);

  return (
    <div className="replica-main">
      <HomeMainToolbar
        hostBridge={props.hostBridge}
        conversationActive={derivedState.conversationActive}
        gitController={props.gitController}
        workspaceOpener={props.workspaceOpener}
        selectedRootName={props.selectedRootName}
        selectedRootPath={props.selectedRootPath}
        selectedThreadTitle={props.selectedThread?.title ?? null}
        terminalOpen={props.terminalOpen}
        diffOpen={props.diffOpen}
        workspaceSwitching={workspaceSwitching}
        onSelectWorkspaceOpener={props.onSelectWorkspaceOpener}
        onToggleDiff={props.onToggleDiff}
        onToggleTerminal={props.onToggleTerminal}
      />
      <HomeBannerStack
        banners={derivedState.visibleBanners}
        onDismissBanner={props.onDismissBanner}
      />
      <GitCommitDialog controller={props.gitController} />
      {derivedState.conversationActive ? (
        <HomeConversationCanvas
          activities={derivedState.renderableActivities}
          selectedThread={props.selectedThread}
          activeTurnId={props.activeTurnId}
          turnStatuses={props.turnStatuses}
          threadDetailLevel={props.threadDetailLevel}
          placeholder={derivedState.placeholder}
          onResolveServerRequest={props.onResolveServerRequest}
          connectionStatus={props.connectionStatus}
          connectionRetryInfo={props.connectionRetryInfo}
          fatalError={props.fatalError}
          retryScheduledAt={props.retryScheduledAt}
          busy={props.busy}
          onRetryConnection={props.onRetryConnection}
        />
      ) : (
        <HomeWorkspaceEmptyState
          roots={props.roots}
          selectedRootId={props.selectedRootId}
          selectedRootName={props.selectedRootName}
          selectedRootPath={props.selectedRootPath}
          switchState={props.workspaceSwitch}
          onSelectRoot={props.onSelectRoot}
        />
      )}
      <HomeTurnPlanDrawer
        plan={derivedState.currentTurnPlan}
        collapsed={planDrawerCollapsed}
        onToggle={() => setPlanDrawerCollapsed((value) => !value)}
      />
      {derivedState.pendingUserInput !== null ? (
        <HomeUserInputPrompt
          busy={props.busy}
          entry={derivedState.pendingUserInput}
          onResolveServerRequest={props.onResolveServerRequest}
        />
      ) : null}
      {showPlanPrompt && derivedState.pendingUserInput === null ? (
        <HomePlanRequestComposer
          busy={props.busy || props.appServerReady === false}
          onDismiss={dismissPlanPrompt}
          onImplement={() => sendPlanPromptTurn({
            text: "Implement the plan.",
            collaborationPreset: "default",
            collaborationModeOverridePreset: "default",
          })}
          onRefine={(notes) => sendPlanPromptTurn({ text: notes, collaborationPreset: "plan" })}
        />
      ) : (
        <HomeComposer
          appServerReady={props.appServerReady}
          busy={props.busy}
          inputText={props.inputText}
          collaborationPreset={props.collaborationPreset}
          models={props.models}
          defaultModel={props.defaultModel}
          defaultEffort={props.defaultEffort}
          defaultServiceTier={props.defaultServiceTier ?? null}
          selectedRootPath={props.selectedRootPath}
          queuedFollowUps={props.queuedFollowUps}
          followUpQueueMode={props.followUpQueueMode}
          composerEnterBehavior={props.composerEnterBehavior}
          permissionLevel={props.composerPermissionLevel}
          gitController={props.gitController}
          selectedThreadId={props.selectedThread?.id ?? null}
          selectedThreadBranch={props.selectedThread?.branch ?? null}
          isResponding={props.isResponding}
          interruptPending={props.interruptPending}
          composerCommandBridge={composerCommandBridge}
          onSelectCollaborationPreset={props.onSelectCollaborationPreset}
          onInputChange={props.onInputChange}
          onCreateThread={props.onCreateThread}
          onSendTurn={props.onSendTurn}
          onPersistComposerSelection={props.onPersistComposerSelection}
          multiAgentAvailable={props.multiAgentAvailable ?? false}
          multiAgentEnabled={props.multiAgentEnabled ?? false}
          onSetMultiAgentEnabled={props.onSetMultiAgentEnabled}
          onSelectPermissionLevel={props.onSelectComposerPermissionLevel}
          onToggleDiff={props.onToggleDiff}
          onUpdateThreadBranch={props.onUpdateThreadBranch}
          onInterruptTurn={props.onInterruptTurn}
          onLogout={props.onLogout}
          onPromoteQueuedFollowUp={props.onPromoteQueuedFollowUp}
          onRemoveQueuedFollowUp={props.onRemoveQueuedFollowUp}
          onClearQueuedFollowUps={props.onClearQueuedFollowUps}
        />
      )}
    </div>
  );
}
