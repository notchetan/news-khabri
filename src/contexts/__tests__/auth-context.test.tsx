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

  // The push side of the sync bus - see "The preference sync bus" in
  // docs/google-sign-in.md for why this doesn't rely on provider nesting order.
  it("pushes the full preference bundle to the server when a preference changes while signed in", async () => {
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
      expect(mockPutPreferences).toHaveBeenCalledWith(
        "session-token",
        expect.objectContaining({ theme: "night" })
      );
    });
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
});
