import { useContext } from "react";

import { createPersistedPreference } from "@/contexts/create-persisted-preference";

export type FontSizePreference = "small" | "medium" | "large";

export const FONT_SIZE_STORAGE_KEY = "fontSizePreference";
export const DEFAULT_FONT_SIZE_PREFERENCE: FontSizePreference = "medium";

const SCALE: Record<FontSizePreference, number> = {
  small: 0.875,
  medium: 1,
  large: 1.2,
};

const base = createPersistedPreference<FontSizePreference>({
  storageKey: FONT_SIZE_STORAGE_KEY,
  defaultValue: DEFAULT_FONT_SIZE_PREFERENCE,
  codec: {
    parse: (raw) =>
      raw === "small" || raw === "medium" || raw === "large" ? raw : undefined,
    serialize: (v) => v,
  },
});

export const FontSizePreferenceProvider = base.Provider;

// Non-throwing, unlike useFontSizePreference below. ThemedText is a leaf
// primitive rendered from a lot of places that legitimately have no
// provider above them (component tests, any future path that renders text
// outside the app tree), and a text component that crashes on a missing
// provider is a footgun out of proportion to what it's reading. Falls back
// to the default scale, which is 1.
export function useFontScale(): number {
  const ctx = useContext(base.Context);
  return SCALE[ctx?.value ?? DEFAULT_FONT_SIZE_PREFERENCE];
}

export function useFontSizePreference() {
  const ctx = useContext(base.Context);
  if (!ctx) {
    throw new Error(
      "useFontSizePreference must be used within a FontSizePreferenceProvider"
    );
  }
  return {
    preference: ctx.value,
    setPreference: ctx.setValue,
    scale: SCALE[ctx.value],
  };
}
