import { useCallback, useRef, useState } from "react";
import { useToolbarMenuDismissal } from "./useToolbarMenuDismissal";

interface ThreadContextMenuProps {
  readonly x: number;
  readonly y: number;
  readonly onDelete: () => Promise<void>;
  readonly onClose: () => void;
}

export function ThreadContextMenu(props: ThreadContextMenuProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pendingDelete, setPendingDelete] = useState(false);
  const closeOverlay = useCallback(() => {
    if (!pendingDelete) {
      props.onClose();
    }
  }, [pendingDelete, props]);

  const handleDelete = useCallback(async () => {
    if (pendingDelete) {
      return;
    }

    setPendingDelete(true);
    try {
      await props.onDelete();
      props.onClose();
    } catch (error) {
      setPendingDelete(false);
      throw error;
    }
  }, [pendingDelete, props]);

  useToolbarMenuDismissal(true, containerRef, closeOverlay);

  return (
    <div ref={containerRef} className="thread-context-menu" style={{ left: props.x, top: props.y }} role="menu" aria-label="会话操作菜单">
      <button type="button" className="thread-context-menu-item" role="menuitem" onClick={() => void handleDelete()} disabled={pendingDelete}>
        {pendingDelete ? "删除中…" : "删除会话"}
      </button>
    </div>
  );
}
