import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  deleteAccount,
  fetchMe,
  putPreferences,
  signInWithGoogle,
} from "@/api/auth";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { ThemePreferenceProvider, useThemePreference } from "@/contexts/theme-preference";

jest.mock("@/api/auth", () => ({
  fetchMe: jest.fn(),
  signInWithGoogle: jest.fn(),
  putPreferences: jest.fn(),
  deleteAccount: jest.fn(),
}));

jest.mock("@/api/notifications", () => ({
  registerPushSubscription: jest.fn().mockResolvedValue(undefined),
}));
const mockRegisterPushSubscription = jest.requireMock("@/api/notifications")
  .registerPushSubscription as jest.Mock;

const mockGetItemAsync = jest.fn();
const mockSetItemAsync = jest.fn();
const mockDeleteItemAsync = jest.fn();
jest.mock("expo-secure-store", () => ({
  getItemAsync: (...args: unknown[]) => mockGetItemAsync(...args),
  setItemAsync: (...args: unknown[]) => mockSetItemAsync(...args),
  deleteItemAsync: (...args: unknown[]) => mockDeleteItemAsync(...args),
}));

const mockGoogleSignInCall = jest.fn();
jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: (...args: unknown[]) => mockGoogleSignInCall(...args),
    signOut: jest.fn().mockResolvedValue(null),
  },
}));

const mockFetchMe = fetchMe as jest.Mock;
const mockSignInWithGoogle = signInWithGoogle as jest.Mock;
const mockPutPreferences = putPreferences as jest.Mock;
const mockDeleteAccount = deleteAccount as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemePreferenceProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemePreferenceProvider>
  );
}

