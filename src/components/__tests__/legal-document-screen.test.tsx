import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import LegalDocumentScreen from "../legal-document-screen";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => mockCanGoBack,
  }),
}));

function renderScreen() {
  return render(
    <ThemePreferenceProvider>
      <LanguagePreferenceProvider>
        <LegalDocumentScreen title="About">
          <Text>Body content</Text>
        </LegalDocumentScreen>
      </LanguagePreferenceProvider>
    </ThemePreferenceProvider>
  );
}

describe("LegalDocumentScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack = true;
  });

  it("renders the title and children", async () => {
    await act(async () => {
      renderScreen();
    });

    expect(screen.getByText("About")).toBeTruthy();
    expect(screen.getByText("Body content")).toBeTruthy();
  });

  it("goes back when a previous screen exists", async () => {
    await act(async () => {
      renderScreen();
    });

    fireEvent.press(screen.getByRole("button", { name: "Back" }));

    expect(mockBack).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("replaces with the preferences tab when there is no previous screen", async () => {
    mockCanGoBack = false;
    await act(async () => {
      renderScreen();
    });

    fireEvent.press(screen.getByRole("button", { name: "Back" }));

    expect(mockReplace).toHaveBeenCalledWith("/preferences");
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("renders a custom header via renderHeader instead of the default '‹ Back' row, and suppresses the in-content title", async () => {
    await act(async () => {
      render(
        <ThemePreferenceProvider>
          <LanguagePreferenceProvider>
            <LegalDocumentScreen
              title="About"
              renderHeader={(goBack) => (
                <Text accessibilityRole="button" onPress={goBack}>
                  Custom header
                </Text>
              )}
            >
              <Text>Body content</Text>
            </LegalDocumentScreen>
          </LanguagePreferenceProvider>
        </ThemePreferenceProvider>
      );
    });

    expect(screen.getByText("Custom header")).toBeTruthy();
    expect(screen.getByText("Body content")).toBeTruthy();
    // "About" would otherwise render twice (once as the in-content heading,
    // once wherever the custom header itself shows it) - the default
    // heading is suppressed so a caller's own header is the only place it
    // appears.
    expect(screen.queryByText("About")).toBeNull();

    fireEvent.press(screen.getByText("Custom header"));
    expect(mockBack).toHaveBeenCalled();
  });
});
