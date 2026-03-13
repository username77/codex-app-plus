import { useI18n } from "../../../i18n";
import type { WorkspaceRoot } from "../../workspace/hooks/useWorkspaceRoots";

function SectionHeader(props: {
  readonly title: string;
  readonly subtitle?: string;
}): JSX.Element {
  return (
    <header className="settings-title-wrap">
      <h1 className="settings-page-title">{props.title}</h1>
      {props.subtitle ? <p className="settings-subtitle">{props.subtitle}</p> : null}
    </header>
  );
}

function ToggleControl(props: { readonly checked?: boolean }): JSX.Element {
  return (
    <span className={props.checked ? "settings-toggle settings-toggle-on" : "settings-toggle"}>
      <span className="settings-toggle-knob" />
    </span>
  );
}

export function GitContent(): JSX.Element {
  const { t } = useI18n();

  return (
    <div className="settings-panel-group">
      <SectionHeader title={t("settings.git.title")} />
      <section className="settings-card">
        <div className="settings-row">
          <div>
            <strong>{t("settings.git.branchPrefixLabel")}</strong>
            <p>{t("settings.git.branchPrefixDescription")}</p>
          </div>
          <span className="settings-chip">codex/</span>
        </div>
        <div className="settings-row">
          <div>
            <strong>{t("settings.git.forceLeaseLabel")}</strong>
            <p>{t("settings.git.forceLeaseDescription")}</p>
          </div>
          <ToggleControl />
        </div>
      </section>
    </div>
  );
}

export function EnvironmentContent(props: {
  readonly roots: ReadonlyArray<WorkspaceRoot>;
  readonly onAddRoot: () => void;
}): JSX.Element {
  const { t } = useI18n();

  return (
    <div className="settings-panel-group">
      <SectionHeader title={t("settings.environment.title")} />
      <section className="settings-card">
        <div className="settings-section-head">
          <strong>{t("settings.environment.workspacesTitle")}</strong>
          <button type="button" className="settings-head-action" onClick={props.onAddRoot}>
            {t("settings.environment.addProjectAction")}
          </button>
        </div>
        <p className="settings-note">{t("settings.environment.note")}</p>
        {props.roots.map((root) => (
          <div key={root.id} className="settings-env-row">
            <div className="settings-env-main">
              <span className="settings-folder">▣</span>
              <strong>{root.name}</strong>
              <span>{root.path}</span>
            </div>
          </div>
        ))}
        {props.roots.length === 0 ? (
          <div className="settings-empty">{t("settings.environment.empty")}</div>
        ) : null}
      </section>
    </div>
  );
}

export function WorktreeContent(): JSX.Element {
  const { t } = useI18n();

  return (
    <div className="settings-panel-group">
      <SectionHeader title={t("settings.worktree.title")} />
      <section className="settings-card">
        <div className="settings-row">
          <div>
            <strong>{t("settings.worktree.autoCleanLabel")}</strong>
            <p>{t("settings.worktree.autoCleanDescription")}</p>
          </div>
          <ToggleControl checked />
        </div>
        <div className="settings-row">
          <div>
            <strong>{t("settings.worktree.retentionLabel")}</strong>
            <p>{t("settings.worktree.retentionDescription")}</p>
          </div>
          <span className="settings-chip settings-chip-sm">15</span>
        </div>
      </section>
    </div>
  );
}

export function PlaceholderContent(props: { readonly sectionTitle: string }): JSX.Element {
  const { t } = useI18n();

  return (
    <div className="settings-panel-group">
      <SectionHeader title={props.sectionTitle} />
      <section className="settings-card">
        <div className="settings-placeholder">{t("settings.placeholder.message")}</div>
      </section>
    </div>
  );
}
