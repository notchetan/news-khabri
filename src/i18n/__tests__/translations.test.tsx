import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { useTranslation, type TranslationKey } from "../translations";
import bn from "../locales/bn";
import en from "../locales/en";
import gu from "../locales/gu";
import hi from "../locales/hi";
import kn from "../locales/kn";
import ml from "../locales/ml";
import mr from "../locales/mr";
import or from "../locales/or";
import ta from "../locales/ta";
import te from "../locales/te";

function wrapper({ children }: { children: React.ReactNode }) {
  return <LanguagePreferenceProvider>{children}</LanguagePreferenceProvider>;
}

describe("useTranslation", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("returns English strings by default", async () => {
    const { result } = await renderHook(() => useTranslation(), { wrapper });

    expect(result.current.language).toBe("en");
    expect(result.current.t("tabHome")).toBe("Home");
    expect(result.current.t("back")).toBe("Back");
  });

  it("returns Hindi strings once the language preference switches to hi", async () => {
    await AsyncStorage.setItem("languagePreference", "hi");

    const { result } = await renderHook(() => useTranslation(), { wrapper });

    await waitFor(() => {
      expect(result.current.language).toBe("hi");
    });
    expect(result.current.t("tabHome")).toBe("होम");
    expect(result.current.t("back")).toBe("वापस");
  });

  it("substitutes {placeholder} template variables", async () => {
    const { result } = await renderHook(() => useTranslation(), { wrapper });

    expect(result.current.t("readOnTemplate", { source: "NDTV" })).toBe(
      "Read on NDTV"
    );
  });

  it("substitutes template variables in Hindi too", async () => {
    await AsyncStorage.setItem("languagePreference", "hi");
    const { result } = await renderHook(() => useTranslation(), { wrapper });

    await waitFor(() => {
      expect(result.current.language).toBe("hi");
    });
    expect(result.current.t("readOnTemplate", { source: "NDTV" })).toBe(
      "NDTV पर पढ़ें"
    );
  });

  // No shipped string uses the same placeholder twice, so there is nothing
  // real to assert the replaceAll fix against - the guarantee worth locking
  // is the one that would break silently: a placeholder must never survive
  // into rendered copy once its var has been supplied.
  it("leaves no unsubstituted placeholder behind in any locale", async () => {
    const locales = ["en", "hi", "gu", "bn", "kn", "mr", "ml", "ta", "te", "or"];
    const samples: [TranslationKey, Record<string, string>][] = [
      ["readOnTemplate", { source: "NDTV" }],
      ["minutesAgoTemplate", { minutes: "5" }],
      ["storySourcesTemplate", { count: "3" }],
      ["noResultsForTemplate", { query: "election" }],
    ];

    for (const locale of locales) {
      await AsyncStorage.setItem("languagePreference", locale);
      const { result } = await renderHook(() => useTranslation(), { wrapper });
      await waitFor(() => {
        expect(result.current.language).toBe(locale);
      });
      for (const [key, vars] of samples) {
        expect({ locale, key, text: result.current.t(key, vars) }).toEqual({
          locale,
          key,
          text: expect.not.stringMatching(/\{[a-zA-Z]+\}/),
        });
      }
    }
  });

  it("leaves the string unchanged when no vars are given for a key with a placeholder", async () => {
    const { result } = await renderHook(() => useTranslation(), { wrapper });

    expect(result.current.t("readOnTemplate")).toBe("Read on {source}");
  });

  it("returns Gujarati strings once the language preference switches to gu", async () => {
    await AsyncStorage.setItem("languagePreference", "gu");

    const { result } = await renderHook(() => useTranslation(), { wrapper });

    await waitFor(() => {
      expect(result.current.language).toBe("gu");
    });
    expect(result.current.t("tabHome")).toBe("હોમ");
    expect(result.current.t("back")).toBe("પાછળ");
  });

  it("substitutes template variables in Gujarati too", async () => {
    await AsyncStorage.setItem("languagePreference", "gu");
    const { result } = await renderHook(() => useTranslation(), { wrapper });

    await waitFor(() => {
      expect(result.current.language).toBe("gu");
    });
    expect(result.current.t("readOnTemplate", { source: "NDTV" })).toBe(
      "NDTV પર વાંચો"
    );
  });

  it.each([
    ["bn", bn, "হোম", "পিছনে"],
    ["kn", kn, "ಹೋಮ್", "ಹಿಂದೆ"],
    ["mr", mr, "होम", "मागे"],
    ["ml", ml, "ഹോം", "തിരികെ"],
    ["ta", ta, "முகப்பு", "பின்செல்"],
    ["te", te, "హోమ్", "వెనుకకు"],
    ["or", or, "ହୋମ୍", "ପଛକୁ"],
  ])(
    "returns %s strings once the language preference switches to it",
    async (code, locale, expectedTabHome, expectedBack) => {
      await AsyncStorage.setItem("languagePreference", code);

      const { result } = await renderHook(() => useTranslation(), { wrapper });

      await waitFor(() => {
        expect(result.current.language).toBe(code);
      });
      expect(result.current.t("tabHome")).toBe(expectedTabHome);
      expect(result.current.t("tabHome")).toBe(locale.tabHome);
      expect(result.current.t("back")).toBe(expectedBack);
      expect(result.current.t("back")).toBe(locale.back);
    }
  );

  it("every locale defines exactly the same set of keys as the English default", () => {
    const enKeys = Object.keys(en).sort();
    expect(Object.keys(hi).sort()).toEqual(enKeys);
    expect(Object.keys(gu).sort()).toEqual(enKeys);
    expect(Object.keys(bn).sort()).toEqual(enKeys);
    expect(Object.keys(kn).sort()).toEqual(enKeys);
    expect(Object.keys(mr).sort()).toEqual(enKeys);
    expect(Object.keys(ml).sort()).toEqual(enKeys);
    expect(Object.keys(ta).sort()).toEqual(enKeys);
    expect(Object.keys(te).sort()).toEqual(enKeys);
    expect(Object.keys(or).sort()).toEqual(enKeys);
  });

  it("every locale's strings contain the same {placeholder} tokens as the English default", () => {
    const placeholderPattern = /\{[a-zA-Z]+\}/g;
    const locales = { hi, gu, bn, kn, mr, ml, ta, te, or };
    for (const [key, enValue] of Object.entries(en)) {
      const expectedPlaceholders = (enValue.match(placeholderPattern) || []).sort();
      if (expectedPlaceholders.length === 0) continue;
      for (const [localeName, locale] of Object.entries(locales)) {
        const actualPlaceholders = (
          (locale as Record<string, string>)[key].match(placeholderPattern) || []
        ).sort();
        expect({ locale: localeName, key, placeholders: actualPlaceholders }).toEqual({
          locale: localeName,
          key,
          placeholders: expectedPlaceholders,
        });
      }
    }
  });
});
