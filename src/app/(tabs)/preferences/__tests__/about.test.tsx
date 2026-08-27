import { act, render, screen } from "@testing-library/react-native";

import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import AboutScreen from "../about";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));

describe("AboutScreen", () => {
  it("renders the title and key content without crashing", async () => {
    await act(async () => {
      render(
        <ThemePreferenceProvider>
          <LanguagePreferenceProvider>
            <AboutScreen />
          </LanguagePreferenceProvider>
        </ThemePreferenceProvider>
      );
    });

    expect(screen.getByText("About")).toBeTruthy();
    expect(screen.getByText(/News Khabri brings together news/)).toBeTruthy();
    expect(screen.getByText(/support@newskhabri\.app/)).toBeTruthy();
  });
});
