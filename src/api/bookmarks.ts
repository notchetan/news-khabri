import { API_BASE_URL as BASE_URL } from "./config";

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
  const res = await fetch(`${BASE_URL}/me/bookmarks`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch bookmarks");
  return res.json();
}

// Idempotent server-side (see the backend's docs/bookmarks.md) - callers
// fire this optimistically and swallow the error themselves, matching
// api/reads.ts's own convention.
export async function addBookmark(token: string, articleId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/me/bookmarks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ articleId }),
  });
  if (!res.ok) throw new Error("Failed to add bookmark");
}

export async function removeBookmark(token: string, articleId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/me/bookmarks/${articleId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to remove bookmark");
}

// Clears the whole list in one call - the "Clear all" action.
export async function clearBookmarks(token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/me/bookmarks`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to clear bookmarks");
}
