import { Suspense, lazy, useCallback, useState } from "react";
import type { AppUpdateState } from "../../../domain/types";
import { useI18n } from "../../../i18n";
import { AppUpdateCard } from "./AppUpdateCard";

const LazyOpenSourceLicensesDialog = lazy(async () => {
  const module = await import("../../shared/ui/OpenSourceLicensesDialog");
  return { default: module.OpenSourceLicensesDialog };
});

interface AboutSettingsSectionProps {
  readonly appUpdate: AppUpdateState;
  onCheckForAppUpdate: () => Promise<void>;
  onInstallAppUpdate: () => Promise<void>;
}

export function AboutSettingsSection(props: AboutSettingsSectionProps): JSX.Element {
  const { t } = useI18n();
  const [licensesOpen, setLicensesOpen] = useState(false);

  const openLicenses = useCallback(() => {
    setLicensesOpen(true);
  }, []);

  const closeLicenses = useCallback(() => {
    setLicensesOpen(false);
  }, []);

  return (
    <div className="settings-panel-group">
      <header className="settings-title-wrap">
        <h1 className="settings-page-title">{t("settings.about.title")}</h1>
        <p className="settings-subtitle">{t("settings.about.subtitle")}</p>
      </header>
      <AppUpdateCard
        appUpdate={props.appUpdate}
        onCheckForAppUpdate={props.onCheckForAppUpdate}
        onInstallAppUpdate={props.onInstallAppUpdate}
      />
      <section className="settings-card settings-config-card">
        <div className="settings-row">
          <div className="settings-row-copy">
            <div className="settings-row-heading">{t("settings.config.licenses.label")}</div>
            <p className="settings-row-meta">{t("settings.config.licenses.description")}</p>
          </div>
          <button
            type="button"
            className="settings-action-btn"
            onClick={openLicenses}
          >
            {t("settings.config.licenses.action")}
          </button>
        </div>
      </section>
      {licensesOpen ? (
        <Suspense fallback={null}>
          <LazyOpenSourceLicensesDialog
            open={licensesOpen}
            onClose={closeLicenses}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
