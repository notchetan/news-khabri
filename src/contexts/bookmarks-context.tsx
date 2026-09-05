import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
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
  addBookmarksBulk,
  clearBookmarks as clearBookmarksRequest,
  fetchBookmarks,
  removeBookmark,
  type BookmarkedArticle,
} from "@/api/bookmarks";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import { useTranslation } from "@/i18n/translations";

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
  clearBookmarks: () => void;
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
  const { show: showToast } = useToast();
  const { t } = useTranslation();
  const router = useRouter();
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

  // On sign-out, drop the cached list. It belonged to the account that just
  // left, and sign-in replays whatever is cached to the server - so keeping
  // it meant signing out of account A and into B on the same device merged
  // A's saved articles into B's server-side list. Signing back into A
  // re-syncs from the server, so nothing is actually lost.
  //
  // Only a real sign-out (a token going from set to null), never the initial
  // null while the stored session is still being restored.
  const previousTokenRef = useRef<string | null>(null);
  useEffect(() => {
    const signedOut = previousTokenRef.current !== null && token === null;
    previousTokenRef.current = token;
    if (signedOut) {
      setBookmarks([]);
      AsyncStorage.removeItem(BOOKMARKS_STORAGE_KEY).catch(() => {});
    }
  }, [token]);

  // On sign-in (or a restored session), replay the whole on-device list to
  // the server one id at a time - both endpoints are idempotent, so this
  // needs no client-side dedupe - then adopt the server's list as this
  // device's.
  useEffect(() => {
    if (!token) {
      syncedTokenRef.current = null;
      return;
    }
    if (syncedTokenRef.current === token) return;
    syncedTokenRef.current = token;

    (async () => {
      const local = await readStored();
      // One request, not N - see the backend's docs/bookmarks.md.
      await addBookmarksBulk(
        token,
        local.map((article) => article.id)
      ).catch(() => {});
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

      if (!currentlySaved) {
        // Toast only on save, never on un-save. The "View" action jumps to
        // the Saved screen.
        showToast({
          message: t("articleSaved"),
          action: { label: t("toastCheckNow"), onPress: () => router.push("/saved") },
        });
      }

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
    [bookmarks, bookmarkedIds, persist, token, showToast, t, router]
  );

  const clearBookmarks = useCallback(() => {
    persist([]);
    if (token) {
      // One call clears the whole server-side list - see the backend's
      // docs/bookmarks.md. Swallow-error like the toggles above.
      clearBookmarksRequest(token).catch(() => {});
    }
  }, [persist, token]);

  const value = useMemo(
    () => ({ bookmarks, isBookmarked, toggleBookmark, clearBookmarks }),
    [bookmarks, isBookmarked, toggleBookmark, clearBookmarks]
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
