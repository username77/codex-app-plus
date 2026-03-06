import { useState, type ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ComposerModelOption } from "../../app/composerPreferences";
import type { HostBridge } from "../../bridge/types";
import type { WorkspaceGitController } from "./git/types";
import { HomeView } from "./HomeView";

const { mockedUseWorkspaceGit } = vi.hoisted(() => ({
  mockedUseWorkspaceGit: vi.fn()
}));

vi.mock("../terminal/TerminalPanel", () => ({
  TerminalPanel: () => null
}));

vi.mock("./git/useWorkspaceGit", () => ({
  useWorkspaceGit: mockedUseWorkspaceGit
}));

vi.mock("./git/WorkspaceGitView", () => ({
  WorkspaceGitView: () => null
}));

const MODELS: ReadonlyArray<ComposerModelOption> = [
  {
    id: "model-1",
    value: "gpt-5.2",
    label: "GPT-5.2",
    defaultEffort: "xhigh",
    supportedEfforts: ["minimal", "low", "medium", "high", "xhigh"],
    isDefault: true
  },
  {
    id: "model-2",
    value: "gpt-5.3-codex",
    label: "GPT-5.3-Codex",
    defaultEffort: "high",
    supportedEfforts: ["minimal", "low", "medium", "high", "xhigh"],
    isDefault: false
  }
];

