const BASE_URL = "http://192.168.0.55:3000";

// Records that this signed-in user opened an article - the backend's own
// signal for /stories/top's personalized ranking (see the backend's
// docs/personalization.md). Callers fire this and swallow the error
// themselves (matches auth-context.tsx's own putPreferences convention) -
// a failed read-record isn't worth surfacing to the reader.
export async function recordRead(token: string, articleId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/me/reads`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ articleId }),
  });
  if (!res.ok) throw new Error("Failed to record read");
}
