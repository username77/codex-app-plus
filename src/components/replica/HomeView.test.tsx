import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { HostBridge } from "../../bridge/types";
import { HomeView } from "./HomeView";

vi.mock("../terminal/TerminalPanel", () => ({
  TerminalPanel: () => null
}));

function renderHomeView(overrides?: Partial<ComponentProps<typeof HomeView>>) {
  const root = { id: "root-1", name: "FPGA", path: "E:/code/FPGA" };

  return render(
    <HomeView
      hostBridge={{} as HostBridge}
      busy={false}
      inputText=""
      roots={[root]}
      selectedRootId={root.id}
      selectedRootName={root.name}
      selectedRootPath={root.path}
      settingsMenuOpen={false}
      onToggleSettingsMenu={vi.fn()}
      onDismissSettingsMenu={vi.fn()}
      onOpenSettings={vi.fn()}
      onSelectRoot={vi.fn()}
      onInputChange={vi.fn()}
      onCreateThread={vi.fn().mockResolvedValue(undefined)}
      onSendTurn={vi.fn().mockResolvedValue(undefined)}
      onAddRoot={vi.fn()}
      onRemoveRoot={vi.fn()}
      {...overrides}
    />
  );
}

describe("HomeView", () => {
  it("calls remove handler when delete button is clicked", () => {
    const onRemoveRoot = vi.fn();
    const root = { id: "root-1", name: "FPGA", path: "E:/code/FPGA" };

    renderHomeView({ onRemoveRoot, roots: [root], selectedRootId: root.id, selectedRootName: root.name, selectedRootPath: root.path });

    fireEvent.click(screen.getByRole("button", { name: `移除工作区 ${root.name}` }));

    expect(onRemoveRoot).toHaveBeenCalledWith(root.id);
  });

  it("calls send handler when send button is clicked", () => {
    const onSendTurn = vi.fn().mockResolvedValue(undefined);

    renderHomeView({ inputText: "请分析当前工作区", onSendTurn });

    fireEvent.click(screen.getByRole("button", { name: "发送消息" }));

    expect(onSendTurn).toHaveBeenCalledTimes(1);
  });
});
