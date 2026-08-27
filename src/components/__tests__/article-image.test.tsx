import { act, render, screen } from "@testing-library/react-native";

import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import ArticleImage from "../article-image";

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

describe("ArticleImage", () => {
  it("renders the real image with the given alt text when a uri is provided", async () => {
    await renderWithProviders(
      <ArticleImage uri="https://example.com/photo.jpg" alt="A news photo" />
    );

    const image = screen.getByRole("image");
    expect(image).toHaveProp("accessibilityLabel", "A news photo");
    expect(image).toHaveProp("source", [
      { uri: "https://example.com/photo.jpg" },
    ]);
  });

  it("falls back to a generic label when no alt is given", async () => {
    await renderWithProviders(<ArticleImage uri="https://example.com/photo.jpg" />);

    expect(screen.getByRole("image")).toHaveProp(
      "accessibilityLabel",
      "Article image"
    );
  });

  it("shows a category-aware SF Symbol placeholder when there is no uri, without a redundant text label", async () => {
    await renderWithProviders(<ArticleImage uri={null} category="Sports" />);

    expect(screen.queryByRole("image")).toBeNull();
    expect(screen.getByTestId("article-image-placeholder-glyph")).toHaveProp(
      "name",
      "trophy.fill"
    );
    // The category name used to be repeated as body text under the icon -
    // it's already shown elsewhere on the card, so the placeholder itself
    // now only carries it via the accessibility label.
    expect(screen.queryByText("Sports")).toBeNull();
    expect(screen.getByLabelText("No image")).toBeTruthy();
  });

  it("shows the generic newspaper glyph when there is no uri and no category", async () => {
    await renderWithProviders(<ArticleImage uri={null} />);

    expect(screen.getByTestId("article-image-placeholder-glyph")).toHaveProp(
      "name",
      "newspaper.fill"
    );
    expect(screen.getByLabelText("No image")).toBeTruthy();
  });

  it("falls back to the failure placeholder when the image errors", async () => {
    await renderWithProviders(
      <ArticleImage uri="https://example.com/broken.jpg" category="Sports" />
    );

    const image = screen.getByRole("image");
    await act(async () => {
      image.props.onError({ nativeEvent: { error: "load failed" } });
    });

    await screen.findByText("Image failed to load");
    expect(screen.queryByRole("image")).toBeNull();
    // A load failure is a different state from "no photo was ever provided"
    // - it gets a distinct icon and keeps a brief explanation, rather than
    // reusing the quiet icon-only "no artwork" treatment.
    expect(screen.getByTestId("article-image-placeholder-glyph")).toHaveProp(
      "name",
      "exclamationmark.triangle.fill"
    );
  });

  it("still renders the image correctly with a custom radius", async () => {
    await renderWithProviders(
      <ArticleImage uri="https://example.com/photo.jpg" alt="A news photo" radius={4} />
    );

    expect(screen.getByRole("image")).toBeTruthy();
  });

  it("still renders the placeholder correctly with a custom radius", async () => {
    await renderWithProviders(<ArticleImage uri={null} category="Sports" radius={16} />);

    expect(screen.getByTestId("article-image-placeholder-glyph")).toBeTruthy();
  });
});
