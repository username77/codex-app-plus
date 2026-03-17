import { lazy, Suspense, useMemo } from "react";
import type { WorkspaceRootController } from "../../workspace/hooks/useWorkspaceRoots";
import type { AppController } from "../../../app/controller/appControllerTypes";
import { useSkillsScreenState } from "../../../app/controller/appControllerState";
import { SettingsLoadingFallback } from "../../../app/ui/SettingsLoadingFallback";
import type { SkillsViewProps } from "./SkillsView";

const LazySkillsView = lazy(async () => {
  const module = await import("./SkillsView");
  return { default: module.SkillsView };
});

interface SkillsScreenProps {
  readonly controller: AppController;
  readonly onBackHome: () => void;
  readonly onOpenLearnMore: () => Promise<void>;
  readonly workspace: WorkspaceRootController;
}

export function SkillsScreen(props: SkillsScreenProps): JSX.Element {
  const state = useSkillsScreenState();
  const selectedRootPath = useMemo(() => {
    const selectedRoot = props.workspace.roots.find((root) => root.id === props.workspace.selectedRootId);
    return selectedRoot?.path ?? null;
  }, [props.workspace.roots, props.workspace.selectedRootId]);

  const skillsProps: SkillsViewProps = {
    authStatus: state.authStatus,
    authMode: state.authMode === "apikey" || state.authMode === "chatgpt" || state.authMode === "chatgptAuthTokens"
      ? state.authMode
      : null,
    selectedRootPath,
    notifications: state.notifications,
    onBackHome: props.onBackHome,
    onOpenLearnMore: props.onOpenLearnMore,
    listSkills: props.controller.listSkills,
    listRemoteSkills: props.controller.listRemoteSkills,
    writeSkillConfig: props.controller.writeSkillConfig,
    exportRemoteSkill: props.controller.exportRemoteSkill,
  };

  return (
    <Suspense fallback={<SettingsLoadingFallback />}>
      <LazySkillsView {...skillsProps} />
    </Suspense>
  );
}
