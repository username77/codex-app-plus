import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { HostBridge } from "../../bridge/types";
import type { ThreadSummary } from "../../domain/types";
import { AppStoreProvider } from "../../state/store";
import { HomeSidebar } from "./HomeSidebar";

const ROOT = { id: "root-1", name: "FPGA", path: "E:/code/FPGA" };

function createThread(source: ThreadSummary["source"]): ThreadSummary {
  return {
    id: `thread-${source}`,
    title: `线程 ${source}`,
    branch: null,
    cwd: ROOT.path,
    archived: false,
    updatedAt: "2026-03-12T10:00:00.000Z",
    source,
    status: source === "rpc" ? "idle" : "notLoaded",
    activeFlags: [],
    queuedCount: 0
  };
}

function renderSidebar(thread: ThreadSummary, options?: { readonly onArchiveThread?: (threadId: string) => Promise<void>; readonly deleteCodexSession?: ReturnType<typeof vi.fn> }) {
  const onArchiveThread = options?.onArchiveThread ?? vi.fn().mockResolvedValue(undefined);
  const deleteCodexSession = options?.deleteCodexSession ?? vi.fn().mockResolvedValue(undefined);
  const hostBridge = { app: { deleteCodexSession } } as unknown as HostBridge;

  function Harness(): JSX.Element {
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(thread.id);

    return (
      <AppStoreProvider>
        <div data-testid="selected-thread">{selectedThreadId ?? "none"}</div>
        <HomeSidebar
          hostBridge={hostBridge}
          roots={[ROOT]}
          codexSessions={[thread]}
          codexSessionsLoading={false}
          codexSessionsError={null}
          selectedRootId={ROOT.id}
          selectedThreadId={selectedThreadId}
          authStatus="authenticated"
          authMode="apikey"
          authBusy={false}
          authLoginPending={false}
          settingsMenuOpen={false}
          collapsed={false}
          onToggleSettingsMenu={vi.fn()}
          onDismissSettingsMenu={vi.fn()}
          onOpenSettings={vi.fn()}
          onLogin={vi.fn().mockResolvedValue(undefined)}
          onLogout={vi.fn().mockResolvedValue(undefined)}
          onSelectRoot={vi.fn()}
          onSelectThread={setSelectedThreadId}
          onCreateThread={vi.fn().mockResolvedValue(undefined)}
          onArchiveThread={onArchiveThread}
          onAddRoot={vi.fn()}
          onRemoveRoot={vi.fn()}
        />
      </AppStoreProvider>
    );
  }

  render(<Harness />);
  return { onArchiveThread, deleteCodexSession };
}

describe("HomeSidebar", () => {
  it("clears the current selection after archiving the selected thread", async () => {
    const thread = createThread("rpc");
    const { onArchiveThread } = renderSidebar(thread);

    fireEvent.click(screen.getByText("FPGA"));
    fireEvent.contextMenu(screen.getByRole("button", { name: /线程 rpc/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "归档会话" }));

    await waitFor(() => expect(onArchiveThread).toHaveBeenCalledWith(thread.id));
    await waitFor(() => expect(screen.getByTestId("selected-thread")).toHaveTextContent("none"));
  });

  it("keeps delete behavior clearing the selected thread", async () => {
    const thread = createThread("codexData");
    const { deleteCodexSession } = renderSidebar(thread);

    fireEvent.click(screen.getByText("FPGA"));
    fireEvent.contextMenu(screen.getByRole("button", { name: /线程 codexData/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "删除会话" }));

    await waitFor(() => expect(deleteCodexSession).toHaveBeenCalledWith({ threadId: thread.id }));
    await waitFor(() => expect(screen.getByTestId("selected-thread")).toHaveTextContent("none"));
  });
});