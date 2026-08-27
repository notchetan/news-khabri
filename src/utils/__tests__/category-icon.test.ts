import { getCategoryIcon } from "../category-icon";

describe("getCategoryIcon", () => {
  it("returns the default newspaper icon for null/undefined/empty category", () => {
    expect(getCategoryIcon(null)).toBe("📰");
    expect(getCategoryIcon(undefined)).toBe("📰");
    expect(getCategoryIcon("")).toBe("📰");
  });

  it("returns the default icon for an unmatched category", () => {
    expect(getCategoryIcon("Astrology")).toBe("📰");
  });

  it.each([
    ["Sports", "🏆"],
    ["स्पोर्ट्स", "🏆"],
    ["Cricket", "🏏"],
    ["क्रिकेट", "🏏"],
    ["Business", "💼"],
    ["बिजनेस", "💼"],
    ["Technology", "💻"],
    ["टेक-ऑटो", "💻"],
    ["Entertainment", "🎬"],
    ["बॉलीवुड", "🎬"],
    ["World", "🌍"],
    ["विदेश", "🌍"],
    ["Politics", "🏛️"],
    ["देश", "🏛️"],
    ["India", "🏛️"],
    ["Science", "🔬"],
    ["विज्ञान", "🔬"],
    // The backend's own taxonomy folds "health wellness" into "lifestyle"
    // (see category-aliases.js) rather than keeping health as its own
    // category - "Health" as an input matches the same lifestyle rule.
    ["Health", "✨"],
    ["Lifestyle", "✨"],
    ["Education", "🎓"],
    ["शिक्षा", "🎓"],
    ["Weather", "☁️"],
    ["Opinion", "🗣️"],
  ])("maps %s to %s", (category, icon) => {
    expect(getCategoryIcon(category)).toBe(icon);
  });

  it("matches case-insensitively", () => {
    expect(getCategoryIcon("SPORTS")).toBe("🏆");
    expect(getCategoryIcon("sPoRtS")).toBe("🏆");
  });

  it("matches a keyword found anywhere within a longer category string", () => {
    expect(getCategoryIcon("Latest Business News")).toBe("💼");
  });

  it("returns the first matching rule when multiple keywords could apply", () => {
    // "sport" is checked before "business" in the rule list.
    expect(getCategoryIcon("sport business")).toBe("🏆");
  });

  it("does not fold cricket into the general sports icon", () => {
    expect(getCategoryIcon("Cricket")).not.toBe(getCategoryIcon("Sports"));
  });
});
