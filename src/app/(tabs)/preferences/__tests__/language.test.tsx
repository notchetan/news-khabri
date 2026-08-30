import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import LanguageScreen from "../language";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack, replace: jest.fn(), canGoBack: () => true }),
}));

function renderScreen() {
  return render(
    <ThemePreferenceProvider>
      <LanguagePreferenceProvider>
        <LanguageScreen />
      </LanguagePreferenceProvider>
    </ThemePreferenceProvider>
  );
}

describe("LanguageScreen (Apple-style pushed picker)", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it("shows a PageHeader (chevron + title left, brand logo right) matching the article page's own header, not the plain 'Back' row", async () => {
    await act(async () => {
      renderScreen();
    });

    expect(screen.getByTestId("language-header-row")).toBeTruthy();
    expect(screen.getByTestId("language-back-chevron")).toBeTruthy();
    expect(screen.getByTestId("language-brand-logo")).toBeTruthy();
    // The heading text appears once, in the header - not duplicated as a
    // separate in-content title the way About/Privacy/Terms still show it.
    expect(screen.getAllByText("Language")).toHaveLength(1);

    fireEvent.press(screen.getByRole("button", { name: "Back" }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("lists every language in its own script, not translated via the currently active language", async () => {
    await act(async () => {
      renderScreen();
    });

    // English is active by default, but every other language still shows
    // its own endonym rather than an English translation of its name.
    expect(screen.getByText("हिंदी")).toBeTruthy();
    expect(screen.getByText("ગુજરાતી")).toBeTruthy();
    expect(screen.getByText("বাংলা")).toBeTruthy();
    expect(screen.getByText("ಕನ್ನಡ")).toBeTruthy();
    expect(screen.getByText("मराठी")).toBeTruthy();
    expect(screen.getByText("മലയാളം")).toBeTruthy();
    expect(screen.getByText("தமிழ்")).toBeTruthy();
    expect(screen.getByText("తెలుగు")).toBeTruthy();
    expect(screen.getByText("ଓଡ଼ିଆ")).toBeTruthy();
    expect(screen.queryByText("Hindi")).toBeNull();
  });

  it("marks the currently selected language and selecting a new one persists it and navigates back", async () => {
    await act(async () => {
      renderScreen();
    });

    expect(
      screen.getByRole("button", { name: "English" })
    ).toHaveProp("accessibilityState", expect.objectContaining({ selected: true }));
    expect(
      screen.getByRole("button", { name: "हिंदी" })
    ).toHaveProp("accessibilityState", expect.objectContaining({ selected: false }));

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "हिंदी" }));
    });

    expect(mockBack).toHaveBeenCalledTimes(1);
    await waitFor(async () => {
      expect(await AsyncStorage.getItem("languagePreference")).toBe("hi");
    });
  });
});
