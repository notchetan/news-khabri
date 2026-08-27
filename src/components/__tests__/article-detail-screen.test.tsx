import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import { Share } from "react-native";

import { fetchArticleDetail, type ArticleDetail } from "@/api/articles";
import { Spacing } from "@/constants/theme";
import { FontSizePreferenceProvider } from "@/contexts/font-size-preference";
import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import ArticleDetailScreen from "../article-detail-screen";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

jest.mock("@/api/articles", () => ({
  ...jest.requireActual("@/api/articles"),
  fetchArticleDetail: jest.fn(),
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
  useLocalSearchParams: () => ({ id: "1" }),
}));

const mockOpenBrowserAsync = jest.fn();
jest.mock("expo-web-browser", () => ({
  openBrowserAsync: (...args: unknown[]) => mockOpenBrowserAsync(...args),
}));

const mockFetchArticleDetail = fetchArticleDetail as jest.Mock;

function makeDetail(overrides: Partial<ArticleDetail> = {}): ArticleDetail {
  return {
    id: 1,
    title: "Main article title",
    link: "https://example.com/1",
    source: "NDTV",
    category: "national",
    published_at: "2026-01-15T18:30:00Z",
    image_url: null,
    fetched_at: "2026-01-15T18:31:00Z",
    language: "en",
    read_time_minutes: null,
    content: "<p>Article body text.</p>",
    image_caption: null,
    related: [],
    ...overrides,
  };
}

function renderScreen(
  props: { basePath: "/article" | "/search/article"; homePath: "/" | "/search" } = {
    basePath: "/article",
    homePath: "/",
  }
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemePreferenceProvider>
        <LanguagePreferenceProvider>
          <FontSizePreferenceProvider>
            <ArticleDetailScreen {...props} />
          </FontSizePreferenceProvider>
        </LanguagePreferenceProvider>
      </ThemePreferenceProvider>
    </QueryClientProvider>
  );
}

