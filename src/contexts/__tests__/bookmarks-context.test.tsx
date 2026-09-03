import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  addBookmark,
  addBookmarksBulk,
  clearBookmarks,
  fetchBookmarks,
  removeBookmark,
} from "@/api/bookmarks";
import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { BOOKMARKS_STORAGE_KEY, BookmarksProvider, useBookmarks } from "../bookmarks-context";

jest.mock("@/api/bookmarks", () => ({
  addBookmark: jest.fn().mockResolvedValue(undefined),
  addBookmarksBulk: jest.fn().mockResolvedValue(undefined),
  removeBookmark: jest.fn().mockResolvedValue(undefined),
  clearBookmarks: jest.fn().mockResolvedValue(undefined),
  fetchBookmarks: jest.fn().mockResolvedValue([]),
}));

// The bookmark sync keys off the session token from useAuth - drive it
// directly here rather than standing up the whole Google-sign-in flow.
let mockToken: string | null = null;
jest.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ token: mockToken }),
}));

const mockShowToast = jest.fn();
jest.mock("@/contexts/toast-context", () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
  useToast: () => ({ show: mockShowToast, hide: jest.fn() }),
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: (...args: unknown[]) => mockPush(...args) }),
}));

const mockAdd = addBookmark as jest.Mock;
const mockBulk = addBookmarksBulk as jest.Mock;
const mockRemove = removeBookmark as jest.Mock;
const mockClear = clearBookmarks as jest.Mock;
const mockFetch = fetchBookmarks as jest.Mock;

function article(id: number) {
  return {
    id,
    title: `Article ${id}`,
    link: `https://example.com/${id}`,
    source: "The Hindu",
    category: "business",
    published_at: "2026-01-15T18:30:00Z",
    image_url: null,
    language: "en",
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <LanguagePreferenceProvider>
      <BookmarksProvider>{children}</BookmarksProvider>
    </LanguagePreferenceProvider>
  );
}

