import { categoryLabelKey } from "../category-label";

describe("categoryLabelKey", () => {
  it("maps every shared English bucket key to its translation key", () => {
    expect(categoryLabelKey("india")).toBe("categoryIndia");
    expect(categoryLabelKey("world")).toBe("categoryWorld");
    expect(categoryLabelKey("business")).toBe("categoryBusiness");
    expect(categoryLabelKey("sports")).toBe("categorySports");
    expect(categoryLabelKey("cricket")).toBe("categoryCricket");
    expect(categoryLabelKey("entertainment")).toBe("categoryEntertainment");
    expect(categoryLabelKey("tech")).toBe("categoryTech");
    expect(categoryLabelKey("lifestyle")).toBe("categoryLifestyle");
    expect(categoryLabelKey("education")).toBe("categoryEducation");
    expect(categoryLabelKey("science")).toBe("categoryScience");
  });

  it("is case-insensitive for the shared English bucket keys", () => {
    expect(categoryLabelKey("India")).toBe("categoryIndia");
    expect(categoryLabelKey("BUSINESS")).toBe("categoryBusiness");
  });

  it("maps Hindi's own native-script raw category values to the same semantic keys", () => {
    expect(categoryLabelKey("देश")).toBe("categoryIndia");
    expect(categoryLabelKey("विदेश")).toBe("categoryWorld");
    expect(categoryLabelKey("बिजनेस")).toBe("categoryBusiness");
    expect(categoryLabelKey("स्पोर्ट्स")).toBe("categorySports");
    expect(categoryLabelKey("बॉलीवुड")).toBe("categoryEntertainment");
    expect(categoryLabelKey("टेक-ऑटो")).toBe("categoryTech");
  });

  it("maps Gujarati's own native-script raw category values to the same semantic keys", () => {
    expect(categoryLabelKey("ઈન્ડિયા")).toBe("categoryIndia");
    expect(categoryLabelKey("વર્લ્ડ")).toBe("categoryWorld");
    expect(categoryLabelKey("બિઝનેસ")).toBe("categoryBusiness");
    expect(categoryLabelKey("સ્પોર્ટ્સ")).toBe("categorySports");
    expect(categoryLabelKey("એન્ટરટેઇનમેન્ટ")).toBe("categoryEntertainment");
  });

  it("returns null for a raw value outside the shared taxonomy (e.g. a language-specific local section)", () => {
    expect(categoryLabelKey("મારું ગુજરાત")).toBeNull();
    expect(categoryLabelKey("some-unmapped-slug")).toBeNull();
  });
});
