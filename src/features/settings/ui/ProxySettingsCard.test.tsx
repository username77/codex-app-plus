import type { ComponentProps } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createI18nWrapper } from "../../../test/createI18nWrapper";
import { ProxySettingsCard } from "./ProxySettingsCard";

function renderCard(
  props: Partial<ComponentProps<typeof ProxySettingsCard>> = {},
) {
  return render(
    <ProxySettingsCard
      agentEnvironment="wsl"
      busy={false}
      readProxySettings={vi.fn().mockResolvedValue({
        settings: {
          enabled: true,
          httpProxy: "http://127.0.0.1:8080",
          httpsProxy: "",
          noProxy: "localhost",
        },
      })}
      writeProxySettings={vi.fn().mockResolvedValue({
        settings: {
          enabled: true,
          httpProxy: "http://127.0.0.1:9000",
          httpsProxy: "",
          noProxy: "localhost",
        },
      })}
      {...props}
    />,
    { wrapper: createI18nWrapper("zh-CN") },
  );
}

describe("ProxySettingsCard", () => {
  it("loads and renders the current environment settings", async () => {
    renderCard();

    expect(await screen.findByDisplayValue("http://127.0.0.1:8080")).toBeInTheDocument();
    expect(screen.getByText(/当前正在编辑 WSL 的 Codex 代理配置/)).toBeInTheDocument();
  });

  it("saves normalized proxy values and shows a restart note", async () => {
    const writeProxySettings = vi.fn().mockResolvedValue({
      settings: {
        enabled: true,
        httpProxy: "http://127.0.0.1:9000",
        httpsProxy: "",
        noProxy: "localhost",
      },
    });
    renderCard({ writeProxySettings });

    const input = await screen.findByLabelText("HTTP Proxy");
    fireEvent.change(input, { target: { value: " http://127.0.0.1:9000 " } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(writeProxySettings).toHaveBeenCalledWith({
        agentEnvironment: "wsl",
        enabled: true,
        httpProxy: "http://127.0.0.1:9000",
        httpsProxy: "",
        noProxy: "localhost",
      });
    });
    expect(screen.getByText("保存后，当前 app-server / Codex 连接需要手动重启才会生效。")).toBeInTheDocument();
  });

  it("blocks invalid proxy URLs before saving", async () => {
    const writeProxySettings = vi.fn();
    renderCard({ writeProxySettings });

    const input = await screen.findByLabelText("HTTP Proxy");
    fireEvent.change(input, { target: { value: "127.0.0.1:8080" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("HTTP Proxy 必须是带协议的 URL，例如 http://127.0.0.1:8080")).toBeInTheDocument();
    expect(writeProxySettings).not.toHaveBeenCalled();
  });
});
