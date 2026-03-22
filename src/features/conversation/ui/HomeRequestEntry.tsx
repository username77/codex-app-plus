import { useState } from "react";
import type { ServerRequestResolution } from "../../../domain/types";
import type {
  PendingApprovalEntry,
  PendingTokenRefreshEntry,
  PendingToolCallEntry,
} from "../../../domain/timeline";
import { createRequestActions } from "../../shared/utils/requestApprovalActions";
import { HomeEntryCard } from "./HomeEntryCard";

interface HomeRequestEntryProps {
  readonly entry: PendingApprovalEntry | PendingToolCallEntry | PendingTokenRefreshEntry;
  readonly onResolveServerRequest: (resolution: ServerRequestResolution) => Promise<void>;
}

export function HomeRequestEntry(props: HomeRequestEntryProps): JSX.Element {
  if (props.entry.kind === "pendingApproval") return <ApprovalRequest entry={props.entry} onResolveServerRequest={props.onResolveServerRequest} />;
  if (props.entry.kind === "pendingToolCall") return <ToolCallRequestCard entry={props.entry} onResolveServerRequest={props.onResolveServerRequest} />;
  return <TokenRefreshRequestCard entry={props.entry} onResolveServerRequest={props.onResolveServerRequest} />;
}

function ApprovalRequest(props: { readonly entry: PendingApprovalEntry; readonly onResolveServerRequest: (resolution: ServerRequestResolution) => Promise<void> }): JSX.Element {
  const request = props.entry.request;
  const buttons = createRequestActions(request);
  return <HomeEntryCard className="home-request-card" title={createApprovalTitle(request.kind)} status="Pending" meta={request.method}>{renderApprovalBody(props.entry)}<div className="home-request-actions">{buttons.map((button) => <button key={button.key} type="button" className={button.primary ? "home-request-button home-request-button-primary" : "home-request-button"} onClick={() => void props.onResolveServerRequest(button.resolution)}>{button.label}</button>)}</div></HomeEntryCard>;
}

function renderApprovalBody(entry: PendingApprovalEntry): JSX.Element {
  const request = entry.request;
  if (request.kind === "commandApproval") {
    return <><pre className="home-request-code">{request.params.command ?? "(unknown command)"}</pre>{request.params.cwd ? <p className="home-request-copy">{request.params.cwd}</p> : null}{request.params.reason ? <p className="home-request-copy">{request.params.reason}</p> : null}</>;
  }
  if (request.kind === "fileApproval") {
    return <p className="home-request-copy">{request.params.reason ?? "Review the proposed file changes before continuing."}</p>;
  }
  if (request.kind === "legacyCommandApproval") {
    return <><pre className="home-request-code">{request.params.command.join(" ")}</pre><p className="home-request-copy">{request.params.cwd}</p>{request.params.reason ? <p className="home-request-copy">{request.params.reason}</p> : null}</>;
  }
  return <><p className="home-request-copy">{request.params.reason ?? "Review the patch before allowing it to be applied."}</p>{request.params.grantRoot ? <p className="home-request-copy">{`Grant root: ${request.params.grantRoot}`}</p> : null}<pre className="home-request-code">{Object.keys(request.params.fileChanges).join("\n")}</pre></>;
}

function ToolCallRequestCard(props: { readonly entry: PendingToolCallEntry; readonly onResolveServerRequest: (resolution: ServerRequestResolution) => Promise<void> }): JSX.Element {
  const [value, setValue] = useState("{}");
  const [error, setError] = useState<string | null>(null);
  return <HomeEntryCard className="home-request-card" title={`Tool invocation · ${props.entry.request.tool}`} status="Pending" meta={props.entry.request.method}><pre className="home-request-code">{JSON.stringify(props.entry.request.arguments, null, 2)}</pre>{error ? <p className="home-request-copy">{error}</p> : null}<textarea className="home-request-textarea" value={value} onChange={(event) => setValue(event.target.value)} /><div className="home-request-actions"><button type="button" className="home-request-button home-request-button-primary" onClick={() => { try { const result = JSON.parse(value); setError(null); void props.onResolveServerRequest({ kind: "toolCall", requestId: props.entry.requestId, result }); } catch (parseError) { setError(`Invalid JSON: ${String(parseError)}`); } }}>Submit result</button></div></HomeEntryCard>;
}

function TokenRefreshRequestCard(props: { readonly entry: PendingTokenRefreshEntry; readonly onResolveServerRequest: (resolution: ServerRequestResolution) => Promise<void> }): JSX.Element {
  const [accessToken, setAccessToken] = useState("");
  const [chatgptAccountId, setChatgptAccountId] = useState(props.entry.request.params.previousAccountId ?? "");
  const [chatgptPlanType, setChatgptPlanType] = useState("");
  return <HomeEntryCard className="home-request-card" title="ChatGPT token refresh" status="Pending" meta={props.entry.request.method}><p className="home-request-copy">A fresh ChatGPT access token is required to continue.</p><input className="home-request-input" type="password" value={accessToken} placeholder="Access token" onChange={(event) => setAccessToken(event.target.value)} /><input className="home-request-input" type="text" value={chatgptAccountId} placeholder="ChatGPT account ID" onChange={(event) => setChatgptAccountId(event.target.value)} /><input className="home-request-input" type="text" value={chatgptPlanType} placeholder="Plan type (optional)" onChange={(event) => setChatgptPlanType(event.target.value)} /><div className="home-request-actions"><button type="button" className="home-request-button home-request-button-primary" onClick={() => void props.onResolveServerRequest({ kind: "tokenRefresh", requestId: props.entry.requestId, result: { accessToken, chatgptAccountId, chatgptPlanType: chatgptPlanType.trim().length === 0 ? null : chatgptPlanType.trim() } })}>Submit tokens</button></div></HomeEntryCard>;
}

function createApprovalTitle(kind: PendingApprovalEntry["request"]["kind"]): string {
  if (kind === "commandApproval" || kind === "legacyCommandApproval") return "Command approval";
  if (kind === "legacyPatchApproval") return "Patch approval";
  return "File approval";
}
