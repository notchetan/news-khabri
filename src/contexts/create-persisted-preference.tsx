import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  notifyPreferenceChanged,
  onPreferenceChanged,
} from "@/utils/preference-sync";

// The shape every per-concern preference context under src/contexts/ was
// hand-rolling: a value backed by one AsyncStorage key, loaded on mount,
// re-loaded on every AuthProvider server pull (via the preference-sync
// bus - see docs/google-sign-in.md), and written back + broadcast on set.
//
// `parse` turns the stored string into a value, or returns null/undefined
// to mean "not a value we recognise - keep whatever's current" (so a
// missing or corrupt key leaves the default in place, but a valid "off"
// value still applies). `serialize` is the inverse.
type Codec<T> = {
  parse: (raw: string) => T | null | undefined;
  serialize: (value: T) => string;
};

export type PersistedPreference<T> = {
  value: T;
  setValue: (next: T) => void;
};

export function createPersistedPreference<T>(options: {
  storageKey: string;
  defaultValue: T;
  codec: Codec<T>;
}) {
  const { storageKey, defaultValue, codec } = options;

  // Exposed so each concern's own `useXxxPreference` can `useContext` it
  // directly and throw its own specific "must be used within" message.
  const Context = createContext<PersistedPreference<T> | undefined>(undefined);

  function Provider({ children }: { children: ReactNode }) {
    const [value, setValueState] = useState<T>(defaultValue);

    useEffect(() => {
      const load = () => {
        AsyncStorage.getItem(storageKey).then((raw) => {
          if (raw == null) return;
          const parsed = codec.parse(raw);
          if (parsed != null) setValueState(parsed);
        });
      };
      load();
      return onPreferenceChanged(load);
    }, []);

    const setValue = (next: T) => {
      setValueState(next);
      AsyncStorage.setItem(storageKey, codec.serialize(next));
      notifyPreferenceChanged();
    };

    return <Context.Provider value={{ value, setValue }}>{children}</Context.Provider>;
  }

  return { Context, Provider };
}
