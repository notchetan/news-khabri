import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { useLanguagePreference, type Language } from "@/contexts/language-preference";

const STORAGE_KEY = "sourcesPreference";

// A stable shared reference for "no selection for this language" - a fresh
// `[]` literal on every render would defeat a consumer's own effect/query-
// key dependency on selectedSources (looks "changed" every render even
// though nothing did).
const EMPTY_SOURCES: string[] = [];

// Keyed per language, not one flat list - publisher names aren't shared
// across languages (NDTV's English feed and NDTV Khabar's Hindi one are
// different registered sources), so a reader's English picks shouldn't
// vanish when they switch to Hindi and back. An empty/missing array for a
// language is the canonical "every source selected" state - both this
// app's default and the only valid resting state if a reader unchecks
// everything (see sources.tsx's own toggle logic, which collapses back to
// this rather than ever persisting a literal "nothing selected").
type SelectionsByLanguage = Partial<Record<Language, string[]>>;

type SourcesPreferenceContextValue = {
  selectedSources: string[];
  setSelectedSources: (sources: string[]) => void;
};

const SourcesPreferenceContext = createContext<
  SourcesPreferenceContextValue | undefined
>(undefined);

export function SourcesPreferenceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { language } = useLanguagePreference();
  const [selections, setSelections] = useState<SelectionsByLanguage>({});

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (!stored) return;
      try {
        setSelections(JSON.parse(stored));
      } catch {
        // Corrupt/unexpected stored shape - ignore and keep the "no filter"
        // default for every language rather than crashing.
      }
    });
  }, []);

  const persist = (next: SelectionsByLanguage) => {
    setSelections(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const selectedSources = selections[language] ?? EMPTY_SOURCES;

  const setSelectedSources = (sources: string[]) => {
    persist({ ...selections, [language]: sources });
  };

  return (
    <SourcesPreferenceContext.Provider
      value={{ selectedSources, setSelectedSources }}
    >
      {children}
    </SourcesPreferenceContext.Provider>
  );
}

export function useSourcesPreference() {
  const ctx = useContext(SourcesPreferenceContext);
  if (!ctx) {
    throw new Error(
      "useSourcesPreference must be used within a SourcesPreferenceProvider"
    );
  }
  return ctx;
}
