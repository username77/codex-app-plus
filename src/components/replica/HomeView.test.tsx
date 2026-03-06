import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { HostBridge } from "../../bridge/types";
import { HomeView } from "./HomeView";

vi.mock("../terminal/TerminalPanel", () => ({
  TerminalPanel: () => null
}));

describe("HomeView", () => {
  it("calls remove handler when delete button is clicked", () => {
    const onRemoveRoot = vi.fn();
    const root = { id: "root-1", name: "FPGA", path: "E:/code/FPGA" };

    render(
      <HomeView
        hostBridge={{} as HostBridge}
        roots={[root]}
        selectedRootId={root.id}
        selectedRootName={root.name}
        selectedRootPath={root.path}
        settingsMenuOpen={false}
        onToggleSettingsMenu={vi.fn()}
        onDismissSettingsMenu={vi.fn()}
        onOpenSettings={vi.fn()}
        onSelectRoot={vi.fn()}
        onAddRoot={vi.fn()}
        onRemoveRoot={onRemoveRoot}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: `删除项目 ${root.name}` }));

    expect(onRemoveRoot).toHaveBeenCalledWith(root.id);
  });
});