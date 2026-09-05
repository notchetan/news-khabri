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

  it("links to the privacy policy and the terms", async () => {
    await act(async () => {
      renderScreen();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("onboarding-legal-privacy"));
    });
    expect(mockPush).toHaveBeenCalledWith("/onboarding/privacy");

    await act(async () => {
      fireEvent.press(screen.getByTestId("onboarding-legal-legal"));
    });
    expect(mockPush).toHaveBeenCalledWith("/onboarding/terms");
  });

  // The whole point of the checkbox: nobody reaches the app without having
  // been shown the two documents first.
  it("does not advance until the legal checkbox is accepted", async () => {
    await act(async () => {
      renderScreen();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("onboarding-next"));
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("advances to the features screen once accepted and Next is pressed", async () => {
    await act(async () => {
      renderScreen();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("onboarding-legal-accept"));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId("onboarding-next"));
    });

    expect(mockPush).toHaveBeenCalledWith("/onboarding/features");
  });

  it("reports the checkbox state to assistive technology", async () => {
    await act(async () => {
      renderScreen();
    });

    // Re-queried after the press rather than reusing the handle: a captured
    // element holds the props from the render it came from, so asserting on
    // the old one would always report the pre-toggle state.
    expect(
      screen.getByTestId("onboarding-legal-accept").props.accessibilityState
    ).toMatchObject({ checked: false });

    await act(async () => {
      fireEvent.press(screen.getByTestId("onboarding-legal-accept"));
    });

    expect(
      screen.getByTestId("onboarding-legal-accept").props.accessibilityState
    ).toMatchObject({ checked: true });
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
