// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppNotificationViewport } from "./AppNotificationViewport";

describe("AppNotificationViewport", () => {
  it("renders notifications emitted through app-notification-requested and auto dismisses them", async () => {
    vi.useFakeTimers();
    let handler: ((payload: { title: string; body: string }) => void) | null = null;
    const hostBridge = {
      subscribe: vi.fn().mockImplementation(async (_eventName, nextHandler) => {
        handler = nextHandler;
        return () => undefined;
      }),
    };

    render(
      <AppNotificationViewport
        autoDismissMs={1000}
        hostBridge={hostBridge as never}
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      handler?.({ title: "Fallback", body: "Shown in app" });
    });

    expect(screen.getByText("Fallback")).toBeInTheDocument();
    expect(screen.getByText("Shown in app")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.queryByText("Fallback")).toBeNull();
    vi.useRealTimers();
  });
});
