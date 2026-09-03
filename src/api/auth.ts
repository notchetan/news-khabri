import { API_BASE_URL as BASE_URL } from "./config";

export type AuthUser = {
  id: number;
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

// The full preference bundle synced with the server - one canonical shape
// `putPreferences`'s param, `readLocalPreferencesBundle` in auth-context.tsx,
// and `ServerPreferences` below all derive from, rather than each
// hand-typing their own copy of the same six fields.
export type PreferenceBundle = {
  theme: string;
  fontSize: string;
  language: string;
  debugEnabled: boolean;
  sources: Record<string, string[]>;
  notificationInterval: number;
};

// What `/me` and `/auth/google` actually return: theme/fontSize/language
// can be null for an account the server has no value for yet.
export type ServerPreferences =
  | (Omit<PreferenceBundle, "theme" | "fontSize" | "language"> & {
      theme: string | null;
      fontSize: string | null;
      language: string | null;
    })
  | null;

export type AuthResponse = {
  token: string;
  user: AuthUser;
  preferences: ServerPreferences;
};

// Exchanges a Google ID token (from @react-native-google-signin/google-signin)
// for this app's own session token - see the backend's
// docs/google-sign-in.md for why there's a second token at all.
export async function signInWithGoogle(idToken: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error("Failed to sign in with Google");
  return res.json();
}

export async function fetchMe(
  token: string
): Promise<{ user: AuthUser; preferences: ServerPreferences }> {
  const res = await fetch(`${BASE_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch account");
  return res.json();
}

export async function putPreferences(
  token: string,
  preferences: PreferenceBundle
): Promise<void> {
  const res = await fetch(`${BASE_URL}/me/preferences`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(preferences),
  });
  if (!res.ok) throw new Error("Failed to save preferences");
}

// Permanently deletes the account and everything the server has synced to
// it (preferences, bookmarks, reading history). The backend clears every
// referencing table in one transaction - see its docs/google-sign-in.md.
export async function deleteAccount(token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/me`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to delete account");
}
