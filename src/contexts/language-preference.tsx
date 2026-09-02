import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { notifyPreferenceChanged, onPreferenceChanged } from "@/utils/preference-sync";

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
const STORAGE_KEY = LANGUAGE_STORAGE_KEY;

type LanguagePreferenceContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const LanguagePreferenceContext = createContext<
  LanguagePreferenceContextValue | undefined
>(undefined);

export function LanguagePreferenceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  // Also re-reads on every AuthProvider preference pull - see
  // docs/google-sign-in.md.
  useEffect(() => {
    const load = () => {
      AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
        if (VALID_LANGUAGES.includes(stored as Language)) {
          setLanguageState(stored as Language);
        }
      });
    };
    load();
    return onPreferenceChanged(load);
  }, []);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
    notifyPreferenceChanged();
  };

  return (
    <LanguagePreferenceContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguagePreferenceContext.Provider>
  );
}

export function useLanguagePreference() {
  const ctx = useContext(LanguagePreferenceContext);
  if (!ctx) {
    throw new Error(
      "useLanguagePreference must be used within a LanguagePreferenceProvider"
    );
  }
  return ctx;
}
