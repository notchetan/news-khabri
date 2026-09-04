import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { fetchSources } from "@/api/articles";
import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { SourcesPreferenceProvider } from "@/contexts/sources-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import SourcesScreen from "../sources";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

jest.mock("@/api/articles", () => ({
  ...jest.requireActual("@/api/articles"),
  fetchSources: jest.fn(),
}));

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack, replace: jest.fn(), canGoBack: () => true }),
}));

const mockFetchSources = fetchSources as jest.Mock;

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemePreferenceProvider>
        <LanguagePreferenceProvider>
          <SourcesPreferenceProvider>
            <SourcesScreen />
          </SourcesPreferenceProvider>
        </LanguagePreferenceProvider>
      </ThemePreferenceProvider>
    </QueryClientProvider>
  );
}

function expectSelected(name: string, selected: boolean) {
  expect(
    screen.getByRole("button", { name })
  ).toHaveProp("accessibilityState", expect.objectContaining({ selected }));
}

describe("SourcesScreen (multi-select picker)", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    mockFetchSources.mockResolvedValue(["NDTV", "BBC Sport", "The Hindu"]);
  });

  it("shows a PageHeader (chevron + title left, brand logo right) matching the article page's own header", async () => {
    await act(async () => {
      renderScreen();
    });

    expect(screen.getByTestId("sources-header-row")).toBeTruthy();
    expect(screen.getByTestId("sources-back-chevron")).toBeTruthy();
    expect(screen.getByTestId("sources-brand-logo")).toBeTruthy();
    expect(screen.getAllByText("Sources")).toHaveLength(1);

    fireEvent.press(screen.getByRole("button", { name: "Back" }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("has no Select all/Clear all buttons - every source is already selected by default instead", async () => {
    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByText("NDTV")).toBeTruthy();
    });
    expect(screen.queryByRole("button", { name: "Select all" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Clear all" })).toBeNull();
  });

  // Before this, a failed fetch rendered a blank list under the description
  // with no explanation and no retry - the one query-backed screen that
  // never got the shared ErrorState (AGENTS.md requires it everywhere).
  it("shows a retryable error state instead of a blank list when the fetch fails", async () => {
    mockFetchSources.mockRejectedValue(new Error("offline"));

    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByTestId("sources-error")).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();

    mockFetchSources.mockResolvedValue(["NDTV"]);
    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    });

    await waitFor(() => {
      expect(screen.getByText("NDTV")).toBeTruthy();
    });
    expect(screen.queryByTestId("sources-error")).toBeNull();
  });

  it("lists every source for the active language, all selected by default", async () => {
    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByText("NDTV")).toBeTruthy();
    });
    expect(screen.getByText("BBC Sport")).toBeTruthy();
    expect(screen.getByText("The Hindu")).toBeTruthy();
    expectSelected("NDTV", true);
    expectSelected("BBC Sport", true);
    expectSelected("The Hindu", true);
  });

  it("deselecting one source out of the (implicit) full set persists the rest as an explicit list", async () => {
    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByText("NDTV")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "NDTV" }));
    });

    expectSelected("NDTV", false);
    expectSelected("BBC Sport", true);
    expectSelected("The Hindu", true);
    await waitFor(async () => {
      const stored = JSON.parse((await AsyncStorage.getItem("sourcesPreference")) ?? "{}");
      expect(stored.en).toEqual(["BBC Sport", "The Hindu"]);
    });
  });

  it("re-selecting a deselected source restores it", async () => {
    await AsyncStorage.setItem("sourcesPreference", JSON.stringify({ en: ["BBC Sport", "The Hindu"] }));

    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expectSelected("NDTV", false);
    });

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "NDTV" }));
    });

    // Every source is selected again - collapses back to the canonical []
    // "all sources" state rather than persisting a redundant explicit list
    // of everything (see the next test for the display-text implication).
    await waitFor(async () => {
      const stored = JSON.parse((await AsyncStorage.getItem("sourcesPreference")) ?? "{}");
      expect(stored.en).toEqual([]);
    });
    expectSelected("NDTV", true);
  });

  it("deselecting every source falls back to all sources selected, not an empty selection", async () => {
    await AsyncStorage.setItem("sourcesPreference", JSON.stringify({ en: ["NDTV"] }));

    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expectSelected("NDTV", true);
    });
    expectSelected("BBC Sport", false);
    expectSelected("The Hindu", false);

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "NDTV" }));
    });

    // Unchecking the last remaining source isn't left as "nothing
    // selected" (an empty feed) - it snaps back to every source selected.
    expectSelected("NDTV", true);
    expectSelected("BBC Sport", true);
    expectSelected("The Hindu", true);
    await waitFor(async () => {
      const stored = JSON.parse((await AsyncStorage.getItem("sourcesPreference")) ?? "{}");
      expect(stored.en).toEqual([]);
    });
  });

  it("shows a source's native-script name alongside its registered English name, for a language with a mapping", async () => {
    mockFetchSources.mockResolvedValue(["Aaj Tak", "NDTV Khabar"]);
    await AsyncStorage.setItem("languagePreference", "hi");

    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByText("आज तक (Aaj Tak)")).toBeTruthy();
    });
    expect(screen.getByText("एनडीटीवी खबर (NDTV Khabar)")).toBeTruthy();
  });

  it("shows a source's plain registered name when no native-script mapping exists (e.g. English)", async () => {
    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByText("NDTV")).toBeTruthy();
    });
    expect(screen.queryByText(/NDTV \(/)).toBeNull();
  });
});
