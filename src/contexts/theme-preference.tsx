import { useContext, useEffect, type ReactNode } from "react";
import { Appearance, Platform } from "react-native";

import { createPersistedPreference } from "@/contexts/create-persisted-preference";
import { useColorScheme as useSystemColorScheme } from "@/hooks/use-color-scheme";

export type ThemePreference = "day" | "night" | "automatic";

export const THEME_STORAGE_KEY = "themePreference";
export const DEFAULT_THEME_PREFERENCE: ThemePreference = "automatic";

const base = createPersistedPreference<ThemePreference>({
  storageKey: THEME_STORAGE_KEY,
  defaultValue: DEFAULT_THEME_PREFERENCE,
  codec: {
    parse: (raw) =>
      raw === "day" || raw === "night" || raw === "automatic" ? raw : undefined,
    serialize: (v) => v,
  },
});

function resolve(
  preference: ThemePreference,
  systemScheme: "light" | "dark" | null | undefined
): "light" | "dark" {
  if (preference === "automatic") return systemScheme === "dark" ? "dark" : "light";
  return preference === "night" ? "dark" : "light";
}

// Our theme preference is app-level JS state - it doesn't by itself affect
// native-rendered chrome (e.g. a NativeTabs bar), which follows the OS's
// actual system appearance. Appearance.setColorScheme overrides that trait
// for this app specifically, so native elements pick up the same choice
// the reader made in-app.
function AppearanceSync({ children }: { children: ReactNode }) {
  const ctx = useContext(base.Context);
  const preference = ctx?.value ?? DEFAULT_THEME_PREFERENCE;
  useEffect(() => {
    if (Platform.OS === "web") return;
    Appearance.setColorScheme(
      preference === "automatic" ? null : preference === "night" ? "dark" : "light"
    );
  }, [preference]);
  return <>{children}</>;
}

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  return (
    <base.Provider>
      <AppearanceSync>{children}</AppearanceSync>
    </base.Provider>
  );
}

export function useThemePreference() {
  const ctx = useContext(base.Context);
  if (!ctx) {
    throw new Error(
      "useThemePreference must be used within a ThemePreferenceProvider"
    );
  }
  const systemScheme = useSystemColorScheme();
  return {
    preference: ctx.value,
    setPreference: ctx.setValue,
    resolvedScheme: resolve(ctx.value, systemScheme),
  };
}
