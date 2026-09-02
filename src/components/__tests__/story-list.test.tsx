import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { fetchMe } from "@/api/auth";
import { fetchStoryFeed, STORIES_PAGE_SIZE, type Story } from "@/api/stories";
import { AuthProvider } from "@/contexts/auth-context";
import { BookmarksProvider } from "@/contexts/bookmarks-context";
import { DebugPreferenceProvider } from "@/contexts/debug-preference";
import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { SourcesPreferenceProvider } from "@/contexts/sources-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import StoryList from "../story-list";
import { __resetGuardedNavigateForTests } from "@/utils/navigation-guard";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

jest.mock("@/api/stories", () => ({
  ...jest.requireActual("@/api/stories"),
  fetchStoryFeed: jest.fn(),
}));

jest.mock("@/api/auth", () => ({
  fetchMe: jest.fn(),
  signInWithGoogle: jest.fn(),
  putPreferences: jest.fn(),
}));

const mockGetItemAsync = jest.fn().mockResolvedValue(null);
jest.mock("expo-secure-store", () => ({
  getItemAsync: (...args: unknown[]) => mockGetItemAsync(...args),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

const mockFetchMe = fetchMe as jest.Mock;

// formatRelativeTime is relative to the real current time - mock it to a
// fixed string so card metadata assertions aren't tied to when the test
// happens to run.
jest.mock("@/utils/format-date", () => ({
  ...jest.requireActual("@/utils/format-date"),
  formatRelativeTime: () => "3 hours ago",
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockFetchStoryFeed = fetchStoryFeed as jest.Mock;

function makeStory(overrides: Partial<Story> = {}): Story {
  return {
    id: 1,
    title: "Cyclone Biparjoy makes landfall in Gujarat",
    summary: "A powerful cyclone has made landfall in Gujarat.",
    category: "world",
    language: "en",
    articleCount: 4,
    sourceCount: 3,
    firstPublishedAt: "2026-01-15T09:00:00Z",
    latestPublishedAt: "2026-01-15T12:00:00Z",
    storyScore: 0.72,
    representativeArticle: {
      id: 10,
      title: "Cyclone Biparjoy makes landfall in Gujarat",
      link: "https://example.com/10",
      source: "The Hindu",
      image_url: null,
      published_at: "2026-01-15T09:00:00Z",
    },
    ...overrides,
  };
}

function renderList(props: Partial<React.ComponentProps<typeof StoryList>> = {}) {
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
                  <StoryList {...props} />
                </BookmarksProvider>
              </AuthProvider>
            </DebugPreferenceProvider>
          </SourcesPreferenceProvider>
        </LanguagePreferenceProvider>
      </ThemePreferenceProvider>
    </QueryClientProvider>
  );
}

describe("StoryList", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockGetItemAsync.mockResolvedValue(null);
    await AsyncStorage.clear();
    mockFetchStoryFeed.mockResolvedValue([]);
    // FeedCard's onPress goes through guardedNavigate now, a module-scoped
    // real-time cooldown shared across every card - without resetting it,
    // a card press in one test can be silently dropped because a *different*
    // test's own press (in this same file, sharing the same module) landed
    // within the real 800ms cooldown window just before it.
    __resetGuardedNavigateForTests();
  });

  it("shows a loading skeleton, then story cards once they resolve", async () => {
    mockFetchStoryFeed.mockResolvedValue([makeStory()]);

    await act(async () => {
      renderList();
    });

    await waitFor(() => {
      expect(screen.getByText("Cyclone Biparjoy makes landfall in Gujarat")).toBeTruthy();
    });
    expect(screen.getByText("3 sources · 4 articles · Updated 3 hours ago")).toBeTruthy();
  });

  it("shows an error message when the story feed request fails", async () => {
    mockFetchStoryFeed.mockRejectedValue(new Error("network down"));

    await act(async () => {
      renderList();
    });

    await waitFor(() => {
      expect(screen.getByText("Something went wrong loading stories.")).toBeTruthy();
    });
  });

  it("shows an empty state when there are no stories", async () => {
    await act(async () => {
      renderList();
    });

    await waitFor(() => {
      expect(screen.getByText("No stories found.")).toBeTruthy();
    });
  });

  it("navigates to the story detail screen when a card is tapped", async () => {
    mockFetchStoryFeed.mockResolvedValue([makeStory({ id: 42 })]);

    await act(async () => {
      renderList();
    });

    await waitFor(() => {
      expect(screen.getByText("Cyclone Biparjoy makes landfall in Gujarat")).toBeTruthy();
    });

    fireEvent.press(screen.getByRole("button", { name: /Cyclone Biparjoy/ }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/story/[id]",
      params: { id: "42" },
    });
  });

  it("only navigates once when two different cards are tapped quickly, one after the other", async () => {
    // Regression test for the actual reported bug: tapping a second, *different*
    // card right after the first shouldn't also navigate, or it stacks two
    // detail screens on top of each other. A per-card debounce alone
    // wouldn't catch this - it has to be shared across cards (see
    // guardedNavigate's own comment).
    mockFetchStoryFeed.mockResolvedValue([
      makeStory({ id: 1, title: "First story", articleCount: 1, sourceCount: 1 }),
      makeStory({ id: 2, title: "Second story", articleCount: 4, sourceCount: 3 }),
    ]);

    await act(async () => {
      renderList();
    });

    await waitFor(() => {
      expect(screen.getByText("First story")).toBeTruthy();
    });
    expect(screen.getByText("Second story")).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: /First story/ }));
      fireEvent.press(screen.getByRole("button", { name: /Second story/ }));
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/article/[id]",
      params: { id: "10" },
    });
  });

  it("shows just the source (not '1 sources · 1 articles') for a single-source, single-article story", async () => {
    mockFetchStoryFeed.mockResolvedValue([
      makeStory({ articleCount: 1, sourceCount: 1 }),
    ]);

    await act(async () => {
      renderList();
    });

    await waitFor(() => {
      expect(screen.getByText("Cyclone Biparjoy makes landfall in Gujarat")).toBeTruthy();
    });
    expect(screen.getByText("The Hindu · 3 hours ago")).toBeTruthy();
    expect(screen.queryByText(/sources ·/)).toBeNull();
  });

  it("navigates straight to the article (not the story screen) for a single-source, single-article story", async () => {
    mockFetchStoryFeed.mockResolvedValue([
      makeStory({ id: 42, articleCount: 1, sourceCount: 1 }),
    ]);

    await act(async () => {
      renderList();
    });

    await waitFor(() => {
      expect(screen.getByText("Cyclone Biparjoy makes landfall in Gujarat")).toBeTruthy();
    });

    fireEvent.press(screen.getByRole("button", { name: /Cyclone Biparjoy/ }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/article/[id]",
      params: { id: "10" },
    });
  });

  it("requests the next page with a larger limit when end-reached fires", async () => {
    const firstPage = Array.from({ length: STORIES_PAGE_SIZE }, (_, i) =>
      makeStory({ id: i + 1, title: `Story ${i + 1}` })
    );
    mockFetchStoryFeed.mockResolvedValueOnce(firstPage).mockResolvedValueOnce([]);

    await act(async () => {
      renderList();
    });

    await waitFor(() => {
      expect(screen.getByText("Story 1")).toBeTruthy();
    });

    await act(async () => {
      screen.getByTestId("story-list").props.onEndReached();
    });

    await waitFor(() => {
      expect(mockFetchStoryFeed).toHaveBeenCalledTimes(2);
    });
    expect(mockFetchStoryFeed).toHaveBeenLastCalledWith("en", undefined, 40, [], null);
  });

  it("passes the category through to fetchStoryFeed", async () => {
    await act(async () => {
      renderList({ category: "business" });
    });

    await waitFor(() => {
      expect(mockFetchStoryFeed).toHaveBeenCalledWith(
        "en",
        "business",
        STORIES_PAGE_SIZE,
        [],
        null
      );
    });
  });

  it("passes the selected sources preference through to fetchStoryFeed", async () => {
    await AsyncStorage.setItem(
      "sourcesPreference",
      JSON.stringify({ en: ["NDTV", "BBC Sport"] })
    );

    await act(async () => {
      renderList();
    });

    await waitFor(() => {
      expect(mockFetchStoryFeed).toHaveBeenCalledWith(
        "en",
        undefined,
        STORIES_PAGE_SIZE,
        ["NDTV", "BBC Sport"],
        null
      );
    });
  });

  it("shows the debug score pill only when debug mode is enabled", async () => {
    mockFetchStoryFeed.mockResolvedValue([makeStory({ storyScore: 0.813 })]);

    await act(async () => {
      renderList();
    });
    await waitFor(() => {
      expect(screen.getByText("Cyclone Biparjoy makes landfall in Gujarat")).toBeTruthy();
    });
    expect(screen.queryByTestId("story-debug-pill")).toBeNull();
  });

  it("shows the debug score pill when debug mode is on", async () => {
    await AsyncStorage.setItem("debugPreference", "true");
    mockFetchStoryFeed.mockResolvedValue([makeStory({ storyScore: 0.813 })]);

    await act(async () => {
      renderList();
    });

    await waitFor(() => {
      expect(screen.getByTestId("story-debug-pill")).toBeTruthy();
    });
    expect(screen.getByText("0.81")).toBeTruthy();
  });

  it("sends the session token so /stories/top can apply its personalization signal, once signed in", async () => {
    mockGetItemAsync.mockResolvedValue("stored-session-token");
    mockFetchMe.mockResolvedValue({
      user: { id: 1, email: "chetan@example.com", name: "Chetan Shetty", avatarUrl: null },
      preferences: null,
    });
    mockFetchStoryFeed.mockResolvedValue([makeStory()]);

    await act(async () => {
      renderList();
    });

    await waitFor(() => {
      expect(mockFetchStoryFeed).toHaveBeenCalledWith(
        "en",
        undefined,
        STORIES_PAGE_SIZE,
        [],
        "stored-session-token"
      );
    });
  });
});
