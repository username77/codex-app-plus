import { useCallback, useRef, useState } from "react";
import { useToolbarMenuDismissal } from "../../shared/hooks/useToolbarMenuDismissal";

interface WorkspaceRootMenuProps {
  readonly rootName: string;
  readonly x: number;
  readonly y: number;
  readonly onClose: () => void;
  readonly onRemove: () => void | Promise<void>;
}

export function WorkspaceRootMenu(props: WorkspaceRootMenuProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);

  const closeOverlay = useCallback(() => {
    if (!pending) {
      props.onClose();
    }
  }, [pending, props]);

  const handleRemove = useCallback(async () => {
    if (pending) {
      return;
    }
    setPending(true);
    try {
      await props.onRemove();
      props.onClose();
    } catch (error) {
      setPending(false);
      throw error;
    }
  }, [pending, props]);

  useToolbarMenuDismissal(true, containerRef, closeOverlay);

  return (
    <div ref={containerRef} className="thread-context-menu workspace-root-menu" style={{ left: props.x, top: props.y }} role="menu" aria-label={`工作区 ${props.rootName} 更多操作`}>
      <button type="button" className="thread-context-menu-item thread-context-menu-item-danger" role="menuitem" onClick={() => void handleRemove()} disabled={pending}>
        {pending ? "移除中..." : "移除"}
      </button>
    </div>
  );
}
