import { apiFetch } from "./client";

// Records that this signed-in user opened an article - the backend's own
// signal for /stories/top's personalized ranking (see the backend's
// docs/personalization.md). Callers fire this and swallow the error
// themselves (matches auth-context.tsx's own putPreferences convention) -
// a failed read-record isn't worth surfacing to the reader.
export async function recordRead(token: string, articleId: number): Promise<void> {
  await apiFetch("/me/reads", {
    method: "POST",
    token,
    body: { articleId },
    parseJson: false,
    errorMessage: "Failed to record read",
  });
}
