import { useLanguagePreference, type Language } from "@/contexts/language-preference";
import bn from "./locales/bn";
import en from "./locales/en";
import gu from "./locales/gu";
import hi from "./locales/hi";
import kn from "./locales/kn";
import ml from "./locales/ml";
import mr from "./locales/mr";
import or from "./locales/or";
import ta from "./locales/ta";
import te from "./locales/te";

// Each language's strings live in their own file under `./locales` (see
// `en.ts`/`hi.ts`/`gu.ts`) - add a new locale file and register it here to
// support another language, e.g. once a source with a native feed for it is
// added (this is exactly how gu.ts got added, alongside Divya Bhaskar).
const translations: Record<Language, Record<string, string>> = {
  en,
  hi,
  gu,
  bn,
  kn,
  mr,
  ml,
  ta,
  te,
  or,
};

export type TranslationKey = keyof typeof en;

export function useTranslation() {
  const { language } = useLanguagePreference();

  function t(key: TranslationKey, vars?: Record<string, string>): string {
    let text: string = translations[language][key];
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        text = text.replace(`{${name}}`, value);
      }
    }
    return text;
  }

  return { t, language };
}
