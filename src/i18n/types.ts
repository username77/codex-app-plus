import type { UiLanguage } from "../features/settings/hooks/useAppPreferences";

export type Locale = UiLanguage;
export type TranslationValue = string | number;
export type TranslationParams = Readonly<Record<string, TranslationValue>>;
