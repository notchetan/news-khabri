import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { fetchMe, putPreferences, signInWithGoogle } from "@/api/auth";
import { AuthProvider } from "@/contexts/auth-context";
import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import ProfileScreen from "../profile";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

jest.mock("@/api/auth", () => ({
  fetchMe: jest.fn(),
  signInWithGoogle: jest.fn(),
  putPreferences: jest.fn(),
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
const mockGoogleSignOutCall = jest.fn();
jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: (...args: unknown[]) => mockGoogleSignInCall(...args),
    signOut: (...args: unknown[]) => mockGoogleSignOutCall(...args),
  },
}));

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => mockCanGoBack,
  }),
}));

const mockFetchMe = fetchMe as jest.Mock;
const mockSignInWithGoogle = signInWithGoogle as jest.Mock;
const mockPutPreferences = putPreferences as jest.Mock;

function renderScreen() {
  return render(
    <ThemePreferenceProvider>
      <LanguagePreferenceProvider>
        <AuthProvider>
          <ProfileScreen />
        </AuthProvider>
      </LanguagePreferenceProvider>
    </ThemePreferenceProvider>
  );
}

function mockSuccessfulGoogleSignIn(idToken = "google-id-token") {
  mockGoogleSignInCall.mockResolvedValue({ type: "success", data: { idToken } });
}

describe("ProfileScreen", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockCanGoBack = true;
    mockGetItemAsync.mockResolvedValue(null);
    mockSetItemAsync.mockResolvedValue(undefined);
    mockDeleteItemAsync.mockResolvedValue(undefined);
    mockPutPreferences.mockResolvedValue(undefined);
  });

  it("shows a sign-in prompt (no stored session) rather than a real profile", async () => {
    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByRole("header", { name: "Profile" })).toBeTruthy();
    });
    expect(
      screen.getByText("Sign in to sync your preferences across devices")
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeTruthy();
  });

  it("goes back when there's history to go back to", async () => {
    mockCanGoBack = true;
    await act(async () => {
      renderScreen();
    });

    fireEvent.press(screen.getByRole("button", { name: "Back" }));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("falls back to replacing with Home when there's no history (e.g. opened directly)", async () => {
    mockCanGoBack = false;
    await act(async () => {
      renderScreen();
    });

    fireEvent.press(screen.getByRole("button", { name: "Back" }));

    expect(mockReplace).toHaveBeenCalledWith("/");
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("signing in shows the account's name, email, and a sign-out button", async () => {
    mockSuccessfulGoogleSignIn();
    mockSignInWithGoogle.mockResolvedValue({
      token: "session-token",
      user: { id: 1, email: "chetan@example.com", name: "Chetan Shetty", avatarUrl: null },
      preferences: null,
    });

    await act(async () => {
      renderScreen();
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Sign in with Google" }));
    });

    await waitFor(() => {
      expect(screen.getByText("Chetan Shetty")).toBeTruthy();
    });
    expect(screen.getByText("chetan@example.com")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
    // The session token is persisted so a relaunch can restore it.
    expect(mockSetItemAsync).toHaveBeenCalledWith("sessionToken", "session-token");
  });

  it("a brand new account (no saved preferences) gets seeded with this device's current preferences", async () => {
    mockSuccessfulGoogleSignIn();
    mockSignInWithGoogle.mockResolvedValue({
      token: "session-token",
      user: { id: 1, email: "chetan@example.com", name: "Chetan Shetty", avatarUrl: null },
      preferences: null,
    });

    await act(async () => {
      renderScreen();
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Sign in with Google" }));
    });

    await waitFor(() => {
      expect(mockPutPreferences).toHaveBeenCalledWith(
        "session-token",
        expect.objectContaining({ theme: "automatic", language: "en" })
      );
    });
  });

  it("an existing account's saved preferences are applied to this device", async () => {
    mockSuccessfulGoogleSignIn();
    mockSignInWithGoogle.mockResolvedValue({
      token: "session-token",
      user: { id: 1, email: "chetan@example.com", name: "Chetan Shetty", avatarUrl: null },
      preferences: {
        theme: "night",
        fontSize: "large",
        language: "hi",
        debugEnabled: true,
        sources: { hi: ["Aaj Tak"] },
        notificationInterval: 15,
      },
    });

    await act(async () => {
      renderScreen();
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Sign in with Google" }));
    });

    await waitFor(async () => {
      expect(await AsyncStorage.getItem("themePreference")).toBe("night");
    });
    expect(await AsyncStorage.getItem("languagePreference")).toBe("hi");
    expect(await AsyncStorage.getItem("debugPreference")).toBe("true");
  });

  it("signing out clears the session and returns to the sign-in prompt", async () => {
    mockSuccessfulGoogleSignIn();
    mockSignInWithGoogle.mockResolvedValue({
      token: "session-token",
      user: { id: 1, email: "chetan@example.com", name: "Chetan Shetty", avatarUrl: null },
      preferences: null,
    });
    mockGoogleSignOutCall.mockResolvedValue(null);

    await act(async () => {
      renderScreen();
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeTruthy();
    });
    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Sign in with Google" }));
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Sign out" }));
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeTruthy();
    });
    expect(mockDeleteItemAsync).toHaveBeenCalledWith("sessionToken");
  });

  it("shows an error message when Google sign-in fails", async () => {
    mockGoogleSignInCall.mockRejectedValue(new Error("Network error"));

    await act(async () => {
      renderScreen();
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Sign in with Google" }));
    });

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeTruthy();
    });
  });

  it("restores a previously signed-in session on mount, validated against the server", async () => {
    mockGetItemAsync.mockResolvedValue("stored-session-token");
    mockFetchMe.mockResolvedValue({
      user: { id: 1, email: "chetan@example.com", name: "Chetan Shetty", avatarUrl: null },
      preferences: null,
    });

    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByText("Chetan Shetty")).toBeTruthy();
    });
    expect(mockFetchMe).toHaveBeenCalledWith("stored-session-token");
  });

  it("clears an invalid/expired stored session rather than staying signed in", async () => {
    mockGetItemAsync.mockResolvedValue("stale-session-token");
    mockFetchMe.mockRejectedValue(new Error("Not signed in"));

    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeTruthy();
    });
    expect(mockDeleteItemAsync).toHaveBeenCalledWith("sessionToken");
  });
});
