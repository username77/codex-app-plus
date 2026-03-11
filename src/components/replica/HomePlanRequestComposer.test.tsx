import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PendingUserInputEntry } from "../../domain/timeline";
import { HomePlanRequestComposer } from "./HomePlanRequestComposer";

function createEntry(): PendingUserInputEntry {
  return {
    id: "request-entry-1",
    kind: "pendingUserInput",
    threadId: "thread-1",
    turnId: "turn-1",
    itemId: "item-1",
    requestId: "request-1",
    request: {
      kind: "userInput",
      id: "request-1",
      method: "item/tool/requestUserInput",
      threadId: "thread-1",
      turnId: "turn-1",
      itemId: "item-1",
      questions: [
        {
          id: "confirm_plan",
          header: "实施此计划？",
          question: "实施此计划？",
          isOther: false,
          isSecret: false,
          options: [
            { label: "是，实施此计划", description: "切换到默认模式并开始编码。" },
            { label: "否，请告知 Codex 如何调整", description: "继续在计划模式中完善方案。" },
          ],
        },
      ],
      params: {
        threadId: "thread-1",
        turnId: "turn-1",
        itemId: "item-1",
        questions: [
          {
            id: "confirm_plan",
            header: "实施此计划？",
            question: "实施此计划？",
            isOther: false,
            isSecret: false,
            options: [
              { label: "是，实施此计划", description: "切换到默认模式并开始编码。" },
              { label: "否，请告知 Codex 如何调整", description: "继续在计划模式中完善方案。" },
            ],
          },
        ],
      },
    },
  };
}

describe("HomePlanRequestComposer", () => {
  it("submits the selected option with notes", async () => {
    const onResolveServerRequest = vi.fn().mockResolvedValue(undefined);
    render(<HomePlanRequestComposer entry={createEntry()} busy={false} onResolveServerRequest={onResolveServerRequest} />);

    fireEvent.click(screen.getByRole("button", { name: /否，请告知 Codex 如何调整/ }));
    fireEvent.change(screen.getByPlaceholderText("请告诉 Codex 该如何调整方案"), { target: { value: "把测试拆成两步" } });
    fireEvent.click(screen.getByRole("button", { name: "提交" }));

    await waitFor(() => expect(onResolveServerRequest).toHaveBeenCalledWith({
      kind: "userInput",
      requestId: "request-1",
      answers: {
        confirm_plan: ["否，请告知 Codex 如何调整", "把测试拆成两步"],
      },
    }));
  });
});
