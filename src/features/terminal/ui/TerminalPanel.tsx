import type { Ref } from "react";
import type { TerminalStatus } from "../model/terminalRuntime";

interface TerminalPanelProps {
  readonly containerRef: Ref<HTMLDivElement>;
  readonly message: string;
  readonly onRestart: () => void;
  readonly status: TerminalStatus;
}

export function TerminalPanel(props: TerminalPanelProps): JSX.Element {
  const showRestart = props.status === "exited" || props.status === "error";

  return (
    <div className="terminal-body">
      <div className="terminal-shell">
        <div ref={props.containerRef} className="terminal-surface" />
        {props.status !== "ready" ? (
          <div className="terminal-overlay">
            <div className="terminal-overlay-message">
              <span>{props.message}</span>
              {showRestart ? (
                <button
                  type="button"
                  className="terminal-overlay-action"
                  onClick={props.onRestart}
                >
                  Reopen
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
