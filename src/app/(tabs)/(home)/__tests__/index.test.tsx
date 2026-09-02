import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { fetchArticles, fetchCategories, type Article } from "@/api/articles";
import { fetchStoryFeed, type Story } from "@/api/stories";
import { AuthProvider } from "@/contexts/auth-context";
import { BookmarksProvider } from "@/contexts/bookmarks-context";
import { DebugPreferenceProvider } from "@/contexts/debug-preference";
import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { SourcesPreferenceProvider } from "@/contexts/sources-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import HomeScreen from "../index";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

jest.mock("@/api/articles", () => ({
  ...jest.requireActual("@/api/articles"),
  fetchArticles: jest.fn(),
  fetchCategories: jest.fn(),
}));

jest.mock("@/api/stories", () => ({
  ...jest.requireActual("@/api/stories"),
  fetchStoryFeed: jest.fn(),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/api/auth", () => ({
  fetchMe: jest.fn(),
  signInWithGoogle: jest.fn(),
  putPreferences: jest.fn(),
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

const mockFetchArticles = fetchArticles as jest.Mock;
const mockFetchCategories = fetchCategories as jest.Mock;
const mockFetchStoryFeed = fetchStoryFeed as jest.Mock;

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: 1,
    title: "Test article title",
    link: "https://example.com/1",
    source: "Test Source",
    category: "national",
    published_at: "2026-01-15T18:30:00Z",
    image_url: null,
    fetched_at: "2026-01-15T18:31:00Z",
    language: "en",
    ...overrides,
  };
}

function makeStory(overrides: Partial<Story> = {}): Story {
  return {
    id: 1,
    title: "Test story title",
    summary: null,
    category: "national",
    language: "en",
    articleCount: 2,
    sourceCount: 2,
    firstPublishedAt: "2026-01-15T18:00:00Z",
    latestPublishedAt: "2026-01-15T18:30:00Z",
    storyScore: 0.5,
    representativeArticle: {
      id: 1,
      title: "Test story title",
      link: "https://example.com/1",
      source: "Test Source",
      image_url: null,
      published_at: "2026-01-15T18:30:00Z",
    },
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
              <AuthProvider>
                <BookmarksProvider>
                  <HomeScreen />
                </BookmarksProvider>
              </AuthProvider>
            </DebugPreferenceProvider>
          </SourcesPreferenceProvider>
        </LanguagePreferenceProvider>
      </ThemePreferenceProvider>
    </QueryClientProvider>
  );
}

describe("HomeScreen", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockFetchCategories.mockResolvedValue(["national", "business"]);
    mockFetchArticles.mockResolvedValue([]);
    mockFetchStoryFeed.mockResolvedValue([]);
  });

  it("shows the app's own name at the top, via the shared AppHeader", async () => {
    await act(async () => {
      renderScreen();
    });

    expect(screen.getByText("News Khabri")).toBeTruthy();
  });

  it("renders a 'Top Stories' pill (pinned, default) plus each discovered category, title-cased", async () => {
    mockFetchCategories.mockResolvedValue(["national", "business"]);

    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "National" })).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: "Top Stories" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Business" })).toBeTruthy();
  });

  it("translates known category values into the currently active language, and filters articles by the raw untranslated value", async () => {
    await AsyncStorage.setItem("languagePreference", "hi");
    mockFetchCategories.mockResolvedValue(["business", "sports"]);

    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "बिजनेस" })).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: "स्पोर्ट्स" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "प्रमुख ख़बरें" })).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "बिजनेस" }));
    });

    // The API is still filtered by the raw backend value, not the
    // translated display text.
    await waitFor(() => {
      expect(mockFetchArticles).toHaveBeenCalledWith("hi", "business", undefined, undefined, []);
    });
  });

  it("defaults to fetching the clustered story feed with no category filter", async () => {
    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(mockFetchStoryFeed).toHaveBeenCalledWith("en", undefined, 20, [], null);
    });
    expect(mockFetchArticles).not.toHaveBeenCalled();
  });

  it("re-fetches articles chronologically, filtered by category, when a category pill is tapped", async () => {
    mockFetchArticles.mockResolvedValue([]);
    mockFetchCategories.mockResolvedValue(["business"]);

    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Business" })).toBeTruthy();
    });

    mockFetchArticles.mockClear();
    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Business" }));
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

  it("switches back to the clustered story feed when the pinned pill is tapped again", async () => {
    mockFetchCategories.mockResolvedValue(["business"]);

    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Business" })).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Business" }));
    });

    mockFetchStoryFeed.mockClear();
    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Top Stories" }));
    });

    await waitFor(() => {
      expect(mockFetchStoryFeed).toHaveBeenCalledWith("en", undefined, 20, [], null);
    });
  });

  it("renders stories from the underlying StoryList once loaded", async () => {
    mockFetchStoryFeed.mockResolvedValue([
      makeStory({ id: 1, title: "First story" }),
    ]);

    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByText("First story")).toBeTruthy();
    });
  });

  it("renders articles from the underlying ArticleList once a category is selected", async () => {
    mockFetchCategories.mockResolvedValue(["business"]);
    mockFetchArticles.mockResolvedValue([
      makeArticle({ id: 1, title: "First article", source: "NDTV" }),
    ]);

    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Business" })).toBeTruthy();
    });
    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Business" }));
    });

    await waitFor(() => {
      expect(screen.getByText("First article")).toBeTruthy();
    });
  });
});
