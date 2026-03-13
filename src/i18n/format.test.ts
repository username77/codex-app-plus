import { describe, expect, it } from "vitest";
import { formatMessage, translate } from "./format";
import { enUS } from "./messages/en-US";
import { zhCN } from "./messages/zh-CN";

function collectLeafPaths(value: Record<string, unknown>, prefix = ""): Array<string> {
  return Object.entries(value).flatMap(([key, currentValue]) => {
    const nextPrefix = prefix.length === 0 ? key : `${prefix}.${key}`;
    if (typeof currentValue === "string") {
      return [nextPrefix];
    }
    return collectLeafPaths(currentValue as Record<string, unknown>, nextPrefix);
  });
}

describe("i18n format", () => {
  it("keeps zh-CN and en-US message keys aligned", () => {
    expect(collectLeafPaths(enUS)).toEqual(collectLeafPaths(zhCN));
  });

  it("interpolates message params", () => {
    expect(translate("zh-CN", "app.alerts.sendTurnFailed", { error: "boom" })).toBe("发送工作区消息失败: boom");
  });

  it("throws when message params are missing", () => {
    expect(() => translate("en-US", "app.alerts.sendTurnFailed")).toThrow('Missing translation parameter "error"');
  });

  it("throws when a message key is missing at runtime", () => {
    expect(() => formatMessage(zhCN, "app.alerts.missing" as never)).toThrow("Missing translation key");
  });
});
