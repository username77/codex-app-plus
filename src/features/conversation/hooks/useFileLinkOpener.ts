import { useCallback } from "react";
import type { HostBridge } from "../../../bridge/types";
import type { ParsedFileLocation } from "../../../utils/fileLinks";

function isAbsolutePath(path: string): boolean {
  return path.startsWith("/") || /^[A-Za-z]:[/\\]/.test(path);
}

function joinPath(base: string, relative: string): string {
  const normalizedBase = base.replace(/[\\/]+$/, "");
  return `${normalizedBase}/${relative}`;
}

function resolveFilePath(path: string, workspacePath: string | null): string {
  const trimmed = path.trim();
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
) {
  const openFileLink = useCallback(
    async (target: ParsedFileLocation) => {
      const resolvedPath = resolveFilePath(target.path, workspacePath);
      try {
        await hostBridge.app.openFileInEditor({
          path: resolvedPath,
          line: target.line,
          column: target.column,
        });
      } catch (error) {
        console.warn("Failed to open file in editor", {
          path: resolvedPath,
          line: target.line,
          column: target.column,
          error,
        });
      }
    },
    [hostBridge, workspacePath],
  );

  return { openFileLink };
}
