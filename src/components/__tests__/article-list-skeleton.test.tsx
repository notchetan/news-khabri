import { render, screen } from "@testing-library/react-native";

import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import ArticleListSkeleton from "../article-list-skeleton";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemePreferenceProvider>
      <LanguagePreferenceProvider>{ui}</LanguagePreferenceProvider>
    </ThemePreferenceProvider>
  );
}

describe("ArticleListSkeleton", () => {
  it("exposes a single accessible progressbar announcing the loading state", async () => {
    await renderWithProviders(<ArticleListSkeleton />);

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveProp("accessibilityLabel", "Loading articles…");
  });

  it("collapses its decorative skeleton blocks out of the accessibility tree", async () => {
    await renderWithProviders(<ArticleListSkeleton />);

    // The individual pulsing placeholder blocks carry no text/labels of
    // their own - only the single progressbar container should be surfaced.
    expect(screen.queryAllByRole("progressbar")).toHaveLength(1);
  });
});
