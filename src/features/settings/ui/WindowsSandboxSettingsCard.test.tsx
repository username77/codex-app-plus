import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { type Locale } from "../../../i18n";
import { createI18nWrapper } from "../../../test/createI18nWrapper";
import { WindowsSandboxSettingsCard } from "./WindowsSandboxSettingsCard";

const IDLE_STATE = { pending: false, mode: null, success: null, error: null } as const;

function renderCard(
  props: ComponentProps<typeof WindowsSandboxSettingsCard>,
  locale: Locale = "zh-CN"
) {
  return render(<WindowsSandboxSettingsCard {...props} />, {
    wrapper: createI18nWrapper(locale)
  });
}

describe("WindowsSandboxSettingsCard", () => {
  it("renders the current configured mode", () => {
    renderCard({
      busy: false,
      configSnapshot: { config: { profile: null }, origins: {}, layers: [{ name: { type: "user", file: "C:/Users/Administrator/.codex/config.toml" }, version: "1", config: { windows: { sandbox: "unelevated" } }, disabledReason: null }] },
      setupState: IDLE_STATE,
      onStartSetup: vi.fn().mockResolvedValue({ started: true })
    });

    expect(screen.getAllByText("标准模式").length).toBeGreaterThan(0);
    expect(screen.getByText(/windows\.sandbox/i)).toBeInTheDocument();
  });

  it("starts the requested setup mode from either action button", () => {
    const onStartSetup = vi.fn().mockResolvedValue({ started: true });
    renderCard({
      busy: false,
      configSnapshot: { config: { profile: null }, origins: {}, layers: [] },
      setupState: IDLE_STATE,
      onStartSetup
    });

    fireEvent.click(screen.getByRole("button", { name: /标准模式（无需管理员）/i }));
    fireEvent.click(screen.getByRole("button", { name: /增强模式（管理员）/i }));

    expect(onStartSetup).toHaveBeenNthCalledWith(1, "unelevated");
    expect(onStartSetup).toHaveBeenNthCalledWith(2, "elevated");
  });

  it("disables actions while setup is pending", () => {
    renderCard({
      busy: false,
      configSnapshot: { config: { profile: null }, origins: {}, layers: [] },
      setupState: { pending: true, mode: "unelevated", success: null, error: null },
      onStartSetup: vi.fn().mockResolvedValue({ started: true })
    });

    expect(screen.getByRole("button", { name: /配置进行中/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /增强模式（管理员）/i })).toBeDisabled();
  });

  it("shows the latest failure message", () => {
    renderCard({
      busy: false,
      configSnapshot: { config: { profile: null }, origins: {}, layers: [] },
      setupState: { pending: false, mode: "elevated", success: false, error: "setup failed" },
      onStartSetup: vi.fn().mockResolvedValue({ started: true })
    });

    expect(screen.getByText("setup failed")).toBeInTheDocument();
  });

  it("renders English copy when locale is en-US", () => {
    renderCard({
      busy: false,
      configSnapshot: { config: { profile: null }, origins: {}, layers: [] },
      setupState: IDLE_STATE,
      onStartSetup: vi.fn().mockResolvedValue({ started: true })
    }, "en-US");

    expect(screen.getByText("Windows Sandbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Standard mode \(no admin\)/i })).toBeInTheDocument();
  });
});
