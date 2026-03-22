import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CodeStylePreview } from "./CodeStylePreview";

function hasExactText(expectedText: string) {
  return (_: string, node: Element | null) =>
    node?.textContent?.trim() === expectedText;
}

describe("CodeStylePreview", () => {
  it("renders a real side-by-side diff preview", () => {
    const { container } = render(<CodeStylePreview codeStyle="Codex" />);

    expect(
      container.querySelector('.code-style-preview[data-code-style="codex"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-preview-side="before"]'),
    ).not.toBeNull();
    expect(container.querySelector('[data-preview-side="after"]')).not.toBeNull();
    expect(container.querySelectorAll(".code-style-preview-row-delete")).toHaveLength(3);
    expect(container.querySelectorAll(".code-style-preview-row-add")).toHaveLength(3);
    expect(container.querySelectorAll(".code-style-preview-row-context")).toHaveLength(4);
    expect(screen.getByText(hasExactText('surface: "sidebar",'))).toBeInTheDocument();
    expect(
      screen.getByText(hasExactText('surface: "sidebar-elevated",')),
    ).toBeInTheDocument();
    expect(screen.getByText(hasExactText("contrast: 42,"))).toBeInTheDocument();
    expect(screen.getByText(hasExactText("contrast: 68,"))).toBeInTheDocument();
  });
});
