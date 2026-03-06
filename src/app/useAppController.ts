import { useCallback, useEffect, useMemo, useRef } from "react";
import type { HostBridge } from "../bridge/types";
import type { AppAction, AppState, AuthStatus } from "../domain/types";
import type { GetAuthStatusResponse } from "../protocol/generated/GetAuthStatusResponse";
import type { InitializeParams } from "../protocol/generated/InitializeParams";
import type { AgentMessageDeltaNotification } from "../protocol/generated/v2/AgentMessageDeltaNotification";
import type { ServerRequestResolvedNotification } from "../protocol/generated/v2/ServerRequestResolvedNotification";
import type { ThreadStartedNotification } from "../protocol/generated/v2/ThreadStartedNotification";
import type { TurnCompletedNotification } from "../protocol/generated/v2/TurnCompletedNotification";
import { listAllThreads, mapCodexSessionsToThreads, mergeThreadCatalogs } from "./threadCatalog";
import { ProtocolClient } from "../protocol/client";
import { mapThreadToSummary } from "../protocol/mappers";
import { useAppStore } from "../state/store";

const APP_VERSION = "0.1.0";
const RETRY_DELAY_MS = 3_000;

interface AppController {
  readonly state: AppState;
  setInput: (text: string) => void;
  retryConnection: () => Promise<void>;
  login: () => Promise<void>;
  approveRequest: (requestId: string) => Promise<void>;
  rejectRequest: (requestId: string) => Promise<void>;
  selectThread: (threadId: string) => void;
}

