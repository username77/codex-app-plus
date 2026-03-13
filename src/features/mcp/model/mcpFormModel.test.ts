import { describe, expect, it } from "vitest";
import {
  buildMcpServerConfigValue,
  createMcpServerFormState,
  validateMcpServerForm,
  type McpServerFormMessages,
} from "./mcpFormModel";

const TEST_MESSAGES: McpServerFormMessages = {
  idRequired: "id required",
  idNoDot: "id no dot",
  commandRequired: "command required",
  urlRequired: (type) => `${type} url required`,
  urlInvalid: "url invalid",
  envLabel: "Env",
  headersLabel: "Headers",
  keyValueFormat: (label) => `${label} format`,
  keyValueEmptyKey: (label) => `${label} empty key`,
};

describe("mcpFormModel", () => {
  it("validates dotted ids and malformed key-value inputs with injected messages", () => {
    const errors = validateMcpServerForm({
      ...createMcpServerFormState(null),
      id: "bad.id",
      command: "npx",
      envText: "BAD",
    }, TEST_MESSAGES);

    expect(errors.id).toBe("id no dot");
    expect(errors.envText).toBe("Env format");
  });

  it("builds stdio and http config values from validated form data", () => {
    const stdioValue = buildMcpServerConfigValue({
      ...createMcpServerFormState(null),
      id: "fetch",
      name: "Fetch",
      type: "stdio",
      command: "uvx",
      argsText: "mcp-server-fetch",
      cwd: "/repo",
      envText: "TOKEN=secret",
      enabled: true,
    }, TEST_MESSAGES);
    const httpValue = buildMcpServerConfigValue({
      ...createMcpServerFormState(null),
      id: "linear",
      type: "http",
      url: "https://mcp.linear.app/mcp",
      headersText: "Authorization=Bearer token",
      enabled: false,
    }, TEST_MESSAGES);

    expect(stdioValue).toEqual({
      name: "Fetch",
      enabled: true,
      type: "stdio",
      command: "uvx",
      args: ["mcp-server-fetch"],
      cwd: "/repo",
      env: { TOKEN: "secret" },
    });
    expect(httpValue).toEqual({
      enabled: false,
      type: "http",
      url: "https://mcp.linear.app/mcp",
      headers: { Authorization: "Bearer token" },
    });
  });
});
