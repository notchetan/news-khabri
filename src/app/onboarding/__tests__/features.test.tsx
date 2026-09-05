import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import OnboardingFeaturesScreen from "../features";

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

  it("advances to the sign-in screen when the Next button is pressed", async () => {
    await act(async () => {
      renderScreen();
    });

    fireEvent.press(screen.getByTestId("onboarding-next"));

    expect(mockPush).toHaveBeenCalledWith("/onboarding/sign-in");
  });

  // Every reader has to complete this flow; on a small screen at a large
  // font size the content used to overflow with no way to reach the buttons.
  it("puts its content in a scroll view so it can never be unreachable", async () => {
    await act(async () => {
      renderScreen();
    });

    expect(screen.getByTestId("onboarding-scroll")).toBeTruthy();
  });
});
