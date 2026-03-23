import type { TimelineEntry } from "../../../domain/timeline";

export interface ConnectionRetryInfo {
  readonly attempt: number;
  readonly total: number;
  readonly sourceEntryId: string;
  readonly text: string;
}

interface RetryLineInfo {
  readonly attempt: number;
  readonly total: number;
  readonly text: string;
}

interface ExtractRetryTextResult {
  readonly text: string;
  readonly info: RetryLineInfo | null;
  readonly hasVisibleContentAfterRetry: boolean;
}

interface ExtractConnectionRetryResult {
  readonly activities: ReadonlyArray<TimelineEntry>;
  readonly retryInfo: ConnectionRetryInfo | null;
}

const RETRY_LINE_PATTERN = /^\s*reconnecting[-\s.:()\[\]\u2026\u3002\uFF0C\uFF1A]*([0-9]+)\s*[\/\\\uFF0F]\s*([0-9]+)\s*$/i;

export function extractConnectionRetryInfo(activities: ReadonlyArray<TimelineEntry>): ExtractConnectionRetryResult {
  const filtered: TimelineEntry[] = [];
  let latestInfo: ConnectionRetryInfo | null = null;

  for (const entry of activities) {
    if (entry.kind !== "agentMessage") {
      filtered.push(entry);
      latestInfo = null;
      continue;
    }

    const retryText = extractRetryText(entry.text);
    if (retryText.info !== null && !retryText.hasVisibleContentAfterRetry) {
      latestInfo = { ...retryText.info, sourceEntryId: entry.id };
    } else if (retryText.info !== null) {
      latestInfo = null;
    }

    if (retryText.text.length === 0 && retryText.info !== null) {
      continue;
    }

    if (retryText.text !== entry.text) {
      filtered.push({ ...entry, text: retryText.text });
    } else {
      filtered.push(entry);
    }

    if (retryText.info === null || retryText.hasVisibleContentAfterRetry) {
      latestInfo = null;
    }
  }

  return { activities: filtered, retryInfo: latestInfo };
}

export function stripConnectionRetryLines(text: string): string {
  return extractRetryText(text).text;
}

function extractRetryText(text: string): ExtractRetryTextResult {
  const keptLines: string[] = [];
  let latestInfo: RetryLineInfo | null = null;
  let hasVisibleContentAfterRetry = false;

  for (const line of splitTextForRetryParsing(text)) {
    const info = parseRetryLine(line);
    if (info === null) {
      keptLines.push(line);
      if (latestInfo !== null && line.trim().length > 0) {
        hasVisibleContentAfterRetry = true;
      }
      continue;
    }

    latestInfo = info;
    hasVisibleContentAfterRetry = false;
  }

  return {
    text: normalizeRetainedText(keptLines),
    info: latestInfo,
    hasVisibleContentAfterRetry,
  };
}

function splitTextForRetryParsing(text: string): ReadonlyArray<string> {
  const lines: string[] = [];

  for (const line of text.split(/\r?\n/)) {
    if (!line.includes("\r")) {
      lines.push(line);
      continue;
    }

    const carriageReturnParts = line.split("\r");
    if (carriageReturnParts.some((part) => parseRetryLine(part) !== null)) {
      lines.push(...carriageReturnParts);
      continue;
    }

    lines.push(line);
  }

  return lines;
}

function parseRetryLine(line: string): RetryLineInfo | null {
  const match = line.match(RETRY_LINE_PATTERN);
  if (match === null) {
    return null;
  }

  const attempt = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isFinite(attempt) || !Number.isFinite(total) || total <= 0) {
    return null;
  }

  return {
    attempt: Math.max(0, attempt),
    total,
    text: line.trim(),
  };
}

function normalizeRetainedText(lines: ReadonlyArray<string>): string {
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
