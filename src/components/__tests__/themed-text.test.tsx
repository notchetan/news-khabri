import { render, screen } from "@testing-library/react-native";

import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import { ThemedText } from "../themed-text";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemePreferenceProvider>{ui}</ThemePreferenceProvider>);
}

describe("ThemedText", () => {
  it.each([
    "default",
    "title",
    "small",
    "smallBold",
    "subtitle",
    "link",
    "linkPrimary",
    "code",
  ] as const)("renders without crashing for type=%s", async (type) => {
    await renderWithTheme(<ThemedText type={type}>Hello</ThemedText>);
    expect(screen.getByText("Hello")).toBeTruthy();
  });

  it("uses the 'text' theme color by default", async () => {
    await renderWithTheme(<ThemedText>Hello</ThemedText>);
    const node = screen.getByText("Hello");
    const flatStyle = [node.props.style].flat();
    expect(flatStyle).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: "#1C1A17" })])
    );
  });

  it("uses the given themeColor when provided", async () => {
    await renderWithTheme(
      <ThemedText themeColor="textSecondary">Hello</ThemedText>
    );
    const node = screen.getByText("Hello");
    const flatStyle = [node.props.style].flat();
    expect(flatStyle).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: "#71685A" })])
    );
  });

  it("type='linkPrimary' defaults to the theme's tint color", async () => {
    await renderWithTheme(<ThemedText type="linkPrimary">Hello</ThemedText>);
    const node = screen.getByText("Hello");
    const flatStyle = [node.props.style].flat();
    expect(flatStyle).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: "#A8552E" })])
    );
  });

  it("an explicit themeColor overrides linkPrimary's default tint", async () => {
    await renderWithTheme(
      <ThemedText type="linkPrimary" themeColor="text">Hello</ThemedText>
    );
    const node = screen.getByText("Hello");
    const flatStyle = [node.props.style].flat();
    expect(flatStyle).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: "#1C1A17" })])
    );
  });

  it.each(["title", "subtitle"] as const)(
    "gives type=%s a generous lineHeight, not Apple's own tighter Dynamic Type ratio",
    async (type) => {
      // Regression test: title/subtitle used lineHeight ratios (44/40,
      // 41/34 - both ~1.1-1.2x fontSize) copied from Apple's own Dynamic
      // Type scale, tuned for Latin text - real article/story headlines in
      // Devanagari/Tamil/etc. clipped at the top under that ratio. Asserts
      // the invariant (>=1.3x, comfortably above Apple's own ratio) rather
      // than the exact current multiplier, so this doesn't need updating
      // every time the multiplier itself is retuned - just that it stays
      // generous.
      await renderWithTheme(<ThemedText type={type}>Hello</ThemedText>);
      const node = screen.getByText("Hello");
      const flatStyle = [node.props.style].flat();
      const { fontSize, lineHeight } = Object.assign({}, ...flatStyle);
      expect(lineHeight / fontSize).toBeGreaterThanOrEqual(1.3);
    }
  );
});
