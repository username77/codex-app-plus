import { useCallback, useEffect, useMemo, useState } from "react";
import type { ThreadSummary } from "../../../domain/types";
import { useI18n, type Locale } from "../../../i18n";

interface ArchivedThreadsSettingsSectionProps {
  listArchivedThreads: () => Promise<ReadonlyArray<ThreadSummary>>;
  unarchiveThread: (threadId: string) => Promise<void>;
}

interface ArchivedThreadRowProps {
  readonly thread: ThreadSummary;
  readonly pending: boolean;
  readonly errorMessage: string | null;
  readonly onUnarchive: (threadId: string) => Promise<void>;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatUpdatedAt(updatedAt: string, locale: Locale): string {
  const timestamp = Date.parse(updatedAt);
  if (Number.isNaN(timestamp)) {
    return updatedAt;
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(timestamp));
}

function clearThreadError(current: Readonly<Record<string, string>>, threadId: string): Record<string, string> {
  const next = { ...current };
  delete next[threadId];
  return next;
}

function ArchivedThreadRow(props: ArchivedThreadRowProps): JSX.Element {
  const { locale, t } = useI18n();

  return (
    <div className="archived-thread-row">
      <div className="archived-thread-main">
        <div className="archived-thread-title">{props.thread.title}</div>
        <div className="archived-thread-meta">{props.thread.cwd ?? t("settings.archived.cwdMissing")}</div>
        <div className="archived-thread-meta">
          {t("settings.archived.updatedAt", {
            time: formatUpdatedAt(props.thread.updatedAt, locale)
          })}
        </div>
        {props.errorMessage ? <div className="archived-thread-error">{props.errorMessage}</div> : null}
      </div>
      <div className="archived-thread-actions">
        <button type="button" className="settings-action-btn settings-action-btn-sm" onClick={() => void props.onUnarchive(props.thread.id)} disabled={props.pending}>
          {props.pending ? t("settings.archived.unarchiving") : t("settings.archived.unarchiveAction")}
        </button>
      </div>
    </div>
  );
}

function useArchivedThreadsState(props: ArchivedThreadsSettingsSectionProps) {
  const [threads, setThreads] = useState<ReadonlyArray<ThreadSummary>>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingThreadIds, setPendingThreadIds] = useState<ReadonlyArray<string>>([]);
  const [rowErrors, setRowErrors] = useState<Readonly<Record<string, string>>>({});
  const pendingThreadIdsSet = useMemo(() => new Set(pendingThreadIds), [pendingThreadIds]);

  const loadThreads = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    setRowErrors({});
    try {
      setThreads(await props.listArchivedThreads());
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [props.listArchivedThreads]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  const handleUnarchive = useCallback(async (threadId: string) => {
    setPendingThreadIds((current) => (current.includes(threadId) ? current : [...current, threadId]));
    setRowErrors((current) => clearThreadError(current, threadId));
    try {
      await props.unarchiveThread(threadId);
      setThreads((current) => current.filter((thread) => thread.id !== threadId));
    } catch (error) {
      setRowErrors((current) => ({ ...current, [threadId]: toErrorMessage(error) }));
    } finally {
      setPendingThreadIds((current) => current.filter((id) => id !== threadId));
    }
  }, [props.unarchiveThread]);

  return { threads, loading, errorMessage, rowErrors, pendingThreadIdsSet, loadThreads, handleUnarchive };
}

export function ArchivedThreadsSettingsSection(props: ArchivedThreadsSettingsSectionProps): JSX.Element {
  const { t } = useI18n();
  const state = useArchivedThreadsState(props);

  return (
    <div className="settings-panel-group">
      <header className="settings-title-wrap">
        <h1 className="settings-page-title">{t("settings.archived.title")}</h1>
        <p className="settings-subtitle">{t("settings.archived.subtitle")}</p>
      </header>
      <section className="settings-card">
        <div className="settings-section-head">
          <strong>{t("settings.archived.listTitle")}</strong>
          <button type="button" className="settings-head-action" onClick={() => void state.loadThreads()} disabled={state.loading}>
            {t("settings.archived.refreshAction")}
          </button>
        </div>
        <p className="settings-note settings-note-pad">{t("settings.archived.note")}</p>
        {state.errorMessage ? <p className="settings-status-note settings-status-note-error">{state.errorMessage}</p> : null}
        {state.loading ? <div className="settings-empty">{t("settings.archived.loading")}</div> : null}
        {!state.loading && state.errorMessage === null && state.threads.length === 0 ? (
          <div className="settings-empty">{t("settings.archived.empty")}</div>
        ) : null}
        {!state.loading && state.errorMessage === null
          ? state.threads.map((thread) => (
              <ArchivedThreadRow key={thread.id} thread={thread} pending={state.pendingThreadIdsSet.has(thread.id)} errorMessage={state.rowErrors[thread.id] ?? null} onUnarchive={state.handleUnarchive} />
            ))
          : null}
      </section>
    </div>
  );
}
