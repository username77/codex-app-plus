import type { GitDiffOutput, GitStatusEntry, GitStatusOutput } from "../../../bridge/types";
import { createGitDiffKey } from "./gitDiffKey";

export interface GitDiffTarget {
  readonly path: string;
  readonly staged: boolean;
}

export function formatActionError(action: string, error: unknown): string {
  return `${action}失败：${String(error)}`;
}

export function normalizePaths(paths: ReadonlyArray<string>): ReadonlyArray<string> {
  return [...new Set(paths.map((path) => path.trim()).filter((path) => path.length > 0))];
}

export function addLoadingDiffKey(current: ReadonlyArray<string>, diffKey: string): ReadonlyArray<string> {
  if (current.includes(diffKey)) {
    return current;
  }
  return [...current, diffKey];
}

export function removeLoadingDiffKey(current: ReadonlyArray<string>, diffKey: string): ReadonlyArray<string> {
  return current.filter((entry) => entry !== diffKey);
}

export function pickBranchName(status: GitStatusOutput | null, currentBranch: string): string {
  if (status === null || !status.isRepository) {
    return "";
  }
  if (status.branches.some((branch) => branch.name === currentBranch)) {
    return currentBranch;
  }
  const activeBranch = status.branches.find((branch) => branch.isCurrent)?.name;
  return activeBranch ?? status.branch?.head ?? status.branches[0]?.name ?? "";
}

function matchesDiffTarget(entry: GitStatusEntry, target: GitDiffTarget): boolean {
  return entry.path === target.path;
}

export function statusHasTarget(status: GitStatusOutput, target: GitDiffTarget): boolean {
  const entries = target.staged ? status.staged : [...status.unstaged, ...status.untracked, ...status.conflicted];
  return entries.some((entry) => matchesDiffTarget(entry, target));
}

export function storeDiff(cache: Readonly<Record<string, GitDiffOutput>>, nextDiff: GitDiffOutput): Readonly<Record<string, GitDiffOutput>> {
  return { ...cache, [createGitDiffKey(nextDiff.path, nextDiff.staged)]: nextDiff };
}
