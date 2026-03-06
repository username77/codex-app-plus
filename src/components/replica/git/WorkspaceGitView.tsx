import { GitChangeSection } from "./GitChangeSection";
import type { WorkspaceGitController } from "./types";

interface WorkspaceGitViewProps {
  readonly selectedRootName: string;
  readonly controller: WorkspaceGitController;
}

function StateCard(props: { readonly title: string; readonly body: string; readonly actionLabel?: string; readonly onAction?: () => void }): JSX.Element {
  return (
    <main className="main-canvas main-canvas-workspace">
      <section className="git-state-card">
        <h2 className="git-state-title">{props.title}</h2>
        <p className="git-state-body">{props.body}</p>
        {props.actionLabel !== undefined && props.onAction !== undefined ? (
          <button type="button" className="git-primary-btn" onClick={props.onAction}>
            {props.actionLabel}
          </button>
        ) : null}
      </section>
    </main>
  );
}

function formatBranchTitle(controller: WorkspaceGitController): string {
  if (controller.status?.branch?.detached) {
    return "Detached HEAD";
  }
  return controller.status?.branch?.head ?? "未命名分支";
}

function createSelectedDiffKey(controller: WorkspaceGitController): string | null {
  if (controller.diffTarget === null) {
    return null;
  }
  return `${controller.diffTarget.staged ? "staged" : "unstaged"}:${controller.diffTarget.path}`;
}

