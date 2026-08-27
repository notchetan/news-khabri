import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type FontSizePreference = "small" | "medium" | "large";

const STORAGE_KEY = "fontSizePreference";

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
    useState<FontSizePreference>("medium");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "small" || stored === "medium" || stored === "large") {
        setPreferenceState(stored);
      }
    });
  }, []);

  const setPreference = (next: FontSizePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
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
