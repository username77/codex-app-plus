const WINDOWS_SEPARATOR = /\\/g;
const TRAILING_SEPARATOR = /\/+$/;

export function trimWorkspaceText(value: string): string {
  return value.trim();
}

function normalizePathSeparators(path: string): string {
  return path.replace(WINDOWS_SEPARATOR, "/");
}

export function normalizeWorkspacePath(path: string): string {
  const trimmedPath = trimWorkspaceText(path);
  if (trimmedPath.length === 0) {
    return "";
  }
  return normalizePathSeparators(trimmedPath).replace(TRAILING_SEPARATOR, "").toLowerCase();
}

export function inferWorkspaceNameFromPath(path: string): string {
  const normalizedPath = normalizePathSeparators(trimWorkspaceText(path)).replace(TRAILING_SEPARATOR, "");
  const parts = normalizedPath.split("/").filter((part) => part.length > 0);
  return parts[parts.length - 1] ?? path;
}
