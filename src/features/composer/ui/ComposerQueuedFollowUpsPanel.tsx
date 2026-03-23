import { useEffect, useRef, useState } from "react";
import type { QueuedFollowUp } from "../../../domain/timeline";
import { OfficialChevronRightIcon } from "../../shared/ui/officialIcons";
import { getAttachmentLabel } from "../model/composerAttachments";
import { AttachmentClip } from "./AttachmentClip";

interface ComposerQueuedFollowUpsPanelProps {
  readonly queuedFollowUps: ReadonlyArray<QueuedFollowUp>;
  readonly interruptPending: boolean;
  readonly onPromoteQueuedFollowUp: (followUpId: string) => void;
  readonly onRemoveQueuedFollowUp: (followUpId: string) => void;
  readonly onClearQueuedFollowUps: () => void;
}

const QUEUE_TITLE = "排队发送";

export function ComposerQueuedFollowUpsPanel(props: ComposerQueuedFollowUpsPanelProps): JSX.Element | null {
  const [collapsed, setCollapsed] = useState(false);
  const previousCountRef = useRef(props.queuedFollowUps.length);

  useEffect(() => {
    const previousCount = previousCountRef.current;
    const nextCount = props.queuedFollowUps.length;

    if (nextCount === 0 || previousCount === 0) {
      setCollapsed(false);
    }

    previousCountRef.current = nextCount;
  }, [props.queuedFollowUps.length]);

  if (props.queuedFollowUps.length === 0) {
    return null;
  }

  return (
    <section className="home-turn-plan-drawer composer-queue-drawer" aria-label={QUEUE_TITLE}>
      <button
        type="button"
        className="home-turn-plan-handle"
        data-expanded={collapsed ? undefined : "true"}
        onClick={() => setCollapsed((current) => !current)}
      >
        <div className="home-turn-plan-handle-info">
          <span className="home-turn-plan-title">{QUEUE_TITLE}</span>
          <span className="home-turn-plan-progress">共 {props.queuedFollowUps.length} 条待发送</span>
        </div>
        <OfficialChevronRightIcon className="home-turn-plan-handle-icon" />
      </button>
      {collapsed ? null : (
        <div className="home-turn-plan-card composer-queue-card">
          <div className="home-turn-plan-summary composer-queue-summary">
            <span>将按顺序自动继续对话</span>
            <button type="button" className="composer-queue-clear" onClick={props.onClearQueuedFollowUps}>
              清空
            </button>
          </div>
          <ol className="home-turn-plan-list">
            {props.queuedFollowUps.map((followUp, index) => (
              <li key={followUp.id} className="home-turn-plan-item composer-queue-item">
                <span className="home-turn-plan-index">{index + 1}</span>
                <div className="composer-queue-body">
                  <p className="home-turn-plan-text composer-queue-text">{getFollowUpPreview(followUp)}</p>
                  {followUp.attachments.length === 0 ? null : (
                    <div className="composer-queue-attachments">
                      {followUp.attachments.map((attachment) => (
                        <AttachmentClip key={attachment.id} label={getAttachmentLabel(attachment)} tone={attachment.kind} />
                      ))}
                    </div>
                  )}
                </div>
                <div className="composer-queue-actions">
                  <button
                    type="button"
                    className="home-turn-plan-status composer-queue-promote"
                    disabled={props.interruptPending && index === 0}
                    onClick={() => props.onPromoteQueuedFollowUp(followUp.id)}
                  >
                    插队
                  </button>
                  <button
                    type="button"
                    className="composer-queue-remove"
                    onClick={() => props.onRemoveQueuedFollowUp(followUp.id)}
                  >
                    移除
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function getFollowUpPreview(followUp: QueuedFollowUp): string {
  const text = followUp.text.trim();
  if (text.length > 0) {
    return text;
  }
  return `包含 ${followUp.attachments.length} 个附件`;
}
