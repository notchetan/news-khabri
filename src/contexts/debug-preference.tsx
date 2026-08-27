import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "debugPreference";

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

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "true") setDebugEnabledState(true);
    });
  }, []);

  const setDebugEnabled = (next: boolean) => {
    setDebugEnabledState(next);
    AsyncStorage.setItem(STORAGE_KEY, String(next));
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
