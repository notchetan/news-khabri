import { act, render, screen } from "@testing-library/react-native";

import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import OnboardingFeaturesScreen from "../features";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

function renderScreen() {
  return render(
    <ThemePreferenceProvider>
      <LanguagePreferenceProvider>
        <OnboardingFeaturesScreen />
      </LanguagePreferenceProvider>
    </ThemePreferenceProvider>
  );
}

describe("OnboardingFeaturesScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists all four features by title and description", async () => {
    await act(async () => {
      renderScreen();
    });

    expect(screen.getByText("No ads, ever")).toBeTruthy();
    expect(
      screen.getByText("A clean reading experience with nothing competing for your attention")
    ).toBeTruthy();
    expect(screen.getByText("Read in your language")).toBeTruthy();
    expect(screen.getByText("News in 10 Indian languages, not just English")).toBeTruthy();
    expect(screen.getByText("Choose your sources")).toBeTruthy();
    expect(
      screen.getByText("Pick exactly which publishers show up in your feed")
    ).toBeTruthy();
    expect(screen.getByText("Notifications on your terms")).toBeTruthy();
    expect(
      screen.getByText("Get alerted about trending stories, as often as you want")
    ).toBeTruthy();
  });
});
