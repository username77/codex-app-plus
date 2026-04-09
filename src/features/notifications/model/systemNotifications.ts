import type { HostBridge } from "../../../bridge/types";

type SendNotificationModule = typeof import("@tauri-apps/plugin-notification");
type AppBridge = Pick<HostBridge, "app">["app"];

let notificationPermissionGranted: boolean | null = null;

export type SystemNotificationResult =
  | { readonly status: "sent" }
  | { readonly status: "permissionDenied" }
  | { readonly status: "pluginFailed"; readonly error: unknown };

export type NotificationDeliveryResult =
  | { readonly status: "sent"; readonly via: "system" }
  | {
      readonly status: "sent";
      readonly via: "app";
      readonly fallbackReason: Exclude<SystemNotificationResult["status"], "sent">;
    }
  | {
      readonly status: "failed";
      readonly reason: Exclude<SystemNotificationResult["status"], "sent"> | "appFallbackFailed";
      readonly error: unknown;
    };

async function resolveNotificationPermission(
  notification: SendNotificationModule,
): Promise<boolean> {
  if (notificationPermissionGranted === true) {
    return true;
  }

  let permissionGranted =
    notificationPermissionGranted ??
    (await notification.isPermissionGranted());

  if (!permissionGranted) {
    const permission = await notification.requestPermission();
    permissionGranted = permission === "granted";
  }

  notificationPermissionGranted = permissionGranted;
  return permissionGranted;
}

export function resetSystemNotificationPermissionForTests(): void {
  notificationPermissionGranted = null;
}

export async function sendSystemNotification(
  title: string,
  body: string,
): Promise<SystemNotificationResult> {
  try {
    const notification = await import("@tauri-apps/plugin-notification");
    const permissionGranted = await resolveNotificationPermission(notification);
    if (!permissionGranted) {
      return { status: "permissionDenied" };
    }

    await notification.sendNotification({
      title,
      body,
      autoCancel: true,
    });
    return { status: "sent" };
  } catch (error) {
    return { status: "pluginFailed", error };
  }
}

export async function deliverNotification(
  app: AppBridge,
  title: string,
  body: string,
): Promise<NotificationDeliveryResult> {
  const systemResult = await sendSystemNotification(title, body);
  if (systemResult.status === "sent") {
    return { status: "sent", via: "system" };
  }

  try {
    await app.showNotification({ title, body });
    return {
      status: "sent",
      via: "app",
      fallbackReason: systemResult.status,
    };
  } catch (error) {
    return {
      status: "failed",
      reason: "appFallbackFailed",
      error,
    };
  }
}
