import type { GitStatusEntry } from "../../../bridge/types";
import { GitChangeSection } from "./GitChangeSection";
import type { WorkspaceGitController } from "./types";

export type GitChangeScope = "all" | "conflicted" | "unstaged" | "staged" | "untracked";
export type GitChangeSectionMode = Exclude<GitChangeScope, "all">;

export interface GitChangeScopeOption {
  readonly scope: GitChangeScope;
  readonly label: string;
  readonly count: number;
}

export interface GitChangeSectionData {
  readonly label: string;
  readonly mode: GitChangeSectionMode;
  readonly staged: boolean;
  readonly entries: ReadonlyArray<GitStatusEntry>;
}

interface GitChangeBrowserProps {
  readonly controller: WorkspaceGitController;
  readonly busy: boolean;
  readonly selectedDiffKey: string | null;
  readonly scope: GitChangeScope;
}

const CHANGE_SECTIONS = [
  { label: "冲突", mode: "conflicted", staged: false },
  { label: "未暂存", mode: "unstaged", staged: false },
  { label: "已暂存", mode: "staged", staged: true },
  { label: "未跟踪", mode: "untracked", staged: false }
] as const;

function getEntries(controller: WorkspaceGitController, mode: (typeof CHANGE_SECTIONS)[number]["mode"]) {
  const status = controller.status;
  if (status === null) {
    return [];
  }
  return status[mode];
}

function getVisibleSections(scope: GitChangeScope) {
  if (scope === "all") {
    return CHANGE_SECTIONS;
  }
  return CHANGE_SECTIONS.filter((section) => section.mode === scope);
}

export function getVisibleGitChangeSections(controller: WorkspaceGitController, scope: GitChangeScope): ReadonlyArray<GitChangeSectionData> {
  return getVisibleSections(scope).map((section) => ({
    label: section.label,
    mode: section.mode,
    staged: section.staged,
    entries: getEntries(controller, section.mode)
  }));
}

export function getGitChangeScopeOptions(controller: WorkspaceGitController): ReadonlyArray<GitChangeScopeOption> {
  const status = controller.status;
  if (status === null) {
    return [];
  }

  return [
    {
      scope: "all",
      label: "全部更改",
      count: status.conflicted.length + status.unstaged.length + status.staged.length + status.untracked.length
    },
    ...CHANGE_SECTIONS.map((section) => ({
      scope: section.mode,
      label: section.label,
      count: status[section.mode].length
    }))
  ];
}

export function getDefaultGitChangeScope(controller: WorkspaceGitController): GitChangeScope {
  const options = getGitChangeScopeOptions(controller);
  const preferred = options.find((option) => option.scope !== "all" && option.count > 0);
  return preferred?.scope ?? "unstaged";
}

export function GitChangeBrowser(props: GitChangeBrowserProps): JSX.Element | null {
  if (props.controller.status === null) {
    return null;
  }

  return (
    <>
      {getVisibleSections(props.scope).map((section) => (
        <GitChangeSection
          key={section.mode}
          title={section.label}
          mode={section.mode}
          entries={getEntries(props.controller, section.mode)}
          busy={props.busy}
          selectedDiffKey={props.selectedDiffKey}
          onSelectDiff={props.controller.selectDiff}
          onStage={props.controller.stagePaths}
          onUnstage={props.controller.unstagePaths}
          onDiscard={props.controller.discardPaths}
        />
      ))}
    </>
  );
}
