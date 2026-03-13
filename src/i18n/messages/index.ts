import type { Locale } from "../types";
import { enUS } from "./en-US";
import { zhCN } from "./zh-CN";
import type { MessagesSchema } from "./schema";

export const MESSAGES_BY_LOCALE: Readonly<Record<Locale, MessagesSchema>> = {
  "zh-CN": zhCN,
  "en-US": enUS,
};
