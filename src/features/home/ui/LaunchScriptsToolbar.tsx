import { useRef } from "react";
import { useToolbarMenuDismissal } from "../../shared/hooks/useToolbarMenuDismissal";
import type { WorkspaceLaunchScriptsState } from "../hooks/useWorkspaceLaunchScripts";
import { LaunchScriptIconPicker } from "./LaunchScriptIconPicker";
import { LaunchScriptIcon } from "./launchScriptIcons";

interface LaunchScriptsToolbarProps {
  readonly disabled: boolean;
  readonly state: WorkspaceLaunchScriptsState;
}

function LaunchToolbarButton(props: {
  readonly ariaLabel: string;
  readonly disabled: boolean;
  readonly icon: JSX.Element;
  readonly onClick: () => void;
  readonly onOpenEditor: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      className="toolbar-icon-btn launch-script-button"
      aria-label={props.ariaLabel}
      disabled={props.disabled}
      onClick={props.onClick}
      onContextMenu={(event) => {
        event.preventDefault();
        if (!props.disabled) {
          props.onOpenEditor();
        }
      }}
      title={props.ariaLabel}
    >
      {props.icon}
    </button>
  );
}

function MainLaunchScriptEditor(props: {
  readonly state: WorkspaceLaunchScriptsState;
}): JSX.Element {
  return (
    <div className="launch-script-popover" role="dialog" aria-label="编辑启动脚本">
      <div className="launch-script-title">启动脚本</div>
      <textarea
        className="launch-script-textarea"
        placeholder="例如：npm run dev"
        value={props.state.mainDraftScript}
        onChange={(event) => props.state.onMainDraftChange(event.target.value)}
        rows={6}
      />
      {props.state.mainError === null ? null : (
        <div className="launch-script-error">{props.state.mainError}</div>
      )}
      <div className="launch-script-actions">
        <button type="button" onClick={props.state.onCloseMainEditor}>取消</button>
        <button type="button" onClick={props.state.onOpenNew}>新增</button>
        <button type="button" className="launch-script-primary" onClick={props.state.onSaveMain}>
          保存
        </button>
      </div>
      {props.state.newEditorOpen ? <NewLaunchScriptEditor state={props.state} /> : null}
    </div>
  );
}

function NewLaunchScriptEditor(props: {
  readonly state: WorkspaceLaunchScriptsState;
}): JSX.Element {
  return (
    <div className="launch-script-nested-editor">
      <div className="launch-script-title">新增启动按钮</div>
      <LaunchScriptIconPicker
        value={props.state.newDraftIcon}
        onChange={props.state.onNewDraftIconChange}
      />
      <input
        className="launch-script-input"
        type="text"
        placeholder="可选标签"
        value={props.state.newDraftLabel}
        onChange={(event) => props.state.onNewDraftLabelChange(event.target.value)}
      />
      <textarea
        className="launch-script-textarea"
        placeholder="例如：npm run dev"
        value={props.state.newDraftScript}
        onChange={(event) => props.state.onNewDraftScriptChange(event.target.value)}
        rows={5}
      />
      {props.state.newError === null ? null : (
        <div className="launch-script-error">{props.state.newError}</div>
      )}
      <div className="launch-script-actions">
        <button type="button" onClick={props.state.onCloseNew}>取消</button>
        <button type="button" className="launch-script-primary" onClick={props.state.onCreateNew}>
          创建
        </button>
      </div>
    </div>
  );
}

function EntryLaunchScriptEditor(props: {
  readonly entryId: string;
  readonly state: WorkspaceLaunchScriptsState;
}): JSX.Element {
  const error = props.state.entryErrorById[props.entryId] ?? null;

  return (
    <div className="launch-script-popover" role="dialog" aria-label="编辑附加启动脚本">
      <div className="launch-script-title">编辑启动按钮</div>
      <LaunchScriptIconPicker
        value={props.state.entryDraftIcon}
        onChange={props.state.onEntryDraftIconChange}
      />
      <input
        className="launch-script-input"
        type="text"
        placeholder="可选标签"
        value={props.state.entryDraftLabel}
        onChange={(event) => props.state.onEntryDraftLabelChange(event.target.value)}
      />
      <textarea
        className="launch-script-textarea"
        placeholder="例如：npm run dev"
        value={props.state.entryDraftScript}
        onChange={(event) => props.state.onEntryDraftScriptChange(event.target.value)}
        rows={6}
      />
      {error === null ? null : <div className="launch-script-error">{error}</div>}
      <div className="launch-script-actions">
        <button type="button" className="launch-script-danger" onClick={props.state.onDeleteEntry}>
          删除
        </button>
        <button type="button" onClick={props.state.onCloseEntryEditor}>取消</button>
        <button type="button" className="launch-script-primary" onClick={props.state.onSaveEntry}>
          保存
        </button>
      </div>
    </div>
  );
}

function MainLaunchScriptAction(props: LaunchScriptsToolbarProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasLaunchScript = props.state.launchScript !== null;

  useToolbarMenuDismissal(
    props.state.mainEditorOpen,
    containerRef,
    props.state.onCloseMainEditor,
  );

  return (
    <div className="launch-script-item" ref={containerRef}>
      <LaunchToolbarButton
        ariaLabel={hasLaunchScript ? "运行启动脚本" : "设置启动脚本"}
        disabled={props.disabled}
        icon={<LaunchScriptIcon icon="play" className="toolbar-terminal-icon" />}
        onClick={hasLaunchScript ? props.state.onRunMain : props.state.onOpenMainEditor}
        onOpenEditor={props.state.onOpenMainEditor}
      />
      {props.state.mainEditorOpen ? <MainLaunchScriptEditor state={props.state} /> : null}
    </div>
  );
}

function EntryLaunchScriptAction(props: {
  readonly disabled: boolean;
  readonly entry: WorkspaceLaunchScriptsState["launchScripts"][number];
  readonly state: WorkspaceLaunchScriptsState;
}): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorOpen = props.state.entryEditorOpenId === props.entry.id;

  useToolbarMenuDismissal(editorOpen, containerRef, props.state.onCloseEntryEditor);

  return (
    <div className="launch-script-item" ref={containerRef}>
      <LaunchToolbarButton
        ariaLabel={`运行启动按钮：${props.entry.label ?? "未命名脚本"}`}
        disabled={props.disabled}
        icon={<LaunchScriptIcon icon={props.entry.icon} className="toolbar-terminal-icon" />}
        onClick={() => props.state.onRunEntry(props.entry.id)}
        onOpenEditor={() => props.state.onOpenEntryEditor(props.entry.id)}
      />
      {editorOpen ? (
        <EntryLaunchScriptEditor entryId={props.entry.id} state={props.state} />
      ) : null}
    </div>
  );
}

export function LaunchScriptsToolbar(props: LaunchScriptsToolbarProps): JSX.Element {
  return (
    <div className="launch-script-cluster" aria-label="启动脚本按钮组">
      <MainLaunchScriptAction disabled={props.disabled} state={props.state} />
      {props.state.launchScripts.map((entry) => (
        <EntryLaunchScriptAction
          key={entry.id}
          disabled={props.disabled}
          entry={entry}
          state={props.state}
        />
      ))}
    </div>
  );
}
