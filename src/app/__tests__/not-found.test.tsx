import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import NotFoundScreen from "../+not-found";

jest.mock("@/hooks/use-color-scheme", () => ({ useColorScheme: () => "light" }));

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = false;
jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => mockCanGoBack,
  }),
}));

async function renderScreen() {
  await act(async () => {
    render(
      <ThemePreferenceProvider>
        <LanguagePreferenceProvider>
          <NotFoundScreen />
        </LanguagePreferenceProvider>
      </ThemePreferenceProvider>
    );
  });
}

describe("NotFoundScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack = false;
  });

  it("shows the not-found copy", async () => {
    await renderScreen();
    expect(screen.getByRole("header", { name: "Page not found" })).toBeTruthy();
    expect(
      screen.getByText("This screen doesn't exist, or the link is broken.")
    ).toBeTruthy();
  });

  it("replaces with Home when there's nothing to go back to", async () => {
    await renderScreen();
    fireEvent.press(screen.getByTestId("not-found-home"));
    expect(mockReplace).toHaveBeenCalledWith("/");
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("goes back when there is history", async () => {
    mockCanGoBack = true;
    await renderScreen();
    fireEvent.press(screen.getByTestId("not-found-home"));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
