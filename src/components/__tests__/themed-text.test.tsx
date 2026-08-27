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
});
