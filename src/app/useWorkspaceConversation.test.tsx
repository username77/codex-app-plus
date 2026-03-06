import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";
import type { HostBridge } from "../bridge/types";
import type { ThreadSummary } from "../domain/types";
import { AppStoreProvider, useAppStore } from "../state/store";
import { useWorkspaceConversation } from "./useWorkspaceConversation";

function Wrapper(props: PropsWithChildren): JSX.Element {
  return <AppStoreProvider>{props.children}</AppStoreProvider>;
}

function createThread(overrides?: Partial<ThreadSummary>): ThreadSummary {
  return {
    id: "thread-1",
    title: "First thread",
    cwd: "E:/code/FPGA",
    archived: false,
    updatedAt: "2026-03-06T09:00:00.000Z",
    source: "rpc",
    ...overrides
  };
}

function createThreadStartResult() {
  return {
    thread: {
      id: "thread-1",
      preview: "请分析当前工作区",
      ephemeral: false,
      modelProvider: "openai",
      createdAt: 1,
      updatedAt: 1,
      status: { type: "idle" as const },
      path: null,
      cwd: "E:/code/FPGA",
      cliVersion: "0.1.0",
      source: "appServer" as const,
      agentNickname: null,
      agentRole: null,
      gitInfo: null,
      name: null,
      turns: []
    }
  };
}

function createTurnStartResult() {
  return {
    turn: {
      id: "turn-1",
      items: [],
      status: "inProgress" as const,
      error: null
    }
  };
}

describe("useWorkspaceConversation", () => {
  it("refreshes the codex catalog after thread start and turn start", async () => {
    const request = vi.fn(async (input: { readonly method: string; readonly params: unknown }) => {
      if (input.method === "thread/start") {
        return { requestId: "request-1", result: createThreadStartResult() };
      }
      if (input.method === "turn/start") {
        return { requestId: "request-2", result: createTurnStartResult() };
      }
      throw new Error(`unexpected method: ${input.method}`);
    });
    const reloadCodexSessions = vi.fn().mockResolvedValue(undefined);
    const hostBridge = {
      rpc: { request, notify: vi.fn(), cancel: vi.fn() },
      app: { readCodexSession: vi.fn() }
    } as unknown as HostBridge;

    const { result } = renderHook(
      () => {
        const store = useAppStore();
        const conversation = useWorkspaceConversation({
          hostBridge,
          threads: [],
          codexSessions: [],
          selectedRootPath: "E:/code/FPGA",
          reloadCodexSessions
        });
        return { store, conversation };
      },
      { wrapper: Wrapper }
    );

    act(() => {
      result.current.store.dispatch({ type: "input/changed", value: "请分析当前工作区" });
    });

    await act(async () => {
      await result.current.conversation.sendTurn({ model: "gpt-5.2", effort: "medium" });
    });

    expect(request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        method: "thread/start",
        params: expect.objectContaining({ cwd: "E:/code/FPGA", model: "gpt-5.2" })
      })
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        method: "turn/start",
        params: expect.objectContaining({ threadId: "thread-1", model: "gpt-5.2", effort: "medium" })
      })
    );
    expect(reloadCodexSessions).toHaveBeenCalledTimes(2);
  });

  it("clears selection when switching to another workspace", async () => {
    const reloadCodexSessions = vi.fn().mockResolvedValue(undefined);
    const hostBridge = {
      rpc: { request: vi.fn(), notify: vi.fn(), cancel: vi.fn() },
      app: { readCodexSession: vi.fn() }
    } as unknown as HostBridge;

    const { result, rerender } = renderHook(
      ({ selectedRootPath }: { readonly selectedRootPath: string | null }) => {
        const store = useAppStore();
        const conversation = useWorkspaceConversation({
          hostBridge,
          threads: [createThread()],
          codexSessions: [],
          selectedRootPath,
          reloadCodexSessions
        });
        return { store, conversation };
      },
      { wrapper: Wrapper, initialProps: { selectedRootPath: "E:/code/FPGA" } }
    );

    act(() => {
      result.current.store.dispatch({ type: "thread/selected", threadId: "thread-1" });
    });

    expect(result.current.conversation.selectedThreadId).toBe("thread-1");

    rerender({ selectedRootPath: "E:/code/Codex" });

    expect(result.current.conversation.selectedThreadId).toBeNull();
    await waitFor(() => {
      expect(result.current.store.state.selectedThreadId).toBeNull();
    });
  });

  it("upserts and loads local codex sessions when selected", async () => {
    const readCodexSession = vi.fn().mockResolvedValue({
      threadId: "local-1",
      messages: [
        { id: "user-1", role: "user", text: "你好" },
        { id: "assistant-1", role: "assistant", text: "你好，我来看看。" }
      ]
    });
    const reloadCodexSessions = vi.fn().mockResolvedValue(undefined);
    const hostBridge = {
      rpc: { request: vi.fn(), notify: vi.fn(), cancel: vi.fn() },
      app: { readCodexSession }
    } as unknown as HostBridge;
    const localThread = createThread({ id: "local-1", title: "本地会话", source: "codexData" });

    const { result } = renderHook(
      () => {
        const store = useAppStore();
        const conversation = useWorkspaceConversation({
          hostBridge,
          threads: [],
          codexSessions: [localThread],
          selectedRootPath: localThread.cwd,
          reloadCodexSessions
        });
        return { store, conversation };
      },
      { wrapper: Wrapper }
    );

    act(() => {
      result.current.conversation.selectThread("local-1");
    });

    expect(result.current.store.state.threads[0]).toMatchObject({ id: "local-1", source: "codexData" });
    await waitFor(() => {
      expect(readCodexSession).toHaveBeenCalledWith({ threadId: "local-1" });
    });
  });

  it("refreshes the codex catalog when a turn completes", async () => {
    const reloadCodexSessions = vi.fn().mockResolvedValue(undefined);
    const hostBridge = {
      rpc: { request: vi.fn(), notify: vi.fn(), cancel: vi.fn() },
      app: { readCodexSession: vi.fn() }
    } as unknown as HostBridge;

    const { result } = renderHook(
      () => {
        const store = useAppStore();
        const conversation = useWorkspaceConversation({
          hostBridge,
          threads: [],
          codexSessions: [],
          selectedRootPath: "E:/code/FPGA",
          reloadCodexSessions
        });
        return { store, conversation };
      },
      { wrapper: Wrapper }
    );

    act(() => {
      result.current.store.dispatch({
        type: "notification/received",
        notification: { method: "turn/completed", params: { threadId: "thread-1", turn: { id: "turn-1" } } }
      });
    });

    await waitFor(() => {
      expect(reloadCodexSessions).toHaveBeenCalledTimes(1);
    });
  });
});
