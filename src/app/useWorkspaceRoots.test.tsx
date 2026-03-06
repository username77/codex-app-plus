import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useWorkspaceRoots } from "./useWorkspaceRoots";

const DISMISSED_ROOT_KEYS_STORAGE_KEY = "codex-app-plus.workspace-root-dismissed-keys";

const THREAD = {
  id: "thread-1",
  title: "FPGA",
  cwd: "E:/code/FPGA",
  archived: false,
  updatedAt: "2026-03-06T09:00:00Z"
} as const;

describe("useWorkspaceRoots", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("keeps removed thread roots hidden after remount", async () => {
    const initialProps = { threads: [THREAD] };
    const first = renderHook(({ threads }) => useWorkspaceRoots(threads), { initialProps });

    expect(first.result.current.roots).toHaveLength(1);

    act(() => {
      first.result.current.removeRoot(first.result.current.roots[0]!.id);
    });

    expect(first.result.current.roots).toHaveLength(0);
    await waitFor(() => {
      expect(window.localStorage.getItem(DISMISSED_ROOT_KEYS_STORAGE_KEY)).not.toBeNull();
    });

    first.unmount();

    const second = renderHook(({ threads }) => useWorkspaceRoots(threads), { initialProps });
    expect(second.result.current.roots).toHaveLength(0);
  });

  it("shows a removed root again after manual re-add", () => {
    const { result } = renderHook(() => useWorkspaceRoots([THREAD]));
    const removedRoot = result.current.roots[0]!;

    act(() => {
      result.current.removeRoot(removedRoot.id);
    });

    act(() => {
      result.current.addRoot({ name: removedRoot.name, path: removedRoot.path });
    });

    expect(result.current.roots).toHaveLength(1);
    expect(result.current.roots[0]).toMatchObject({ name: removedRoot.name, path: removedRoot.path });
  });

  it("ignores threads without cwd when building workspace roots", () => {
    const threads = [
      THREAD,
      {
        id: "thread-2",
        title: "这是一条会话标题，不是工作区",
        cwd: null,
        archived: false,
        updatedAt: "2026-03-06T10:00:00Z"
      }
    ];

    const { result } = renderHook(() => useWorkspaceRoots(threads));

    expect(result.current.roots).toHaveLength(1);
    expect(result.current.roots[0]).toMatchObject({ name: "FPGA", path: "E:/code/FPGA" });
  });

  it("uses workspace path name instead of thread title for auto roots", () => {
    const threads = [
      {
        id: "thread-3",
        title: "请帮我重构这里的状态机",
        cwd: "E:/code/project-alpha",
        archived: false,
        updatedAt: "2026-03-06T11:00:00Z"
      }
    ];

    const { result } = renderHook(() => useWorkspaceRoots(threads));

    expect(result.current.roots).toHaveLength(1);
    expect(result.current.roots[0]).toMatchObject({ name: "project-alpha", path: "E:/code/project-alpha" });
  });
});
