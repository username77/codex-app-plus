import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HostBridge } from "../bridge/types";
import { AppStoreProvider } from "../state/store";

const protocolState = vi.hoisted(() => ({
  handlers: null as null | {
    onConnectionChanged: (status: "disconnected" | "connecting" | "connected" | "error") => void;
    onNotification: (method: string, params: unknown) => void;
    onServerRequest: (id: string, method: string, params: unknown) => void;
    onFatalError: (message: string) => void;
  },
  request: vi.fn(),
  startAppServer: vi.fn().mockResolvedValue(undefined),
  restartAppServer: vi.fn().mockResolvedValue(undefined),
  stopAppServer: vi.fn().mockResolvedValue(undefined),
  initializeConnection: vi.fn().mockResolvedValue(undefined),
  resolveServerRequest: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../protocol/client", () => ({
  ProtocolClient: class {
    constructor(_hostBridge: HostBridge, handlers: (typeof protocolState)["handlers"]) {
      protocolState.handlers = handlers;
    }

    attach(): Promise<void> {
      return Promise.resolve();
    }

    detach(): void {}

    startAppServer(): Promise<void> {
      return protocolState.startAppServer();
    }

    restartAppServer(): Promise<void> {
      return protocolState.restartAppServer();
    }

    stopAppServer(): Promise<void> {
      return protocolState.stopAppServer();
    }

    initializeConnection(): Promise<void> {
      return protocolState.initializeConnection();
    }

    request(method: string, params: unknown): Promise<unknown> {
      return protocolState.request(method, params);
    }

    resolveServerRequest(requestId: string, result: unknown): Promise<void> {
      return protocolState.resolveServerRequest(requestId, result);
    }
  },
}));

vi.mock("./configOperations", () => ({
  batchWriteConfigAndReadSnapshot: vi.fn(),
  batchWriteConfigAndRefresh: vi.fn(),
  listAllExperimentalFeatures: vi.fn().mockResolvedValue([]),
  listAllMcpServerStatuses: vi.fn().mockResolvedValue([]),
  readConfigSnapshot: vi.fn(),
  refreshMcpData: vi.fn(),
  writeConfigValueAndRefresh: vi.fn(),
}));

vi.mock("./threadCatalog", () => ({
  loadThreadCatalog: vi.fn().mockResolvedValue([]),
}));

vi.mock("./windowsSandboxSetup", () => ({
  refreshConfigAfterWindowsSandboxSetup: vi.fn().mockResolvedValue(undefined),
  startWindowsSandboxSetupRequest: vi.fn(),
}));

import {
  loginWithStoredTokens,
  logoutWithLocalCleanup,
  openChatgptLogin,
  useAppController,
} from "./useAppController";

function createHostBridge(overrides?: Partial<HostBridge["app"]>): HostBridge {
  return {
    app: {
      openExternal: vi.fn().mockResolvedValue(undefined),
      openWorkspace: vi.fn().mockResolvedValue(undefined),
      openCodexConfigToml: vi.fn().mockResolvedValue(undefined),
      readGlobalAgentInstructions: vi.fn(),
      writeGlobalAgentInstructions: vi.fn(),
      listCodexProviders: vi.fn(),
      upsertCodexProvider: vi.fn(),
      deleteCodexProvider: vi.fn(),
      applyCodexProvider: vi.fn(),
      readChatgptAuthTokens: vi.fn().mockResolvedValue({
        accessToken: "token-123",
        chatgptAccountId: "account-123",
        chatgptPlanType: "plus",
        source: "cache",
      }),
      writeChatgptAuthTokens: vi.fn().mockImplementation(async (value) => value),
      clearChatgptAuthState: vi.fn().mockResolvedValue(undefined),
      showNotification: vi.fn().mockResolvedValue(undefined),
      showContextMenu: vi.fn().mockResolvedValue(undefined),
      importOfficialData: vi.fn().mockResolvedValue(undefined),
      listCodexSessions: vi.fn().mockResolvedValue([]),
      readCodexSession: vi.fn(),
      deleteCodexSession: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    },
    appServer: {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      restart: vi.fn().mockResolvedValue(undefined),
    },
    rpc: {
      request: vi.fn(),
      notify: vi.fn(),
      cancel: vi.fn(),
    },
    serverRequest: {
      resolve: vi.fn().mockResolvedValue(undefined),
    },
    subscribe: vi.fn().mockResolvedValue(() => undefined),
    git: {} as HostBridge["git"],
    terminal: {} as HostBridge["terminal"],
  } as unknown as HostBridge;
}

