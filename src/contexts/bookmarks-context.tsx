import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  addBookmark,
  fetchBookmarks,
  removeBookmark,
  type BookmarkedArticle,
} from "@/api/bookmarks";
import { useAuth } from "@/contexts/auth-context";

export const BOOKMARKS_STORAGE_KEY = "bookmarks";

// The on-device list is the single render source for the Saved screen,
// signed in or out - so it renders instantly and offline either way. When
// signed in it's a cache of the server's list (reconciled at sign-in);
// when signed out it's the whole truth. Not wired into the preference-sync
// bus (utils/preference-sync.ts) - bookmarks aren't part of the six-field
// preference bundle and have their own endpoints (see the backend's
// docs/bookmarks.md).
type BookmarksContextValue = {
  bookmarks: BookmarkedArticle[];
  isBookmarked: (articleId: number) => boolean;
  toggleBookmark: (article: BookmarkedArticle) => void;
};

const BookmarksContext = createContext<BookmarksContextValue | undefined>(undefined);

async function readStored(): Promise<BookmarkedArticle[]> {
  try {
    const raw = await AsyncStorage.getItem(BOOKMARKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupt/unexpected stored shape - start from an empty list rather
    // than crashing the whole app on launch.
    return [];
  }
}

export function BookmarksProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [bookmarks, setBookmarks] = useState<BookmarkedArticle[]>([]);
  // Which token the sign-in reconcile below has already run for, so it
  // fires once per sign-in and not on every bookmark change afterwards.
  const syncedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    readStored().then(setBookmarks);
  }, []);

  const persist = useCallback((next: BookmarkedArticle[]) => {
    setBookmarks(next);
    AsyncStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  // On sign-in (or a restored session), replay the whole on-device list to
  // the server one id at a time - both endpoints are idempotent, so this
  // needs no client-side dedupe - then adopt the server's list as this
  // device's. On sign-out, keep whatever's cached (the reader keeps seeing
  // what they saved, now as a guest) and allow a future sign-in to
  // reconcile again.
  useEffect(() => {
    if (!token) {
      syncedTokenRef.current = null;
      return;
    }
    if (syncedTokenRef.current === token) return;
    syncedTokenRef.current = token;

    (async () => {
      const local = await readStored();
      await Promise.all(
        local.map((article) => addBookmark(token, article.id).catch(() => {}))
      );
      try {
        const server = await fetchBookmarks(token);
        persist(server);
      } catch {
        // Network hiccup - the cached list stays as-is and the next
        // sign-in reconciles again.
      }
    })();
  }, [token, persist]);

  const bookmarkedIds = useMemo(
    () => new Set(bookmarks.map((article) => article.id)),
    [bookmarks]
  );

  const isBookmarked = useCallback(
    (articleId: number) => bookmarkedIds.has(articleId),
    [bookmarkedIds]
  );

  const toggleBookmark = useCallback(
    (article: BookmarkedArticle) => {
      const currentlySaved = bookmarkedIds.has(article.id);
      const next = currentlySaved
        ? bookmarks.filter((b) => b.id !== article.id)
        : [{ ...article, bookmarked_at: new Date().toISOString() }, ...bookmarks];
      persist(next);

      if (token) {
        const call = currentlySaved
          ? removeBookmark(token, article.id)
          : addBookmark(token, article.id);
        // A failed write just doesn't sync this one change immediately -
        // the next sign-in's reconcile still converges (matches
        // auth-context.tsx's own putPreferences swallow-error convention).
        call.catch(() => {});
      }
    },
    [bookmarks, bookmarkedIds, persist, token]
  );

  const value = useMemo(
    () => ({ bookmarks, isBookmarked, toggleBookmark }),
    [bookmarks, isBookmarked, toggleBookmark]
  );

  return <BookmarksContext.Provider value={value}>{children}</BookmarksContext.Provider>;
}

export function useBookmarks() {
  const ctx = useContext(BookmarksContext);
  if (!ctx) {
    throw new Error("useBookmarks must be used within a BookmarksProvider");
  }
  return ctx;
}
