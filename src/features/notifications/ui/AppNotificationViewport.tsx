import { useCallback, useEffect, useRef, useState } from "react";
import type { HostBridge, ShowNotificationInput } from "../../../bridge/types";
import "../../../styles/replica/replica-app-notifications.css";

const AUTO_DISMISS_MS = 5_000;
const MAX_VISIBLE_NOTIFICATIONS = 4;

interface AppNotificationViewportProps {
  readonly hostBridge: Pick<HostBridge, "subscribe">;
  readonly autoDismissMs?: number;
}

interface AppNotificationCard extends ShowNotificationInput {
  readonly id: string;
}

function createNotificationId(): string {
  return `app-notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AppNotificationViewport({
  hostBridge,
  autoDismissMs = AUTO_DISMISS_MS,
}: AppNotificationViewportProps): JSX.Element | null {
  const [notifications, setNotifications] = useState<ReadonlyArray<AppNotificationCard>>([]);
  const timersRef = useRef(new Map<string, number>());

  const dismissNotification = useCallback((notificationId: string) => {
    const timer = timersRef.current.get(notificationId);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(notificationId);
    }
    setNotifications((current) =>
      current.filter((notification) => notification.id !== notificationId),
    );
  }, []);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | null = null;

    void hostBridge
      .subscribe("app-notification-requested", (payload) => {
        const notificationId = createNotificationId();
        setNotifications((current) => {
          const next = [{ ...payload, id: notificationId }, ...current];
          return next.slice(0, MAX_VISIBLE_NOTIFICATIONS);
        });
        const timer = window.setTimeout(() => {
          dismissNotification(notificationId);
        }, autoDismissMs);
        timersRef.current.set(notificationId, timer);
      })
      .then((nextUnlisten) => {
        if (disposed) {
          nextUnlisten();
          return;
        }
        unlisten = nextUnlisten;
      })
      .catch((error) => {
        console.error("订阅应用内通知事件失败", error);
      });

    return () => {
      disposed = true;
      unlisten?.();
      for (const timer of timersRef.current.values()) {
        window.clearTimeout(timer);
      }
      timersRef.current.clear();
    };
  }, [autoDismissMs, dismissNotification, hostBridge]);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <section className="app-notification-viewport" aria-label="应用通知" role="region">
      {notifications.map((notification) => (
        <article className="app-notification-card" key={notification.id} role="status">
          <div className="app-notification-copy">
            <strong className="app-notification-title">{notification.title}</strong>
            {notification.body.trim() ? (
              <p className="app-notification-body">{notification.body}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="app-notification-dismiss"
            aria-label={`关闭通知：${notification.title}`}
            onClick={() => dismissNotification(notification.id)}
          >
            ×
          </button>
        </article>
      ))}
    </section>
  );
}
