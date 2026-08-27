import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  LanguagePreferenceProvider,
  useLanguagePreference,
} from "../language-preference";

const STORAGE_KEY = "languagePreference";

function wrapper({ children }: { children: React.ReactNode }) {
  return <LanguagePreferenceProvider>{children}</LanguagePreferenceProvider>;
}

describe("useLanguagePreference", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("throws when used outside the provider", async () => {
    const { result } = await renderHook(() => {
      try {
        return useLanguagePreference();
      } catch (e) {
        return e as Error;
      }
    });
    expect(result.current).toBeInstanceOf(Error);
    expect((result.current as Error).message).toContain(
      "useLanguagePreference must be used within a LanguagePreferenceProvider"
    );
  });

  it("defaults to English before storage resolves and after resolving to nothing stored", async () => {
    const { result } = await renderHook(() => useLanguagePreference(), {
      wrapper,
    });

    expect(result.current.language).toBe("en");
    await waitFor(() => {
      expect(result.current.language).toBe("en");
    });
  });

  it("loads a previously persisted language from storage on mount", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "hi");

    const { result } = await renderHook(() => useLanguagePreference(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.language).toBe("hi");
    });
  });

  it("loads a previously persisted Gujarati preference from storage on mount", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "gu");

    const { result } = await renderHook(() => useLanguagePreference(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.language).toBe("gu");
    });
  });

  it("ignores a corrupt/unrecognized stored value and keeps the default", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "fr");

    const { result } = await renderHook(() => useLanguagePreference(), {
      wrapper,
    });

    // Give the async AsyncStorage read a moment to resolve, then confirm the
    // bad value was ignored and the default is still in effect.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.language).toBe("en");
  });

  it("updates state and persists to storage when setLanguage is called", async () => {
    const { result } = await renderHook(() => useLanguagePreference(), {
      wrapper,
    });

    await act(async () => {
      result.current.setLanguage("hi");
    });

    expect(result.current.language).toBe("hi");
    await waitFor(async () => {
      expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe("hi");
    });
  });
});
