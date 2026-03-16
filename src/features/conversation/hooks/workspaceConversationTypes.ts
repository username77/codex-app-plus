import type { AgentEnvironment, HostBridge } from "../../../bridge/types";
import type { ComposerSelection } from "../../composer/model/composerPreferences";
import type { CollaborationModePreset, CollaborationPreset, ComposerAttachment, FollowUpMode, QueuedFollowUp, ThreadSummary, TimelineEntry } from "../../../domain/timeline";
import type { TurnStatus } from "../../../protocol/generated/v2/TurnStatus";
import type { ComposerPermissionLevel } from "../../composer/model/composerPermission";

export interface SendTurnOptions {
  readonly text: string;
  readonly attachments: ReadonlyArray<ComposerAttachment>;
  readonly selection: ComposerSelection;
  readonly permissionLevel: ComposerPermissionLevel;
  readonly collaborationPreset: CollaborationPreset;
  readonly collaborationModeOverridePreset?: CollaborationPreset | null;
  readonly followUpOverride?: FollowUpMode | null;
}

export interface WorkspaceConversationController {
  readonly selectedThreadId: string | null;
  readonly selectedThread: ThreadSummary | null;
  readonly activeTurnId: string | null;
  readonly turnStatuses: Readonly<Record<string, TurnStatus>>;
  readonly isResponding: boolean;
  readonly interruptPending: boolean;
  readonly collaborationPreset: CollaborationPreset;
  readonly workspaceThreads: ReadonlyArray<ThreadSummary>;
  readonly activities: ReadonlyArray<TimelineEntry>;
  readonly queuedFollowUps: ReadonlyArray<QueuedFollowUp>;
  readonly draftActive: boolean;
  readonly selectedConversationLoading: boolean;
  createThread: () => Promise<void>;
  selectThread: (threadId: string | null) => void;
  selectCollaborationPreset: (preset: CollaborationPreset) => void;
  sendTurn: (options: SendTurnOptions) => Promise<void>;
  interruptActiveTurn: () => Promise<void>;
  updateThreadBranch: (branch: string) => Promise<void>;
  removeQueuedFollowUp: (followUpId: string) => void;
  clearQueuedFollowUps: () => void;
}

export interface UseWorkspaceConversationOptions {
  readonly agentEnvironment: AgentEnvironment;
  readonly hostBridge: HostBridge;
  readonly selectedRootPath: string | null;
  readonly collaborationModes: ReadonlyArray<CollaborationModePreset>;
  readonly followUpQueueMode: FollowUpMode;
}
