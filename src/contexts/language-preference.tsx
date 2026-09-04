import { useContext } from "react";

import { createPersistedPreference } from "@/contexts/create-persisted-preference";

export type Language =
  | "en"
  | "hi"
  | "gu"
  | "bn"
  | "kn"
  | "mr"
  | "ml"
  | "ta"
  | "te"
  | "or";

const VALID_LANGUAGES: Language[] = [
  "en",
  "hi",
  "gu",
  "bn",
  "kn",
  "mr",
  "ml",
  "ta",
  "te",
  "or",
];

export const LANGUAGE_STORAGE_KEY = "languagePreference";
export const DEFAULT_LANGUAGE: Language = "en";

const base = createPersistedPreference<Language>({
  storageKey: LANGUAGE_STORAGE_KEY,
  defaultValue: DEFAULT_LANGUAGE,
  codec: {
    parse: (raw) => (VALID_LANGUAGES.includes(raw as Language) ? (raw as Language) : undefined),
    serialize: (v) => v,
  },
});

export const LanguagePreferenceProvider = base.Provider;

export function useLanguagePreference() {
  const ctx = useContext(base.Context);
  if (!ctx) {
    throw new Error(
      "useLanguagePreference must be used within a LanguagePreferenceProvider"
    );
  }
  return { language: ctx.value, setLanguage: ctx.setValue };
}
