import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { LanguagePreferenceProvider, useLanguagePreference } from "../language-preference";
import { SourcesPreferenceProvider, useSourcesPreference } from "../sources-preference";

const STORAGE_KEY = "sourcesPreference";

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <LanguagePreferenceProvider>
      <SourcesPreferenceProvider>{children}</SourcesPreferenceProvider>
    </LanguagePreferenceProvider>
  );
}

describe("useSourcesPreference", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("throws when used outside the provider", async () => {
    const { result } = await renderHook(() => {
      try {
        return useSourcesPreference();
      } catch (e) {
        return e as Error;
      }
    });
    expect(result.current).toBeInstanceOf(Error);
    expect((result.current as Error).message).toContain(
      "useSourcesPreference must be used within a SourcesPreferenceProvider"
    );
  });

  it("defaults to no selection (every source shown) before storage resolves and after resolving to nothing stored", async () => {
    const { result } = await renderHook(() => useSourcesPreference(), { wrapper });

    expect(result.current.selectedSources).toEqual([]);
    await waitFor(() => {
      expect(result.current.selectedSources).toEqual([]);
    });
  });

  it("loads a previously persisted selection for the active language from storage on mount", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ en: ["NDTV", "BBC Sport"] }));

    const { result } = await renderHook(() => useSourcesPreference(), { wrapper });

    await waitFor(() => {
      expect(result.current.selectedSources).toEqual(["NDTV", "BBC Sport"]);
    });
  });

  it("ignores a corrupt stored value and keeps the default empty selection", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "{not valid json");

    const { result } = await renderHook(() => useSourcesPreference(), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.selectedSources).toEqual([]);
  });

  it("setSelectedSources replaces the whole selection for the active language and persists it", async () => {
    const { result } = await renderHook(() => useSourcesPreference(), { wrapper });

    await act(async () => {
      result.current.setSelectedSources(["NDTV"]);
    });

    expect(result.current.selectedSources).toEqual(["NDTV"]);
    await waitFor(async () => {
      const stored = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? "{}");
      expect(stored.en).toEqual(["NDTV"]);
    });
  });

  it("setSelectedSources replaces the whole selection for the active language", async () => {
    const { result } = await renderHook(() => useSourcesPreference(), { wrapper });

    await act(async () => {
      result.current.setSelectedSources(["The Hindu", "Times of India"]);
    });

    expect(result.current.selectedSources).toEqual(["The Hindu", "Times of India"]);
  });

  // Publisher names aren't shared across languages (NDTV's English feed vs.
  // NDTV Khabar's Hindi one) - a selection made in one language shouldn't
  // leak into or clobber another's, which is exactly what a single flat
  // list (instead of one keyed per language) would do.
  it("keeps selections for different languages independent", async () => {
    function combinedWrapper({ children }: { children: React.ReactNode }) {
      return (
        <LanguagePreferenceProvider>
          <SourcesPreferenceProvider>{children}</SourcesPreferenceProvider>
        </LanguagePreferenceProvider>
      );
    }

    const { result } = await renderHook(
      () => ({
        language: useLanguagePreference(),
        sources: useSourcesPreference(),
      }),
      { wrapper: combinedWrapper }
    );

    await act(async () => {
      result.current.sources.setSelectedSources(["NDTV"]);
    });
    expect(result.current.sources.selectedSources).toEqual(["NDTV"]);

    await act(async () => {
      result.current.language.setLanguage("hi");
    });
    await waitFor(() => {
      expect(result.current.language.language).toBe("hi");
    });
    // Hindi has no selection yet - "no filter" (every Hindi source shown),
    // not the English selection carried over.
    expect(result.current.sources.selectedSources).toEqual([]);

    await act(async () => {
      result.current.sources.setSelectedSources(["Aaj Tak"]);
    });

    await act(async () => {
      result.current.language.setLanguage("en");
    });
    await waitFor(() => {
      expect(result.current.language.language).toBe("en");
    });
    // Back to English - its own earlier selection is still there, untouched
    // by whatever was picked for Hindi in between.
    expect(result.current.sources.selectedSources).toEqual(["NDTV"]);
  });
});
