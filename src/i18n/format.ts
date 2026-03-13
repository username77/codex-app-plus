import { MESSAGES_BY_LOCALE } from "./messages";
import type { MessageKey, MessagesSchema } from "./messages/schema";
import type { Locale, TranslationParams } from "./types";

const TEMPLATE_TOKEN_PATTERN = /\{(\w+)\}/g;

function readMessage(messages: MessagesSchema, key: MessageKey): string {
  const value = key.split(".").reduce<unknown>((current, part) => {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }
    return (current as Record<string, unknown>)[part];
  }, messages);

  if (typeof value !== "string") {
    throw new Error(`Missing translation key: ${key}`);
  }

  return value;
}

function applyParams(template: string, key: MessageKey, params?: TranslationParams): string {
  return template.replace(TEMPLATE_TOKEN_PATTERN, (_, name: string) => {
    const value = params?.[name];
    if (value === undefined) {
      throw new Error(`Missing translation parameter "${name}" for key "${key}"`);
    }
    return String(value);
  });
}

export function formatMessage(messages: MessagesSchema, key: MessageKey, params?: TranslationParams): string {
  return applyParams(readMessage(messages, key), key, params);
}

export function translate(locale: Locale, key: MessageKey, params?: TranslationParams): string {
  return formatMessage(MESSAGES_BY_LOCALE[locale], key, params);
}
