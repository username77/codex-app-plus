import { Suspense, lazy } from "react";
import type { WorkspaceGitController } from "./git/types";

const LazyWorkspaceDiffSidebar = lazy(async () => {
  const module = await import("./git/WorkspaceDiffSidebar");
  return { default: module.WorkspaceDiffSidebar };
});

interface WorkspaceDiffSidebarHostProps {
  readonly controller: WorkspaceGitController;
  readonly onClose: () => void;
  readonly selectedRootName: string;
  readonly selectedRootPath: string | null;
}

export function WorkspaceDiffSidebarHost(props: WorkspaceDiffSidebarHostProps): JSX.Element | null {
  if (props.selectedRootPath === null) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <LazyWorkspaceDiffSidebar
        controller={props.controller}
        onClose={props.onClose}
        open={true}
        selectedRootName={props.selectedRootName}
        selectedRootPath={props.selectedRootPath}
      />
    </Suspense>
  );
}
