import type { FileUpdateChange } from "../../../protocol/generated/v2/FileUpdateChange";
import type { PatchApplyStatus } from "../../../protocol/generated/v2/PatchApplyStatus";

const SINGLE_FILE_COUNT = 1;
const NAMELESS_FILE_LABEL = "file";
const PATH_SEGMENT_PATTERN = /[\\/]+/u;
const TRAILING_SEPARATOR_PATTERN = /[\\/]+$/u;

export interface FileChangeSummaryParts {
  readonly text: string;
  readonly prefix: string;
  readonly fileName: string | null;
  readonly suffix: string;
}

function extractFileName(path: string): string | null {
  const normalizedPath = path.trim().replace(TRAILING_SEPARATOR_PATTERN, "");
  if (normalizedPath.length === 0) {
    return null;
  }
  const fileName = normalizedPath.split(PATH_SEGMENT_PATTERN).at(-1) ?? NAMELESS_FILE_LABEL;
  return fileName.length > 0 ? fileName : NAMELESS_FILE_LABEL;
}

export function getFileChangeDisplayName(path: string): string {
  return extractFileName(path) ?? NAMELESS_FILE_LABEL;
}

function createPrimaryFileSummary(verb: string, changes: ReadonlyArray<FileUpdateChange>): FileChangeSummaryParts | null {
  const fileName = extractFileName(changes[0]?.path ?? "");
  if (fileName === null) {
    return null;
  }
  const suffix = changes.length === SINGLE_FILE_COUNT ? "" : ` 等 ${changes.length} 个文件`;
  return { text: `${verb} ${fileName}${suffix}`, prefix: `${verb} `, fileName, suffix };
}

function createCountOnlySummary(prefix: string, changes: ReadonlyArray<FileUpdateChange>): FileChangeSummaryParts {
  return { text: `${prefix}${changes.length} 个文件`, prefix, fileName: null, suffix: `${changes.length} 个文件` };
}

export function createFileChangeSummaryParts(
  status: PatchApplyStatus,
  changes: ReadonlyArray<FileUpdateChange>,
): FileChangeSummaryParts {
  if (status === "completed") {
    return createPrimaryFileSummary("已编辑", changes) ?? createCountOnlySummary("已编辑 ", changes);
  }
  if (status === "failed") {
    return { text: "文件编辑失败", prefix: "文件编辑失败", fileName: null, suffix: "" };
  }
  if (status === "declined") {
    return { text: "文件编辑已拒绝", prefix: "文件编辑已拒绝", fileName: null, suffix: "" };
  }
  return createPrimaryFileSummary("正在编辑", changes) ?? { text: "正在编辑文件", prefix: "正在编辑文件", fileName: null, suffix: "" };
}

export function formatFileChangeSummary(status: PatchApplyStatus, changes: ReadonlyArray<FileUpdateChange>): string {
  return createFileChangeSummaryParts(status, changes).text;
}
