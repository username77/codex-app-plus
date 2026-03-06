import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";
import type { HostBridge } from "../bridge/types";
import { AppStoreProvider, useAppStore } from "../state/store";
import { useWorkspaceConversation } from "./useWorkspaceConversation";

function Wrapper(props: PropsWithChildren): JSX.Element {
  return <AppStoreProvider>{props.children}</AppStoreProvider>;
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
  it("sends the selected model and effort to the app server", async () => {
    const request = vi.fn(async (input: { readonly method: string; readonly params: unknown }) => {
      if (input.method === "thread/start") {
        return { requestId: "request-1", result: createThreadStartResult() };
      }
      if (input.method === "turn/start") {
        return { requestId: "request-2", result: createTurnStartResult() };
      }
      throw new Error(`unexpected method: ${input.method}`);
    });

    const hostBridge = {
      rpc: {
        request,
        notify: vi.fn(),
        cancel: vi.fn()
      }
    } as unknown as HostBridge;

    const { result } = renderHook(
      () => {
        const store = useAppStore();
        const conversation = useWorkspaceConversation(hostBridge, [], "E:/code/FPGA");
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
  });
});
