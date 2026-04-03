import { useCallback, useRef } from "react";
import type { ProtocolClient } from "../../protocol/client";
import type { AppStoreApi } from "../../state/store";
import type { ReceivedServerRequest } from "../../domain/serverRequests";
import {
  decrementThreadElicitation,
  incrementThreadElicitation,
  reportServerRequestError,
} from "./appControllerServerRequests";

export interface ServerRequestTracker {
  readonly trackThreadRequest: (request: ReceivedServerRequest) => void;
  readonly settleThreadRequest: (requestId: string) => void;
  readonly clearOnDisconnect: () => void;
}

export function useServerRequestTracker(
  clientRef: React.RefObject<ProtocolClient | null>,
  dispatch: AppStoreApi["dispatch"],
): ServerRequestTracker {
  const pausedRequestThreadIdsRef = useRef(new Map<string, string>());
  const requestThreadMetaRef = useRef(new Map<string, { threadId: string; turnId: string | null }>());
  const settledRequestIdsRef = useRef(new Set<string>());

  const resumeThreadTimeout = useCallback((threadId: string, turnId: string | null) => {
    if (clientRef.current === null) {
      return;
    }
    void decrementThreadElicitation(clientRef.current, threadId).catch((error) => {
      reportServerRequestError(dispatch, { threadId, turnId }, "Failed to resume request timeout", error);
    });
  }, [clientRef, dispatch]);

  const trackThreadRequest = useCallback((request: ReceivedServerRequest) => {
    if (request.threadId === null || clientRef.current === null || pausedRequestThreadIdsRef.current.has(request.id)) {
      return;
    }
    const { threadId } = request;
    requestThreadMetaRef.current.set(request.id, { threadId, turnId: request.turnId });
    void incrementThreadElicitation(clientRef.current, threadId)
      .then(() => {
        if (settledRequestIdsRef.current.delete(request.id)) {
          requestThreadMetaRef.current.delete(request.id);
          resumeThreadTimeout(threadId, request.turnId);
          return;
        }
        pausedRequestThreadIdsRef.current.set(request.id, threadId);
      })
      .catch((error) => {
        requestThreadMetaRef.current.delete(request.id);
        reportServerRequestError(dispatch, request, "Failed to pause request timeout", error);
      });
  }, [clientRef, dispatch, resumeThreadTimeout]);

  const settleThreadRequest = useCallback((requestId: string) => {
    const threadId = pausedRequestThreadIdsRef.current.get(requestId);
    const requestMeta = requestThreadMetaRef.current.get(requestId) ?? null;
    if (threadId === undefined) {
      if (requestMeta !== null) {
        settledRequestIdsRef.current.add(requestId);
      }
      return;
    }
    pausedRequestThreadIdsRef.current.delete(requestId);
    requestThreadMetaRef.current.delete(requestId);
    resumeThreadTimeout(threadId, requestMeta?.turnId ?? null);
  }, [resumeThreadTimeout]);

  const clearOnDisconnect = useCallback(() => {
    pausedRequestThreadIdsRef.current.clear();
    requestThreadMetaRef.current.clear();
    settledRequestIdsRef.current.clear();
  }, []);

  return { trackThreadRequest, settleThreadRequest, clearOnDisconnect };
}