function createInitializeParams(): InitializeParams {
  return {
    clientInfo: {
      name: "codex_app_plus",
      title: "Codex App Plus",
      version: APP_VERSION
    },
    capabilities: {
      experimentalApi: true,
      optOutNotificationMethods: null
    }
  };
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function mapAuthStatus(response: GetAuthStatusResponse): { status: AuthStatus; mode: string | null } {
  if (response.requiresOpenaiAuth === true && response.authMethod === null) {
    return { status: "needs_login", mode: null };
  }
  if (response.authMethod !== null || response.requiresOpenaiAuth === false) {
    return { status: "authenticated", mode: response.authMethod };
  }
  return { status: "unknown", mode: response.authMethod };
}

async function loadBootstrapSnapshot(
  client: ProtocolClient,
  hostBridge: HostBridge,
  dispatch: (action: AppAction) => void
): Promise<void> {
  await loadAuthStatus(client, dispatch);
  await loadThreads(client, hostBridge, dispatch);
  const config = await client.request("config/read", { includeLayers: true });
  dispatch({ type: "config/loaded", config });
}

async function loadAuthStatus(client: ProtocolClient, dispatch: (action: AppAction) => void): Promise<void> {
  try {
    const response = (await client.request("getAuthStatus", {
      includeToken: false,
      refreshToken: false
    })) as GetAuthStatusResponse;
    const auth = mapAuthStatus(response);
    dispatch({ type: "auth/changed", status: auth.status, mode: auth.mode });
  } catch {
    dispatch({ type: "auth/changed", status: "unknown", mode: null });
  }
}

async function loadThreads(
  client: ProtocolClient,
  hostBridge: HostBridge,
  dispatch: (action: AppAction) => void
): Promise<void> {
  const remoteThreads = await listAllThreads({ request: (method, params) => client.request(method, params) });
  const codexSessions = await hostBridge.app.listCodexSessions();
  const threads = mergeThreadCatalogs(remoteThreads, mapCodexSessionsToThreads(codexSessions));
  dispatch({ type: "threads/loaded", threads });
}

function applyNotification(dispatch: (action: AppAction) => void, method: string, params: unknown): void {
  if (method === "item/agentMessage/delta") {
    const payload = params as AgentMessageDeltaNotification;
    dispatch({
      type: "message/assistantDelta",
      threadId: payload.threadId,
      turnId: payload.turnId,
      itemId: payload.itemId,
      delta: payload.delta
    });
    return;
  }

  if (method === "turn/completed") {
    const payload = params as TurnCompletedNotification;
    dispatch({ type: "turn/completed", threadId: payload.threadId, turnId: payload.turn.id });
    return;
  }

  if (method === "thread/started") {
    const payload = params as ThreadStartedNotification;
    dispatch({ type: "thread/upserted", thread: mapThreadToSummary(payload.thread) });
    return;
  }

  if (method === "serverRequest/resolved") {
    const payload = params as ServerRequestResolvedNotification;
    dispatch({ type: "serverRequest/resolved", requestId: String(payload.requestId) });
  }
}

async function startOrReuseAppServer(client: ProtocolClient): Promise<void> {
  try {
    await client.startAppServer();
  } catch (error) {
    if (!toErrorMessage(error).includes("已在运行")) {
      throw error;
    }
  }
}

export function useAppController(hostBridge: HostBridge): AppController {
  const { state, dispatch } = useAppStore();
  const clientRef = useRef<ProtocolClient | null>(null);
  const bootStartedRef = useRef(false);
  const bootingRef = useRef(false);
  const retryTimerRef = useRef<number | null>(null);
  const retryHandlerRef = useRef<() => void>(() => undefined);

  const clearRetry = useCallback(() => {
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    dispatch({ type: "retry/scheduled", at: null });
  }, [dispatch]);

  const scheduleRetry = useCallback(() => {
    if (retryTimerRef.current !== null) {
      return;
    }
    const scheduledAt = Date.now() + RETRY_DELAY_MS;
    dispatch({ type: "retry/scheduled", at: scheduledAt });
    retryTimerRef.current = window.setTimeout(() => {
      retryTimerRef.current = null;
      dispatch({ type: "retry/scheduled", at: null });
      void retryHandlerRef.current();
    }, RETRY_DELAY_MS);
  }, [dispatch]);

  const client = useMemo(() => {
    if (clientRef.current !== null) {
      return clientRef.current;
    }

    clientRef.current = new ProtocolClient(hostBridge, {
      onConnectionChanged: (status) => dispatch({ type: "connection/changed", status }),
      onNotification: (method, params) => {
        dispatch({ type: "notification/received", notification: { method, params } });
        applyNotification(dispatch, method, params);
      },
      onServerRequest: (id, method, params) => {
        dispatch({ type: "serverRequest/received", request: { id, method, params } });
      },
      onFatalError: (message) => {
        dispatch({ type: "fatal/error", message });
        scheduleRetry();
      }
    });
    return clientRef.current;
  }, [dispatch, hostBridge, scheduleRetry]);

  const bootstrap = useCallback(
    async (forceRestart: boolean) => {
      if (bootingRef.current) {
        return;
      }
      bootingRef.current = true;
      clearRetry();
      dispatch({ type: "busy/changed", busy: true });
      dispatch({ type: "initialized/changed", ready: false });
      try {
        if (forceRestart) {
          await client.restartAppServer();
        } else {
          await startOrReuseAppServer(client);
        }
        await client.initializeConnection(createInitializeParams());
        dispatch({ type: "initialized/changed", ready: true });
        await loadBootstrapSnapshot(client, hostBridge, dispatch);
      } catch (error) {
        dispatch({ type: "fatal/error", message: toErrorMessage(error) });
        scheduleRetry();
      } finally {
        dispatch({ type: "busy/changed", busy: false });
        bootingRef.current = false;
      }
    },
    [clearRetry, client, dispatch, hostBridge, scheduleRetry]
  );

  retryHandlerRef.current = () => void bootstrap(true);

  useEffect(() => {
    void client.attach();
    return () => {
      client.detach();
      clearRetry();
    };
  }, [client, clearRetry]);

  useEffect(() => {
    if (bootStartedRef.current) {
      return;
    }
    bootStartedRef.current = true;
    void bootstrap(false);
  }, [bootstrap]);

  const runBusy = useCallback(
    async (runner: () => Promise<void>) => {
      dispatch({ type: "busy/changed", busy: true });
      try {
        await runner();
      } finally {
        dispatch({ type: "busy/changed", busy: false });
      }
    },
    [dispatch]
  );

  const login = useCallback(async () => {
    await runBusy(async () => {
      await client.request("account/login/start", { type: "chatgpt" });
    });
  }, [client, runBusy]);

  const approveRequest = useCallback(
    async (requestId: string) => {
      await runBusy(async () => {
        await client.resolveServerRequest(requestId, { approved: true });
        dispatch({ type: "serverRequest/resolved", requestId });
      });
    },
    [client, dispatch, runBusy]
  );

  const rejectRequest = useCallback(
    async (requestId: string) => {
      await runBusy(async () => {
        await client.rejectServerRequest(requestId, 4001, "Rejected by user");
        dispatch({ type: "serverRequest/resolved", requestId });
      });
    },
    [client, dispatch, runBusy]
  );

  return {
    state,
    setInput: (text) => dispatch({ type: "input/changed", value: text }),
    retryConnection: () => bootstrap(true),
    login,
    approveRequest,
    rejectRequest,
    selectThread: (threadId) => dispatch({ type: "thread/selected", threadId })
  };
}
