import { createContext, useEffect, useMemo } from "react";
import type { PropsWithChildren } from "react";
import { formatMessage } from "./format";
import { MESSAGES_BY_LOCALE } from "./messages";
import type { MessageKey } from "./messages/schema";
import type { Locale, TranslationParams } from "./types";

interface I18nContextValue {
  readonly locale: Locale;
  readonly setLocale: (locale: Locale) => void;
  readonly t: (key: MessageKey, params?: TranslationParams) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

function useDocumentLocale(locale: Locale, t: I18nContextValue["t"]): void {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t("app.document.title");
  }, [locale, t]);
}

interface I18nProviderProps extends PropsWithChildren {
  readonly locale: Locale;
  readonly setLocale: (locale: Locale) => void;
}

export function I18nProvider(props: I18nProviderProps): JSX.Element {
  const messages = useMemo(() => MESSAGES_BY_LOCALE[props.locale], [props.locale]);
  const value = useMemo<I18nContextValue>(() => ({
    locale: props.locale,
    setLocale: props.setLocale,
    t: (key, params) => formatMessage(messages, key, params),
  }), [messages, props.locale, props.setLocale]);

  useDocumentLocale(props.locale, value.t);

  return <I18nContext.Provider value={value}>{props.children}</I18nContext.Provider>;
}