describe("useBookmarks", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockToken = null;
    mockFetch.mockResolvedValue([]);
    await AsyncStorage.clear();
  });

  it("throws when used outside the provider", async () => {
    const { result } = await renderHook(() => {
      try {
        return useBookmarks();
      } catch (e) {
        return e as Error;
      }
    });
    expect((result.current as Error).message).toContain(
      "useBookmarks must be used within a BookmarksProvider"
    );
  });

  it("loads a previously persisted list from storage on mount", async () => {
    await AsyncStorage.setItem(
      BOOKMARKS_STORAGE_KEY,
      JSON.stringify([article(2), article(1)])
    );

    const { result } = await renderHook(() => useBookmarks(), { wrapper });

    await waitFor(() => {
      expect(result.current.bookmarks.map((b) => b.id)).toEqual([2, 1]);
    });
    expect(result.current.isBookmarked(2)).toBe(true);
    expect(result.current.isBookmarked(99)).toBe(false);
  });

  it("toggleBookmark adds (newest first) then removes, persisting each time", async () => {
    const { result } = await renderHook(() => useBookmarks(), { wrapper });
    await waitFor(() => expect(result.current.bookmarks).toEqual([]));

    await act(async () => {
      result.current.toggleBookmark(article(1));
    });
    await act(async () => {
      result.current.toggleBookmark(article(2));
    });

    expect(result.current.bookmarks.map((b) => b.id)).toEqual([2, 1]);
    await waitFor(async () => {
      const stored = JSON.parse(
        (await AsyncStorage.getItem(BOOKMARKS_STORAGE_KEY)) ?? "[]"
      );
      expect(stored.map((b: { id: number }) => b.id)).toEqual([2, 1]);
    });

    await act(async () => {
      result.current.toggleBookmark(article(1));
    });
    expect(result.current.bookmarks.map((b) => b.id)).toEqual([2]);
  });

  it("does not touch the server while signed out", async () => {
    const { result } = await renderHook(() => useBookmarks(), { wrapper });
    await waitFor(() => expect(result.current.bookmarks).toEqual([]));

    await act(async () => {
      result.current.toggleBookmark(article(1));
    });

    expect(mockAdd).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("shows a toast on save but not on un-save", async () => {
    const { result } = await renderHook(() => useBookmarks(), { wrapper });
    await waitFor(() => expect(result.current.bookmarks).toEqual([]));

    await act(async () => {
      result.current.toggleBookmark(article(1));
    });
    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(mockShowToast.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        message: expect.any(String),
        action: expect.objectContaining({ label: expect.any(String) }),
      })
    );

    mockShowToast.mockClear();
    await act(async () => {
      result.current.toggleBookmark(article(1));
    });
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it("writes through to the server when signed in", async () => {
    mockToken = "session-token";
    const { result } = await renderHook(() => useBookmarks(), { wrapper });
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    await act(async () => {
      result.current.toggleBookmark(article(7));
    });
    expect(mockAdd).toHaveBeenCalledWith("session-token", 7);

    await act(async () => {
      result.current.toggleBookmark(article(7));
    });
    expect(mockRemove).toHaveBeenCalledWith("session-token", 7);
  });

  it("on sign-in, replays the on-device list to the server then adopts the server's list", async () => {
    await AsyncStorage.setItem(
      BOOKMARKS_STORAGE_KEY,
      JSON.stringify([article(1), article(2)])
    );
    // Server already had #2 and #3 saved from another device.
    mockFetch.mockResolvedValue([
      { ...article(3), bookmarked_at: "2026-01-16T00:00:00Z" },
      { ...article(2), bookmarked_at: "2026-01-15T00:00:00Z" },
    ]);

    const { result, rerender } = await renderHook(() => useBookmarks(), { wrapper });
    await waitFor(() => {
      expect(result.current.bookmarks.map((b) => b.id)).toEqual([1, 2]);
    });

    await act(async () => {
      mockToken = "session-token";
      rerender({});
    });

    await waitFor(() => {
      expect(result.current.bookmarks.map((b) => b.id)).toEqual([3, 2]);
    });
    // The whole local list went up in one call before adopting the server list.
    expect(mockBulk).toHaveBeenCalledTimes(1);
    expect(mockBulk).toHaveBeenCalledWith("session-token", [1, 2]);
    const stored = JSON.parse(
      (await AsyncStorage.getItem(BOOKMARKS_STORAGE_KEY)) ?? "[]"
    );
    expect(stored.map((b: { id: number }) => b.id)).toEqual([3, 2]);
  });

  it("clearBookmarks empties the list and persists it (signed out: no server call)", async () => {
    await AsyncStorage.setItem(
      BOOKMARKS_STORAGE_KEY,
      JSON.stringify([article(1), article(2)])
    );
    const { result } = await renderHook(() => useBookmarks(), { wrapper });
    await waitFor(() => expect(result.current.bookmarks).toHaveLength(2));

    await act(async () => {
      result.current.clearBookmarks();
    });

    expect(result.current.bookmarks).toEqual([]);
    expect(mockClear).not.toHaveBeenCalled();
    await waitFor(async () => {
      expect(await AsyncStorage.getItem(BOOKMARKS_STORAGE_KEY)).toBe("[]");
    });
  });

  it("clearBookmarks hits the server when signed in", async () => {
    mockToken = "session-token";
    mockFetch.mockResolvedValue([article(1)]);
    const { result } = await renderHook(() => useBookmarks(), { wrapper });
    await waitFor(() => expect(result.current.bookmarks).toHaveLength(1));

    await act(async () => {
      result.current.clearBookmarks();
    });

    expect(result.current.bookmarks).toEqual([]);
    expect(mockClear).toHaveBeenCalledWith("session-token");
  });

  it("keeps the cached list on sign-out", async () => {
    mockToken = "session-token";
    mockFetch.mockResolvedValue([article(5)]);
    const { result, rerender } = await renderHook(() => useBookmarks(), { wrapper });
    await waitFor(() => {
      expect(result.current.bookmarks.map((b) => b.id)).toEqual([5]);
    });

    await act(async () => {
      mockToken = null;
      rerender({});
    });

    expect(result.current.bookmarks.map((b) => b.id)).toEqual([5]);
  });
});
