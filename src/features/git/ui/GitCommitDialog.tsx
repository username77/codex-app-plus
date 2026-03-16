import { useEffect, useRef, type KeyboardEvent, type RefObject } from "react";
import { canCommitChanges } from "../model/gitActionAvailability";
import type { WorkspaceGitController } from "../model/types";
import { GitCommitIcon } from "./gitIcons";

const COMMIT_DIALOG_LABEL = "提交更改";
const DEFAULT_BRANCH_LABEL = "未命名分支";

interface GitCommitDialogProps {
  readonly controller: WorkspaceGitController;
}

function useCommitInputFocus(
  inputRef: RefObject<HTMLTextAreaElement | null>,
  open: boolean,
): void {
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open, inputRef]);
}

function getHelperText(controller: WorkspaceGitController): string {
  if (controller.status === null) {
    return "将提交当前已暂存的更改。";
  }
  if (controller.status.staged.length === 0) {
    return "请先暂存至少一项更改。";
  }
  if (controller.commitMessage.trim().length === 0) {
    return "请填写提交说明后再正式提交。";
  }
  return "将提交当前已暂存的更改。";
}

function handleCommitShortcut(
  event: KeyboardEvent<HTMLTextAreaElement>,
  canSubmit: boolean,
  onConfirm: () => void,
): void {
  if (!canSubmit || event.key !== "Enter" || (!event.ctrlKey && !event.metaKey)) {
    return;
  }
  event.preventDefault();
  onConfirm();
}

export function GitCommitDialog(props: GitCommitDialogProps): JSX.Element | null {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const canSubmit = canCommitChanges(props.controller);
  const pending = props.controller.pendingAction === "提交更改";
  const branchName = props.controller.status?.branch?.head?.trim() || DEFAULT_BRANCH_LABEL;
  const stagedCount = props.controller.status?.staged.length ?? 0;
  const helperText = getHelperText(props.controller);

  useCommitInputFocus(inputRef, props.controller.commitDialogOpen);

  if (!props.controller.commitDialogOpen) {
    return null;
  }

  return (
    <div className="git-dialog-backdrop" role="presentation" onClick={pending ? undefined : props.controller.closeCommitDialog}>
      <section className="git-commit-dialog" role="dialog" aria-modal="true" aria-label={COMMIT_DIALOG_LABEL} onClick={(event) => event.stopPropagation()}>
        <header className="git-push-confirm-header">
          <div className="git-push-confirm-icon-box" aria-hidden="true">
            <GitCommitIcon className="git-push-confirm-icon" />
          </div>
          <button type="button" className="git-dialog-close" onClick={props.controller.closeCommitDialog} aria-label="关闭提交卡片" disabled={pending}>×</button>
        </header>
        <div className="git-push-confirm-body git-commit-dialog-body">
          <h2 className="git-push-confirm-title">{COMMIT_DIALOG_LABEL}</h2>
          <div className="git-push-confirm-row">
            <span className="git-push-confirm-label">分支</span>
            <strong className="git-push-confirm-value">{branchName}</strong>
          </div>
          <div className="git-push-confirm-row">
            <span className="git-push-confirm-label">已暂存</span>
            <strong className="git-push-confirm-value">{stagedCount} 项</strong>
          </div>
          <p className="git-push-confirm-text">{helperText}</p>
          <label className="git-commit-dialog-label" htmlFor="git-commit-message">提交说明</label>
          <textarea
            id="git-commit-message"
            ref={inputRef}
            className="git-textarea git-commit-dialog-textarea"
            placeholder="例如：feat: 完成设置页提交流程"
            value={props.controller.commitMessage}
            disabled={pending}
            onChange={(event) => props.controller.setCommitMessage(event.currentTarget.value)}
            onKeyDown={(event) => handleCommitShortcut(event, canSubmit, () => void props.controller.commit())}
          />
          {props.controller.commitDialogError !== null ? <p className="git-commit-dialog-error">{props.controller.commitDialogError}</p> : null}
          <div className="git-commit-dialog-actions">
            <button type="button" className="git-inline-btn" onClick={props.controller.closeCommitDialog} disabled={pending}>取消</button>
            <button type="button" className="git-primary-btn" onClick={() => void props.controller.commit()} disabled={!canSubmit}>
              {pending ? "提交中…" : "正式提交"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
