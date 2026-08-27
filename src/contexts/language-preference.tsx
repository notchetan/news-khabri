import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

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

const STORAGE_KEY = "languagePreference";

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
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (VALID_LANGUAGES.includes(stored as Language)) {
        setLanguageState(stored as Language);
      }
    });
  }, []);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
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
