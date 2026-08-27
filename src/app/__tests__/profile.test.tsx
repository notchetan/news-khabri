import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import ProfileScreen from "../profile";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => mockCanGoBack,
  }),
}));

function renderScreen() {
  return render(
    <ThemePreferenceProvider>
      <LanguagePreferenceProvider>
        <ProfileScreen />
      </LanguagePreferenceProvider>
    </ThemePreferenceProvider>
  );
}

describe("ProfileScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack = true;
  });

  it("renders a coming-soon placeholder rather than a real profile", async () => {
    await act(async () => {
      renderScreen();
    });

    expect(screen.getByRole("header", { name: "Profile" })).toBeTruthy();
    expect(
      screen.getByText("Sign-in and personalization are coming soon.")
    ).toBeTruthy();
  });

  it("goes back when there's history to go back to", async () => {
    mockCanGoBack = true;
    await act(async () => {
      renderScreen();
    });

    fireEvent.press(screen.getByRole("button", { name: "Back" }));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("falls back to replacing with Home when there's no history (e.g. opened directly)", async () => {
    mockCanGoBack = false;
    await act(async () => {
      renderScreen();
    });

    fireEvent.press(screen.getByRole("button", { name: "Back" }));

    expect(mockReplace).toHaveBeenCalledWith("/");
    expect(mockBack).not.toHaveBeenCalled();
  });
});
