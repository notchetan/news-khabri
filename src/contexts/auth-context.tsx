import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  deleteAccount as deleteAccountRequest,
  fetchMe,
  putPreferences,
  signInWithGoogle,
  type AuthUser,
  type PreferenceBundle,
  type ServerPreferences,
} from "@/api/auth";
import { DEBUG_STORAGE_KEY } from "@/contexts/debug-preference";
import {
  DEFAULT_FONT_SIZE_PREFERENCE,
  FONT_SIZE_STORAGE_KEY,
} from "@/contexts/font-size-preference";
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY } from "@/contexts/language-preference";
import {
  DEFAULT_NOTIFICATION_INTERVAL,
  NOTIFICATION_STORAGE_KEY,
} from "@/contexts/notification-preference";
import {
  DEFAULT_SOURCES_SELECTIONS,
  SOURCES_STORAGE_KEY,
} from "@/contexts/sources-preference";
import { DEFAULT_THEME_PREFERENCE, THEME_STORAGE_KEY } from "@/contexts/theme-preference";
import { notifyPreferenceChanged, onPreferenceChanged } from "@/utils/preference-sync";

const SESSION_TOKEN_KEY = "sessionToken";

type AuthContextValue = {
  user: AuthUser | null;
  // The session token itself - exposed so callers can authenticate their
  // own requests directly (e.g. api/reads.ts's recordRead, fetchStoryFeed's
  // optional personalization signal) rather than every such call needing
  // its own copy of getStoredToken()'s SecureStore lookup.
  token: string | null;
  isLoading: boolean;
  signInError: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  // Permanently deletes the server-side account, then tears down the local
  // session exactly like signOut. Rejects (without clearing the session)
  // if the server call fails, so the caller can surface an error and let
  // the reader retry.
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Neither @react-native-google-signin/google-signin nor expo-secure-store
// is imported at this file's module scope - see "Why two new native
// modules are required lazily, not imported" in docs/google-sign-in.md.

async function getStoredToken(): Promise<string | null> {
  try {
    const SecureStore: typeof import("expo-secure-store") = require("expo-secure-store");
    return await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function storeToken(token: string | null): Promise<void> {
  try {
    const SecureStore: typeof import("expo-secure-store") = require("expo-secure-store");
    if (token) {
      await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
    }
  } catch {
    // No secure storage available yet (native module not linked, or a
    // platform/device without a keychain) - the session just won't
    // survive an app restart, not a crash.
  }
}

// Writes a server-pulled preference bundle into the exact same
// AsyncStorage keys each individual preference context already owns, then
// tells them to reload - see utils/preference-sync.ts for why a plain
// write alone wouldn't reach an already-mounted context.
async function applyServerPreferences(preferences: ServerPreferences): Promise<void> {
  if (!preferences) return;
  await Promise.all([
    AsyncStorage.setItem(THEME_STORAGE_KEY, preferences.theme ?? DEFAULT_THEME_PREFERENCE),
    AsyncStorage.setItem(
      FONT_SIZE_STORAGE_KEY,
      preferences.fontSize ?? DEFAULT_FONT_SIZE_PREFERENCE
    ),
    AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, preferences.language ?? DEFAULT_LANGUAGE),
    AsyncStorage.setItem(DEBUG_STORAGE_KEY, String(preferences.debugEnabled)),
    AsyncStorage.setItem(
      SOURCES_STORAGE_KEY,
      JSON.stringify(preferences.sources ?? DEFAULT_SOURCES_SELECTIONS)
    ),
    AsyncStorage.setItem(
      NOTIFICATION_STORAGE_KEY,
      String(preferences.notificationInterval ?? DEFAULT_NOTIFICATION_INTERVAL)
    ),
  ]);
  notifyPreferenceChanged();
}

async function readLocalPreferencesBundle(): Promise<PreferenceBundle> {
  const [theme, fontSize, language, debug, sourcesRaw, notificationInterval] =
    await Promise.all([
      AsyncStorage.getItem(THEME_STORAGE_KEY),
      AsyncStorage.getItem(FONT_SIZE_STORAGE_KEY),
      AsyncStorage.getItem(LANGUAGE_STORAGE_KEY),
      AsyncStorage.getItem(DEBUG_STORAGE_KEY),
      AsyncStorage.getItem(SOURCES_STORAGE_KEY),
      AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY),
    ]);
  return {
    theme: theme ?? DEFAULT_THEME_PREFERENCE,
    fontSize: fontSize ?? DEFAULT_FONT_SIZE_PREFERENCE,
    language: language ?? DEFAULT_LANGUAGE,
    debugEnabled: debug === "true",
    sources: sourcesRaw ? JSON.parse(sourcesRaw) : DEFAULT_SOURCES_SELECTIONS,
    notificationInterval: Number(notificationInterval) || DEFAULT_NOTIFICATION_INTERVAL,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [signInError, setSignInError] = useState<string | null>(null);

  // Restores a previous session on launch, validated against the server
  // (not just "a token exists locally") so a revoked/expired session
  // doesn't silently pretend to still be signed in.
  useEffect(() => {
    (async () => {
      const stored = await getStoredToken();
      if (!stored) {
        setIsLoading(false);
        return;
      }
      try {
        const { user: me, preferences } = await fetchMe(stored);
        setToken(stored);
        setUser(me);
        await applyServerPreferences(preferences);
      } catch {
        await storeToken(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Pushes the full current preference bundle to the server whenever any
  // of them changes locally, for as long as this device is signed in.
  useEffect(() => {
    if (!token) return undefined;
    return onPreferenceChanged(() => {
      readLocalPreferencesBundle().then((bundle) => {
        putPreferences(token, bundle).catch(() => {
          // A transient network failure here just means this one change
          // doesn't sync immediately - the next preference change (or the
          // next sign-in's own pull) will still converge eventually.
        });
      });
    });
  }, [token]);

  const signIn = async () => {
    setSignInError(null);
    try {
      const {
        GoogleSignin,
      }: typeof import("@react-native-google-signin/google-signin") = require("@react-native-google-signin/google-signin");

      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      });
      await GoogleSignin.hasPlayServices();
      const result = await GoogleSignin.signIn();
      if (result.type !== "success" || !result.data.idToken) {
        return; // Cancelled, or no ID token - nothing to sign in with.
      }

      const { token: sessionToken, user: signedInUser, preferences } =
        await signInWithGoogle(result.data.idToken);
      await storeToken(sessionToken);
      setToken(sessionToken);
      setUser(signedInUser);

      if (preferences) {
        // An existing account's saved preferences become this device's
        // source of truth.
        await applyServerPreferences(preferences);
      } else {
        // A brand new account - seed it with whatever this device
        // currently has, rather than leaving it empty.
        const bundle = await readLocalPreferencesBundle();
        await putPreferences(sessionToken, bundle).catch(() => {});
      }
    } catch (err) {
      setSignInError(err instanceof Error ? err.message : "Sign-in failed");
    }
  };

  const clearLocalSession = async () => {
    try {
      const {
        GoogleSignin,
      }: typeof import("@react-native-google-signin/google-signin") = require("@react-native-google-signin/google-signin");
      await GoogleSignin.signOut();
    } catch {
      // Not configured/never signed in natively this session - fine,
      // still clear our own session below regardless.
    }
    await storeToken(null);
    setToken(null);
    setUser(null);
  };

  const signOut = async () => {
    await clearLocalSession();
  };

  const deleteAccount = async () => {
    if (!token) return;
    // Let a failure here propagate - the session stays intact so the
    // reader can retry rather than being half-signed-out with a live
    // server account.
    await deleteAccountRequest(token);
    await clearLocalSession();
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, signInError, signIn, signOut, deleteAccount }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