describe("ArticleDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack = true;
  });

  it("shows a loading skeleton, then the article content once it resolves", async () => {
    mockFetchArticleDetail.mockResolvedValue(makeDetail());

    await act(async () => {
      renderScreen();
    });

    expect(screen.getByRole("progressbar")).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText("Main article title")).toBeTruthy();
    });
    // Source on its own line, date/time on the line below it - see the
    // "source above, date below" layout test further down for the full
    // structural check.
    expect(screen.getByText("NDTV")).toBeTruthy();
    expect(screen.getByText(/2026/)).toBeTruthy();
  });

  it("shows an error message when the article fails to load", async () => {
    mockFetchArticleDetail.mockRejectedValue(new Error("network down"));

    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByText("Couldn't load this article.")).toBeTruthy();
    });
  });

  it("shows a content-error message when the article has no scraped content", async () => {
    mockFetchArticleDetail.mockResolvedValue(makeDetail({ content: null }));

    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(
        screen.getByText("We couldn't load the full text for this article.")
      ).toBeTruthy();
    });
  });

  it("calls router.back() when the back button is pressed and history exists", async () => {
    mockFetchArticleDetail.mockResolvedValue(makeDetail());
    await act(async () => {
      renderScreen();
    });
    await waitFor(() => screen.getByText("Main article title"));

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Back" }));
    });

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("falls back to replacing with this stack's homePath when there is no back history", async () => {
    mockCanGoBack = false;
    mockFetchArticleDetail.mockResolvedValue(makeDetail());
    await act(async () => {
      renderScreen({ basePath: "/search/article", homePath: "/search" });
    });
    await waitFor(() => screen.getByText("Main article title"));

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Back" }));
    });

    expect(mockReplace).toHaveBeenCalledWith("/search");
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("opens the original article link when 'Read on X' is pressed", async () => {
    mockFetchArticleDetail.mockResolvedValue(makeDetail({ source: "NDTV" }));
    await act(async () => {
      renderScreen();
    });
    await waitFor(() => screen.getByText("Main article title"));

    await act(async () => {
      fireEvent.press(screen.getByRole("link", { name: "Read on NDTV" }));
    });

    expect(mockOpenBrowserAsync).toHaveBeenCalledWith("https://example.com/1");
  });

  it("opens the native share sheet with the article's title and link when Share is pressed", async () => {
    const shareSpy = jest.spyOn(Share, "share").mockResolvedValue({
      action: "sharedAction",
    });
    mockFetchArticleDetail.mockResolvedValue(
      makeDetail({
        title: "Main article title",
        link: "https://example.com/1",
      })
    );
    await act(async () => {
      renderScreen();
    });
    await waitFor(() => screen.getByText("Main article title"));

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Share" }));
    });

    expect(shareSpy).toHaveBeenCalledTimes(1);
    const [content] = shareSpy.mock.calls[0];
    expect(JSON.stringify(content)).toContain("https://example.com/1");
    expect(JSON.stringify(content)).toContain("Main article title");

    shareSpy.mockRestore();
  });

  it("shows the source above the date/time, both on the left of the share button - matching story-detail-screen's own meta layout", async () => {
    // Regression test: the share button used to sit alone, above this row
    // entirely, with source and date combined on one line here instead.
    mockFetchArticleDetail.mockResolvedValue(
      makeDetail({ source: "NDTV", read_time_minutes: 5 })
    );
    await act(async () => {
      renderScreen();
    });
    await waitFor(() => screen.getByText("Main article title"));

    const metaRow = screen.getByTestId("article-meta-row");
    const metaTextBlock = screen.getByTestId("article-meta-text-block");

    // Source and date/time (+ read time, folded into the same line rather
    // than a separate pill) are both inside the text block, source first.
    const sourceText = within(metaTextBlock).getByText("NDTV");
    const dateText = within(metaTextBlock).getByText(/2026.*5 min read/);
    expect(sourceText).toBeTruthy();
    expect(dateText).toBeTruthy();

    // The share button is a sibling of that text block within the same
    // row, not a separate element above it.
    expect(within(metaRow).getByRole("button", { name: "Share" })).toBeTruthy();
  });

  it("does not throw when the share sheet is dismissed or unsupported", async () => {
    const shareSpy = jest
      .spyOn(Share, "share")
      .mockRejectedValue(new Error("Share is not supported in this browser"));
    mockFetchArticleDetail.mockResolvedValue(makeDetail());
    await act(async () => {
      renderScreen();
    });
    await waitFor(() => screen.getByText("Main article title"));

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Share" }));
    });

    expect(shareSpy).toHaveBeenCalledTimes(1);

    shareSpy.mockRestore();
  });

  it("navigates to a related article using this stack's basePath", async () => {
    mockFetchArticleDetail.mockResolvedValue(
      makeDetail({
        related: [
          makeDetail({ id: 2, title: "Related story", source: "Aaj Tak" }),
        ],
      })
    );
    await act(async () => {
      renderScreen({ basePath: "/search/article", homePath: "/search" });
    });

    await waitFor(() => {
      expect(screen.getByText("Related story")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(
        screen.getByRole("button", { name: "Related story, Aaj Tak" })
      );
    });

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/search/article/[id]",
      params: { id: "2" },
    });
  });

  it("does not render the related-articles section when there are none", async () => {
    mockFetchArticleDetail.mockResolvedValue(makeDetail({ related: [] }));
    await act(async () => {
      renderScreen();
    });
    await waitFor(() => screen.getByText("Main article title"));

    expect(screen.queryByText("RELATED ARTICLES")).toBeNull();
  });

  it("shows the app logo and name on the top right, alongside the back button on the top left", async () => {
    mockFetchArticleDetail.mockResolvedValue(makeDetail());
    await act(async () => {
      renderScreen();
    });
    await waitFor(() => screen.getByText("Main article title"));

    expect(screen.getByTestId("article-back-chevron")).toBeTruthy();
    expect(screen.getByText(" Back")).toBeTruthy();
    expect(screen.getByTestId("article-brand-logo")).toBeTruthy();
    expect(screen.getByText(" News Khabri")).toBeTruthy();
  });

  it("collapses both the back label and the brand label together as the real scroll position moves, and re-expands on any scroll up - not just a scroll all the way back to the top", async () => {
    // Regression test: the previous version drove this off a boolean
    // (isScrolled) flipped past a fixed threshold, itself driving a
    // separate imperative Animated.timing in a useEffect - a rapid
    // scroll-up gesture that didn't fully settle back at y<=threshold
    // could leave the timing animation re-triggered mid-flight repeatedly,
    // visually reading as "only re-expands once scrolled all the way back
    // to the top". This now drives both labels directly off the live
    // scroll offset (see HEADER_COLLAPSE_DISTANCE), which can't get stuck
    // in an intermediate state the way a re-triggered discrete animation
    // could - reversing scroll direction at *any* point should immediately
    // start reversing the opacity too.
    mockFetchArticleDetail.mockResolvedValue(makeDetail());
    await act(async () => {
      renderScreen();
    });
    await waitFor(() => screen.getByText("Main article title"));

    const backLabel = screen.getByText(" Back");
    const brandLabel = screen.getByText(" News Khabri");
    const scrollView = screen.getByTestId("article-scroll-view");

    const opacityOf = (label: typeof backLabel) => {
      const style = [label.parent?.props.style].flat();
      return style.find((s) => s && "opacity" in s)?.opacity;
    };

    expect(opacityOf(backLabel)).toBe(1);
    expect(opacityOf(brandLabel)).toBe(1);

    // Fully collapsed at/past HEADER_COLLAPSE_DISTANCE (60).
    await act(async () => {
      fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { y: 60 } } });
    });
    expect(opacityOf(backLabel)).toBe(0);
    expect(opacityOf(brandLabel)).toBe(0);

    // Scroll back up, but only partway (40, not all the way to 0) - both
    // labels should already be partially visible again, not stuck at 0.
    await act(async () => {
      fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { y: 40 } } });
    });
    const partialBack = opacityOf(backLabel) as number;
    const partialBrand = opacityOf(brandLabel) as number;
    expect(partialBack).toBeGreaterThan(0);
    expect(partialBack).toBeLessThan(1);
    expect(partialBrand).toBeGreaterThan(0);
    expect(partialBrand).toBeLessThan(1);

    // Scroll up a little further, still not at the top (20) - should keep
    // increasing, not stay flat until y reaches 0.
    await act(async () => {
      fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { y: 20 } } });
    });
    expect(opacityOf(backLabel) as number).toBeGreaterThan(partialBack);
    expect(opacityOf(brandLabel) as number).toBeGreaterThan(partialBrand);

    // Fully back at the top.
    await act(async () => {
      fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { y: 0 } } });
    });
    expect(opacityOf(backLabel)).toBe(1);
    expect(opacityOf(brandLabel)).toBe(1);
  });

  it("starts the scroll content below the measured header height, so the hero image loads below the header instead of behind it", async () => {
    mockFetchArticleDetail.mockResolvedValue(makeDetail());
    await act(async () => {
      renderScreen();
    });
    await waitFor(() => screen.getByText("Main article title"));

    const scrollView = screen.getByTestId("article-scroll-view");
    const paddingTopOf = () => {
      const style = [scrollView.props.contentContainerStyle].flat();
      return style.find((s) => s && "paddingTop" in s)?.paddingTop;
    };

    // Before the header row's own onLayout has measured anything, a
    // generous fallback still clears it (see contentTopPadding's own
    // comment) - well past a bare status-bar-only inset.
    expect(paddingTopOf()).toBeGreaterThan(20);

    // Once the real header row measures taller than that fallback, the
    // scroll content's top padding grows to match it (plus its own small
    // gap) - the hero image should never load already tucked behind the
    // header.
    await act(async () => {
      fireEvent(screen.getByTestId("article-header-row"), "layout", {
        nativeEvent: { layout: { height: 120, width: 400, x: 0, y: 0 } },
      });
    });
    expect(paddingTopOf()).toBe(120 + Spacing.two);
  });

  it("shows and hides the photo caption when the info badge is toggled", async () => {
    mockFetchArticleDetail.mockResolvedValue(
      makeDetail({ image_caption: "Photo: A press photographer" })
    );
    await act(async () => {
      renderScreen();
    });
    await waitFor(() => screen.getByText("Main article title"));

    expect(screen.queryByText("Photo: A press photographer")).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Show photo credit" }));
    });
    expect(screen.getByText("Photo: A press photographer")).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Hide photo credit" }));
    });
    expect(screen.queryByText("Photo: A press photographer")).toBeNull();
  });
});
