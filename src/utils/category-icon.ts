import { getCategoryTopic, type CategoryTopic } from "./category-topic";

// Emoji per topic - used for the search tab's category-selection grid,
// where a colorful glyph works as decorative tile art rather than a
// functional icon (see the SF Symbol mapping in category-glyph.ts for the
// article-image.tsx placeholder, a different context where a flat emoji on
// a plain box reads as a broken/empty state rather than a designed one).
const TOPIC_ICON: Record<CategoryTopic, string> = {
  // Cricket keeps the cricket-bat emoji it always had; general sports (now
  // meaning "everything except cricket" - football, tennis, Olympics, ...)
  // uses a football/soccer ball rather than a trophy, reading more clearly
  // as "sports" at a glance in the grid.
  cricket: "🏏",
  sports: "⚽",
  business: "💼",
  tech: "💻",
  entertainment: "🎬",
  world: "🌍",
  // "politics" is the topic the backend's own "india"/national-news
  // category resolves to (see CATEGORY_TOPIC_RULES's own comment - the
  // backend has no separate canonical "politics" category, "india" is
  // what actually surfaces this card in the search grid), so its icon is
  // the India flag rather than a generic government building.
  politics: "🇮🇳",
  science: "🔬",
  lifestyle: "✨",
  education: "🎓",
  weather: "☁️",
  opinion: "🗣️",
  default: "📰",
};

export function getCategoryIcon(category: string | null | undefined): string {
  return TOPIC_ICON[getCategoryTopic(category)];
}