function createRequestStub() {
  return vi.fn(async (method: string) => {
    switch (method) {
      case "account/login/start":
        return { type: "chatgptAuthTokens" };
      case "account/logout":
        return {};
      case "getAuthStatus":
        return { requiresOpenaiAuth: false, authMethod: "chatgpt" };
      case "account/read":
        return { account: { type: "chatgpt", email: "user@example.com", planType: "plus" }, requiresOpenaiAuth: false };
      case "account/rateLimits/read":
        return { rateLimits: null };
      case "config/read":
        return { config: {}, version: 1, layers: [] };
      case "collaborationMode/list":
        return { data: [] };
      default:
        return {};
    }
  });
}

function wrapper(props: PropsWithChildren): JSX.Element {
  return <AppStoreProvider>{props.children}</AppStoreProvider>;
}

describe("useAppController auth helpers", () => {
  beforeEach(() => {
    protocolState.handlers = null;
    protocolState.request = createRequestStub();
    protocolState.startAppServer.mockClear();
    protocolState.restartAppServer.mockClear();
    protocolState.initializeConnection.mockClear();
    protocolState.resolveServerRequest.mockClear();
  });

  it("logs in with stored ChatGPT tokens when available", async () => {
    const client = { request: vi.fn().mockResolvedValue({ type: "chatgptAuthTokens" }) };
    const hostBridge = createHostBridge();

    const success = await loginWithStoredTokens(client as never, hostBridge as never);

    expect(success).toBe(true);
    expect(hostBridge.app.readChatgptAuthTokens).toHaveBeenCalledTimes(1);
    expect(hostBridge.app.writeChatgptAuthTokens).toHaveBeenCalledTimes(1);
    expect(client.request).toHaveBeenCalledWith("account/login/start", expect.objectContaining({ type: "chatgptAuthTokens" }));
  });

  it("opens the browser for ChatGPT OAuth when required", async () => {
    const dispatch = vi.fn();
    const client = { request: vi.fn().mockResolvedValue({ type: "chatgpt", loginId: "login-1", authUrl: "https://example.com/auth" }) };
    const hostBridge = createHostBridge();

    const openedBrowser = await openChatgptLogin(client as never, hostBridge as never, dispatch);

    expect(openedBrowser).toBe(true);
    expect(dispatch).toHaveBeenCalledWith({ type: "authLogin/started", loginId: "login-1", authUrl: "https://example.com/auth" });
    expect(hostBridge.app.openExternal).toHaveBeenCalledWith("https://example.com/auth");
  });

  it("cleans local auth state during logout", async () => {
    const dispatch = vi.fn();
    const client = { request: createRequestStub() };
    const hostBridge = createHostBridge();

    await logoutWithLocalCleanup(client as never, hostBridge as never, dispatch);

    expect(client.request).toHaveBeenCalledWith("account/logout", undefined);
    expect(hostBridge.app.clearChatgptAuthState).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: "auth/changed", status: "authenticated", mode: "chatgpt" });
  });

  it("refreshes account state after account/login/completed succeeds", async () => {
    const hostBridge = createHostBridge();
    const { result } = renderHook(() => useAppController(hostBridge), { wrapper });

    await waitFor(() => {
      expect(result.current.state.initialized).toBe(true);
    });
    protocolState.request.mockClear();

    protocolState.handlers?.onNotification("account/login/completed", { loginId: "login-1", success: true, error: null });

    await waitFor(() => {
      expect(protocolState.request).toHaveBeenCalledWith("getAuthStatus", { includeToken: false, refreshToken: false });
      expect(protocolState.request).toHaveBeenCalledWith("account/read", { refreshToken: false });
      expect(protocolState.request).toHaveBeenCalledWith("account/rateLimits/read", undefined);
    });
  });
});
