import { getCategoryTopic } from "../category-topic";

describe("getCategoryTopic", () => {
  it("returns 'default' for null/undefined/empty category", () => {
    expect(getCategoryTopic(null)).toBe("default");
    expect(getCategoryTopic(undefined)).toBe("default");
    expect(getCategoryTopic("")).toBe("default");
  });

  it("returns 'default' for an unmatched category", () => {
    expect(getCategoryTopic("Astrology")).toBe("default");
  });

  it.each([
    ["Sports", "sports"],
    ["સ્પોર્ટ્સ", "sports"],
    ["Cricket", "cricket"],
    ["क्रिकेट", "cricket"],
    ["Business", "business"],
    ["બિઝનેસ", "business"],
    ["Technology", "tech"],
    ["Entertainment", "entertainment"],
    ["એન્ટરટેઇનમેન્ટ", "entertainment"],
    ["World", "world"],
    ["વર્લ્ડ", "world"],
    ["Politics", "politics"],
    ["India", "politics"],
    ["ઈન્ડિયા", "politics"],
    ["મારું ગુજરાત", "politics"],
    ["Science", "science"],
    ["Lifestyle", "lifestyle"],
    ["Health", "lifestyle"],
    ["Education", "education"],
    ["Weather", "weather"],
    ["Opinion", "opinion"],
  ])("maps %s to topic %s", (category, topic) => {
    expect(getCategoryTopic(category)).toBe(topic);
  });

  it("matches case-insensitively", () => {
    expect(getCategoryTopic("SPORTS")).toBe("sports");
  });

  it("returns the first matching rule when multiple keywords could apply", () => {
    expect(getCategoryTopic("sport business")).toBe("sports");
  });

  it("does not fold cricket into the general sports topic", () => {
    expect(getCategoryTopic("Cricket")).not.toBe("sports");
    expect(getCategoryTopic("Cricket")).toBe("cricket");
  });
});
