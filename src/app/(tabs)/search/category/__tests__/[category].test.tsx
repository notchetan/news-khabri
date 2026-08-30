import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { fetchArticles, type Article } from "@/api/articles";
import { DebugPreferenceProvider } from "@/contexts/debug-preference";
import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { SourcesPreferenceProvider } from "@/contexts/sources-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import SearchCategoryScreen from "../[category]";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

jest.mock("@/api/articles", () => ({
  ...jest.requireActual("@/api/articles"),
  fetchArticles: jest.fn(),
}));

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    push: jest.fn(),
    canGoBack: () => mockCanGoBack,
  }),
  useLocalSearchParams: () => ({ category: "business" }),
}));

const mockFetchArticles = fetchArticles as jest.Mock;

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: 1,
    title: "Test article title",
    link: "https://example.com/1",
    source: "Test Source",
    category: "business",
    published_at: "2026-01-15T18:30:00Z",
    image_url: null,
    fetched_at: "2026-01-15T18:31:00Z",
    language: "en",
    ...overrides,
  };
}

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemePreferenceProvider>
        <LanguagePreferenceProvider>
          <SourcesPreferenceProvider>
            <DebugPreferenceProvider>
              <SearchCategoryScreen />
            </DebugPreferenceProvider>
          </SourcesPreferenceProvider>
        </LanguagePreferenceProvider>
      </ThemePreferenceProvider>
    </QueryClientProvider>
  );
}

describe("SearchCategoryScreen", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockCanGoBack = true;
    mockFetchArticles.mockResolvedValue([]);
  });

  it("shows the title-cased category name as a header", async () => {
    await act(async () => {
      renderScreen();
    });

    expect(screen.getByRole("header", { name: "Business" })).toBeTruthy();
  });

  it("translates the header into the currently active language", async () => {
    await AsyncStorage.setItem("languagePreference", "hi");

    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByRole("header", { name: "बिजनेस" })).toBeTruthy();
    });
  });

  it("requests articles filtered by the category param", async () => {
    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(mockFetchArticles).toHaveBeenCalledWith(
        "en",
        "business",
        undefined,
        undefined,
        []
      );
    });
  });

  it("renders matching articles", async () => {
    mockFetchArticles.mockResolvedValue([
      makeArticle({ id: 1, title: "Market rally continues" }),
    ]);

    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByText("Market rally continues")).toBeTruthy();
    });
  });

  it("shows the ranking debug pill when debug mode is on and the result carries a ranking score", async () => {
    await AsyncStorage.setItem("debugPreference", "true");
    mockFetchArticles.mockResolvedValue([
      makeArticle({ id: 1, title: "Market rally continues", ranking_score: 0.62 }),
    ]);

    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByTestId("ranking-debug-pill")).toBeTruthy();
    });
    expect(screen.getByText("0.62")).toBeTruthy();
  });

  it("calls router.back() when the back button is pressed and history exists", async () => {
    await act(async () => {
      renderScreen();
    });

    fireEvent.press(screen.getByRole("button", { name: "Back" }));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("falls back to replacing with the Search tab's root when there is no back history", async () => {
    mockCanGoBack = false;
    await act(async () => {
      renderScreen();
    });

    fireEvent.press(screen.getByRole("button", { name: "Back" }));

    expect(mockReplace).toHaveBeenCalledWith("/search");
    expect(mockBack).not.toHaveBeenCalled();
  });
});
