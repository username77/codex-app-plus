import type { AppAction, AuthStatus } from "../../domain/types";
import type { GetAuthStatusResponse } from "../../protocol/generated/GetAuthStatusResponse";
import type { GetAccountRateLimitsResponse } from "../../protocol/generated/v2/GetAccountRateLimitsResponse";
import type { GetAccountResponse } from "../../protocol/generated/v2/GetAccountResponse";
import type { LoginAccountResponse } from "../../protocol/generated/v2/LoginAccountResponse";
import type { AccountRequestClient, AppHostBridge } from "./appControllerTypes";

type Dispatch = (action: AppAction) => void;

function mapAuthStatus(response: GetAuthStatusResponse): { status: AuthStatus; mode: string | null } {
  if (response.requiresOpenaiAuth === true && response.authMethod === null) {
    return { status: "needs_login", mode: null };
  }
  if (response.authMethod !== null || response.requiresOpenaiAuth === false) {
    return { status: "authenticated", mode: response.authMethod };
  }
  return { status: "unknown", mode: response.authMethod };
}

async function loadAuthStatus(client: AccountRequestClient, dispatch: Dispatch): Promise<void> {
  try {
    const response = (await client.request("getAuthStatus", { includeToken: false, refreshToken: false })) as GetAuthStatusResponse;
    const auth = mapAuthStatus(response);
    dispatch({ type: "auth/changed", status: auth.status, mode: auth.mode });
  } catch {
    dispatch({ type: "auth/changed", status: "unknown", mode: null });
  }
}

async function loadAccountSnapshot(client: AccountRequestClient, dispatch: Dispatch): Promise<void> {
  try {
    const response = (await client.request("account/read", { refreshToken: false })) as GetAccountResponse;
    if (response.account === null) {
      dispatch({ type: "account/updated", account: null });
      return;
    }
    dispatch({
      type: "account/updated",
      account: {
        authMode: response.account.type === "apiKey" ? "apikey" : "chatgpt",
        planType: response.account.type === "chatgpt" ? response.account.planType : null,
      },
    });
  } catch {
    dispatch({ type: "account/updated", account: null });
  }
}

async function loadRateLimits(client: AccountRequestClient, dispatch: Dispatch): Promise<void> {
  try {
    const response = (await client.request("account/rateLimits/read", undefined)) as GetAccountRateLimitsResponse;
    dispatch({ type: "rateLimits/updated", rateLimits: response.rateLimits });
  } catch {
    dispatch({ type: "rateLimits/updated", rateLimits: null });
  }
}

export async function refreshAccountState(client: AccountRequestClient, dispatch: Dispatch): Promise<void> {
  await Promise.all([
    loadAuthStatus(client, dispatch),
    loadAccountSnapshot(client, dispatch),
    loadRateLimits(client, dispatch),
  ]);
}

export async function openChatgptLogin(
  client: AccountRequestClient,
  hostBridge: AppHostBridge,
  dispatch: Dispatch,
): Promise<boolean> {
  const response = (await client.request("account/login/start", { type: "chatgpt" })) as LoginAccountResponse;
  if (response.type !== "chatgpt") {
    dispatch({ type: "authLogin/completed", success: true, error: null });
    return false;
  }
  dispatch({ type: "authLogin/started", loginId: response.loginId, authUrl: response.authUrl });
  await hostBridge.app.openExternal(response.authUrl);
  return true;
}

export async function loginWithStoredTokens(client: AccountRequestClient, hostBridge: AppHostBridge): Promise<boolean> {
  try {
    const tokens = await hostBridge.app.readChatgptAuthTokens();
    await hostBridge.app.writeChatgptAuthTokens(tokens);
    const response = (await client.request("account/login/start", {
      type: "chatgptAuthTokens",
      accessToken: tokens.accessToken,
      chatgptAccountId: tokens.chatgptAccountId,
      chatgptPlanType: tokens.chatgptPlanType,
    })) as LoginAccountResponse;
    return response.type === "chatgptAuthTokens";
  } catch {
    return false;
  }
}

export async function logoutWithLocalCleanup(
  client: AccountRequestClient,
  hostBridge: AppHostBridge,
  dispatch: Dispatch,
): Promise<void> {
  await client.request("account/logout", undefined);
  await hostBridge.app.clearChatgptAuthState();
  await refreshAccountState(client, dispatch);
}
