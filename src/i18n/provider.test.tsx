import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "./provider";
import { useI18n } from "./useI18n";

function LocaleProbe(): JSX.Element {
  const { locale, t } = useI18n();
  return <div>{`${locale}:${t("auth.choice.title")}`}</div>;
}

describe("I18nProvider", () => {
  it("updates document metadata when locale changes", () => {
    const { rerender } = render(
      <I18nProvider locale="zh-CN" setLocale={() => undefined}>
        <LocaleProbe />
      </I18nProvider>
    );

    expect(screen.getByText("zh-CN:选择登录方式")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("zh-CN");
    expect(document.title).toBe("Codex App Plus 桌面端");

    rerender(
      <I18nProvider locale="en-US" setLocale={() => undefined}>
        <LocaleProbe />
      </I18nProvider>
    );

    expect(screen.getByText("en-US:Choose sign-in method")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("en-US");
    expect(document.title).toBe("Codex App Plus Desktop");
  });
});
