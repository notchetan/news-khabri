// The app's own session JWT, kept in the device keychain via
// expo-secure-store. The module is required lazily inside try/catch (repo
// convention - see docs/google-sign-in.md) so it's a no-op, not a crash,
// where the native module isn't linked. Lives in its own file so both
// auth-context and notification-preference can read the token without an
// import cycle between them.
export const SESSION_TOKEN_KEY = "sessionToken";

export async function getStoredToken(): Promise<string | null> {
  try {
    const SecureStore: typeof import("expo-secure-store") = require("expo-secure-store");
    return await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function storeToken(token: string | null): Promise<void> {
  try {
    const SecureStore: typeof import("expo-secure-store") = require("expo-secure-store");
    if (token) {
      await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
    }
  } catch {
    // No secure storage available (native module not linked, or a
    // platform/device without a keychain) - the session just won't
    // survive an app restart, not a crash.
  }
}
