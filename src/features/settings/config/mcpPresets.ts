import type { JsonValue } from "../../../protocol/generated/serde_json/JsonValue";
import type { MessageKey } from "../../../i18n";

export type JsonObject = Record<string, JsonValue>;

export interface McpRecommendedPreset {
  readonly id: string;
  readonly label: string;
  readonly vendor: string;
  readonly descriptionKey: MessageKey;
  readonly docsUrl: string;
  readonly value: JsonObject;
}

export const MCP_RECOMMENDED_PRESETS: ReadonlyArray<McpRecommendedPreset> = [
  {
    id: "linear",
    label: "Linear",
    vendor: "Linear",
    descriptionKey: "settings.mcp.presets.linear.description",
    docsUrl: "https://mcp.linear.app/mcp",
    value: { url: "https://mcp.linear.app/mcp" }
  },
  {
    id: "notion",
    label: "Notion",
    vendor: "Notion",
    descriptionKey: "settings.mcp.presets.notion.description",
    docsUrl: "https://mcp.notion.com/mcp",
    value: { url: "https://mcp.notion.com/mcp" }
  },
  {
    id: "figma",
    label: "Figma",
    vendor: "Figma",
    descriptionKey: "settings.mcp.presets.figma.description",
    docsUrl: "https://mcp.figma.com/mcp",
    value: { url: "https://mcp.figma.com/mcp" }
  },
  {
    id: "playwright",
    label: "Playwright",
    vendor: "Microsoft",
    descriptionKey: "settings.mcp.presets.playwright.description",
    docsUrl: "https://www.npmjs.com/package/@playwright/mcp",
    value: { command: "npx", args: ["@playwright/mcp@latest"] }
  }
];
