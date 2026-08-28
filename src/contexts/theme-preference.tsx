import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Appearance, Platform } from "react-native";

import { useColorScheme as useSystemColorScheme } from "@/hooks/use-color-scheme";

export type ThemePreference = "day" | "night" | "automatic";

const STORAGE_KEY = "themePreference";

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  resolvedScheme: "light" | "dark";
};

const ThemePreferenceContext = createContext<
  ThemePreferenceContextValue | undefined
>(undefined);

export function ThemePreferenceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] =
    useState<ThemePreference>("automatic");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "day" || stored === "night" || stored === "automatic") {
        setPreferenceState(stored);
      }
    });
  }, []);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  };

  // Our theme preference is app-level JS state - it doesn't by itself
  // affect native-rendered chrome (e.g. a NativeTabs bar), which follows the
  // OS's actual UITraitCollection/system appearance. Appearance.setColorScheme
  // overrides that trait for this app specifically, so native elements pick
  // up the same choice the user made in-app instead of only the device's
  // real system setting.
  useEffect(() => {
    if (Platform.OS === "web") return;
    // "unspecified", not null - RN's ColorSchemeName dropped null in favor
    // of this literal for "no override, follow the system" (see
    // NativeAppearance.d.ts).
    Appearance.setColorScheme(
      preference === "automatic"
        ? "unspecified"
        : preference === "night"
          ? "dark"
          : "light"
    );
  }, [preference]);

  const resolvedScheme: "light" | "dark" =
    preference === "automatic"
      ? systemScheme === "dark"
        ? "dark"
        : "light"
      : preference === "night"
        ? "dark"
        : "light";

  return (
    <ThemePreferenceContext.Provider
      value={{ preference, setPreference, resolvedScheme }}
    >
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference() {
  const ctx = useContext(ThemePreferenceContext);
  if (!ctx) {
    throw new Error(
      "useThemePreference must be used within a ThemePreferenceProvider"
    );
  }
  return ctx;
}
