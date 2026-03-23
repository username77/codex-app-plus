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

export function removeStaleDiffKey(current: ReadonlyArray<string>, diffKey: string): ReadonlyArray<string> {
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

export function getCommitableChangeCount(status: GitStatusOutput | null): number {
  if (status === null || !status.isRepository) {
    return 0;
  }
  return status.staged.length + status.unstaged.length + status.untracked.length;
}

export function hasCommitableChanges(status: GitStatusOutput | null): boolean {
  return getCommitableChangeCount(status) > 0;
}

export function hasUnresolvedConflicts(status: GitStatusOutput | null): boolean {
  return status !== null && status.conflicted.length > 0;
}

export function collectAutoStagePaths(status: GitStatusOutput): ReadonlyArray<string> {
  return normalizePaths([...status.unstaged, ...status.untracked].map((entry) => entry.path));
}

function matchesDiffTarget(entry: GitStatusEntry, target: GitDiffTarget): boolean {
  return entry.path === target.path;
}

function createTargets(entries: ReadonlyArray<GitStatusEntry>, staged: boolean): ReadonlyArray<GitDiffTarget> {
  return entries.map((entry) => ({ path: entry.path, staged }));
}

export function collectDiffTargets(status: GitStatusOutput): ReadonlyArray<GitDiffTarget> {
  return [
    ...createTargets(status.conflicted, false),
    ...createTargets(status.unstaged, false),
    ...createTargets(status.staged, true),
    ...createTargets(status.untracked, false)
  ];
}

export function createStaleDiffKeys(status: GitStatusOutput): ReadonlyArray<string> {
  return collectDiffTargets(status).map((target) => createGitDiffKey(target.path, target.staged));
}

export function statusHasTarget(status: GitStatusOutput, target: GitDiffTarget): boolean {
  const entries = target.staged ? status.staged : [...status.unstaged, ...status.untracked, ...status.conflicted];
  return entries.some((entry) => matchesDiffTarget(entry, target));
}

export function findRetainedDiffTarget(status: GitStatusOutput, target: GitDiffTarget | null): GitDiffTarget | null {
  if (target === null) {
    return collectDiffTargets(status)[0] ?? null;
  }
  if (statusHasTarget(status, target)) {
    return target;
  }
  return collectDiffTargets(status).find((entry) => entry.path === target.path) ?? collectDiffTargets(status)[0] ?? null;
}

export function pruneDiffCache(
  cache: Readonly<Record<string, GitDiffOutput>>,
  status: GitStatusOutput
): Readonly<Record<string, GitDiffOutput>> {
  const validKeys = new Set(createStaleDiffKeys(status));
  return Object.fromEntries(Object.entries(cache).filter(([diffKey]) => validKeys.has(diffKey)));
}

export function storeDiff(cache: Readonly<Record<string, GitDiffOutput>>, nextDiff: GitDiffOutput): Readonly<Record<string, GitDiffOutput>> {
  return { ...cache, [createGitDiffKey(nextDiff.path, nextDiff.staged)]: nextDiff };
}

export function isSameDiffTarget(left: GitDiffTarget | null, right: GitDiffTarget | null): boolean {
  if (left === right) {
    return true;
  }
  if (left === null || right === null) {
    return false;
  }
  return left.path === right.path && left.staged === right.staged;
}
