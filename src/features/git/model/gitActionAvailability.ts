import { isGitBusy } from "./gitViewState";
import type { WorkspaceGitController } from "./types";

function hasTrackingBranch(controller: WorkspaceGitController): boolean {
  return controller.status?.branch?.head !== null && controller.status?.branch?.upstream !== null;
}

function canUseGitActions(controller: WorkspaceGitController): boolean {
  if (isGitBusy(controller) || controller.status?.isRepository !== true) {
    return false;
  }
  return true;
}

export function canOpenCommitDialog(controller: WorkspaceGitController): boolean {
  if (!canUseGitActions(controller)) {
    return false;
  }
  const status = controller.status;
  if (status === null) {
    return false;
  }
  return status.staged.length > 0;
}

export function canCommitChanges(controller: WorkspaceGitController): boolean {
  if (!canOpenCommitDialog(controller)) {
    return false;
  }
  return controller.commitMessage.trim().length > 0;
}

export function canPullChanges(controller: WorkspaceGitController): boolean {
  if (!canUseGitActions(controller)) {
    return false;
  }

  return hasTrackingBranch(controller);
}

export function canPushChanges(controller: WorkspaceGitController): boolean {
  if (!canPullChanges(controller)) {
    return false;
  }

  return controller.status?.branch?.ahead !== 0;
}
