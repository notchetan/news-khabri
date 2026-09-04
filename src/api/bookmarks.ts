import { apiFetch } from "./client";

// One saved article as the backend returns it from GET /me/bookmarks -
// the same card-shaped fields the feed already uses (so BookmarkedArticle
// is assignable wherever an Article-ish shape is expected), plus when it
// was saved. Also the exact shape the app caches in AsyncStorage for the
// signed-out guest list, so the Saved screen renders identically either
// way.
export type BookmarkedArticle = {
  id: number;
  title: string;
  link: string;
  source: string;
  category: string;
  published_at: string;
  image_url: string | null;
  language: string;
  bookmarked_at?: string;
};

// The signed-in, cross-device bookmark list. Guests never call this - see
// contexts/bookmarks-context.tsx for where the on-device list takes over.
export async function fetchBookmarks(token: string): Promise<BookmarkedArticle[]> {
  return apiFetch("/me/bookmarks", {
    token,
    errorMessage: "Failed to fetch bookmarks",
  });
}

// Idempotent server-side (see the backend's docs/bookmarks.md) - callers
// fire this optimistically and swallow the error themselves, matching
// api/reads.ts's own convention.
export async function addBookmark(token: string, articleId: number): Promise<void> {
  await apiFetch("/me/bookmarks", {
    method: "POST",
    token,
    body: { articleId },
    parseJson: false,
    errorMessage: "Failed to add bookmark",
  });
}

// Replays a whole guest list at sign-in in one request (see the backend's
// docs/bookmarks.md) instead of N parallel addBookmark calls. Same
// swallow-error convention as addBookmark.
export async function addBookmarksBulk(
  token: string,
  articleIds: number[]
): Promise<void> {
  if (articleIds.length === 0) return;
  await apiFetch("/me/bookmarks/bulk", {
    method: "POST",
    token,
    body: { articleIds },
    parseJson: false,
    errorMessage: "Failed to sync bookmarks",
  });
}

export async function removeBookmark(token: string, articleId: number): Promise<void> {
  await apiFetch(`/me/bookmarks/${articleId}`, {
    method: "DELETE",
    token,
    parseJson: false,
    errorMessage: "Failed to remove bookmark",
  });
}

// Clears the whole list in one call - the "Clear all" action.
export async function clearBookmarks(token: string): Promise<void> {
  await apiFetch("/me/bookmarks", {
    method: "DELETE",
    token,
    parseJson: false,
    errorMessage: "Failed to clear bookmarks",
  });
}
