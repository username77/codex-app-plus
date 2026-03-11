import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("windows sandbox protocol generation", () => {
  it("includes optional cwd in WindowsSandboxSetupStartParams schema", () => {
    const schema = JSON.parse(
      readFileSync(resolve("src/protocol/schema/v2/WindowsSandboxSetupStartParams.json"), "utf8"),
    ) as { properties?: Record<string, unknown> };

    expect(schema.properties?.cwd).toBeDefined();
  });
});
