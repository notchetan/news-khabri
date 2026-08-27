import type { TranslationKey } from "@/i18n/translations";

// Maps a raw category value (as stored/returned by the backend) to the
// i18n key that translates it into whatever language is currently active.
//
// Two families of raw value exist today: the shared canonical English bucket
// keys (india/world/business/...) that English and every language added
// after it use, and Hindi/Gujarati's own native-script values from before
// this multi-language system existed (see category-aliases.js on the
// backend) - both are mapped to the same semantic TranslationKey set here,
// so a lookup behaves the same regardless of which language a given
// category's raw value originally came from.
const CATEGORY_LABEL_KEYS: Record<string, TranslationKey> = {
  india: "categoryIndia",
  world: "categoryWorld",
  business: "categoryBusiness",
  sports: "categorySports",
  cricket: "categoryCricket",
  entertainment: "categoryEntertainment",
  tech: "categoryTech",
  lifestyle: "categoryLifestyle",
  education: "categoryEducation",
  science: "categoryScience",

  // Hindi's native-script canonical values.
  देश: "categoryIndia",
  विदेश: "categoryWorld",
  बिजनेस: "categoryBusiness",
  स्पोर्ट्स: "categorySports",
  बॉलीवुड: "categoryEntertainment",
  "टेक-ऑटो": "categoryTech",

  // Gujarati's native-script canonical values. "મારું ગુજરાત" (a
  // Gujarat-specific local-news section with no equivalent in the shared
  // taxonomy) is deliberately not mapped - callers fall back to showing it
  // as-is, which is already correct Gujarati text.
  ઈન્ડિયા: "categoryIndia",
  વર્લ્ડ: "categoryWorld",
  બિઝનેસ: "categoryBusiness",
  સ્પોર્ટ્સ: "categorySports",
  એન્ટરટેઇનમેન્ટ: "categoryEntertainment",
};

// The i18n key for a raw category value, or null if it isn't in the shared
// taxonomy (e.g. a language-specific local section) - callers should fall
// back to displaying the raw value itself in that case, not hide it.
export function categoryLabelKey(rawCategory: string): TranslationKey | null {
  // .toLowerCase() is a no-op on the Devanagari/Gujarati keys above - only
  // the shared English bucket keys actually need it.
  return CATEGORY_LABEL_KEYS[rawCategory.toLowerCase()] ?? null;
}
