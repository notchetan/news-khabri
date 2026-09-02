import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { signInWithGoogle } from "@/api/auth";
import { AuthProvider } from "@/contexts/auth-context";
import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { OnboardingProvider } from "@/contexts/onboarding-context";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import OnboardingSignInScreen from "../sign-in";

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
jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: (...args: unknown[]) => mockGoogleSignInCall(...args),
    signOut: jest.fn(),
  },
}));

const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
}));

const mockSignInWithGoogle = signInWithGoogle as jest.Mock;

function renderScreen() {
  return render(
    <ThemePreferenceProvider>
      <LanguagePreferenceProvider>
        <AuthProvider>
          <OnboardingProvider>
            <OnboardingSignInScreen />
          </OnboardingProvider>
        </AuthProvider>
      </LanguagePreferenceProvider>
    </ThemePreferenceProvider>
  );
}

describe("OnboardingSignInScreen", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockGetItemAsync.mockResolvedValue(null);
    mockSetItemAsync.mockResolvedValue(undefined);
    mockDeleteItemAsync.mockResolvedValue(undefined);
  });

  it("explains what signing in unlocks and offers both a sign-in and a skip button", async () => {
    await act(async () => {
      renderScreen();
    });

    expect(screen.getByText("Sign in to unlock more")).toBeTruthy();
    expect(
      screen.getByText(
        "Sign in with Google to sync your source picks and notification settings across every device you use"
      )
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Skip for now" })).toBeTruthy();
  });

  it("skipping marks onboarding complete and lands on the real app", async () => {
    await act(async () => {
      renderScreen();
    });

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Skip for now" }));
    });

    await waitFor(async () => {
      expect(await AsyncStorage.getItem("hasCompletedOnboarding")).toBe("true");
    });
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("a successful Google sign-in also marks onboarding complete and lands on the real app", async () => {
    mockGoogleSignInCall.mockResolvedValue({
      type: "success",
      data: { idToken: "google-id-token" },
    });
    mockSignInWithGoogle.mockResolvedValue({
      token: "session-token",
      user: { id: 1, email: "chetan@example.com", name: "Chetan Shetty", avatarUrl: null },
      preferences: null,
    });

    await act(async () => {
      renderScreen();
    });

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Sign in with Google" }));
    });

    await waitFor(async () => {
      expect(await AsyncStorage.getItem("hasCompletedOnboarding")).toBe("true");
    });
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("shows an error and stays on this screen when Google sign-in fails", async () => {
    mockGoogleSignInCall.mockRejectedValue(new Error("Network error"));

    await act(async () => {
      renderScreen();
    });

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Sign in with Google" }));
    });

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeTruthy();
    });
    expect(mockReplace).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem("hasCompletedOnboarding")).toBeNull();
  });
});
