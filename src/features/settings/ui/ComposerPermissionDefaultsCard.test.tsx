import { fireEvent, render, screen } from "@testing-library/react";
import { useState, type Dispatch, type SetStateAction } from "react";
import { describe, expect, it, vi } from "vitest";
import { type Locale } from "../../../i18n";
import { createI18nWrapper } from "../../../test/createI18nWrapper";
import {
  DEFAULT_APP_PREFERENCES,
  type AppPreferences,
  type AppPreferencesController,
} from "../hooks/useAppPreferences";
import { ComposerPermissionDefaultsCard } from "./ComposerPermissionDefaultsCard";

function createPreferencesController(
  preferences: AppPreferences,
  setPreferences: Dispatch<SetStateAction<AppPreferences>>
): AppPreferencesController {
  return {
    ...preferences,
    setAgentEnvironment: vi.fn(),
    setWorkspaceOpener: vi.fn(),
    setEmbeddedTerminalShell: vi.fn(),
    setEmbeddedTerminalUtf8: vi.fn(),
    setNotificationDeliveryMode: vi.fn(),
    setNotificationTriggerMode: vi.fn(),
    setSubagentNotificationsEnabled: vi.fn(),
    setThemeMode: vi.fn(),
    setUiLanguage: vi.fn(),
    setThreadDetailLevel: vi.fn(),
    setFollowUpQueueMode: vi.fn(),
    setComposerEnterBehavior: vi.fn(),
    setComposerPermissionLevel: vi.fn(),
    setComposerDefaultApprovalPolicy: (composerDefaultApprovalPolicy) =>
      setPreferences((current) => ({ ...current, composerDefaultApprovalPolicy })),
    setComposerDefaultSandboxMode: (composerDefaultSandboxMode) =>
      setPreferences((current) => ({ ...current, composerDefaultSandboxMode })),
    setComposerFullApprovalPolicy: (composerFullApprovalPolicy) =>
      setPreferences((current) => ({ ...current, composerFullApprovalPolicy })),
    setComposerFullSandboxMode: (composerFullSandboxMode) =>
      setPreferences((current) => ({ ...current, composerFullSandboxMode })),
    setUiFontFamily: vi.fn(),
    setUiFontSize: vi.fn(),
    setCodeFontFamily: vi.fn(),
    setCodeFontSize: vi.fn(),
    setGitBranchPrefix: vi.fn(),
    setGitPushForceWithLease: vi.fn(),
    setContrast: vi.fn(),
    setAppearanceThemeColors: vi.fn(),
    setCodeStyle: vi.fn(),
  };
}

function renderCard(locale: Locale = "zh-CN"): void {
  function Wrapper(): JSX.Element {
    const [preferences, setPreferences] = useState(DEFAULT_APP_PREFERENCES);
    return (
      <ComposerPermissionDefaultsCard
        preferences={createPreferencesController(preferences, setPreferences)}
      />
    );
  }

  render(<Wrapper />, { wrapper: createI18nWrapper(locale) });
}

describe("ComposerPermissionDefaultsCard", () => {
  it("updates the standard approval policy after selecting on-failure", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "标准权限 · 审批策略：按需询问" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "失败时询问" }));

    expect(screen.getByRole("button", { name: "标准权限 · 审批策略：失败时询问" })).toBeInTheDocument();
  });

  it("renders the permission defaults title and descriptions", () => {
    renderCard();

    expect(screen.getByText("Composer 权限默认值")).toBeInTheDocument();
    expect(screen.getByText("控制底部\"默认权限\"实际使用的 approval policy。")).toBeInTheDocument();
  });

  it("renders English copy when locale is en-US", () => {
    renderCard("en-US");

    expect(screen.getByText("Composer permission defaults")).toBeInTheDocument();
    expect(screen.getByText("Standard permission · Approval policy")).toBeInTheDocument();
    expect(screen.getByText("Full access · Access mode")).toBeInTheDocument();
  });
});
