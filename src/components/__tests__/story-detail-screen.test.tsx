import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Share } from "react-native";

import { fetchStoryDetail, type StoryDetail } from "@/api/stories";
import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import StoryDetailScreen from "../story-detail-screen";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

jest.mock("@/api/stories", () => ({
  ...jest.requireActual("@/api/stories"),
  fetchStoryDetail: jest.fn(),
}));

jest.mock("@/utils/format-date", () => ({
  ...jest.requireActual("@/utils/format-date"),
  formatRelativeTime: () => "3 hours ago",
}));

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockCanGoBack = true;
jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    push: mockPush,
    canGoBack: () => mockCanGoBack,
  }),
  useLocalSearchParams: () => ({ id: "42" }),
}));

const mockFetchStoryDetail = fetchStoryDetail as jest.Mock;

function makeDetail(overrides: Partial<StoryDetail> = {}): StoryDetail {
  return {
    id: 42,
    title: "Cyclone Biparjoy makes landfall in Gujarat",
    summary: "A powerful cyclone has made landfall in Gujarat.",
    category: "world",
    language: "en",
    articleCount: 2,
    sourceCount: 2,
    firstPublishedAt: "2026-01-15T09:00:00Z",
    latestPublishedAt: "2026-01-15T12:00:00Z",
    storyScore: 0.72,
    representativeArticle: {
      id: 1,
      title: "Cyclone Biparjoy makes landfall in Gujarat",
      link: "https://example.com/1",
      source: "The Hindu",
      image_url: null,
      published_at: "2026-01-15T09:00:00Z",
    },
    members: [
      {
        id: 1,
        title: "Cyclone Biparjoy makes landfall in Gujarat",
        link: "https://example.com/1",
        source: "The Hindu",
        image_url: null,
        published_at: "2026-01-15T09:00:00Z",
        language: "en",
      },
      {
        id: 2,
        title: "Cyclone Biparjoy hits Gujarat coast",
        link: "https://example.com/2",
        source: "Times of India",
        image_url: null,
        published_at: "2026-01-15T10:00:00Z",
        language: "en",
      },
    ],
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
          <StoryDetailScreen articleBasePath="/article" homePath="/" />
        </LanguagePreferenceProvider>
      </ThemePreferenceProvider>
    </QueryClientProvider>
  );
}

describe("StoryDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack = true;
  });

  it("shows the story title, summary, and meta once loaded", async () => {
    mockFetchStoryDetail.mockResolvedValue(makeDetail());

    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(
        screen.getByRole("header", { name: "Cyclone Biparjoy makes landfall in Gujarat" })
      ).toBeTruthy();
    });
    expect(screen.getByText("A powerful cyclone has made landfall in Gujarat.")).toBeTruthy();
    expect(screen.getByText("2 sources · 2 articles")).toBeTruthy();
    expect(screen.getByText("Updated 3 hours ago")).toBeTruthy();
  });

  it("redirects straight to the article for a story with only one source/article", async () => {
    mockFetchStoryDetail.mockResolvedValue(
      makeDetail({ articleCount: 1, sourceCount: 1 })
    );

    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: "/article/[id]",
        params: { id: "1" },
      });
    });
    // The pointless "1 sources · 1 articles" story page never renders.
    expect(screen.queryByText("1 sources · 1 articles · Updated 3 hours ago")).toBeNull();
  });

  it("renders a row for every member article", async () => {
    mockFetchStoryDetail.mockResolvedValue(makeDetail());

    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByText("The Hindu")).toBeTruthy();
    });
    expect(screen.getByText("Times of India")).toBeTruthy();
    expect(screen.getByText("Cyclone Biparjoy hits Gujarat coast")).toBeTruthy();
  });

  it("navigates to the article detail screen when a member row is tapped", async () => {
    mockFetchStoryDetail.mockResolvedValue(makeDetail());

    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByText("Times of India")).toBeTruthy();
    });

    fireEvent.press(
      screen.getByRole("button", { name: "Cyclone Biparjoy hits Gujarat coast, Times of India" })
    );

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/article/[id]",
      params: { id: "2" },
    });
  });

  it("opens the native share sheet with the representative article's title and link", async () => {
    const shareSpy = jest.spyOn(Share, "share").mockResolvedValue({
      action: "sharedAction",
    });
    mockFetchStoryDetail.mockResolvedValue(makeDetail());

    await act(async () => {
      renderScreen();
    });
    await waitFor(() => screen.getByText("The Hindu"));

    fireEvent.press(screen.getByRole("button", { name: "Share" }));

    expect(shareSpy).toHaveBeenCalledTimes(1);
    const [content] = shareSpy.mock.calls[0];
    expect(JSON.stringify(content)).toContain("https://example.com/1");
    expect(JSON.stringify(content)).toContain("Cyclone Biparjoy makes landfall in Gujarat");

    shareSpy.mockRestore();
  });

  it("shows an error message when the story fails to load", async () => {
    mockFetchStoryDetail.mockRejectedValue(new Error("network down"));

    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByText("Couldn't load this story.")).toBeTruthy();
    });
  });

  it("calls router.back() when the back button is pressed and history exists", async () => {
    mockFetchStoryDetail.mockResolvedValue(makeDetail());

    await act(async () => {
      renderScreen();
    });

    fireEvent.press(screen.getByRole("button", { name: "Back" }));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("falls back to replacing with the home path when there is no back history", async () => {
    mockCanGoBack = false;
    mockFetchStoryDetail.mockResolvedValue(makeDetail());

    await act(async () => {
      renderScreen();
    });

    fireEvent.press(screen.getByRole("button", { name: "Back" }));

    expect(mockReplace).toHaveBeenCalledWith("/");
    expect(mockBack).not.toHaveBeenCalled();
  });
});
