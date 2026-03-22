import { describe, expect, it, vi } from "vitest";
import type { HostBridge } from "../../bridge/types";
import { createHostBridgeAppServerClient } from "../appServerClient";

function createHostBridge() {
  return {
    rpc: {
      request: vi.fn().mockResolvedValue({ requestId: "1", result: { ok: true } }),
      notify: vi.fn(),
      cancel: vi.fn(),
    },
  } as unknown as Pick<HostBridge, "rpc">;
}

describe("createHostBridgeAppServerClient", () => {
  it("forwards requests without consulting duplicated initialized state", async () => {
    const hostBridge = createHostBridge();
    const client = createHostBridgeAppServerClient(hostBridge);

    await expect(client.request("thread/list", { archived: false })).resolves.toEqual({ ok: true });
    expect(hostBridge.rpc.request).toHaveBeenCalledWith({
      method: "thread/list",
      params: { archived: false },
    });
  });

  it("normalizes undefined params to null for host bridge requests", async () => {
    const hostBridge = createHostBridge();
    const client = createHostBridgeAppServerClient(hostBridge);

    await client.request("config/mcpServer/reload", undefined);

    expect(hostBridge.rpc.request).toHaveBeenCalledWith({
      method: "config/mcpServer/reload",
      params: null,
    });
  });
});
