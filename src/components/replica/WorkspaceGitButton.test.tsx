import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { GitStatusOutput } from "../../bridge/types";
import type { WorkspaceGitController } from "./git/types";
import { WorkspaceGitButton } from "./WorkspaceGitButton";

const status: GitStatusOutput = {
  isRepository: true,
  repoRoot: "E:/code/project",
  branch: { head: "main", upstream: "origin/main", ahead: 0, behind: 0, detached: false },
  remoteName: "origin",
  remoteUrl: "https://example.com/repo.git",
  branches: [{ name: "main", upstream: "origin/main", isCurrent: true }],
  staged: [],
  unstaged: [],
  untracked: [],
  conflicted: [],
  isClean: true
};

function createController(overrides?: Partial<WorkspaceGitController>): WorkspaceGitController {
  return {
    loading: false,
    pendingAction: null,
    status,
    statusLoaded: true,
    hasRepository: true,
    error: null,
    notice: null,
    commitMessage: "",
    selectedBranch: "main",
    newBranchName: "",
    diff: null,
    diffCache: {},
    diffTarget: null,
    loadingDiffKeys: [],
    refresh: vi.fn().mockResolvedValue(undefined),
    initRepository: vi.fn().mockResolvedValue(undefined),
    fetch: vi.fn().mockResolvedValue(undefined),
    pull: vi.fn().mockResolvedValue(undefined),
    push: vi.fn().mockResolvedValue(undefined),
    stagePaths: vi.fn().mockResolvedValue(undefined),
    unstagePaths: vi.fn().mockResolvedValue(undefined),
    discardPaths: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue(undefined),
    checkoutSelectedBranch: vi.fn().mockResolvedValue(undefined),
    createBranch: vi.fn().mockResolvedValue(undefined),
    ensureDiff: vi.fn().mockResolvedValue(undefined),
    selectDiff: vi.fn().mockResolvedValue(undefined),
    clearDiff: vi.fn(),
    setCommitMessage: vi.fn(),
    setSelectedBranch: vi.fn(),
    setNewBranchName: vi.fn(),
    ...overrides
  };
}

vi.mock("./git/WorkspaceGitView", () => ({
  WorkspaceGitView: () => <div>git-workspace-view</div>
}));

function renderButton(overrides?: Partial<ComponentProps<typeof WorkspaceGitButton>>) {
  return render(
    <WorkspaceGitButton
      controller={createController()}
      selectedRootName="codex-app-plus"
      selectedRootPath="E:/code/project"
      {...overrides}
    />
  );
}

describe("WorkspaceGitButton", () => {
  it("disables actions when no workspace is selected", () => {
    renderButton({ selectedRootPath: null });

    expect(screen.getByRole("button", { name: "推送当前工作区" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "选择 Git 操作" })).toBeDisabled();
  });

  it("shows git quick actions from dropdown", () => {
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: "选择 Git 操作" }));

    expect(screen.getByRole("menu", { name: "Git 操作" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "推送" })).toBeEnabled();
    expect(screen.getByRole("menuitem", { name: "拉取" })).toBeEnabled();
    expect(screen.getByRole("menuitem", { name: "抓取" })).toBeEnabled();
    expect(screen.getByRole("menuitem", { name: "打开 Git 工作台" })).toBeEnabled();
  });

  it("opens git workspace dialog from dropdown", () => {
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: "选择 Git 操作" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "打开 Git 工作台" }));

    expect(screen.getByRole("dialog", { name: "Git 工作台" })).toBeInTheDocument();
    expect(screen.getByText("git-workspace-view")).toBeInTheDocument();
  });
});
