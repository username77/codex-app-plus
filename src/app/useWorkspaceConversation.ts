import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ComposerSelection } from "./composerPreferences";
import type { CodexSessionReadOutput, HostBridge } from "../bridge/types";
import type { ConversationMessage, ThreadSummary } from "../domain/types";
import { createUserConversationMessage, mapThreadHistoryToMessages } from "./conversationMessages";
import type { ThreadReadParams } from "../protocol/generated/v2/ThreadReadParams";
import type { ThreadReadResponse } from "../protocol/generated/v2/ThreadReadResponse";
import type { ThreadResumeParams } from "../protocol/generated/v2/ThreadResumeParams";
import type { ThreadStartParams } from "../protocol/generated/v2/ThreadStartParams";
import type { ThreadStartResponse } from "../protocol/generated/v2/ThreadStartResponse";
import type { TurnStartParams } from "../protocol/generated/v2/TurnStartParams";
import type { TurnStartResponse } from "../protocol/generated/v2/TurnStartResponse";
import { mapThreadToSummary } from "../protocol/mappers";
import { useAppStore } from "../state/store";
import { listThreadsForWorkspace } from "./workspaceThread";

interface WorkspaceConversationController {
  readonly selectedThreadId: string | null;
  readonly workspaceThreads: ReadonlyArray<ThreadSummary>;
  createThread: (model?: string | null) => Promise<string>;
  selectThread: (threadId: string) => void;
  sendTurn: (selection: ComposerSelection) => Promise<void>;
}

function mapCodexSessionMessages(threadId: string, response: CodexSessionReadOutput): ReadonlyArray<ConversationMessage> {
  return response.messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      id: message.id,
      threadId,
      turnId: null,
      itemId: message.id,
      role: message.role as "user" | "assistant",
      text: message.text,
      status: "done"
    }));
}

export function useWorkspaceConversation(
  hostBridge: HostBridge,
  threads: ReadonlyArray<ThreadSummary>,
  selectedRootPath: string | null
): WorkspaceConversationController {
  const { dispatch, state } = useAppStore();
  const loadedThreadIds = useRef(new Set<string>());
  const resumedThreadIds = useRef(new Set<string>());
  const workspaceThreads = useMemo(() => listThreadsForWorkspace(threads, selectedRootPath), [threads, selectedRootPath]);
  const selectedThreadId = useMemo(() => {
    if (state.selectedThreadId !== null && workspaceThreads.some((thread) => thread.id === state.selectedThreadId)) {
      return state.selectedThreadId;
    }
    return workspaceThreads[0]?.id ?? null;
  }, [state.selectedThreadId, workspaceThreads]);
  const selectedThread = useMemo(
    () => workspaceThreads.find((thread) => thread.id === selectedThreadId) ?? null,
    [selectedThreadId, workspaceThreads]
  );

  useEffect(() => {
    if (state.selectedThreadId !== selectedThreadId) {
      dispatch({ type: "thread/selected", threadId: selectedThreadId });
    }
  }, [dispatch, selectedThreadId, state.selectedThreadId]);

  const loadThreadHistory = useCallback(
    async (thread: ThreadSummary) => {
      if (thread.source === "codexData") {
        const response = await hostBridge.app.readCodexSession({ threadId: thread.id });
        dispatch({ type: "thread/messagesLoaded", threadId: thread.id, messages: mapCodexSessionMessages(thread.id, response) });
        loadedThreadIds.current.add(thread.id);
        return;
      }

      const threadId = thread.id;
      const params: ThreadReadParams = { threadId, includeTurns: true };
      const response = (await hostBridge.rpc.request({ method: "thread/read", params })).result as ThreadReadResponse;
      dispatch({ type: "thread/upserted", thread: mapThreadToSummary(response.thread) });
      dispatch({ type: "thread/messagesLoaded", threadId, messages: mapThreadHistoryToMessages(response.thread) });
      loadedThreadIds.current.add(threadId);
    },
    [dispatch, hostBridge.app, hostBridge.rpc]
  );

  useEffect(() => {
    if (selectedThread === null || loadedThreadIds.current.has(selectedThread.id)) {
      return;
    }
    void loadThreadHistory(selectedThread).catch((error) => {
      dispatch({ type: "fatal/error", message: String(error) });
    });
  }, [dispatch, loadThreadHistory, selectedThread]);

  const ensureThreadResumed = useCallback(
    async (threadId: string) => {
      if (resumedThreadIds.current.has(threadId)) {
        return;
      }
      const params: ThreadResumeParams = { threadId, persistExtendedHistory: true };
      await hostBridge.rpc.request({ method: "thread/resume", params });
      resumedThreadIds.current.add(threadId);
    },
    [hostBridge.rpc]
  );

  const runBusy = useCallback(
    async <T,>(runner: () => Promise<T>): Promise<T> => {
      dispatch({ type: "busy/changed", busy: true });
      try {
        return await runner();
      } finally {
        dispatch({ type: "busy/changed", busy: false });
      }
    },
    [dispatch]
  );

  const createThread = useCallback(async (model: string | null = null) => {
    if (selectedRootPath === null) {
      throw new Error("请先选择一个工作区文件夹");
    }
    return runBusy(async () => {
      const params: ThreadStartParams = {
        model: model ?? undefined,
        cwd: selectedRootPath,
        experimentalRawEvents: false,
        persistExtendedHistory: true
      };
      const response = (await hostBridge.rpc.request({ method: "thread/start", params })).result as ThreadStartResponse;
      const summary = mapThreadToSummary(response.thread);
      dispatch({ type: "thread/upserted", thread: summary });
      dispatch({ type: "thread/selected", threadId: response.thread.id });
      dispatch({ type: "thread/messagesLoaded", threadId: response.thread.id, messages: [] });
      loadedThreadIds.current.add(response.thread.id);
      resumedThreadIds.current.add(response.thread.id);
      return response.thread.id;
    });
  }, [dispatch, hostBridge.rpc, runBusy, selectedRootPath]);

  const sendTurn = useCallback(async (selection: ComposerSelection) => {
    const text = state.inputText.trim();
    if (text.length === 0) {
      return;
    }
    const threadId = selectedThreadId ?? (await createThread(selection.model));
    await runBusy(async () => {
      await ensureThreadResumed(threadId);
      const params: TurnStartParams = {
        threadId,
        model: selection.model ?? undefined,
        effort: selection.effort ?? undefined,
        cwd: selectedRootPath ?? undefined,
        input: [{ type: "text", text, text_elements: [] }]
      };
      const response = (await hostBridge.rpc.request({ method: "turn/start", params })).result as TurnStartResponse;
      dispatch({ type: "thread/selected", threadId });
      dispatch({ type: "thread/touched", threadId, updatedAt: new Date().toISOString() });
      dispatch({ type: "message/added", message: createUserConversationMessage(threadId, response.turn.id, text) });
      dispatch({ type: "input/changed", value: "" });
    });
  }, [createThread, dispatch, ensureThreadResumed, hostBridge.rpc, runBusy, selectedRootPath, selectedThreadId, state.inputText]);

  return {
    selectedThreadId,
    workspaceThreads,
    createThread,
    selectThread: (threadId) => dispatch({ type: "thread/selected", threadId }),
    sendTurn
  };
}
