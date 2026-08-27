import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { Keyboard, TextInput } from "react-native";

import { fetchArticles, fetchCategories, type Article } from "@/api/articles";
import { DebugPreferenceProvider } from "@/contexts/debug-preference";
import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import SearchScreen from "../index";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

jest.mock("@/api/articles", () => ({
  ...jest.requireActual("@/api/articles"),
  fetchArticles: jest.fn(),
  fetchCategories: jest.fn(),
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    useRouter: () => ({ push: mockPush }),
    // The real one needs a navigation/route context this standalone-render
    // test doesn't set up - simulate "already focused on mount" via a plain
    // useEffect instead, which (like the real thing) only runs after the
    // ref has attached - unlike calling the effect inline during render.
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

const mockFetchArticles = fetchArticles as jest.Mock;
const mockFetchCategories = fetchCategories as jest.Mock;

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

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemePreferenceProvider>
        <LanguagePreferenceProvider>
          <DebugPreferenceProvider>
            <SearchScreen />
          </DebugPreferenceProvider>
        </LanguagePreferenceProvider>
      </ThemePreferenceProvider>
    </QueryClientProvider>
  );
}

describe("SearchScreen", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockFetchCategories.mockResolvedValue(["national", "business"]);
    mockFetchArticles.mockResolvedValue([]);
  });

  it("focuses the search input as soon as the tab gains focus", async () => {
    const focusSpy = jest.spyOn(TextInput.prototype, "focus");

    await act(async () => {
      renderScreen();
    });

    expect(focusSpy).toHaveBeenCalled();
  });

  it("shows 'Explore' at the top, via the shared AppHeader", async () => {
    await act(async () => {
      renderScreen();
    });

    expect(screen.getByText("Explore")).toBeTruthy();
  });

  it("renders a category grid by default (empty search)", async () => {
    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "National" })).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: "Business" })).toBeTruthy();
    expect(screen.getByTestId("category-grid")).toBeTruthy();
  });

  it("renders every category as its own tappable card even with an odd count (no dropped/merged last item)", async () => {
    mockFetchCategories.mockResolvedValue(["national", "business", "sports"]);

    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sports" })).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: "National" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Business" })).toBeTruthy();
  });

  it("gives every row the same fixed height (measured height / 5 reference rows) regardless of how many categories exist", async () => {
    mockFetchCategories.mockResolvedValue([
      "national", "business", "sports", "tech", "world",
      "entertainment", "cricket", "lifestyle", "education", "science",
    ]);

    await act(async () => {
      renderScreen();
    });
    await waitFor(() => {
      expect(screen.getByTestId("grid-row-4")).toBeTruthy();
    });

    await act(async () => {
      fireEvent(screen.getByTestId("category-grid"), "layout", {
        nativeEvent: { layout: { height: 814, width: 400, x: 0, y: 0 } },
      });
    });

    // (814 - 32 padding - 64 row-gaps) / 5 reference rows = 143.6.
    for (let i = 0; i < 5; i++) {
      expect(screen.getByTestId(`grid-row-${i}`)).toHaveStyle({ height: 143.6 });
    }
  });

  it("applies the exact same row height to a language with far fewer categories than English, given the same measured space", async () => {
    mockFetchCategories.mockResolvedValue(["business", "sports"]);

    await act(async () => {
      renderScreen();
    });
    await waitFor(() => {
      expect(screen.getByTestId("grid-row-0")).toBeTruthy();
    });

    await act(async () => {
      fireEvent(screen.getByTestId("category-grid"), "layout", {
        nativeEvent: { layout: { height: 814, width: 400, x: 0, y: 0 } },
      });
    });

    // Same 143.6 as the 10-category case above - a language with only one
    // row of categories gets the same card size as one with five, not a
    // row stretched to fill all the leftover space.
    expect(screen.getByTestId("grid-row-0")).toHaveStyle({ height: 143.6 });
    expect(screen.queryByTestId("grid-row-1")).toBeNull();
  });

  it("keeps the category cards the same size across a keyboard show/hide, never resizing to the keyboard-shrunk measurement", async () => {
    mockFetchCategories.mockResolvedValue(["national", "business"]);

    // jest-expo's Keyboard mock doesn't support emitting events directly
    // (no Keyboard.emit) - capture the real listener the screen itself
    // registers via Keyboard.addListener and invoke it directly instead,
    // which exercises the same code path (setKeyboardVisible) the real
    // native keyboard events would.
    const listeners: Record<string, () => void> = {};
    const addListenerSpy = jest
      .spyOn(Keyboard, "addListener")
      .mockImplementation((eventName, callback) => {
        listeners[eventName] = () => (callback as () => void)();
        return { remove: jest.fn() } as unknown as ReturnType<typeof Keyboard.addListener>;
      });

    await act(async () => {
      renderScreen();
    });
    await waitFor(() => {
      expect(screen.getByTestId("grid-row-0")).toBeTruthy();
    });

    // Establish the real, keyboard-closed reference size.
    await act(async () => {
      fireEvent(screen.getByTestId("category-grid"), "layout", {
        nativeEvent: { layout: { height: 814, width: 400, x: 0, y: 0 } },
      });
    });
    expect(screen.getByTestId("grid-row-0")).toHaveStyle({ height: 143.6 });

    // The screen picks the iOS ("Will") or Android ("Did") event names
    // based on Platform.OS - find whichever pair actually got registered
    // rather than assuming one platform.
    const showListener = listeners["keyboardWillShow"] ?? listeners["keyboardDidShow"];
    const hideListener = listeners["keyboardWillHide"] ?? listeners["keyboardDidHide"];
    expect(showListener).toBeDefined();
    expect(hideListener).toBeDefined();

    // The keyboard opening shrinks the grid's available height - a layout
    // pass fired while it's up (KeyboardAvoidingView resizing the
    // container) must not overwrite the remembered closed-state size.
    // The state update from showListener needs its own act() to actually
    // flush before the layout event fires - otherwise handleGridLayout
    // still runs against the pre-update (stale) keyboardVisible closure.
    await act(async () => {
      showListener?.();
    });
    await act(async () => {
      fireEvent(screen.getByTestId("category-grid"), "layout", {
        nativeEvent: { layout: { height: 400, width: 400, x: 0, y: 0 } },
      });
    });
    expect(screen.getByTestId("grid-row-0")).toHaveStyle({ height: 143.6 });

    // And it stays fixed once the keyboard closes again too.
    await act(async () => {
      hideListener?.();
    });
    expect(screen.getByTestId("grid-row-0")).toHaveStyle({ height: 143.6 });

    addListenerSpy.mockRestore();
  });

  it("translates known category values into the currently active language", async () => {
    await AsyncStorage.setItem("languagePreference", "hi");
    mockFetchCategories.mockResolvedValue(["business", "sports"]);

    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "बिजनेस" })).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: "स्पोर्ट्स" })).toBeTruthy();
  });

  it("navigates to the category results screen when a card is tapped", async () => {
    await act(async () => {
      renderScreen();
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Business" })).toBeTruthy();
    });

    fireEvent.press(screen.getByRole("button", { name: "Business" }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/search/category/[category]",
      params: { category: "business" },
    });
  });

  it("does not search immediately on every keystroke (debounced)", async () => {
    await act(async () => {
      renderScreen();
    });

    await act(async () => {
      fireEvent.changeText(
        screen.getByLabelText("Search articles"),
        "election"
      );
    });
    // Immediately after typing, still within the debounce window - no
    // search request yet.
    expect(mockFetchArticles).not.toHaveBeenCalledWith(
      "en",
      undefined,
      undefined,
      "election"
    );

    await waitFor(
      () => {
        expect(mockFetchArticles).toHaveBeenCalledWith(
          "en",
          undefined,
          undefined,
          "election"
        );
      },
      { timeout: 2000 }
    );
  });

  it("does not search below the 2-character minimum, even after the debounce window", async () => {
    await act(async () => {
      renderScreen();
    });

    await act(async () => {
      fireEvent.changeText(screen.getByLabelText("Search articles"), "e");
    });

    // Give the debounce timer plenty of time to fire - a 1-character query
    // should never reach fetchArticles, and the category grid should stay put.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
    });
    expect(mockFetchArticles).not.toHaveBeenCalled();
    expect(screen.getByTestId("category-grid")).toBeTruthy();
  });

  it("searches once the query reaches the 2-character minimum", async () => {
    mockFetchArticles.mockResolvedValue([
      makeArticle({ id: 1, title: "US elections" }),
    ]);

    await act(async () => {
      renderScreen();
    });

    await act(async () => {
      fireEvent.changeText(screen.getByLabelText("Search articles"), "us");
    });

    await waitFor(
      () => {
        expect(mockFetchArticles).toHaveBeenCalledWith(
          "en",
          undefined,
          undefined,
          "us"
        );
      },
      { timeout: 2000 }
    );
  });

  it("shows the ranking debug pill on a search result when debug mode is on", async () => {
    await AsyncStorage.setItem("debugPreference", "true");
    mockFetchArticles.mockResolvedValue([
      makeArticle({ id: 1, title: "Election results in", ranking_score: 0.45 }),
    ]);

    await act(async () => {
      renderScreen();
    });

    await act(async () => {
      fireEvent.changeText(screen.getByLabelText("Search articles"), "election");
    });

    await waitFor(
      () => {
        expect(screen.getByTestId("ranking-debug-pill")).toBeTruthy();
      },
      { timeout: 2000 }
    );
    expect(screen.getByText("0.45")).toBeTruthy();
  });

  it("swaps the category grid for search results once debounced text is present, and back once cleared", async () => {
    mockFetchArticles.mockResolvedValue([
      makeArticle({ id: 1, title: "Election results in" }),
    ]);
    await act(async () => {
      renderScreen();
    });
    await waitFor(() => {
      expect(screen.getByTestId("category-grid")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(screen.getByLabelText("Search articles"), "election");
    });

    await waitFor(
      () => {
        expect(screen.getByText("Election results in")).toBeTruthy();
      },
      { timeout: 2000 }
    );
    expect(screen.queryByTestId("category-grid")).toBeNull();

    await act(async () => {
      fireEvent.changeText(screen.getByLabelText("Search articles"), "");
    });

    await waitFor(
      () => {
        expect(screen.getByTestId("category-grid")).toBeTruthy();
      },
      { timeout: 2000 }
    );
  });
});
