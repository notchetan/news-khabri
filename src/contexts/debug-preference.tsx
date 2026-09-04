import { useContext } from "react";

import { createPersistedPreference } from "@/contexts/create-persisted-preference";

export const DEBUG_STORAGE_KEY = "debugPreference";

const base = createPersistedPreference<boolean>({
  storageKey: DEBUG_STORAGE_KEY,
  defaultValue: false,
  // Any stored string resolves (so a reload can turn this *off* too, not
  // just on) - "true" is true, everything else false.
  codec: { parse: (raw) => raw === "true", serialize: (v) => String(v) },
});

export const DebugPreferenceProvider = base.Provider;

export function useDebugPreference() {
  const ctx = useContext(base.Context);
  if (!ctx) {
    throw new Error(
      "useDebugPreference must be used within a DebugPreferenceProvider"
    );
  }
  // Debug mode is a developer aid (the ranking-score pills on feed cards),
  // never a shipped user feature - force it off in a release build even if
  // a previous dev build left "true" in AsyncStorage. The toggle that sets
  // it is also only rendered when __DEV__ (see preferences/index.tsx).
  return { debugEnabled: __DEV__ && ctx.value, setDebugEnabled: ctx.setValue };
}
