import { describe, expect, it, vi } from "vitest";
import type { AppAction } from "../domain/types";
import { applyAppServerNotification } from "./appControllerNotifications";
import { FrameTextDeltaQueue } from "./frameTextDeltaQueue";
import { OutputDeltaQueue } from "./outputDeltaQueue";

function createThread(overrides: Record<string, unknown> = {}) {
  return {
    id: "thread-1",
    preview: "Inspect workspace",
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
    turns: [],
    ...overrides,
  };
}

function createContext(dispatch: (action: AppAction) => void) {
  return {
    dispatch,
    textDeltaQueue: new FrameTextDeltaQueue({ onFlush: () => undefined }),
    outputDeltaQueue: new OutputDeltaQueue({ onFlush: () => undefined }),
  };
}

describe("applyAppServerNotification", () => {
  it("marks thread/started conversations as resumed", () => {
    const dispatch = vi.fn<(action: AppAction) => void>();

    applyAppServerNotification(createContext(dispatch), "thread/started", { thread: createThread() });

    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: "conversation/upserted",
      conversation: expect.objectContaining({
        id: "thread-1",
        resumeState: "resumed",
      }),
    }));
  });

  it("records windows sandbox setup completion", () => {
    const dispatch = vi.fn<(action: AppAction) => void>();

    applyAppServerNotification(createContext(dispatch), "windowsSandbox/setupCompleted", {
      mode: "unelevated",
      success: false,
      error: "setup failed",
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: "windowsSandbox/setupCompleted",
      mode: "unelevated",
      success: false,
      error: "setup failed",
    });
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: "banner/pushed",
      banner: expect.objectContaining({
        source: "windows-sandbox",
        level: "error",
      }),
    }));
  });
});
