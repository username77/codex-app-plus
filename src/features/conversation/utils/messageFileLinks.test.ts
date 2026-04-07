import { describe, expect, it } from "vitest";
import { formatFileLocation, parseFileLocation } from "../../../utils/fileLinks";
import { resolveMessageFileHref } from "./messageFileLinks";

function formatResolvedTarget(value: ReturnType<typeof resolveMessageFileHref>) {
  if (!value) {
    return null;
  }
  return formatFileLocation(value.path, value.line, value.column);
}

describe("messageFileLinks", () => {
  it("parses colon line and column suffixes", () => {
    expect(formatResolvedTarget(parseFileLocation("src/App.tsx:42:7"))).toBe(
      "src/App.tsx:42:7",
    );
  });

  it("parses #L line anchors", () => {
    expect(formatResolvedTarget(parseFileLocation("src/App.tsx#L42C3"))).toBe(
      "src/App.tsx:42:3",
    );
  });

  it("preserves line numbers for mounted workspace hrefs", () => {
    expect(formatResolvedTarget(resolveMessageFileHref("/workspace/src/App.tsx:33"))).toBe(
      "/workspace/src/App.tsx:33",
    );
  });
});
