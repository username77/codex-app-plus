import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceGitButton } from "./WorkspaceGitButton";

describe("WorkspaceGitButton", () => {
  it("disables push actions when no workspace is selected", () => {
    render(<WorkspaceGitButton selectedRootPath={null} />);

    expect(screen.getByRole("button", { name: "推送当前工作区" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "选择 Git 操作" })).toBeDisabled();
  });

  it("shows the git operation menu from the dropdown", () => {
    render(<WorkspaceGitButton selectedRootPath="E:/code/project" />);

    fireEvent.click(screen.getByRole("button", { name: "选择 Git 操作" }));

    expect(screen.getByRole("menu", { name: "Git 操作" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "推送当前工作区" })).toBeEnabled();
    expect(screen.getByRole("menuitem", { name: "提交" })).toBeDisabled();
    expect(screen.getByRole("menuitem", { name: "创建拉取请求" })).toBeDisabled();
  });

  it("surfaces an explicit alert when push is clicked", () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);

    render(<WorkspaceGitButton selectedRootPath="E:/code/project" />);
    fireEvent.click(screen.getByRole("button", { name: "推送当前工作区" }));

    expect(alertSpy).toHaveBeenCalledWith("Git 推送功能暂未接入。");
  });
});
