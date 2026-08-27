import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { DebugPreferenceProvider } from "@/contexts/debug-preference";
import { FontSizePreferenceProvider } from "@/contexts/font-size-preference";
import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import PreferencesScreen from "../index";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

function renderScreen() {
  return render(
    <ThemePreferenceProvider>
      <LanguagePreferenceProvider>
        <FontSizePreferenceProvider>
          <DebugPreferenceProvider>
            <PreferencesScreen />
          </DebugPreferenceProvider>
        </FontSizePreferenceProvider>
      </LanguagePreferenceProvider>
    </ThemePreferenceProvider>
  );
}

describe("PreferencesScreen", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it("renders the three preference sections with the automatic/medium/English defaults selected", async () => {
    await act(async () => {
      renderScreen();
    });

    expect(
      screen.getByRole("button", {
        name: "Match your device's system setting",
      })
    ).toHaveProp("accessibilityState", expect.objectContaining({ selected: true }));
    expect(
      screen.getByRole("button", { name: "Medium font size" })
    ).toHaveProp("accessibilityState", expect.objectContaining({ selected: true }));
    // Language is now a nav row showing the current value (like
    // About/Privacy/Terms below) rather than a pill per language - the full
    // picker lives on its own pushed screen, see language.test.tsx.
    expect(screen.getByText("English")).toBeTruthy();
  });

  it("switches the selected appearance option and updates the description", async () => {
    await act(async () => {
      renderScreen();
    });

    await act(async () => {
      fireEvent.press(
        screen.getByRole("button", { name: "Always use dark appearance" })
      );
    });

    expect(screen.getByText("Always use dark appearance")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Always use dark appearance" })
    ).toHaveProp("accessibilityState", expect.objectContaining({ selected: true }));
    expect(
      screen.getByRole("button", { name: "Match your device's system setting" })
    ).toHaveProp("accessibilityState", expect.objectContaining({ selected: false }));

    await waitFor(async () => {
      expect(await AsyncStorage.getItem("themePreference")).toBe("night");
    });
  });

  it("switches the selected font size and grows the preview text", async () => {
    await act(async () => {
      renderScreen();
    });

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Large font size" }));
    });

    expect(
      screen.getByRole("button", { name: "Large font size" })
    ).toHaveProp("accessibilityState", expect.objectContaining({ selected: true }));
    await waitFor(async () => {
      expect(await AsyncStorage.getItem("fontSizePreference")).toBe("large");
    });
  });

  it("shows a sample letter from the currently active language's own script, not always Latin \"A\"", async () => {
    await act(async () => {
      renderScreen();
    });
    // All three font-size buttons show the same sample letter, just at
    // different sizes.
    expect(screen.getAllByText("A")).toHaveLength(3);
    screen.unmount();

    await AsyncStorage.setItem("languagePreference", "hi");
    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getAllByText("अ")).toHaveLength(3);
    });
    expect(screen.queryByText("A")).toBeNull();
  });

  it("shows the current language's own name and navigates to the language picker screen when tapped (Apple Settings-style push, not a modal)", async () => {
    await act(async () => {
      renderScreen();
    });

    expect(screen.getByText("Preferences")).toBeTruthy();
    expect(screen.getByText("English")).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: "Language" }));

    expect(mockPush).toHaveBeenCalledWith("/preferences/language");
  });

  it("shows the selected language's own endonym as the current value, not its English name", async () => {
    await AsyncStorage.setItem("languagePreference", "hi");

    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByText("हिंदी")).toBeTruthy();
    });
    expect(screen.queryByText("Hindi")).toBeNull();
  });

  it("loads previously persisted preferences from storage on mount", async () => {
    await AsyncStorage.setItem("themePreference", "day");
    await AsyncStorage.setItem("fontSizePreference", "small");
    await AsyncStorage.setItem("languagePreference", "hi");

    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByText("सेटिंग्स")).toBeTruthy();
    });
    expect(
      screen.getByRole("button", { name: "हमेशा हल्का रूप उपयोग करें" })
    ).toHaveProp("accessibilityState", expect.objectContaining({ selected: true }));
    expect(
      screen.getByRole("button", { name: "छोटा फ़ॉन्ट आकार" })
    ).toHaveProp("accessibilityState", expect.objectContaining({ selected: true }));
  });

  it("defaults debug mode off and toggles it on, persisting the choice", async () => {
    await act(async () => {
      renderScreen();
    });

    const toggle = screen.getByRole("switch", { name: "Debug mode" });
    expect(toggle).toHaveProp("value", false);

    await act(async () => {
      fireEvent(toggle, "valueChange", true);
    });

    expect(screen.getByRole("switch", { name: "Debug mode" })).toHaveProp(
      "value",
      true
    );
    await waitFor(async () => {
      expect(await AsyncStorage.getItem("debugPreference")).toBe("true");
    });
  });

  it("loads a previously persisted debug mode preference from storage on mount", async () => {
    await AsyncStorage.setItem("debugPreference", "true");

    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByRole("switch", { name: "Debug mode" })).toHaveProp(
        "value",
        true
      );
    });
  });

  it("shows About, Privacy Policy, and Terms of Service on a single dot-separated line", async () => {
    await act(async () => {
      renderScreen();
    });

    expect(screen.getByRole("button", { name: "About" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Privacy Policy" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Terms of Service" })).toBeTruthy();
    // Two separators between three links - none before the first or after
    // the last.
    expect(screen.getAllByText("·")).toHaveLength(2);
  });

  it.each([
    ["About", "/preferences/about"],
    ["Privacy Policy", "/preferences/privacy"],
    ["Terms of Service", "/preferences/terms"],
  ])("navigates to %s when its row is tapped", async (label, href) => {
    await act(async () => {
      renderScreen();
    });

    fireEvent.press(screen.getByRole("button", { name: label }));

    expect(mockPush).toHaveBeenCalledWith(href);
  });
});
