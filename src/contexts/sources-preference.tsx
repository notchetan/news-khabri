import { useContext } from "react";

import { createPersistedPreference } from "@/contexts/create-persisted-preference";
import { useLanguagePreference, type Language } from "@/contexts/language-preference";

export const SOURCES_STORAGE_KEY = "sourcesPreference";

// A stable shared reference for "no selection for this language" - a fresh
// `[]` literal on every render would defeat a consumer's own effect/query-
// key dependency on selectedSources.
const EMPTY_SOURCES: string[] = [];

// Keyed per language, not one flat list - publisher names aren't shared
// across languages (NDTV's English feed and NDTV Khabar's Hindi one are
// different registered sources), so a reader's English picks shouldn't
// vanish when they switch to Hindi and back. An empty/missing array for a
// language is the canonical "every source selected" state.
export type SelectionsByLanguage = Partial<Record<Language, string[]>>;
export const DEFAULT_SOURCES_SELECTIONS: SelectionsByLanguage = {};

const base = createPersistedPreference<SelectionsByLanguage>({
  storageKey: SOURCES_STORAGE_KEY,
  defaultValue: DEFAULT_SOURCES_SELECTIONS,
  codec: {
    parse: (raw) => {
      try {
        return JSON.parse(raw);
      } catch {
        // Corrupt/unexpected stored shape - keep the "no filter" default.
        return undefined;
      }
    },
    serialize: (v) => JSON.stringify(v),
  },
});

export const SourcesPreferenceProvider = base.Provider;

export function useSourcesPreference() {
  const ctx = useContext(base.Context);
  if (!ctx) {
    throw new Error(
      "useSourcesPreference must be used within a SourcesPreferenceProvider"
    );
  }
  const { language } = useLanguagePreference();
  return {
    selectedSources: ctx.value[language] ?? EMPTY_SOURCES,
    setSelectedSources: (sources: string[]) =>
      ctx.setValue({ ...ctx.value, [language]: sources }),
  };
}
