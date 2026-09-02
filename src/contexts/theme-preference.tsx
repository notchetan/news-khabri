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
import { notifyPreferenceChanged, onPreferenceChanged } from "@/utils/preference-sync";

export type ThemePreference = "day" | "night" | "automatic";

export const THEME_STORAGE_KEY = "themePreference";
export const DEFAULT_THEME_PREFERENCE: ThemePreference = "automatic";
const STORAGE_KEY = THEME_STORAGE_KEY;

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
    useState<ThemePreference>(DEFAULT_THEME_PREFERENCE);

  // Also re-reads on every AuthProvider preference pull (see
  // docs/google-sign-in.md), not just on mount - a signed-in reader's
  // theme can change from a server value applied after this provider
  // already initialized.
  useEffect(() => {
    const load = () => {
      AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
        if (stored === "day" || stored === "night" || stored === "automatic") {
          setPreferenceState(stored);
        }
      });
    };
    load();
    return onPreferenceChanged(load);
  }, []);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
    notifyPreferenceChanged();
  };

  // Our theme preference is app-level JS state - it doesn't by itself
  // affect native-rendered chrome (e.g. a NativeTabs bar), which follows the
  // OS's actual UITraitCollection/system appearance. Appearance.setColorScheme
  // overrides that trait for this app specifically, so native elements pick
  // up the same choice the user made in-app instead of only the device's
  // real system setting.
  useEffect(() => {
    if (Platform.OS === "web") return;
    Appearance.setColorScheme(
      preference === "automatic" ? null : preference === "night" ? "dark" : "light"
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
