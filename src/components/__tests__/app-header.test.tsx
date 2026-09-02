import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Platform } from "react-native";

import { fetchMe } from "@/api/auth";
import { AuthProvider } from "@/contexts/auth-context";
import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import AppHeader from "../app-header";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

jest.mock("@/api/auth", () => ({
  fetchMe: jest.fn(),
  signInWithGoogle: jest.fn(),
  putPreferences: jest.fn(),
}));

const mockGetItemAsync = jest.fn().mockResolvedValue(null);
jest.mock("expo-secure-store", () => ({
  getItemAsync: (...args: unknown[]) => mockGetItemAsync(...args),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

const mockFetchMe = fetchMe as jest.Mock;

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemePreferenceProvider>
      <LanguagePreferenceProvider>
        <AuthProvider>{ui}</AuthProvider>
      </LanguagePreferenceProvider>
    </ThemePreferenceProvider>
  );
}

describe("AppHeader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItemAsync.mockResolvedValue(null);
  });

  it("shows the given title and the app's own logo", async () => {
    await act(async () => {
      renderWithProviders(<AppHeader title="Search" />);
    });

    expect(screen.getByText("Search")).toBeTruthy();
    expect(screen.getByTestId("app-header-logo")).toBeTruthy();
  });

  it("navigates to /profile when the profile button is pressed", async () => {
    await act(async () => {
      renderWithProviders(<AppHeader title="Home" />);
    });

    fireEvent.press(screen.getByRole("button", { name: "Profile" }));

    expect(mockPush).toHaveBeenCalledWith("/profile");
  });

  it("shows the signed-in user's Google avatar instead of the generic profile icon", async () => {
    mockGetItemAsync.mockResolvedValue("stored-session-token");
    mockFetchMe.mockResolvedValue({
      user: {
        id: 1,
        email: "chetan@example.com",
        name: "Chetan Shetty",
        avatarUrl: "https://example.com/avatar.jpg",
      },
      preferences: null,
    });

    await act(async () => {
      renderWithProviders(<AppHeader title="Home" />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("app-header-avatar")).toBeTruthy();
    });
  });

  it("renders nothing on web - the web tab bar carries this same information itself", async () => {
    const originalOS = Platform.OS;
    Platform.OS = "web";

    await act(async () => {
      renderWithProviders(<AppHeader title="Home" />);
    });

    expect(screen.queryByText("Home")).toBeNull();
    expect(screen.queryByRole("button", { name: "Profile" })).toBeNull();

    Platform.OS = originalOS;
  });
});
