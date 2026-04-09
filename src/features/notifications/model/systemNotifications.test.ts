// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/plugin-notification", () => ({
  isPermissionGranted: vi.fn(),
  requestPermission: vi.fn(),
  sendNotification: vi.fn(),
}));

import * as notification from "@tauri-apps/plugin-notification";
import {
  deliverNotification,
  resetSystemNotificationPermissionForTests,
  sendSystemNotification,
} from "./systemNotifications";

describe("sendSystemNotification", () => {
  beforeEach(() => {
    resetSystemNotificationPermissionForTests();
    vi.clearAllMocks();
  });

  it("sends immediately when permission is already granted", async () => {
    vi.mocked(notification.isPermissionGranted).mockResolvedValueOnce(true);

    const sent = await sendSystemNotification("Hello", "World");

    expect(sent).toEqual({ status: "sent" });
    expect(notification.requestPermission).not.toHaveBeenCalled();
    expect(notification.sendNotification).toHaveBeenCalledWith({
      title: "Hello",
      body: "World",
      autoCancel: true,
    });
  });

  it("returns false without sending when permission is denied", async () => {
    vi.mocked(notification.isPermissionGranted).mockResolvedValueOnce(false);
    vi.mocked(notification.requestPermission).mockResolvedValueOnce("denied");

    const sent = await sendSystemNotification("Hello", "World");

    expect(sent).toEqual({ status: "permissionDenied" });
    expect(notification.sendNotification).not.toHaveBeenCalled();
  });

  it("falls back to app notifications when the system path is denied", async () => {
    vi.mocked(notification.isPermissionGranted).mockResolvedValueOnce(false);
    vi.mocked(notification.requestPermission).mockResolvedValueOnce("denied");
    const app = {
      showNotification: vi.fn().mockResolvedValue(undefined),
    } as const;

    const result = await deliverNotification(app as never, "Hello", "World");

    expect(result).toEqual({
      status: "sent",
      via: "app",
      fallbackReason: "permissionDenied",
    });
    expect(app.showNotification).toHaveBeenCalledWith({
      title: "Hello",
      body: "World",
    });
  });
});
