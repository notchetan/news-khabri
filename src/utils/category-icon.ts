import { getCategoryTopic, type CategoryTopic } from "./category-topic";

// See docs/category-icon-emoji.md.
const TOPIC_ICON: Record<CategoryTopic, string> = {
  cricket: "🏏",
  sports: "⚽",
  business: "💼",
  tech: "💻",
  entertainment: "🎬",
  world: "🌍",
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
