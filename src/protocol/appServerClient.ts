import type { HostBridge } from "../bridge/types";
import type { ClientRequest } from "./generated/ClientRequest";

type ClientMethod = ClientRequest["method"];
type ParamsByMethod<M extends ClientMethod> = Extract<ClientRequest, { method: M }> extends {
  params: infer Params;
}
  ? Params
  : never;

export interface AppServerClient {
  request<M extends ClientMethod>(method: M, params: ParamsByMethod<M>): Promise<unknown>;
}

export function createAppServerInitializationError(method: string): Error {
  return new Error(`Codex app-server 尚未完成 initialize/initialized 握手，无法调用 ${method}`);
}

function normalizeRequestParams(params: unknown): unknown {
  return params === undefined ? null : params;
}

export function createHostBridgeAppServerClient(
  hostBridge: Pick<HostBridge, "rpc">,
): AppServerClient {
  return {
    async request(method, params) {
      const response = await hostBridge.rpc.request({
        method,
        params: normalizeRequestParams(params),
      });
      return response.result;
    },
  };
}
