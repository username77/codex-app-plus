import { useContext } from "react";
import { I18nContext } from "./provider";

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === null) {
    throw new Error("useI18n 必须在 I18nProvider 内部使用");
  }
  return context;
}
