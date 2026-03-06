import { useCallback, useEffect, useMemo } from "react";
import type { HostBridge } from "../bridge/types";
import type { ThreadSummary, TimelineItem } from "../domain/types";
import type { ThreadStartParams } from "../protocol/generated/v2/ThreadStartParams";
import type { ThreadStartResponse } from "../protocol/generated/v2/ThreadStartResponse";
import type { TurnStartParams } from "../protocol/generated/v2/TurnStartParams";
import { mapThreadToSummary } from "../protocol/mappers";
import { useAppStore } from "../state/store";
import { findLatestThreadForWorkspace } from "./workspaceThread";

interface WorkspaceConversationController {
  readonly activeThreadId: string | null;
  createThread: () => Promise<string>;
  sendTurn: () => Promise<void>;
}

function makeSystemItem(text: string): TimelineItem {
  return {
    id: crypto.randomUUID(),
    role: "system",
    text
  };
}

function upsertThreadSummary(threads: ReadonlyArray<ThreadSummary>, nextThread: ThreadSummary): ReadonlyArray<ThreadSummary> {
  return [nextThread, ...threads.filter((thread) => thread.id !== nextThread.id)];
}

export function useWorkspaceConversation(
  hostBridge: HostBridge,
  threads: ReadonlyArray<ThreadSummary>,
  selectedRootPath: string | null
): WorkspaceConversationController {
  const { dispatch, state } = useAppStore();
  const activeThread = useMemo(
    () => findLatestThreadForWorkspace(threads, selectedRootPath),
    [selectedRootPath, threads]
  );
  const activeThreadId = activeThread?.id ?? null;

  useEffect(() => {
    if (state.selectedThreadId === activeThreadId) {
      return;
    }
    dispatch({ type: "thread/selected", threadId: activeThreadId });
  }, [activeThreadId, dispatch, state.selectedThreadId]);

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

  const createThread = useCallback(async () => {
    if (selectedRootPath === null) {
      throw new Error("请先选择一个工作区文件夹");
    }
    return runBusy(async () => {
      const params: ThreadStartParams = { cwd: selectedRootPath, experimentalRawEvents: false, persistExtendedHistory: true };
      const result = await hostBridge.rpc.request({ method: "thread/start", params });
      const response = result.result as ThreadStartResponse;
      const summary = mapThreadToSummary(response.thread);
      dispatch({ type: "threads/loaded", threads: upsertThreadSummary(threads, summary) });
      dispatch({ type: "thread/selected", threadId: response.thread.id });
      dispatch({ type: "timeline/appended", item: makeSystemItem(`已创建会话 ${response.thread.id}`) });
      return response.thread.id;
    });
  }, [dispatch, hostBridge.rpc, runBusy, selectedRootPath, threads]);

  const sendTurn = useCallback(async () => {
    const text = state.inputText.trim();
    if (text.length === 0) {
      return;
    }
    const threadId = activeThreadId ?? (await createThread());
    await runBusy(async () => {
      const params: TurnStartParams = {
        threadId,
        cwd: selectedRootPath ?? undefined,
        input: [{ type: "text", text, text_elements: [] }]
      };
      dispatch({ type: "thread/selected", threadId });
      await hostBridge.rpc.request({ method: "turn/start", params });
      dispatch({ type: "timeline/appended", item: { id: crypto.randomUUID(), role: "user", text } });
      dispatch({ type: "input/changed", value: "" });
    });
  }, [activeThreadId, createThread, dispatch, hostBridge.rpc, runBusy, selectedRootPath, state.inputText]);

  return {
    activeThreadId,
    createThread,
    sendTurn
  };
}
