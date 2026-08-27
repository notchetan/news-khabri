import { getCategoryGlyph } from "../category-glyph";

describe("getCategoryGlyph", () => {
  it("returns the generic newspaper glyph for null/undefined/empty/unmatched category", () => {
    expect(getCategoryGlyph(null)).toBe("newspaper.fill");
    expect(getCategoryGlyph(undefined)).toBe("newspaper.fill");
    expect(getCategoryGlyph("")).toBe("newspaper.fill");
    expect(getCategoryGlyph("Astrology")).toBe("newspaper.fill");
  });

  it.each([
    ["Sports", "trophy.fill"],
    ["Cricket", "sportscourt.fill"],
    ["Business", "chart.line.uptrend.xyaxis"],
    ["Technology", "desktopcomputer"],
    ["Entertainment", "film.fill"],
    ["World", "globe"],
    ["Politics", "building.columns.fill"],
    ["India", "building.columns.fill"],
    ["Science", "cross.case.fill"],
    ["Lifestyle", "sparkles"],
    ["Health", "sparkles"],
    ["Education", "graduationcap.fill"],
    ["Weather", "cloud.sun.fill"],
    ["Opinion", "quote.bubble.fill"],
  ])("maps %s to %s", (category, glyph) => {
    expect(getCategoryGlyph(category)).toBe(glyph);
  });
});