function createController(overrides?: Partial<WorkspaceGitController>): WorkspaceGitController {
  return {
    loading: false,
    pendingAction: null,
    status: null,
    statusLoaded: false,
    hasRepository: false,
    error: null,
    notice: null,
    commitMessage: "",
    selectedBranch: "",
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

function renderHomeView(overrides?: Partial<ComponentProps<typeof HomeView>>) {
  mockedUseWorkspaceGit.mockReturnValue(createController());
  const root = { id: "root-1", name: "FPGA", path: "E:/code/FPGA" };
  const thread = {
    id: "thread-1",
    title: "First thread",
    cwd: root.path,
    archived: false,
    updatedAt: "2026-03-06T09:00:00.000Z"
  };

  return render(
    <HomeView
      hostBridge={{} as HostBridge}
      busy={false}
      inputText=""
      roots={[root]}
      selectedRootId={root.id}
      selectedRootName={root.name}
      selectedRootPath={root.path}
      threads={[thread]}
      selectedThreadId={thread.id}
      messages={[]}
      models={MODELS}
      defaultModel="gpt-5.2"
      defaultEffort="xhigh"
      pendingServerRequests={[]}
      connectionStatus="connected"
      fatalError={null}
      authStatus="authenticated"
      authMode="chatgpt"
      retryScheduledAt={null}
      settingsMenuOpen={false}
      onToggleSettingsMenu={vi.fn()}
      onDismissSettingsMenu={vi.fn()}
      onOpenSettings={vi.fn()}
      onSelectRoot={vi.fn()}
      onSelectThread={vi.fn()}
      onInputChange={vi.fn()}
      onCreateThread={vi.fn().mockResolvedValue(undefined)}
      onSendTurn={vi.fn().mockResolvedValue(undefined)}
      onAddRoot={vi.fn()}
      onRemoveRoot={vi.fn()}
      onRetryConnection={vi.fn().mockResolvedValue(undefined)}
      onLogin={vi.fn().mockResolvedValue(undefined)}
      onApproveRequest={vi.fn().mockResolvedValue(undefined)}
      onRejectRequest={vi.fn().mockResolvedValue(undefined)}
      {...overrides}
    />
  );
}

describe("HomeView", () => {
  it("toggles terminal button label through icon button", () => {
    renderHomeView();

    fireEvent.click(screen.getByRole("button", { name: "隐藏终端" }));

    expect(screen.getByRole("button", { name: "显示终端" })).toHaveAttribute("aria-pressed", "false");
  });

  it("toggles diff sidebar from toolbar", () => {
    renderHomeView();

    fireEvent.click(screen.getByRole("button", { name: "显示差异侧栏" }));

    expect(screen.getByRole("button", { name: "隐藏差异侧栏" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("工作区差异侧栏")).toBeInTheDocument();
  });

  it("disables diff button when no workspace is selected", () => {
    renderHomeView({ roots: [], selectedRootId: null, selectedRootName: "选择工作区", selectedRootPath: null, threads: [], selectedThreadId: null });

    expect(screen.getByRole("button", { name: "显示差异侧栏" })).toBeDisabled();
  });

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

    expect(onSendTurn).toHaveBeenCalledWith({ model: "gpt-5.2", effort: "xhigh" });
  });

  it("updates model and effort from the composer popovers", () => {
    const onSendTurn = vi.fn().mockResolvedValue(undefined);

    renderHomeView({ inputText: "请分析当前工作区", onSendTurn });

    fireEvent.click(screen.getByRole("button", { name: "选择模型：GPT-5.2" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "GPT-5.3-Codex" }));
    fireEvent.click(screen.getByRole("button", { name: "选择思考强度：超高" }));
    expect(screen.getByRole("menuitemradio", { name: "极低" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitemradio", { name: "中" }));
    fireEvent.click(screen.getByRole("button", { name: "发送消息" }));

    expect(onSendTurn).toHaveBeenCalledWith({ model: "gpt-5.3-codex", effort: "medium" });
  });
  it("shows sessions for the selected workspace in the sidebar", () => {
    const firstRoot = { id: "root-1", name: "FPGA", path: "E:/code/FPGA" };
    const secondRoot = { id: "root-2", name: "Codex", path: "E:/code/codex" };
    const firstThread = {
      id: "thread-1",
      title: "First thread",
      cwd: firstRoot.path,
      archived: false,
      updatedAt: "2026-03-06T09:00:00.000Z"
    };
    const secondThread = {
      id: "thread-2",
      title: "Second thread",
      cwd: secondRoot.path,
      archived: false,
      updatedAt: "2026-03-06T10:00:00.000Z"
    };

    renderHomeView({
      roots: [firstRoot, secondRoot],
      selectedRootId: firstRoot.id,
      selectedRootName: firstRoot.name,
      selectedRootPath: firstRoot.path,
      threads: [firstThread, secondThread],
      selectedThreadId: firstThread.id
    });

    expect(screen.getByText("First thread")).toBeInTheDocument();
    expect(screen.queryByText("Second thread")).not.toBeInTheDocument();
  });

  it("shows empty session state for a selected workspace without sessions", () => {
    const root = { id: "root-1", name: "Empty", path: "E:/code/empty" };

    renderHomeView({
      roots: [root],
      selectedRootId: root.id,
      selectedRootName: root.name,
      selectedRootPath: root.path,
      threads: [],
      selectedThreadId: null
    });

    expect(screen.getByText("暂无会话")).toBeInTheDocument();
  });

  it("switches workspace and reveals its sessions", () => {
    const firstRoot = { id: "root-1", name: "FPGA", path: "E:/code/FPGA" };
    const secondRoot = { id: "root-2", name: "Codex", path: "E:/code/codex" };
    const threads = [
      {
        id: "thread-1",
        title: "First thread",
        cwd: firstRoot.path,
        archived: false,
        updatedAt: "2026-03-06T09:00:00.000Z"
      },
      {
        id: "thread-2",
        title: "Second thread",
        cwd: secondRoot.path,
        archived: false,
        updatedAt: "2026-03-06T10:00:00.000Z"
      }
    ];

    function Harness(): JSX.Element {
      const [selectedRootId, setSelectedRootId] = useState(firstRoot.id);
      const selectedRoot = selectedRootId === firstRoot.id ? firstRoot : secondRoot;
      const selectedThreadId = selectedRootId === firstRoot.id ? "thread-1" : "thread-2";
      return (
        <HomeView
          hostBridge={{} as HostBridge}
          busy={false}
          inputText=""
          roots={[firstRoot, secondRoot]}
          selectedRootId={selectedRoot.id}
          selectedRootName={selectedRoot.name}
          selectedRootPath={selectedRoot.path}
          threads={threads}
          selectedThreadId={selectedThreadId}
          messages={[]}
          models={MODELS}
          defaultModel="gpt-5.2"
          defaultEffort="xhigh"
          pendingServerRequests={[]}
          connectionStatus="connected"
          fatalError={null}
          authStatus="authenticated"
          authMode="chatgpt"
          retryScheduledAt={null}
          settingsMenuOpen={false}
          onToggleSettingsMenu={vi.fn()}
          onDismissSettingsMenu={vi.fn()}
          onOpenSettings={vi.fn()}
          onSelectRoot={setSelectedRootId}
          onSelectThread={vi.fn()}
          onInputChange={vi.fn()}
          onCreateThread={vi.fn().mockResolvedValue(undefined)}
          onSendTurn={vi.fn().mockResolvedValue(undefined)}
          onAddRoot={vi.fn()}
          onRemoveRoot={vi.fn()}
          onRetryConnection={vi.fn().mockResolvedValue(undefined)}
          onLogin={vi.fn().mockResolvedValue(undefined)}
          onApproveRequest={vi.fn().mockResolvedValue(undefined)}
          onRejectRequest={vi.fn().mockResolvedValue(undefined)}
        />
      );
    }

    render(<Harness />);

    expect(screen.queryByText("Second thread")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Codex"));

    expect(screen.getByText("Second thread")).toBeInTheDocument();
  });
});
