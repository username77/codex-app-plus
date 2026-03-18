import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createI18nWrapper } from "../../../test/createI18nWrapper";
import { AuthChoiceView } from "./AuthChoiceView";

describe("AuthChoiceView", () => {
  it("renders both authentication options", () => {
    render(
      <AuthChoiceView
        busy={false}
        loginPending={false}
        onLogin={vi.fn().mockResolvedValue(undefined)}
        onUseApiKey={vi.fn()}
      />,
      { wrapper: createI18nWrapper() }
    );

    expect(screen.getByRole("heading", { name: "选择登录方式" })).toBeInTheDocument();
    expect(screen.getByText("你可以使用官方 ChatGPT 账户登录，或进入配置页使用 API Key。选择完毕后需重启软件生效。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "使用账户登录" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "使用 API Key" })).toBeInTheDocument();
  });

  it("fires the corresponding handlers", () => {
    const onLogin = vi.fn().mockResolvedValue(undefined);
    const onUseApiKey = vi.fn();

    render(
      <AuthChoiceView
        busy={false}
        loginPending={false}
        onLogin={onLogin}
        onUseApiKey={onUseApiKey}
      />,
      { wrapper: createI18nWrapper() }
    );

    fireEvent.click(screen.getByRole("button", { name: "使用账户登录" }));
    fireEvent.click(screen.getByRole("button", { name: "使用 API Key" }));

    expect(onLogin).toHaveBeenCalledTimes(1);
    expect(onUseApiKey).toHaveBeenCalledTimes(1);
  });

  it("disables both actions while busy", () => {
    render(
      <AuthChoiceView
        busy={true}
        loginPending={true}
        onLogin={vi.fn().mockResolvedValue(undefined)}
        onUseApiKey={vi.fn()}
      />,
      { wrapper: createI18nWrapper() }
    );

    expect(screen.getByRole("button", { name: "正在跳转登录..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "使用 API Key" })).toBeDisabled();
  });

  it("renders English copy when locale is en-US", () => {
    render(
      <AuthChoiceView
        busy={false}
        loginPending={false}
        onLogin={vi.fn().mockResolvedValue(undefined)}
        onUseApiKey={vi.fn()}
      />,
      { wrapper: createI18nWrapper("en-US") }
    );

    expect(screen.getByRole("heading", { name: "Choose sign-in method" })).toBeInTheDocument();
    expect(screen.getByText("Use your official ChatGPT account or open the config page to use an API key. Restart the app after choosing for the change to take effect.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use API Key" })).toBeInTheDocument();
  });
});
