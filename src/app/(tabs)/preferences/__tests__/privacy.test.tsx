import { act, render, screen } from "@testing-library/react-native";

import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import PrivacyScreen from "../privacy";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));

describe("PrivacyScreen", () => {
  it("renders the title and key content without crashing", async () => {
    await act(async () => {
      render(
        <ThemePreferenceProvider>
          <LanguagePreferenceProvider>
            <PrivacyScreen />
          </LanguagePreferenceProvider>
        </ThemePreferenceProvider>
      );
    });

    expect(screen.getByText("Privacy Policy")).toBeTruthy();
    expect(screen.getByText(/WHAT WE COLLECT/)).toBeTruthy();
    expect(screen.getByText(/support@newskhabri\.app/)).toBeTruthy();
  });
});
