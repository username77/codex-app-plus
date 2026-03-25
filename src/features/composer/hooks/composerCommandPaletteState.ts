import { useMemo } from "react";
import type { ConversationState } from "../../../domain/conversation";
import type { CollaborationPreset } from "../../../domain/timeline";
import type { AppState } from "../../../domain/types";
import { useAppSelector } from "../../../state/store";
import { DEFAULT_COMPOSER_SLASH_CAPABILITIES, type ComposerSlashCapabilitySnapshot } from "../model/composerSlashCommandCatalog";
import type { SlashExecutionContext } from "../service/composerSlashCommandExecutor";
import type { UseComposerCommandPaletteOptions } from "./useComposerCommandPalette";

interface ResumeConversationInput {
  readonly id: string;
  readonly title: string | null;
  readonly cwd: string | null;
  readonly resumeState: ConversationState["resumeState"];
}

export interface SlashRuntimeState {
  readonly account: AppState["account"];
  readonly collaborationModes: AppState["collaborationModes"];
  readonly configSnapshot: AppState["configSnapshot"];
  readonly connectionStatus: AppState["connectionStatus"];
  readonly rateLimits: AppState["rateLimits"];
  readonly realtimeState: SlashExecutionContext["realtimeState"];
}

export interface SlashCollections {
  readonly customPrompts: AppState["customPrompts"];
  readonly collaborationItems: ReadonlyArray<{
    readonly key: CollaborationPreset;
    readonly label: string;
    readonly description: string;
    readonly disabled: false;
    readonly meta: string | null;
  }>;
  readonly resumeItems: ReadonlyArray<{
    readonly key: string;
    readonly label: string;
    readonly description: string;
    readonly disabled: false;
    readonly meta: string;
  }>;
  readonly slashContext: {
    readonly hasThread: boolean;
    readonly hasWorkspace: boolean;
    readonly realtimeActive: boolean;
    readonly taskRunning: boolean;
    readonly capabilities: ComposerSlashCapabilitySnapshot;
  };
}

export function useSelectedConversation(selectedThreadId: string | null): ConversationState | null {
  const selector = useMemo(
    () => (state: AppState) => (
      selectedThreadId === null ? null : state.conversationsById[selectedThreadId] ?? null
    ),
    [selectedThreadId],
  );
  return useAppSelector(selector);
}

export function useSlashRuntimeState(selectedThreadId: string | null): SlashRuntimeState {
  const configSnapshot = useAppSelector((state) => state.configSnapshot);
  const account = useAppSelector((state) => state.account);
  const rateLimits = useAppSelector((state) => state.rateLimits);
  const connectionStatus = useAppSelector((state) => state.connectionStatus);
  const collaborationModes = useAppSelector((state) => state.collaborationModes);
  const realtimeSelector = useMemo(
    () => (state: AppState) => (
      selectedThreadId === null ? null : state.realtimeByThreadId[selectedThreadId] ?? null
    ),
    [selectedThreadId],
  );
  const realtimeState = useAppSelector(realtimeSelector);

  return useMemo(
    () => ({
      account,
      collaborationModes,
      configSnapshot,
      connectionStatus,
      rateLimits,
      realtimeState,
    }),
    [account, collaborationModes, configSnapshot, connectionStatus, rateLimits, realtimeState],
  );
}

export function useSlashCollections(
  options: Pick<
    UseComposerCommandPaletteOptions,
    "collaborationPreset" | "selectedRootPath" | "selectedThreadId" | "isResponding"
  >,
  realtimeState: SlashExecutionContext["realtimeState"],
): SlashCollections {
  const collaborationModes = useAppSelector((state) => state.collaborationModes);
  const customPrompts = useAppSelector((state) => state.customPrompts);
  const resumeInputs = useAppSelector(
    useMemo(
      () => (state: AppState) => state.orderedConversationIds
        .map((threadId) => state.conversationsById[threadId])
        .filter(
          (conversation): conversation is ConversationState => (
            conversation !== undefined
            && !conversation.hidden
            && conversation.id !== options.selectedThreadId
          ),
        )
        .map((conversation) => ({
          id: conversation.id,
          title: conversation.title,
          cwd: conversation.cwd,
          resumeState: conversation.resumeState,
        })),
      [options.selectedThreadId],
    ),
    areResumeConversationInputsEqual,
  );

  return useMemo(
    () => ({
      slashContext: {
        hasThread: options.selectedThreadId !== null,
        hasWorkspace: options.selectedRootPath !== null,
        realtimeActive: realtimeState !== null
          && realtimeState.sessionId !== null
          && !realtimeState.closed,
        taskRunning: options.isResponding,
        capabilities: DEFAULT_COMPOSER_SLASH_CAPABILITIES,
      },
      customPrompts,
      collaborationItems: collaborationModes
        .filter((mode) => mode.mode !== null)
        .map((mode) => ({
          key: mode.mode as CollaborationPreset,
          label: mode.name,
          description: `${mode.model ?? "Use current model"} · ${mode.reasoningEffort ?? "default effort"}`,
          disabled: false as const,
          meta: options.collaborationPreset === mode.mode ? "Current" : null,
        })),
      resumeItems: resumeInputs.map((conversation) => ({
        key: conversation.id,
        label: conversation.title ?? conversation.id,
        description: conversation.cwd ?? "No workspace",
        disabled: false as const,
        meta: conversation.resumeState === "resumed" ? "Loaded" : "Needs resume",
      })),
    }),
    [
      collaborationModes,
      customPrompts,
      options.collaborationPreset,
      options.isResponding,
      options.selectedRootPath,
      options.selectedThreadId,
      realtimeState,
      resumeInputs,
    ],
  );
}

function areResumeConversationInputsEqual(
  left: ReadonlyArray<ResumeConversationInput>,
  right: ReadonlyArray<ResumeConversationInput>,
): boolean {
  if (left === right) {
    return true;
  }
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    const leftItem = left[index];
    const rightItem = right[index];
    if (
      leftItem.id !== rightItem.id
      || leftItem.title !== rightItem.title
      || leftItem.cwd !== rightItem.cwd
      || leftItem.resumeState !== rightItem.resumeState
    ) {
      return false;
    }
  }
  return true;
}
