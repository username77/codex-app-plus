import type { ReactNode } from "react";
import type { TerminalTab } from "../hooks/useTerminalTabs";

interface TerminalDockProps {
  readonly activeTabId: string | null;
  readonly children: ReactNode;
  readonly hasWorkspace: boolean;
  readonly isOpen: boolean;
  readonly onCloseTab: (tabId: string) => void;
  readonly onCreateTab: () => void;
  readonly onSelectTab: (tabId: string) => void;
  readonly tabs: ReadonlyArray<TerminalTab>;
}

export function TerminalDock(props: TerminalDockProps): JSX.Element {
  const emptyLabel = props.hasWorkspace ? "暂无终端会话" : "选择工作区后可打开终端";

  return (
    <section
      className={`replica-terminal${props.isOpen ? "" : " replica-terminal-hidden"}`}
      aria-label="Terminal"
    >
      <div className="terminal-tabs-bar">
        <div className="terminal-tabs" role="tablist" aria-label="Terminal tabs">
          {props.tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              className={`terminal-tab${tab.id === props.activeTabId ? " active" : ""}`}
              aria-selected={tab.id === props.activeTabId}
              onClick={() => props.onSelectTab(tab.id)}
            >
              <span className="terminal-tab-label">{tab.title}</span>
              <span
                className="terminal-tab-close"
                role="button"
                aria-label={`Close ${tab.title}`}
                onClick={(event) => {
                  event.stopPropagation();
                  props.onCloseTab(tab.id);
                }}
              >
                ×
              </span>
            </button>
          ))}
        </div>
        <div className="terminal-tabs-actions">
          <button
            type="button"
            className="terminal-tab-add"
            onClick={props.onCreateTab}
            disabled={!props.hasWorkspace}
            aria-label="New terminal"
            title="New terminal"
          >
            +
          </button>
        </div>
      </div>
      <div className="terminal-dock-body">
        {props.children}
        {props.tabs.length === 0 ? (
          <div className="terminal-empty-state">{emptyLabel}</div>
        ) : null}
      </div>
    </section>
  );
}
