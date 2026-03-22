import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ConversationState } from "../../../domain/conversation";
import type { CollaborationPreset } from "../../../domain/timeline";
import type { ThreadMetadataUpdateResponse } from "../../../protocol/generated/v2/ThreadMetadataUpdateResponse";
import type { ThreadResumeResponse } from "../../../protocol/generated/v2/ThreadResumeResponse";
import type { ThreadStartResponse } from "../../../protocol/generated/v2/ThreadStartResponse";
import type { TurnInterruptParams } from "../../../protocol/generated/v2/TurnInterruptParams";
import type { TurnStartParams } from "../../../protocol/generated/v2/TurnStartParams";
import type { TurnStartResponse } from "../../../protocol/generated/v2/TurnStartResponse";
import type { TurnSteerParams } from "../../../protocol/generated/v2/TurnSteerParams";
import { useAppDispatch, useAppStoreApi } from "../../../state/store";
import {
  createThreadPermissionOverrides,
  createTurnPermissionOverrides,
} from "../../composer/model/composerPermission";
import { resolveAgentWorkspacePath } from "../../workspace/model/workspacePath";
import { createConversationFromThread } from "../model/conversationState";
import { deriveConversationPreviewTitle, pickConversationTitle } from "../model/conversationTitle";
import { getActiveTurnId, isConversationStreaming } from "../model/conversationSelectors";
import { consumePrewarmedThread } from "../service/prewarmedThreadManager";
import { collectDescendantThreadIds, createRpcThreadRuntimeCleanupTransport, forceCloseThreadRuntime, reportThreadCleanupError } from "../service/threadRuntimeCleanup";
import { useThreadResourceCleanup } from "./useThreadResourceCleanup";
import { buildInterruptedTurn, createInput, createQueuedFollowUp, resolveConversationCwd, resolveRequestedCollaborationMode, toErrorMessage } from "./workspaceConversationHelpers";
import type { CreateThreadOptions, SendTurnOptions, UseWorkspaceConversationOptions, WorkspaceConversationController } from "./workspaceConversationTypes";
import { createHostBridgeAppServerClient } from "../../../protocol/appServerClient";

type AppDispatch = ReturnType<typeof useAppDispatch>;
type AppStoreApi = ReturnType<typeof useAppStoreApi>;

interface UseWorkspaceConversationControllerArgs {
  readonly options: UseWorkspaceConversationOptions;
  readonly dispatch: AppDispatch;
  readonly store: AppStoreApi;
  readonly selectedConversation: ConversationState | null;
  readonly activeTurnId: string | null;
  readonly nextQueuedConversationId: string | null;
}

type WorkspaceConversationActions = Pick<
  WorkspaceConversationController,
  | "clearQueuedFollowUps"
  | "createThread"
  | "interruptActiveTurn"
  | "removeQueuedFollowUp"
  | "selectCollaborationPreset"
  | "selectThread"
  | "sendTurn"
  | "updateThreadBranch"
>;

const APP_SERVER_NOT_READY_MESSAGE = "Codex 正在启动或未连接，请等待连接完成后再发送。";

function createAppServerNotReadyError(): Error {
  return new Error(APP_SERVER_NOT_READY_MESSAGE);
}

