import { act, render, screen } from "@testing-library/react-native";

import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import TermsScreen from "../terms";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));

describe("TermsScreen", () => {
  it("renders the title and key content without crashing", async () => {
    await act(async () => {
      render(
        <ThemePreferenceProvider>
          <LanguagePreferenceProvider>
            <TermsScreen />
          </LanguagePreferenceProvider>
        </ThemePreferenceProvider>
      );
    });

    expect(screen.getByText("Terms of Service")).toBeTruthy();
    expect(screen.getByText(/WHAT NEWS KHABRI IS/)).toBeTruthy();
    expect(screen.getByText(/support@newskhabri\.app/)).toBeTruthy();
  });
});
