import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { notifyPreferenceChanged, onPreferenceChanged } from "@/utils/preference-sync";

export type FontSizePreference = "small" | "medium" | "large";

export const FONT_SIZE_STORAGE_KEY = "fontSizePreference";
export const DEFAULT_FONT_SIZE_PREFERENCE: FontSizePreference = "medium";
const STORAGE_KEY = FONT_SIZE_STORAGE_KEY;

const SCALE: Record<FontSizePreference, number> = {
  small: 0.875,
  medium: 1,
  large: 1.2,
};

type FontSizePreferenceContextValue = {
  preference: FontSizePreference;
  setPreference: (preference: FontSizePreference) => void;
  scale: number;
};

const FontSizePreferenceContext = createContext<
  FontSizePreferenceContextValue | undefined
>(undefined);

export function FontSizePreferenceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [preference, setPreferenceState] =
    useState<FontSizePreference>(DEFAULT_FONT_SIZE_PREFERENCE);

  // Also re-reads on every AuthProvider preference pull - see
  // docs/google-sign-in.md.
  useEffect(() => {
    const load = () => {
      AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
        if (stored === "small" || stored === "medium" || stored === "large") {
          setPreferenceState(stored);
        }
      });
    };
    load();
    return onPreferenceChanged(load);
  }, []);

  const setPreference = (next: FontSizePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
    notifyPreferenceChanged();
  };

  return (
    <FontSizePreferenceContext.Provider
      value={{ preference, setPreference, scale: SCALE[preference] }}
    >
      {children}
    </FontSizePreferenceContext.Provider>
  );
}

export function useFontSizePreference() {
  const ctx = useContext(FontSizePreferenceContext);
  if (!ctx) {
    throw new Error(
      "useFontSizePreference must be used within a FontSizePreferenceProvider"
    );
  }
  return ctx;
}
