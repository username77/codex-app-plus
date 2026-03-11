import { useCallback, useRef, useState, type RefObject } from "react";
import type { ThreadSummary } from "../../domain/types";
import { useToolbarMenuDismissal } from "./useToolbarMenuDismissal";

interface ThreadContextMenuProps {
  readonly thread: ThreadSummary;
  readonly x: number;
  readonly y: number;
  readonly onDelete: () => Promise<void>;
  readonly onClose: () => void;
}

interface DeleteThreadDialogProps {
  readonly containerRef: RefObject<HTMLDivElement>;
  readonly title: string;
  readonly pending: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

function DeleteThreadDialog(props: DeleteThreadDialogProps): JSX.Element {
  return (
    <div className="settings-dialog-backdrop" role="presentation" onClick={props.onCancel}>
      <div ref={props.containerRef} className="settings-dialog mcp-confirm-dialog" role="dialog" aria-modal="true" aria-label="删除会话" onClick={(event) => event.stopPropagation()}>
        <header className="settings-dialog-header">
          <strong>删除会话</strong>
          <button type="button" className="settings-dialog-close" onClick={props.onCancel} aria-label="关闭" disabled={props.pending}>×</button>
        </header>
        <div className="settings-dialog-body mcp-confirm-body">
          <p>确定删除会话“{props.title}”吗？删除后会从本地历史记录中永久移除。</p>
          <div className="mcp-form-actions">
            <button type="button" className="settings-action-btn" onClick={props.onCancel} disabled={props.pending}>取消</button>
            <button type="button" className="settings-action-btn settings-action-btn-primary" onClick={props.onConfirm} disabled={props.pending}>{props.pending ? "删除中…" : "确认删除"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ThreadContextMenu(props: ThreadContextMenuProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const title = props.thread.title.trim() || "未命名会话";
  const closeOverlay = useCallback(() => {
    if (!pendingDelete) {
      props.onClose();
    }
  }, [pendingDelete, props]);
  const handleDelete = useCallback(async () => {
    setPendingDelete(true);
    try {
      await props.onDelete();
      setPendingDelete(false);
      props.onClose();
    } catch (error) {
      setPendingDelete(false);
      throw error;
    }
  }, [props]);

  useToolbarMenuDismissal(true, containerRef, closeOverlay);

  if (confirmingDelete) {
    return <DeleteThreadDialog containerRef={containerRef} title={title} pending={pendingDelete} onCancel={closeOverlay} onConfirm={() => void handleDelete()} />;
  }

  return <div ref={containerRef} className="thread-context-menu" style={{ left: props.x, top: props.y }} role="menu" aria-label="会话操作菜单"><button type="button" className="thread-context-menu-item" role="menuitem" onClick={() => setConfirmingDelete(true)}>删除会话</button></div>;
}