export function useWorkspaceConversationController({
  options,
  dispatch,
  store,
  selectedConversation,
  activeTurnId,
  nextQueuedConversationId,
}: UseWorkspaceConversationControllerArgs): WorkspaceConversationActions {
  const resumingConversationIds = useRef(new Set<string>());
  const drainingConversationIds = useRef(new Set<string>());
  const interruptRequestKeys = useRef(new Set<string>());
  const deferredResumeConversationIds = useRef(new Set<string>());
  const appServerClient = useMemo(
    () => options.appServerClient ?? createHostBridgeAppServerClient(options.hostBridge),
    [options.appServerClient, options.hostBridge],
  );
  const appServerReady = options.appServerReady !== false;

  useThreadResourceCleanup({ appServerClient, store, dispatch });

  const getConversation = useCallback((conversationId: string) => {
    const conversation = store.getState().conversationsById[conversationId] ?? null;
    return conversation?.agentEnvironment === options.agentEnvironment ? conversation : null;
  }, [options.agentEnvironment, store]);

  const cleanupTransport = useMemo(
    () => createRpcThreadRuntimeCleanupTransport(appServerClient),
    [appServerClient],
  );
  const interruptPending = activeTurnId !== null && selectedConversation?.interruptRequestedTurnId === activeTurnId;

  useEffect(() => {
    const activeKey = selectedConversation === null || activeTurnId === null ? null : `${selectedConversation.id}:${activeTurnId}`;
    if (interruptPending || activeKey === null) {
      interruptRequestKeys.current.clear();
      return;
    }
    for (const requestKey of interruptRequestKeys.current) {
      if (requestKey !== activeKey) {
        interruptRequestKeys.current.delete(requestKey);
      }
    }
  }, [activeTurnId, interruptPending, selectedConversation]);

  const ensureConversationResumed = useCallback(async (conversationId: string) => {
    if (!appServerReady) {
      return;
    }
    deferredResumeConversationIds.current.delete(conversationId);
    const conversation = getConversation(conversationId);
    if (
      conversation === null
      || conversation.resumeState === "resumed"
      || conversation.resumeState === "resume_failed"
      || resumingConversationIds.current.has(conversationId)
    ) {
      return;
    }
    resumingConversationIds.current.add(conversationId);
    dispatch({ type: "conversation/resumeStateChanged", conversationId, resumeState: "resuming" });
    try {
      const response = await appServerClient.request("thread/resume", {
        threadId: conversationId,
        persistExtendedHistory: true,
      }) as ThreadResumeResponse;
      dispatch({ type: "conversation/loaded", conversationId, thread: response.thread });
    } catch (error) {
      dispatch({ type: "conversation/resumeStateChanged", conversationId, resumeState: "resume_failed" });
      dispatch({
        type: "conversation/systemNoticeAdded",
        conversationId,
        turnId: null,
        title: "恢复工作区会话失败",
        detail: toErrorMessage(error),
        level: "error",
        source: "thread/resume",
      });
    } finally {
      resumingConversationIds.current.delete(conversationId);
    }
  }, [appServerClient, appServerReady, dispatch, getConversation]);

  useEffect(() => {
    if (!appServerReady) {
      return;
    }
    if (selectedConversation === null || selectedConversation.resumeState !== "needs_resume") {
      return;
    }
    if (deferredResumeConversationIds.current.has(selectedConversation.id)) {
      return;
    }
    void ensureConversationResumed(selectedConversation.id);
  }, [appServerReady, ensureConversationResumed, selectedConversation]);

  const createThread = useCallback(async (createOptions?: CreateThreadOptions) => {
    const workspacePath = createOptions?.workspacePath ?? options.selectedRootPath;
    if (workspacePath === null) {
      throw new Error("请先选择工作区。");
    }
    dispatch({ type: "conversation/draftOpened", draft: { workspacePath, createdAt: new Date().toISOString() } });
  }, [dispatch, options.selectedRootPath]);

  const startTurn = useCallback(async (conversationId: string, sendOptions: SendTurnOptions, cwdOverride: string | null) => {
    if (!appServerReady) {
      throw createAppServerNotReadyError();
    }
    const collaborationMode = resolveRequestedCollaborationMode(options.collaborationModes, sendOptions);
    const input = createInput(sendOptions.text, sendOptions.attachments);
    const resolvedCwd = resolveConversationCwd(cwdOverride, options.agentEnvironment);
    dispatch({
      type: "conversation/turnPlaceholderAdded",
      conversationId,
      params: {
        input,
        cwd: resolvedCwd,
        model: sendOptions.selection.model,
        effort: sendOptions.selection.effort,
        serviceTier: sendOptions.selection.serviceTier,
        collaborationMode: collaborationMode ?? null,
      },
    });
    const params: TurnStartParams = {
      threadId: conversationId,
      model: sendOptions.selection.model ?? undefined,
      effort: sendOptions.selection.effort ?? undefined,
      serviceTier: sendOptions.selection.serviceTier ?? null,
      cwd: resolvedCwd ?? undefined,
      input,
      collaborationMode,
      ...createTurnPermissionOverrides(sendOptions.permissionLevel, options.permissionSettings),
    };
    const response = await appServerClient.request("turn/start", params) as TurnStartResponse;
    dispatch({ type: "conversation/turnStarted", conversationId, turn: response.turn });
    dispatch({ type: "conversation/touched", conversationId, updatedAt: new Date().toISOString() });
  }, [appServerClient, appServerReady, dispatch, options.agentEnvironment, options.collaborationModes, options.permissionSettings]);

  const startNewConversation = useCallback(async (sendOptions: SendTurnOptions) => {
    if (!appServerReady) {
      throw createAppServerNotReadyError();
    }
    const workspacePath = options.selectedRootPath ?? store.getState().draftConversation?.workspacePath ?? null;
    if (workspacePath === null) {
      throw new Error("请先选择工作区。");
    }
    const agentWorkspacePath = resolveAgentWorkspacePath(workspacePath, options.agentEnvironment);
    const prewarmedResponse = await consumePrewarmedThread(workspacePath);
    const response = prewarmedResponse ?? (
      await appServerClient.request("thread/start", {
        model: sendOptions.selection.model ?? undefined,
        serviceTier: sendOptions.selection.serviceTier ?? null,
        cwd: agentWorkspacePath,
        experimentalRawEvents: false,
        persistExtendedHistory: true,
        ...createThreadPermissionOverrides(sendOptions.permissionLevel, options.permissionSettings),
      }) as ThreadStartResponse
    );
    const conversation = createConversationFromThread(response.thread, { hidden: false, resumeState: "resumed", agentEnvironment: options.agentEnvironment });
    const localPreviewTitle = pickConversationTitle(conversation.title, deriveConversationPreviewTitle(createInput(sendOptions.text, sendOptions.attachments)));
    dispatch({ type: "conversation/upserted", conversation });
    if (localPreviewTitle !== null && localPreviewTitle !== conversation.title) {
      dispatch({ type: "conversation/titleChanged", conversationId: conversation.id, title: localPreviewTitle });
    }
    dispatch({ type: "composer/draftCollaborationPresetTransferred", conversationId: conversation.id });
    dispatch({ type: "conversation/selected", conversationId: conversation.id });
    await startTurn(conversation.id, sendOptions, response.thread.cwd || response.cwd || agentWorkspacePath);
  }, [appServerClient, appServerReady, dispatch, options.agentEnvironment, options.permissionSettings, options.selectedRootPath, startTurn, store]);

  const steerTurn = useCallback(async (conversationId: string, turnId: string, sendOptions: SendTurnOptions) => {
    if (!appServerReady) {
      throw createAppServerNotReadyError();
    }
    const input = createInput(sendOptions.text, sendOptions.attachments);
    const params: TurnSteerParams = { threadId: conversationId, input, expectedTurnId: turnId };
    await appServerClient.request("turn/steer", params);
    dispatch({ type: "conversation/itemCompleted", conversationId, turnId, item: { type: "userMessage", id: `steer-${Date.now()}`, content: input } });
  }, [appServerClient, appServerReady, dispatch]);

  const interruptTurn = useCallback(async (conversationId: string, turnId: string) => {
    if (!appServerReady) {
      throw createAppServerNotReadyError();
    }
    const requestKey = `${conversationId}:${turnId}`;
    if (interruptRequestKeys.current.has(requestKey)) {
      return;
    }
    interruptRequestKeys.current.add(requestKey);
    const params: TurnInterruptParams = { threadId: conversationId, turnId };
    try {
      await appServerClient.request("turn/interrupt", params);
      dispatch({ type: "turn/interruptRequested", conversationId, turnId });
    } catch (error) {
      interruptRequestKeys.current.delete(requestKey);
      throw error;
    }
  }, [appServerClient, appServerReady, dispatch]);

  const interruptAndUnloadConversation = useCallback(async (conversationId: string, turnId: string) => {
    const descendantThreadIds = collectDescendantThreadIds(conversationId, store.getState().conversationsById);
    try {
      for (const threadId of descendantThreadIds) {
        await forceCloseThreadRuntime(threadId, getConversation(threadId), cleanupTransport);
      }
      await forceCloseThreadRuntime(conversationId, getConversation(conversationId), cleanupTransport);
    } catch (error) {
      reportThreadCleanupError(dispatch, getConversation(conversationId), error);
      throw error;
    }

    deferredResumeConversationIds.current.add(conversationId);
    const interruptedTurn = buildInterruptedTurn(getConversation(conversationId), turnId);
    if (interruptedTurn !== null) {
      dispatch({ type: "conversation/turnCompleted", conversationId, turn: interruptedTurn });
    }
    dispatch({ type: "conversation/statusChanged", conversationId, status: "notLoaded", activeFlags: [] });
    dispatch({ type: "conversation/resumeStateChanged", conversationId, resumeState: "needs_resume" });
  }, [cleanupTransport, dispatch, getConversation, store]);

  const processQueuedFollowUp = useCallback(async (conversationId: string) => {
    if (!appServerReady) {
      return;
    }
    if (drainingConversationIds.current.has(conversationId)) {
      return;
    }
    const conversation = getConversation(conversationId);
    const queued = conversation?.queuedFollowUps[0] ?? null;
    if (conversation === null || queued === null || isConversationStreaming(conversation)) {
      return;
    }
    drainingConversationIds.current.add(conversationId);
    try {
      await ensureConversationResumed(conversationId);
      await startTurn(conversationId, {
        text: queued.text,
        attachments: queued.attachments,
        selection: { model: queued.model, effort: queued.effort, serviceTier: queued.serviceTier },
        permissionLevel: queued.permissionLevel,
        collaborationPreset: queued.collaborationPreset,
        followUpOverride: queued.mode,
      }, conversation.cwd ?? options.selectedRootPath);
      dispatch({ type: "followUp/dequeued", conversationId, followUpId: queued.id });
    } finally {
      drainingConversationIds.current.delete(conversationId);
    }
  }, [appServerReady, dispatch, ensureConversationResumed, getConversation, options.selectedRootPath, startTurn]);

  useEffect(() => {
    if (nextQueuedConversationId !== null) {
      void processQueuedFollowUp(nextQueuedConversationId);
    }
  }, [nextQueuedConversationId, processQueuedFollowUp]);

  const sendTurn = useCallback(async (sendOptions: SendTurnOptions) => {
    const text = sendOptions.text.trim();
    if (text.length === 0 && sendOptions.attachments.length === 0) {
      return;
    }
    if (selectedConversation === null) {
      await startNewConversation(sendOptions);
      dispatch({ type: "input/changed", value: "" });
      return;
    }
    await ensureConversationResumed(selectedConversation.id);
    const currentActiveTurnId = getActiveTurnId(getConversation(selectedConversation.id) ?? selectedConversation);
    if (currentActiveTurnId === null) {
      await startTurn(selectedConversation.id, sendOptions, selectedConversation.cwd ?? options.selectedRootPath);
      dispatch({ type: "input/changed", value: "" });
      return;
    }
    const mode = sendOptions.followUpOverride ?? options.followUpQueueMode;
    if (mode === "steer") {
      await steerTurn(selectedConversation.id, currentActiveTurnId, sendOptions);
      dispatch({ type: "input/changed", value: "" });
      return;
    }
    const followUp = createQueuedFollowUp({ ...sendOptions, followUpOverride: mode });
    dispatch({ type: "followUp/enqueued", conversationId: selectedConversation.id, followUp });
    dispatch({ type: "input/changed", value: "" });
    if (mode === "interrupt" && selectedConversation.interruptRequestedTurnId !== currentActiveTurnId) {
      await interruptTurn(selectedConversation.id, currentActiveTurnId);
    }
  }, [dispatch, ensureConversationResumed, getConversation, interruptTurn, options.followUpQueueMode, options.selectedRootPath, selectedConversation, startNewConversation, startTurn, steerTurn]);

  const interruptActiveTurn = useCallback(async () => {
    if (selectedConversation === null || activeTurnId === null || selectedConversation.interruptRequestedTurnId === activeTurnId) {
      return;
    }
    await interruptAndUnloadConversation(selectedConversation.id, activeTurnId);
  }, [activeTurnId, interruptAndUnloadConversation, selectedConversation]);

  const selectThread = useCallback((threadId: string | null) => {
    if (threadId !== null && getConversation(threadId)?.resumeState === "resume_failed") {
      dispatch({ type: "conversation/resumeStateChanged", conversationId: threadId, resumeState: "needs_resume" });
    }
    dispatch({ type: "conversation/selected", conversationId: threadId });
  }, [dispatch, getConversation]);

  const selectCollaborationPreset = useCallback((preset: CollaborationPreset) => {
    if (selectedConversation === null) {
      dispatch({ type: "composer/draftCollaborationPresetSelected", preset });
      return;
    }
    dispatch({ type: "composer/threadCollaborationPresetSelected", conversationId: selectedConversation.id, preset });
  }, [dispatch, selectedConversation]);

  const updateThreadBranch = useCallback(async (branch: string) => {
    if (!appServerReady) {
      throw createAppServerNotReadyError();
    }
    if (selectedConversation === null) {
      return;
    }
    const response = await appServerClient.request("thread/metadata/update", {
      threadId: selectedConversation.id,
      gitInfo: { branch },
    }) as ThreadMetadataUpdateResponse;
    dispatch({
      type: "conversation/upserted",
      conversation: createConversationFromThread(response.thread, {
        hidden: selectedConversation.hidden,
        resumeState: selectedConversation.resumeState,
        agentEnvironment: options.agentEnvironment,
      }),
    });
  }, [appServerClient, appServerReady, dispatch, options.agentEnvironment, selectedConversation]);

  const removeQueuedFollowUp = useCallback((followUpId: string) => {
    if (selectedConversation !== null) {
      dispatch({ type: "followUp/removed", conversationId: selectedConversation.id, followUpId });
    }
  }, [dispatch, selectedConversation]);

  const clearQueuedFollowUps = useCallback(() => {
    if (selectedConversation !== null) {
      dispatch({ type: "followUp/cleared", conversationId: selectedConversation.id });
    }
  }, [dispatch, selectedConversation]);

  return {
    clearQueuedFollowUps,
    createThread,
    interruptActiveTurn,
    removeQueuedFollowUp,
    selectCollaborationPreset,
    selectThread,
    sendTurn,
    updateThreadBranch,
  };
}