describe("AuthProvider preference sync", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockGetItemAsync.mockResolvedValue(null);
    mockSetItemAsync.mockResolvedValue(undefined);
    mockDeleteItemAsync.mockResolvedValue(undefined);
    mockPutPreferences.mockResolvedValue(undefined);
    mockDeleteAccount.mockResolvedValue(undefined);
  });

  async function signIn(result: { current: { auth: ReturnType<typeof useAuth> } }) {
    mockGoogleSignInCall.mockResolvedValue({ type: "success", data: { idToken: "google-id-token" } });
    mockSignInWithGoogle.mockResolvedValue({
      token: "session-token",
      user: { id: 1, email: "chetan@example.com", name: "Chetan Shetty", avatarUrl: null },
      preferences: null,
    });
    await act(async () => {
      await result.current.auth.signIn();
    });
    await waitFor(() => {
      expect(result.current.auth.user).not.toBeNull();
    });
  }

  it("deleteAccount calls the API with the token then clears the local session", async () => {
    const { result } = await renderHook(() => ({ auth: useAuth() }), { wrapper });
    await signIn(result);

    await act(async () => {
      await result.current.auth.deleteAccount();
    });

    expect(mockDeleteAccount).toHaveBeenCalledWith("session-token");
    expect(result.current.auth.user).toBeNull();
    expect(result.current.auth.token).toBeNull();
    expect(mockDeleteItemAsync).toHaveBeenCalledWith("sessionToken");
  });

  it("deleteAccount keeps the session intact when the API call fails", async () => {
    const { result } = await renderHook(() => ({ auth: useAuth() }), { wrapper });
    await signIn(result);
    mockDeleteAccount.mockRejectedValueOnce(new Error("network"));

    await expect(
      act(async () => {
        await result.current.auth.deleteAccount();
      })
    ).rejects.toThrow("network");

    expect(result.current.auth.user).not.toBeNull();
    expect(result.current.auth.token).toBe("session-token");
  });

  it("on sign-out, re-registers the cached push token anonymously (no session token) so the backend drops the account link", async () => {
    await AsyncStorage.setItem("notificationPushToken", "ExponentPushToken[dev]");
    await AsyncStorage.setItem("notificationPreference", "15");
    const { result } = await renderHook(() => ({ auth: useAuth() }), { wrapper });
    await signIn(result);
    mockRegisterPushSubscription.mockClear();

    await act(async () => {
      await result.current.auth.signOut();
    });

    expect(mockRegisterPushSubscription).toHaveBeenCalledWith(
      "ExponentPushToken[dev]",
      15,
      "en"
    );
  });

  it("on sign-out with no cached push token, does not call the push API", async () => {
    const { result } = await renderHook(() => ({ auth: useAuth() }), { wrapper });
    await signIn(result);
    mockRegisterPushSubscription.mockClear();

    await act(async () => {
      await result.current.auth.signOut();
    });

    expect(mockRegisterPushSubscription).not.toHaveBeenCalled();
  });

  // The push side of the sync bus - see "The preference sync bus" in
  // docs/google-sign-in.md for why this doesn't rely on provider nesting order.
  it("pushes only the field that changed, not the whole bundle, once a device has a synced baseline", async () => {
    mockGoogleSignInCall.mockResolvedValue({
      type: "success",
      data: { idToken: "google-id-token" },
    });
    mockSignInWithGoogle.mockResolvedValue({
      token: "session-token",
      user: { id: 1, email: "chetan@example.com", name: "Chetan Shetty", avatarUrl: null },
      preferences: null,
    });

    const { result } = await renderHook(
      () => ({ auth: useAuth(), theme: useThemePreference() }),
      { wrapper }
    );

    await act(async () => {
      await result.current.auth.signIn();
    });
    await waitFor(() => {
      expect(result.current.auth.user).not.toBeNull();
    });
    mockPutPreferences.mockClear(); // Clear the initial "seed a new account" call.

    await act(async () => {
      result.current.theme.setPreference("night");
    });

    await waitFor(() => {
      expect(mockPutPreferences).toHaveBeenCalledWith("session-token", { theme: "night" });
    });
    // Not a whole-bundle push.
    expect(mockPutPreferences.mock.calls.at(-1)?.[1]).toEqual({ theme: "night" });
  });

  it("does not push preference changes while signed out", async () => {
    const { result } = await renderHook(
      () => ({ theme: useThemePreference() }),
      { wrapper }
    );

    await act(async () => {
      result.current.theme.setPreference("night");
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockPutPreferences).not.toHaveBeenCalled();
  });

  // --- reconcile on relaunch (persisted sync baseline) -----------------

  const FULL_BUNDLE = {
    theme: "automatic",
    fontSize: "medium",
    language: "en",
    debugEnabled: false,
    sources: {},
    notificationInterval: 0,
  };

  async function restore(serverPrefs: Record<string, unknown>) {
    mockGetItemAsync.mockResolvedValue("session-token"); // stored session token
    mockFetchMe.mockResolvedValue({
      user: { id: 1, email: "chetan@example.com", name: "Chetan Shetty", avatarUrl: null },
      preferences: serverPrefs,
    });
    const rendered = await renderHook(
      () => ({ auth: useAuth(), theme: useThemePreference() }),
      { wrapper }
    );
    await waitFor(() => expect(rendered.result.current.auth.user).not.toBeNull());
    return rendered;
  }

  it("keeps an unsynced local edit across a relaunch instead of letting the server value overwrite it", async () => {
    await AsyncStorage.setItem("themePreference", "night");
    await AsyncStorage.setItem(
      "preferencesSyncBaseline",
      JSON.stringify({ ...FULL_BUNDLE, theme: "automatic" })
    );

    const { result } = await restore({ ...FULL_BUNDLE, theme: "automatic" });

    expect(result.current.theme.preference).toBe("night");
    await waitFor(() =>
      expect(mockPutPreferences).toHaveBeenCalledWith("session-token", { theme: "night" })
    );
  });

  it("adopts the server value on relaunch when the local value matches the baseline", async () => {
    await AsyncStorage.setItem("themePreference", "automatic");
    await AsyncStorage.setItem(
      "preferencesSyncBaseline",
      JSON.stringify({ ...FULL_BUNDLE, theme: "automatic" })
    );

    const { result } = await restore({ ...FULL_BUNDLE, theme: "night" });

    expect(result.current.theme.preference).toBe("night");
    expect(mockPutPreferences).not.toHaveBeenCalled();
  });

  it("falls back to server-wins on relaunch when there is no persisted baseline yet", async () => {
    await AsyncStorage.setItem("themePreference", "night");

    const { result } = await restore({ ...FULL_BUNDLE, theme: "automatic" });

    expect(result.current.theme.preference).toBe("automatic");
    expect(mockPutPreferences).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem("preferencesSyncBaseline")).toContain('"automatic"');
  });
});
