import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { GitDiffOutput, GitStatusOutput } from "../../../bridge/types";
import type { WorkspaceGitController } from "./types";
import { WorkspaceDiffSidebar } from "./WorkspaceDiffSidebar";

function createStatus(overrides?: Partial<GitStatusOutput>): GitStatusOutput {
  return {
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
    isClean: true,
    ...overrides
  };
}

function createDiff(overrides?: Partial<GitDiffOutput>): GitDiffOutput {
  return {
    path: "src/App.tsx",
    staged: false,
    diff: "@@ -1 +1 @@\n-console.log('old')\n+console.log('new')",
    ...overrides
  };
}

function createController(overrides?: Partial<WorkspaceGitController>): WorkspaceGitController {
  return {
    loading: false,
    pendingAction: null,
    status: createStatus(),
    statusLoaded: true,
    hasRepository: true,
    error: null,
    notice: null,
    commitMessage: "",
    selectedBranch: "main",
    newBranchName: "",
    diff: null,
    diffTarget: null,
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
    selectDiff: vi.fn().mockResolvedValue(undefined),
    clearDiff: vi.fn(),
    setCommitMessage: vi.fn(),
    setSelectedBranch: vi.fn(),
    setNewBranchName: vi.fn(),
    ...overrides
  };
}

function renderSidebar(controller: WorkspaceGitController) {
  return render(
    <WorkspaceDiffSidebar
      open
      selectedRootName="codex-app-plus"
      selectedRootPath="E:/code/project"
      controller={controller}
      onClose={vi.fn()}
    />
  );
}

describe("WorkspaceDiffSidebar", () => {
  it("shows loading state while reading git status", () => {
    renderSidebar(createController({ loading: true, status: null, statusLoaded: false }));

    expect(screen.getByText("正在读取 Git 状态")).toBeInTheDocument();
  });

  it("shows non-repository state", () => {
    renderSidebar(createController({ status: createStatus({ isRepository: false, repoRoot: null }), hasRepository: false }));

    expect(screen.getByText("当前工作区还不是 Git 仓库")).toBeInTheDocument();
  });

  it("renders compact scope selector", () => {
    renderSidebar(createController({ status: createStatus({ unstaged: [{ path: "src/App.tsx", originalPath: null, indexStatus: " ", worktreeStatus: "M" }] }) }));

    expect(screen.getByRole("button", { name: "选择差异分组" })).toHaveTextContent("未暂存");
    expect(screen.getByRole("button", { name: "选择差异分组" })).toHaveTextContent("1");
  });

  it("renders empty diff preview when repository has no changes", () => {
    const controller = createController({ status: createStatus() });
    renderSidebar(controller);

    expect(screen.getByText("当前还没有选择任何文件。")).toBeInTheDocument();
    expect(controller.selectDiff).not.toHaveBeenCalled();
  });

  it("renders selected diff content", () => {
    renderSidebar(
      createController({
        status: createStatus({ unstaged: [{ path: "src/App.tsx", originalPath: null, indexStatus: " ", worktreeStatus: "M" }] }),
        diff: createDiff(),
        diffTarget: { path: "src/App.tsx", staged: false }
      })
    );

    expect(screen.getByText(/console\.log\('new'\)/)).toBeInTheDocument();
  });

  it("auto selects the first diff when sidebar opens", async () => {
    const controller = createController({
      status: createStatus({ unstaged: [{ path: "src/App.tsx", originalPath: null, indexStatus: " ", worktreeStatus: "M" }] })
    });

    renderSidebar(controller);

    await waitFor(() => expect(controller.selectDiff).toHaveBeenCalledWith("src/App.tsx", false));
  });

  it("switches scope from dropdown menu", () => {
    renderSidebar(
      createController({
        status: createStatus({ staged: [{ path: "src/App.tsx", originalPath: null, indexStatus: "M", worktreeStatus: " " }] })
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "选择差异分组" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /已暂存/ }));

    expect(screen.getByRole("button", { name: "选择差异分组" })).toHaveTextContent("已暂存");
  });

  it("calls selectDiff when user clicks file action", () => {
    const controller = createController({
      status: createStatus({ unstaged: [{ path: "src/App.tsx", originalPath: null, indexStatus: " ", worktreeStatus: "M" }] }),
      diffTarget: { path: "src/App.tsx", staged: false }
    });

    renderSidebar(controller);
    fireEvent.click(screen.getByRole("button", { name: "查看差异" }));

    expect(controller.selectDiff).toHaveBeenCalledWith("src/App.tsx", false);
  });
});
