import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import { BookmarksProvider } from "@/contexts/bookmarks-context";
import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import SavedScreen from "@/app/saved";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

// Signed out - the on-device list is the whole source of truth, so these
// never reach the network.
jest.mock("@/contexts/toast-context", () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
  useToast: () => ({ show: jest.fn(), hide: jest.fn() }),
}));

jest.mock("@/api/bookmarks", () => ({
  addBookmark: jest.fn().mockResolvedValue(undefined),
  removeBookmark: jest.fn().mockResolvedValue(undefined),
  fetchBookmarks: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ token: null }),
}));

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => mockCanGoBack,
  }),
}));

function makeBookmark(id: number) {
  return {
    id,
    title: `Saved article ${id}`,
    link: `https://example.com/${id}`,
    source: "The Hindu",
    category: "business",
    published_at: "2026-01-15T18:30:00Z",
    image_url: null,
    language: "en",
  };
}

async function renderScreen(bookmarks: ReturnType<typeof makeBookmark>[] = []) {
  if (bookmarks.length > 0) {
    await AsyncStorage.setItem("bookmarks", JSON.stringify(bookmarks));
  }
  return render(
    <ThemePreferenceProvider>
      <LanguagePreferenceProvider>
        <BookmarksProvider>
          <SavedScreen />
        </BookmarksProvider>
      </LanguagePreferenceProvider>
    </ThemePreferenceProvider>
  );
}

describe("SavedScreen", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockCanGoBack = true;
    await AsyncStorage.clear();
  });

  it("shows the empty state when nothing is saved", async () => {
    await renderScreen();
    await waitFor(() => {
      expect(screen.getByText("No saved articles yet")).toBeTruthy();
    });
  });

  it("renders a card per saved article", async () => {
    await renderScreen([makeBookmark(1), makeBookmark(2)]);
    await waitFor(() => {
      expect(screen.getByText("Saved article 1")).toBeTruthy();
    });
    expect(screen.getByText("Saved article 2")).toBeTruthy();
    expect(screen.queryByText("No saved articles yet")).toBeNull();
  });

  it("opens the article on card press", async () => {
    await renderScreen([makeBookmark(7)]);
    await waitFor(() => {
      expect(screen.getByText("Saved article 7")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Saved article 7"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/article/[id]",
      params: { id: "7" },
    });
  });

  it("unsaves an article from its card bookmark button", async () => {
    await renderScreen([makeBookmark(3)]);
    await waitFor(() => {
      expect(screen.getByText("Saved article 3")).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText("Remove from saved"));

    await waitFor(() => {
      expect(screen.getByText("No saved articles yet")).toBeTruthy();
    });
  });

  it("goes back when a previous route exists", async () => {
    await renderScreen();
    fireEvent.press(screen.getByLabelText("Back"));
    expect(mockBack).toHaveBeenCalled();
  });

  it("shows a saved count and no Clear All when the list is empty", async () => {
    await renderScreen();
    await waitFor(() => {
      expect(screen.getByText("No saved articles yet")).toBeTruthy();
    });
    expect(screen.queryByTestId("saved-clear-all")).toBeNull();
  });

  it("Clear All asks for confirmation, then empties the list on confirm", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    await renderScreen([makeBookmark(1), makeBookmark(2)]);
    await waitFor(() => {
      expect(screen.getByText("Saved article 1")).toBeTruthy();
    });
    expect(screen.getByTestId("saved-large-title").props.children).toBe("Saved (2)");

    fireEvent.press(screen.getByTestId("saved-clear-all"));

    expect(alertSpy).toHaveBeenCalledTimes(1);
    const buttons = alertSpy.mock.calls[0][2] as { text: string; style?: string; onPress?: () => void }[];
    const destructive = buttons.find((b) => b.style === "destructive");
    expect(destructive).toBeTruthy();

    fireEvent(screen.getByTestId("saved-list"), "layout", {
      nativeEvent: { layout: { width: 300, height: 600 } },
    });
    destructive!.onPress?.();

    await waitFor(() => {
      expect(screen.getByText("No saved articles yet")).toBeTruthy();
    });
    alertSpy.mockRestore();
  });
});