export function WorkspaceGitView(props: WorkspaceGitViewProps): JSX.Element {
  if (props.controller.loading && props.controller.status === null) {
    return <StateCard title="正在读取 Git 状态" body="稍等一下，我正在分析当前工作区的分支、变更和远端信息。" />;
  }
  if (props.controller.error !== null && props.controller.status === null) {
    return <StateCard title="读取 Git 状态失败" body={props.controller.error} actionLabel="重新加载" onAction={() => void props.controller.refresh()} />;
  }
  if (props.controller.status === null) {
    return <StateCard title="Git 状态暂不可用" body="请重新选择工作区，或稍后再次刷新。" actionLabel="重新加载" onAction={() => void props.controller.refresh()} />;
  }
  if (!props.controller.status.isRepository) {
    return (
      <StateCard
        title="当前工作区还不是 Git 仓库"
        body={`已选择工作区：${props.selectedRootName}。初始化后就可以直接在这里查看分支、暂存、提交和推送。`}
        actionLabel="初始化 Git 仓库"
        onAction={() => void props.controller.initRepository()}
      />
    );
  }

  const busy = props.controller.loading || props.controller.pendingAction !== null;
  const selectedDiffKey = createSelectedDiffKey(props.controller);
  const currentBranchTitle = formatBranchTitle(props.controller);
  const canCommit = props.controller.status.staged.length > 0 && props.controller.commitMessage.trim().length > 0 && !busy;
  const canSwitchBranch = props.controller.selectedBranch.trim().length > 0 && props.controller.selectedBranch !== props.controller.status.branch?.head && !busy;
  const canCreateBranch = props.controller.newBranchName.trim().length > 0 && !busy;

  return (
    <main className="main-canvas main-canvas-workspace">
      <section className="git-workspace">
        <header className="git-overview-card">
          <div className="git-overview-main">
            <div>
              <h2 className="git-overview-title">{currentBranchTitle}</h2>
              <p className="git-overview-subtitle">{props.controller.status.repoRoot ?? props.selectedRootName}</p>
            </div>
            <div className="git-overview-actions">
              <button type="button" className="git-inline-btn" disabled={busy} onClick={() => void props.controller.refresh()}>
                刷新
              </button>
              <button type="button" className="git-inline-btn" disabled={busy} onClick={() => void props.controller.fetch()}>
                抓取
              </button>
              <button type="button" className="git-inline-btn" disabled={busy} onClick={() => void props.controller.pull()}>
                拉取
              </button>
              <button type="button" className="git-primary-btn" disabled={busy} onClick={() => void props.controller.push()}>
                推送
              </button>
            </div>
          </div>
          <div className="git-overview-meta">
            <span className="git-badge">已暂存 {props.controller.status.staged.length}</span>
            <span className="git-badge">未暂存 {props.controller.status.unstaged.length}</span>
            <span className="git-badge">未跟踪 {props.controller.status.untracked.length}</span>
            <span className="git-badge">冲突 {props.controller.status.conflicted.length}</span>
            <span className={props.controller.status.isClean ? "git-badge git-badge-success" : "git-badge git-badge-warning"}>
              {props.controller.status.isClean ? "工作区干净" : "存在待处理变更"}
            </span>
            {props.controller.status.branch?.upstream !== null ? <span className="git-badge">上游 {props.controller.status.branch?.upstream}</span> : null}
            {props.controller.status.branch?.ahead ? <span className="git-badge">领先 {props.controller.status.branch.ahead}</span> : null}
            {props.controller.status.branch?.behind ? <span className="git-badge">落后 {props.controller.status.branch.behind}</span> : null}
          </div>
          {props.controller.status.remoteUrl !== null ? <div className="git-remote-url">远端：{props.controller.status.remoteUrl}</div> : null}
          {props.controller.notice !== null ? (
            <div className={props.controller.notice.kind === "success" ? "git-banner git-banner-success" : "git-banner git-banner-error"}>
              {props.controller.notice.text}
            </div>
          ) : null}
        </header>

        <div className="git-columns">
          <div className="git-column git-column-left">
            <GitChangeSection
              title="冲突"
              mode="conflicted"
              entries={props.controller.status.conflicted}
              busy={busy}
              selectedDiffKey={selectedDiffKey}
              onSelectDiff={props.controller.selectDiff}
              onStage={props.controller.stagePaths}
              onUnstage={props.controller.unstagePaths}
              onDiscard={props.controller.discardPaths}
            />
            <GitChangeSection
              title="未暂存"
              mode="unstaged"
              entries={props.controller.status.unstaged}
              busy={busy}
              selectedDiffKey={selectedDiffKey}
              onSelectDiff={props.controller.selectDiff}
              onStage={props.controller.stagePaths}
              onUnstage={props.controller.unstagePaths}
              onDiscard={props.controller.discardPaths}
            />
            <GitChangeSection
              title="已暂存"
              mode="staged"
              entries={props.controller.status.staged}
              busy={busy}
              selectedDiffKey={selectedDiffKey}
              onSelectDiff={props.controller.selectDiff}
              onStage={props.controller.stagePaths}
              onUnstage={props.controller.unstagePaths}
              onDiscard={props.controller.discardPaths}
            />
            <GitChangeSection
              title="未跟踪"
              mode="untracked"
              entries={props.controller.status.untracked}
              busy={busy}
              selectedDiffKey={selectedDiffKey}
              onSelectDiff={props.controller.selectDiff}
              onStage={props.controller.stagePaths}
              onUnstage={props.controller.unstagePaths}
              onDiscard={props.controller.discardPaths}
            />
          </div>

          <div className="git-column git-column-right">
            <section className="git-card">
              <h3 className="git-card-title">分支</h3>
              <div className="git-form-row">
                <select className="git-select" value={props.controller.selectedBranch} disabled={busy || props.controller.status.branches.length === 0} onChange={(event) => props.controller.setSelectedBranch(event.currentTarget.value)}>
                  <option value="">选择已有分支</option>
                  {props.controller.status.branches.map((branch) => (
                    <option key={branch.name} value={branch.name}>
                      {branch.isCurrent ? `当前：${branch.name}` : branch.name}
                    </option>
                  ))}
                </select>
                <button type="button" className="git-inline-btn" disabled={!canSwitchBranch} onClick={() => void props.controller.checkoutSelectedBranch()}>
                  切换
                </button>
              </div>
              <div className="git-form-row">
                <input className="git-input" placeholder="输入新分支名称" value={props.controller.newBranchName} disabled={busy} onChange={(event) => props.controller.setNewBranchName(event.currentTarget.value)} />
                <button type="button" className="git-inline-btn" disabled={!canCreateBranch} onClick={() => void props.controller.createBranch()}>
                  新建并切换
                </button>
              </div>
            </section>

            <section className="git-card">
              <h3 className="git-card-title">提交</h3>
              <textarea
                className="git-textarea"
                placeholder="填写提交说明，提交的是当前已暂存的更改。"
                value={props.controller.commitMessage}
                disabled={busy}
                onChange={(event) => props.controller.setCommitMessage(event.currentTarget.value)}
              />
              <button type="button" className="git-primary-btn git-full-width" disabled={!canCommit} onClick={() => void props.controller.commit()}>
                提交已暂存更改
              </button>
            </section>

            <section className="git-card git-diff-card">
              <header className="git-section-header">
                <div>
                  <h3 className="git-card-title">差异预览</h3>
                  <p className="git-card-meta">选择左侧文件即可查看。</p>
                </div>
                {props.controller.diff !== null ? (
                  <button type="button" className="git-inline-btn" disabled={busy} onClick={props.controller.clearDiff}>
                    清除
                  </button>
                ) : null}
              </header>
              {props.controller.diff === null ? (
                <div className="git-empty-tip">当前还没有选择任何文件。</div>
              ) : (
                <pre className="git-diff-content">{props.controller.diff.diff}</pre>
              )}
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
