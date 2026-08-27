import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Platform } from "react-native";

import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import AppHeader from "../app-header";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemePreferenceProvider>
      <LanguagePreferenceProvider>{ui}</LanguagePreferenceProvider>
    </ThemePreferenceProvider>
  );
}

describe("AppHeader", () => {
  beforeEach(() => {
    mockPush.mockClear();
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
