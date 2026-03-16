import type { AppAction } from "../../domain/types";
import type { ReceivedServerRequest } from "../../domain/serverRequests";
import { ProtocolClient } from "../../protocol/client";
import { toErrorMessage } from "./appControllerTypes";

type Dispatch = (action: AppAction) => void;

export async function incrementThreadElicitation(client: ProtocolClient, threadId: string): Promise<void> {
  await client.request("thread/increment_elicitation", { threadId });
}

export async function decrementThreadElicitation(client: ProtocolClient, threadId: string): Promise<void> {
  await client.request("thread/decrement_elicitation", { threadId });
}

export function reportServerRequestError(
  dispatch: Dispatch,
  request: Pick<ReceivedServerRequest, "threadId" | "turnId">,
  title: string,
  error: unknown,
): void {
  const detail = toErrorMessage(error);
  dispatch({
    type: "banner/pushed",
    banner: { id: `server-request:${title}:${detail}`, level: "error", title, detail, source: "server-request" },
  });
  if (request.threadId !== null) {
    dispatch({
      type: "conversation/systemNoticeAdded",
      conversationId: request.threadId,
      turnId: request.turnId,
      title,
      detail,
      level: "error",
      source: "server-request",
    });
  }
}
