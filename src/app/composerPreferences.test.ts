import { describe, expect, it, vi } from "vitest";
import type { HostBridge } from "../bridge/types";
import { listComposerModels } from "./composerPreferences";

describe("composerPreferences", () => {
  it("includes hidden models in the picker list", async () => {
    const request = vi.fn().mockResolvedValue({
      requestId: "request-1",
      result: {
        data: [
          {
            id: "model-1",
            model: "gpt-5.3-codex",
            upgrade: null,
            upgradeInfo: null,
            availabilityNux: null,
            displayName: "GPT-5.3-Codex",
            description: "",
            hidden: true,
            supportedReasoningEfforts: [{ reasoningEffort: "high", description: "" }],
            defaultReasoningEffort: "high",
            inputModalities: [],
            supportsPersonality: false,
            isDefault: false
          }
        ],
        nextCursor: null
      }
    });

    const hostBridge = {
      rpc: {
        request,
        notify: vi.fn(),
        cancel: vi.fn()
      }
    } as unknown as HostBridge;

    const result = await listComposerModels(hostBridge);

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "model/list",
        params: expect.objectContaining({ includeHidden: true })
      })
    );
    expect(result).toEqual([
      expect.objectContaining({
        value: "gpt-5.3-codex",
        label: "GPT-5.3-Codex"
      })
    ]);
  });
});
