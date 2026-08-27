// Maps a category name (raw string from whatever publisher/language it came
// from - there's no fixed taxonomy, see category-aliases.js on the backend)
// to one of a small set of general topics via keyword matching. Shared by
// category-icon.ts (emoji, used for the search tab's category grid) and
// category-glyph.ts (SF Symbol, used for article-image.tsx's no-photo
// placeholder) so the "which bucket does this category belong to" judgment
// call lives in exactly one place rather than two keyword lists silently
// drifting apart as sources/languages are added.
export type CategoryTopic =
  | "sports"
  | "cricket"
  | "business"
  | "tech"
  | "entertainment"
  | "world"
  | "politics"
  | "science"
  | "lifestyle"
  | "education"
  | "weather"
  | "opinion"
  | "default";

// Mirrors the backend's own consolidated ~10-category taxonomy (see
// services/category-aliases.js) closely enough that every one of its
// canonical English category strings (india, world, business, sports,
// cricket, science, tech, education, entertainment, lifestyle) matches its
// own rule directly, rather than relying on an incidental substring match -
// that gap is exactly what let "lifestyle" fall through to "health" via the
// (removed) bare "life" keyword, which also incorrectly lumped the
// backend's now-separate "science" category under the same icon as
// "lifestyle". Cricket gets its own rule/topic for the same reason the
// backend keeps it split from general sports - popular enough in India to
// earn its own icon rather than sharing sports'.
const CATEGORY_TOPIC_RULES: { keywords: string[]; topic: CategoryTopic }[] = [
  { keywords: ["cricket", "क्रिकेट"], topic: "cricket" },
  { keywords: ["sport", "football", "स्पोर्ट", "સ્પોર્ટ્સ"], topic: "sports" },
  {
    keywords: ["business", "market", "finance", "बिजनेस", "व्यापार", "बाज़ार", "બિઝનેસ"],
    topic: "business",
  },
  { keywords: ["tech", "auto", "गैजेट", "टेक", "ऑटो"], topic: "tech" },
  {
    keywords: ["entertainment", "bollywood", "movie", "बॉलीवुड", "मनोरंजन", "એન્ટરટેઇનમેન્ટ"],
    topic: "entertainment",
  },
  { keywords: ["world", "foreign", "international", "विदेश", "વર્લ્ડ"], topic: "world" },
  {
    keywords: [
      "politic", "national", "देश", "राजनीति", "nation", "india",
      "ઈન્ડિયા", "મારું ગુજરાત",
    ],
    topic: "politics",
  },
  { keywords: ["science", "विज्ञान"], topic: "science" },
  { keywords: ["lifestyle", "health", "wellness", "स्वास्थ्य", "जीवन"], topic: "lifestyle" },
  { keywords: ["education", "job", "career", "शिक्षा", "जॉब"], topic: "education" },
  { keywords: ["weather"], topic: "weather" },
  { keywords: ["opinion", "ओपिनियन"], topic: "opinion" },
];

export function getCategoryTopic(category: string | null | undefined): CategoryTopic {
  if (!category) return "default";
  const lower = category.toLowerCase();
  const match = CATEGORY_TOPIC_RULES.find((rule) =>
    rule.keywords.some((keyword) => lower.includes(keyword))
  );
  return match?.topic ?? "default";
}
