import { useCallback } from "react";
import type { AgentEnvironment, HostBridge } from "../../../bridge/types";
import type { ParsedFileLocation } from "../../../utils/fileLinks";
import { resolveAgentWorkspacePath } from "../../workspace/model/workspacePath";

const WORKSPACE_MOUNT_PREFIX = "/workspace/";
const WORKSPACES_MOUNT_PREFIX = "/workspaces/";

function isAbsolutePath(path: string): boolean {
  return (
    path.startsWith("/") ||
    path.startsWith("\\\\") ||
    path.startsWith("//") ||
    /^[A-Za-z]:[/\\]/.test(path)
  );
}

function normalizePathSeparators(path: string): string {
  return path.replace(/\\/g, "/");
}

function trimTrailingPathSeparators(path: string): string {
  return path.replace(/[\\/]+$/, "");
}

function pathBaseName(path: string): string {
  return trimTrailingPathSeparators(normalizePathSeparators(path.trim()))
    .split("/")
    .filter(Boolean)
    .pop() ?? "";
}

function joinPath(base: string, relative: string): string {
  const normalizedBase = base.replace(/[\\/]+$/, "");
  const normalizedRelative = relative.replace(/^[\\/]+/, "");
  return normalizedRelative ? `${normalizedBase}/${normalizedRelative}` : normalizedBase;
}

function resolveMountedWorkspacePath(
  path: string,
  workspacePath: string | null,
): string | null {
  const trimmedWorkspace = workspacePath?.trim() ?? "";
  if (!trimmedWorkspace) {
    return null;
  }

  const normalizedPath = normalizePathSeparators(path.trim());
  const workspaceName = pathBaseName(trimmedWorkspace);
  if (!workspaceName) {
    return null;
  }

  const resolveFromSegments = (
    segments: ReadonlyArray<string>,
    allowDirectRelative: boolean,
  ) => {
    if (segments.length === 0) {
      return trimTrailingPathSeparators(trimmedWorkspace);
    }

    const workspaceIndex = segments.findIndex((segment) => segment === workspaceName);
    if (workspaceIndex >= 0) {
      const relativePath = segments.slice(workspaceIndex + 1).join("/");
      return relativePath
        ? joinPath(trimmedWorkspace, relativePath)
        : trimTrailingPathSeparators(trimmedWorkspace);
    }

    if (allowDirectRelative) {
      return joinPath(trimmedWorkspace, segments.join("/"));
    }

    return null;
  };

  if (normalizedPath.startsWith(WORKSPACE_MOUNT_PREFIX)) {
    return resolveFromSegments(
      normalizedPath
        .slice(WORKSPACE_MOUNT_PREFIX.length)
        .split("/")
        .filter(Boolean),
      true,
    );
  }

  if (normalizedPath.startsWith(WORKSPACES_MOUNT_PREFIX)) {
    return resolveFromSegments(
      normalizedPath
        .slice(WORKSPACES_MOUNT_PREFIX.length)
        .split("/")
        .filter(Boolean),
      false,
    );
  }

  return null;
}

function resolveFilePath(path: string, workspacePath: string | null): string {
  const trimmed = path.trim();
  const mountedWorkspacePath = resolveMountedWorkspacePath(trimmed, workspacePath);
  if (mountedWorkspacePath) {
    return mountedWorkspacePath;
  }
  if (!workspacePath) {
    return trimmed;
  }
  if (isAbsolutePath(trimmed)) {
    return trimmed;
  }
  return joinPath(workspacePath, trimmed);
}

export function useFileLinkOpener(
  hostBridge: HostBridge,
  workspacePath: string | null,
  agentEnvironment: AgentEnvironment = "windowsNative",
) {
  const openFileLink = useCallback(
    async (target: ParsedFileLocation) => {
      let resolvedPath = target.path;
      let editorPath = target.path;
      try {
        resolvedPath = resolveFilePath(target.path, workspacePath);
        editorPath = isAbsolutePath(resolvedPath)
          ? resolveAgentWorkspacePath(resolvedPath, agentEnvironment)
          : resolvedPath;
        await hostBridge.app.openFileInEditor({
          path: editorPath,
          agentEnvironment,
          line: target.line,
          column: target.column,
        });
      } catch (error) {
        console.warn("Failed to open file in editor", {
          path: editorPath,
          resolvedPath,
          agentEnvironment,
          line: target.line,
          column: target.column,
          error,
        });
      }
    },
    [agentEnvironment, hostBridge, workspacePath],
  );

  return { openFileLink };
}
