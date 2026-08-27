import type { Language } from "@/contexts/language-preference";
import type { TranslationKey } from "@/i18n/translations";
import bn from "@/i18n/locales/bn";
import en from "@/i18n/locales/en";
import gu from "@/i18n/locales/gu";
import hi from "@/i18n/locales/hi";
import kn from "@/i18n/locales/kn";
import ml from "@/i18n/locales/ml";
import mr from "@/i18n/locales/mr";
import or from "@/i18n/locales/or";
import ta from "@/i18n/locales/ta";
import te from "@/i18n/locales/te";

// Shared between preferences/index.tsx (shows the current selection) and
// preferences/language.tsx (the picker screen itself), so the two can never
// drift apart on which languages exist or what order they're listed in.
export const LANGUAGE_OPTIONS: { value: Language; labelKey: TranslationKey }[] = [
  { value: "en", labelKey: "languageEnglish" },
  { value: "hi", labelKey: "languageHindi" },
  { value: "gu", labelKey: "languageGujarati" },
  { value: "bn", labelKey: "languageBengali" },
  { value: "kn", labelKey: "languageKannada" },
  { value: "mr", labelKey: "languageMarathi" },
  { value: "ml", labelKey: "languageMalayalam" },
  { value: "ta", labelKey: "languageTamil" },
  { value: "te", labelKey: "languageTelugu" },
  { value: "or", labelKey: "languageOdia" },
];

// Each language's own name, in its own script, taken directly from that
// language's own locale file rather than run through the currently active
// language's t() - this is what makes "Hindi" read as "हिंदी" in the picker
// even while the app itself is showing English, matching how every major
// app's language picker works (a user can find their own language even if
// they can't read whichever one happens to be active right now).
export const LANGUAGE_ENDONYMS: Record<Language, string> = {
  en: en.languageEnglish,
  hi: hi.languageHindi,
  gu: gu.languageGujarati,
  bn: bn.languageBengali,
  kn: kn.languageKannada,
  mr: mr.languageMarathi,
  ml: ml.languageMalayalam,
  ta: ta.languageTamil,
  te: te.languageTelugu,
  or: or.languageOdia,
};
