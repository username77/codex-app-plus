import { describe, expect, it } from "vitest";
import { findLatestThreadForWorkspace } from "./workspaceThread";

describe("findLatestThreadForWorkspace", () => {
  it("returns the latest thread in the selected workspace", () => {
    const threads = [
      {
        id: "thread-1",
        title: "older",
        cwd: "E:/code/codex-app-plus",
        archived: false,
        updatedAt: "2026-03-06T08:00:00.000Z"
      },
      {
        id: "thread-2",
        title: "latest",
        cwd: "E:\\code\\codex-app-plus\\",
        archived: false,
        updatedAt: "2026-03-06T09:00:00.000Z"
      },
      {
        id: "thread-3",
        title: "other",
        cwd: "E:/code/another-workspace",
        archived: false,
        updatedAt: "2026-03-06T10:00:00.000Z"
      }
    ] as const;

    expect(findLatestThreadForWorkspace(threads, "E:/code/codex-app-plus")).toMatchObject({ id: "thread-2" });
  });

  it("returns null when the workspace has no thread", () => {
    const threads = [
      {
        id: "thread-1",
        title: "other",
        cwd: "E:/code/another-workspace",
        archived: false,
        updatedAt: "2026-03-06T10:00:00.000Z"
      }
    ] as const;

    expect(findLatestThreadForWorkspace(threads, "E:/code/codex-app-plus")).toBeNull();
  });
});
