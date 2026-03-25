import type { CustomPromptOutput } from "../../../bridge/types";

export const CUSTOM_PROMPT_PREFIX = "prompts";
const PROMPT_NAME_PREFIX = `/${CUSTOM_PROMPT_PREFIX}:`;
const PROMPT_TOKEN_PATTERN = /\$[A-Z][A-Z0-9_]*/g;

interface ParsedPromptCommand {
  readonly promptName: string;
  readonly rest: string;
}

export interface CustomPromptCommandInsert {
  readonly text: string;
  readonly cursor: number | null;
}

export function createCustomPromptCommandInsert(
  prompt: CustomPromptOutput,
): CustomPromptCommandInsert {
  const namedArgs = promptArgumentNames(prompt.content);
  if (namedArgs.length > 0) {
    return buildNamedPromptCommand(prompt.name, namedArgs);
  }
  if (promptHasNumericPlaceholders(prompt.content)) {
    return { text: `${PROMPT_NAME_PREFIX}${prompt.name} `, cursor: null };
  }
  return { text: `${PROMPT_NAME_PREFIX}${prompt.name}`, cursor: null };
}

export function expandCustomPromptCommand(
  text: string,
  prompts: ReadonlyArray<CustomPromptOutput>,
): string | null {
  const parsed = parseCustomPromptCommand(text);
  if (parsed === null) {
    return null;
  }
  const prompt = prompts.find((item) => item.name === parsed.promptName) ?? null;
  if (prompt === null) {
    return null;
  }
  const namedArgs = promptArgumentNames(prompt.content);
  if (namedArgs.length > 0) {
    const inputs = parseNamedArgs(parsed.rest, parsed.promptName);
    const missing = namedArgs.filter((name) => !inputs.has(name));
    if (missing.length > 0) {
      throw new Error(`/${CUSTOM_PROMPT_PREFIX}:${parsed.promptName} 缺少必填参数：${missing.join("、")}。`);
    }
    return expandNamedPlaceholders(prompt.content, inputs);
  }
  return expandNumericPlaceholders(prompt.content, tokenizeArgs(parsed.rest));
}

export function promptArgumentNames(content: string): ReadonlyArray<string> {
  const names: Array<string> = [];
  const seen = new Set<string>();
  for (const match of content.matchAll(PROMPT_TOKEN_PATTERN)) {
    const index = match.index ?? -1;
    if (index > 0 && content[index - 1] === "$") {
      continue;
    }
    const name = match[0].slice(1);
    if (name === "ARGUMENTS" || seen.has(name)) {
      continue;
    }
    seen.add(name);
    names.push(name);
  }
  return names;
}

export function promptHasNumericPlaceholders(content: string): boolean {
  for (let index = 0; index < content.length; index += 1) {
    if (content[index] !== "$") {
      continue;
    }
    if (content[index + 1] === "$") {
      index += 1;
      continue;
    }
    const digit = content[index + 1];
    if (digit !== undefined && /[1-9]/.test(digit)) {
      return true;
    }
    if (content.startsWith("$ARGUMENTS", index)) {
      return true;
    }
  }
  return false;
}

function parseCustomPromptCommand(text: string): ParsedPromptCommand | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith(PROMPT_NAME_PREFIX)) {
    return null;
  }
  const afterPrefix = trimmed.slice(PROMPT_NAME_PREFIX.length);
  const separatorIndex = afterPrefix.search(/\s/);
  if (separatorIndex === -1) {
    return afterPrefix.length === 0
      ? null
      : { promptName: afterPrefix, rest: "" };
  }
  const promptName = afterPrefix.slice(0, separatorIndex).trim();
  const rest = afterPrefix.slice(separatorIndex).trim();
  return promptName.length === 0 ? null : { promptName, rest };
}

function buildNamedPromptCommand(
  promptName: string,
  names: ReadonlyArray<string>,
): CustomPromptCommandInsert {
  let text = `${PROMPT_NAME_PREFIX}${promptName}`;
  let cursor: number | null = null;
  for (let index = 0; index < names.length; index += 1) {
    text += ` ${names[index]}=""`;
    if (index === 0) {
      cursor = text.length - 1;
    }
  }
  return { text, cursor };
}

function parseNamedArgs(
  text: string,
  promptName: string,
): ReadonlyMap<string, string> {
  const inputs = new Map<string, string>();
  for (const token of tokenizeArgs(text)) {
    const separatorIndex = token.indexOf("=");
    if (separatorIndex === -1) {
      throw new Error(
        `无法解析 /${CUSTOM_PROMPT_PREFIX}:${promptName}：参数必须写成 key=value，含空格的值请用引号包裹。`,
      );
    }
    if (separatorIndex === 0) {
      throw new Error(
        `无法解析 /${CUSTOM_PROMPT_PREFIX}:${promptName}：'${token}' 在 '=' 前缺少参数名。`,
      );
    }
    inputs.set(token.slice(0, separatorIndex), token.slice(separatorIndex + 1));
  }
  return inputs;
}

function tokenizeArgs(text: string): ReadonlyArray<string> {
  const tokens: Array<string> = [];
  let current = "";
  let quote: "\"" | "'" | null = null;
  let escaping = false;
  for (const char of text) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }
    if (char === "\\" && quote !== null) {
      escaping = true;
      continue;
    }
    if (quote !== null) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }
    if (char === "\"" || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }
  if (quote !== null) {
    throw new Error("自定义 prompt 参数里的引号没有闭合。");
  }
  if (escaping) {
    current += "\\";
  }
  if (current.length > 0) {
    tokens.push(current);
  }
  return tokens;
}

function expandNamedPlaceholders(
  content: string,
  inputs: ReadonlyMap<string, string>,
): string {
  let output = "";
  for (let index = 0; index < content.length; index += 1) {
    const current = content[index];
    if (current !== "$") {
      output += current;
      continue;
    }
    if (content[index + 1] === "$") {
      output += "$$";
      index += 1;
      continue;
    }
    const match = content.slice(index).match(/^\$([A-Z][A-Z0-9_]*)/);
    if (match === null) {
      output += current;
      continue;
    }
    const placeholder = match[1];
    const replacement = inputs.get(placeholder);
    output += replacement ?? match[0];
    index += match[0].length - 1;
  }
  return output;
}

function expandNumericPlaceholders(
  content: string,
  args: ReadonlyArray<string>,
): string {
  let output = "";
  for (let index = 0; index < content.length; index += 1) {
    const current = content[index];
    if (current !== "$") {
      output += current;
      continue;
    }
    if (content[index + 1] === "$") {
      output += "$$";
      index += 1;
      continue;
    }
    if (content.startsWith("$ARGUMENTS", index)) {
      output += args.join(" ");
      index += "$ARGUMENTS".length - 1;
      continue;
    }
    const digit = content[index + 1];
    if (digit !== undefined && /[1-9]/.test(digit)) {
      output += args[Number(digit) - 1] ?? "";
      index += 1;
      continue;
    }
    output += current;
  }
  return output;
}
