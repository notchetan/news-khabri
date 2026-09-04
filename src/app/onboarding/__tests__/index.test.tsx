import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import OnboardingWelcomeScreen from "../index";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));

function renderScreen() {
  return render(
    <ThemePreferenceProvider>
      <LanguagePreferenceProvider>
        <OnboardingWelcomeScreen />
      </LanguagePreferenceProvider>
    </ThemePreferenceProvider>
  );
}

describe("OnboardingWelcomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows the app name and a catchphrase", async () => {
    await act(async () => {
      renderScreen();
    });

    expect(screen.getByText("News Khabri")).toBeTruthy();
    expect(
      screen.getByText("Your day's biggest stories, without the noise.")
    ).toBeTruthy();
  });

  it("shows the language picker defaulted to English", async () => {
    await act(async () => {
      renderScreen();
    });

    expect(screen.getByRole("button", { name: "Language" })).toBeTruthy();
    expect(screen.getByText("English")).toBeTruthy();
  });

  it("advances to the features screen when the Next button is pressed", async () => {
    await act(async () => {
      renderScreen();
    });

    fireEvent.press(screen.getByTestId("onboarding-next"));

    expect(mockPush).toHaveBeenCalledWith("/onboarding/features");
  });
});
