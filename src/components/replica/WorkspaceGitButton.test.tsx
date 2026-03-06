import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceGitButton } from "./WorkspaceGitButton";

function renderButton(overrides?: Partial<ComponentProps<typeof WorkspaceGitButton>>) {
  return render(
    <WorkspaceGitButton
      selectedRootPath="E:/code/project"
      statusLoaded
      hasRepository
      loading={false}
      pendingAction={null}
      onOpenPanel={vi.fn()}
      onInit={vi.fn().mockResolvedValue(undefined)}
      onFetch={vi.fn().mockResolvedValue(undefined)}
      onPull={vi.fn().mockResolvedValue(undefined)}
      onPush={vi.fn().mockResolvedValue(undefined)}
      onRefresh={vi.fn().mockResolvedValue(undefined)}
      {...overrides}
    />
  );
}

describe("WorkspaceGitButton", () => {
  it("disables git actions when no workspace is selected", () => {
    renderButton({ selectedRootPath: null, statusLoaded: false, hasRepository: false });

    expect(screen.getByRole("button", { name: "Git当前工作区" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "选择 Git 操作" })).toBeDisabled();
  });

  it("shows repository quick actions from the dropdown", () => {
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: "选择 Git 操作" }));

    expect(screen.getByRole("menu", { name: "Git 操作" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Git当前工作区" })).toBeEnabled();
    expect(screen.getByRole("menuitem", { name: "推送" })).toBeEnabled();
    expect(screen.getByRole("menuitem", { name: "拉取" })).toBeEnabled();
    expect(screen.getByRole("menuitem", { name: "抓取" })).toBeEnabled();
  });

  it("opens panel from main button", () => {
    const onOpenPanel = vi.fn();

    renderButton({ onOpenPanel });
    fireEvent.click(screen.getByRole("button", { name: "Git当前工作区" }));

    expect(onOpenPanel).toHaveBeenCalledTimes(1);
  });
});
