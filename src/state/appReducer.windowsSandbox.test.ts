import { describe, expect, it } from "vitest";
import { createInitialState } from "./appReducer";
import { appReducer } from "./appReducer";

describe("appReducer windows sandbox lifecycle", () => {
  it("clears transient setup state on explicit cleanup", () => {
    const started = appReducer(createInitialState(), { type: "windowsSandbox/setupStarted", mode: "unelevated" });
    const completed = appReducer(started, { type: "windowsSandbox/setupCompleted", mode: "unelevated", success: true, error: null });

    const cleared = appReducer(completed, { type: "windowsSandbox/setupCleared" });

    expect(cleared.windowsSandboxSetup).toEqual(createInitialState().windowsSandboxSetup);
  });

  it("clears transient setup state when connection leaves connected", () => {
    const started = appReducer(createInitialState(), { type: "windowsSandbox/setupStarted", mode: "elevated" });

    const disconnected = appReducer(started, { type: "connection/changed", status: "disconnected" });

    expect(disconnected.windowsSandboxSetup).toEqual(createInitialState().windowsSandboxSetup);
  });
});
