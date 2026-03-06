import type { HostBridge } from "../../bridge/types";
import { OfficialCloseIcon } from "../replica/officialIcons";
import { useEmbeddedTerminal } from "./useEmbeddedTerminal";

interface TerminalPanelProps {
  readonly hostBridge: HostBridge;
  readonly open: boolean;
  readonly cwd: string | null;
  readonly cwdLabel: string;
  readonly onClose: () => void;
}

export function TerminalPanel(props: TerminalPanelProps): JSX.Element {
  const terminal = useEmbeddedTerminal(props);

  return (
    <section className={terminal.className} aria-label="终端">
      <header className="terminal-toolbar">
        <div className="terminal-title">
          <span className="terminal-title-main">终端</span>
          <span className="terminal-title-sub">{terminal.subtitle}</span>
          <span className={`terminal-status terminal-status-${terminal.status}`}>{terminal.statusLabel}</span>
        </div>
        <div className="terminal-actions">
          {terminal.showRestartAction ? (
            <button type="button" className="terminal-action-btn" onClick={() => void terminal.openTerminal()}>
              重新打开
            </button>
          ) : null}
          <button type="button" className="terminal-close-btn" aria-label="关闭终端" onClick={props.onClose}>
            <OfficialCloseIcon className="terminal-close-icon" />
          </button>
        </div>
      </header>
      {terminal.errorMessage === null ? null : <div className="terminal-error">{terminal.errorMessage}</div>}
      <div className="terminal-body" onClick={terminal.focusTerminal}>
        <div ref={terminal.containerRef} className="terminal-surface" />
      </div>
    </section>
  );
}
