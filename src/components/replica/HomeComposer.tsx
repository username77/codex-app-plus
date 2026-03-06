import { useState } from "react";
import type { ComposerModelOption, ComposerSelection } from "../../app/composerPreferences";
import { useComposerSelection } from "../../app/useComposerSelection";
import { ComposerAttachmentMenu } from "./ComposerAttachmentMenu";
import { ComposerFooter } from "./ComposerFooter";
import { ComposerModelControls } from "./ComposerModelControls";
import { OfficialPlusIcon } from "./officialIcons";

const MIN_TRIMMED_MESSAGE_LENGTH = 1;

export interface HomeComposerProps {
  readonly busy: boolean;
  readonly inputText: string;
  readonly models: ReadonlyArray<ComposerModelOption>;
  readonly defaultModel: string | null;
  readonly defaultEffort: ComposerSelection["effort"];
  readonly selectedRootPath: string | null;
  readonly onInputChange: (text: string) => void;
  readonly onSendTurn: (selection: ComposerSelection) => Promise<void>;
}

export function HomeComposer(props: HomeComposerProps): JSX.Element {
  return (
    <footer className="composer-area">
      <ComposerCard {...props} />
      <ComposerFooter />
    </footer>
  );
}

function ComposerCard(props: HomeComposerProps): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const [planModeEnabled, setPlanModeEnabled] = useState(false);
  const composerSelection = useComposerSelection(props.models, props.defaultModel, props.defaultEffort);
  const canSend = !props.busy && props.selectedRootPath !== null && props.inputText.trim().length >= MIN_TRIMMED_MESSAGE_LENGTH;
  const placeholder = getComposerPlaceholder(props.selectedRootPath);
  const handleCloseMenu = () => setMenuOpen(false);
  const handleToggleMenu = () => setMenuOpen((value) => !value);
  const handleTogglePlanMode = () => setPlanModeEnabled((value) => !value);
  const handleSend = () => void props.onSendTurn(createSelection(composerSelection.selectedModel, composerSelection.selectedEffort));

  return (
    <div className="composer-card">
      {menuOpen ? <button type="button" className="composer-popover-backdrop" aria-label="关闭添加菜单" onClick={handleCloseMenu} /> : null}
      <textarea
        className="composer-input"
        placeholder={placeholder}
        value={props.inputText}
        onChange={(event) => props.onInputChange(event.currentTarget.value)}
      />
      <div className="composer-bar">
        <div className="composer-left">
          <AddMenuButton
            menuOpen={menuOpen}
            planModeEnabled={planModeEnabled}
            onCloseMenu={handleCloseMenu}
            onToggleMenu={handleToggleMenu}
            onTogglePlanMode={handleTogglePlanMode}
          />
          <ComposerModelControls
            models={props.models}
            selectedModel={composerSelection.selectedModel}
            selectedEffort={composerSelection.selectedEffort}
            supportedEfforts={composerSelection.selectedModelOption?.supportedEfforts ?? []}
            onSelectModel={composerSelection.selectModel}
            onSelectEffort={composerSelection.selectEffort}
          />
        </div>
        <SendButton canSend={canSend} onClick={handleSend} />
      </div>
    </div>
  );
}

function AddMenuButton(props: {
  readonly menuOpen: boolean;
  readonly planModeEnabled: boolean;
  readonly onCloseMenu: () => void;
  readonly onToggleMenu: () => void;
  readonly onTogglePlanMode: () => void;
}): JSX.Element {
  return (
    <div className="composer-plus-anchor">
      {props.menuOpen ? (
        <ComposerAttachmentMenu
          planModeEnabled={props.planModeEnabled}
          onTogglePlanMode={props.onTogglePlanMode}
          onClose={props.onCloseMenu}
        />
      ) : null}
      <button
        type="button"
        className={props.menuOpen ? "composer-mini-btn composer-mini-btn-active" : "composer-mini-btn"}
        aria-label="添加"
        aria-haspopup="menu"
        aria-expanded={props.menuOpen}
        onClick={props.onToggleMenu}
      >
        <OfficialPlusIcon className="composer-plus-icon" />
      </button>
    </div>
  );
}

function SendButton(props: { readonly canSend: boolean; readonly onClick: () => void }): JSX.Element {
  return (
    <button type="button" className="send-btn" aria-label="发送消息" disabled={!props.canSend} onClick={props.onClick}>
      <SendArrowIcon className="send-icon" />
    </button>
  );
}

function createSelection(model: string | null, effort: ComposerSelection["effort"]): ComposerSelection {
  return { model, effort };
}

function getComposerPlaceholder(selectedRootPath: string | null): string {
  return selectedRootPath === null ? "向 Codex 提问，或先添加文件、调用命令" : "输入问题，后续对话会固定在当前工作区";
}

function SendArrowIcon(props: { readonly className?: string }): JSX.Element {
  return (
    <svg className={props.className} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 13.3V2.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M3.2 7.1L8 2.3l4.8 4.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
