import { useCallback, useState } from "react";
import {
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  resolveWorkspaceDropTargetIndex,
  type WorkspaceDnDHoverState,
} from "../model/workspaceRootDnd";
import type { WorkspaceRoot } from "../hooks/useWorkspaceRoots";

export interface WorkspaceDnDState {
  readonly sensors: ReturnType<typeof useSensors>;
  readonly activeRootId: string | null;
  readonly activeRoot: WorkspaceRoot | null;
  readonly dropMarkerRootId: string | null;
  readonly handleDragStart: (event: { active: { id: string | number } }) => void;
  readonly handleDragOver: (event: DragOverEvent) => void;
  readonly handleDragMove: (event: DragMoveEvent) => void;
  readonly handleDragEnd: (event: DragEndEvent) => void;
  readonly handleDragCancel: () => void;
}

export function useWorkspaceDnD(
  roots: ReadonlyArray<WorkspaceRoot>,
  onReorderRoots?: (fromIndex: number, toIndex: number) => void,
): WorkspaceDnDState {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [hoverState, setHoverState] = useState<WorkspaceDnDHoverState>({ overId: null, enteredAt: 0 });
  const [dropMarkerRootId, setDropMarkerRootId] = useState<string | null>(null);
  const [activeRootId, setActiveRootId] = useState<string | null>(null);

  const resetDnDState = useCallback(() => {
    setHoverState({ overId: null, enteredAt: 0 });
    setDropMarkerRootId(null);
    setActiveRootId(null);
  }, []);

  const handleDragStart = useCallback((event: { active: { id: string | number } }) => {
    if (typeof event.active.id === "string") {
      setActiveRootId(event.active.id);
      setDropMarkerRootId(event.active.id);
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const overId = event.over?.id;
    if (typeof overId !== "string") {
      return;
    }
    setHoverState((current) => current.overId === overId ? current : ({ overId, enteredAt: Date.now() }));
  }, []);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const overId = event.over?.id;
    if (typeof overId === "string") {
      setDropMarkerRootId(overId);
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (overId === null) {
      resetDnDState();
      return;
    }

    const overRect = event.over?.rect;
    if (!overRect) {
      resetDnDState();
      return;
    }

    const translatedTop = event.active.rect.current.translated?.top;
    const translatedHeight = event.active.rect.current.translated?.height;
    const pointerY = (translatedTop ?? overRect.top) + ((translatedHeight ?? overRect.height) / 2);

    const targetIndex = resolveWorkspaceDropTargetIndex({
      roots,
      activeId,
      overId,
      pointerY,
      overTop: overRect.top,
      overHeight: overRect.height,
      now: Date.now(),
      hoverState,
    });

    const fromIndex = roots.findIndex((root) => root.id === activeId);
    if (fromIndex >= 0 && targetIndex >= 0 && fromIndex !== targetIndex) {
      onReorderRoots?.(fromIndex, targetIndex);
    }

    resetDnDState();
  }, [hoverState, onReorderRoots, resetDnDState, roots]);

  const activeRoot = activeRootId !== null
    ? roots.find((root) => root.id === activeRootId) ?? null
    : null;

  return {
    sensors,
    activeRootId,
    activeRoot,
    dropMarkerRootId,
    handleDragStart,
    handleDragOver,
    handleDragMove,
    handleDragEnd,
    handleDragCancel: resetDnDState,
  };
}
