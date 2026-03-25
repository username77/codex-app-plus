import { describe, expect, it } from "vitest";
import {
  buildProxySettingsInput,
  hasProxySettingsChanges,
  isProxyUrl,
  normalizeProxySettings,
} from "./proxySettings";

describe("proxySettings", () => {
  it("normalizes proxy values by trimming surrounding whitespace", () => {
    expect(normalizeProxySettings({
      enabled: true,
      httpProxy: " http://127.0.0.1:8080 ",
      httpsProxy: "",
      noProxy: " localhost ",
    })).toEqual({
      enabled: true,
      httpProxy: "http://127.0.0.1:8080",
      httpsProxy: "",
      noProxy: "localhost",
    });
  });

  it("detects meaningful proxy setting changes", () => {
    expect(hasProxySettingsChanges(
      { enabled: false, httpProxy: "", httpsProxy: "", noProxy: "" },
      { enabled: false, httpProxy: " ", httpsProxy: "", noProxy: "" },
    )).toBe(false);
    expect(hasProxySettingsChanges(
      { enabled: false, httpProxy: "", httpsProxy: "", noProxy: "" },
      { enabled: true, httpProxy: "", httpsProxy: "", noProxy: "" },
    )).toBe(true);
  });

  it("accepts proxy URLs only when they include an explicit scheme", () => {
    expect(isProxyUrl("")).toBe(true);
    expect(isProxyUrl("http://127.0.0.1:8080")).toBe(true);
    expect(isProxyUrl("socks5://127.0.0.1:1080")).toBe(true);
    expect(isProxyUrl("127.0.0.1:8080")).toBe(false);
    expect(isProxyUrl("http://127.0.0.1 :8080")).toBe(false);
  });

  it("builds proxy write input with the selected environment", () => {
    expect(buildProxySettingsInput("wsl", {
      enabled: true,
      httpProxy: " http://127.0.0.1:8080 ",
      httpsProxy: "",
      noProxy: " localhost ",
    })).toEqual({
      agentEnvironment: "wsl",
      enabled: true,
      httpProxy: "http://127.0.0.1:8080",
      httpsProxy: "",
      noProxy: "localhost",
    });
  });
});
