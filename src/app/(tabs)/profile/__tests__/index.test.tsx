import { act, render, screen } from "@testing-library/react-native";

import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import ProfileScreen from "../index";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

describe("ProfileScreen (placeholder)", () => {
  it("renders a coming-soon placeholder rather than a real profile", async () => {
    await act(async () => {
      render(
        <ThemePreferenceProvider>
          <LanguagePreferenceProvider>
            <ProfileScreen />
          </LanguagePreferenceProvider>
        </ThemePreferenceProvider>
      );
    });

    expect(screen.getByRole("header", { name: "Profile" })).toBeTruthy();
    expect(
      screen.getByText("Sign-in and personalization are coming soon.")
    ).toBeTruthy();
  });
});
