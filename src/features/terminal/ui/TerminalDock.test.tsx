import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TerminalDock } from "./TerminalDock";

describe("TerminalDock", () => {
  it("hides the panel without closing tabs when the panel close button is clicked", () => {
    const onCloseTab = vi.fn();
    const onHidePanel = vi.fn();

    render(
      <TerminalDock
        activeTabId="terminal-1"
        hasWorkspace={true}
        isOpen={true}
        onCloseTab={onCloseTab}
        onCreateTab={vi.fn()}
        onHidePanel={onHidePanel}
        onSelectTab={vi.fn()}
        tabs={[{ id: "terminal-1", title: "Terminal 1" }]}
      >
        <div>terminal body</div>
      </TerminalDock>,
    );

    fireEvent.click(screen.getByRole("button", { name: "隐藏终端" }));

    expect(onHidePanel).toHaveBeenCalledTimes(1);
    expect(onCloseTab).not.toHaveBeenCalled();
  });
});
