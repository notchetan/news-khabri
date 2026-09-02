import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { notifyPreferenceChanged, onPreferenceChanged } from "@/utils/preference-sync";

export const DEBUG_STORAGE_KEY = "debugPreference";
const STORAGE_KEY = DEBUG_STORAGE_KEY;

type DebugPreferenceContextValue = {
  debugEnabled: boolean;
  setDebugEnabled: (enabled: boolean) => void;
};

const DebugPreferenceContext = createContext<
  DebugPreferenceContextValue | undefined
>(undefined);

export function DebugPreferenceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [debugEnabled, setDebugEnabledState] = useState(false);

  // Also re-reads on every AuthProvider preference pull - see
  // docs/google-sign-in.md. Unconditionally sets both true and false (not
  // just "true" -> true, leaving the useState(false) default do the rest)
  // - a reload needs to be able to turn this *off* too, not just on.
  useEffect(() => {
    const load = () => {
      AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
        if (stored != null) setDebugEnabledState(stored === "true");
      });
    };
    load();
    return onPreferenceChanged(load);
  }, []);

  const setDebugEnabled = (next: boolean) => {
    setDebugEnabledState(next);
    AsyncStorage.setItem(STORAGE_KEY, String(next));
    notifyPreferenceChanged();
  };

  return (
    <DebugPreferenceContext.Provider value={{ debugEnabled, setDebugEnabled }}>
      {children}
    </DebugPreferenceContext.Provider>
  );
}

export function useDebugPreference() {
  const ctx = useContext(DebugPreferenceContext);
  if (!ctx) {
    throw new Error(
      "useDebugPreference must be used within a DebugPreferenceProvider"
    );
  }
  return ctx;
}
