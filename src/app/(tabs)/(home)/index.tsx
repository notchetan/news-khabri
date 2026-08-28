import { fetchCategories } from "@/api/articles";
import AppHeader from "@/components/app-header";
import ArticleList from "@/components/article-list";
import CategoryPills from "@/components/category-pills";
import StoryList from "@/components/story-list";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NATIVE_TAB_BAR_HEIGHT, Spacing } from "@/constants/theme";
import { useLanguagePreference } from "@/contexts/language-preference";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";
import { categoryLabelKey } from "@/utils/category-label";

// A sentinel distinct from any real backend category value - the pinned
// "no category filter" pill and the default selection. Deliberately not the
// translated "Top Stories" text itself (that was the previous design): a
// pure sentinel keeps selection state independent of the current language,
// so the reset-on-language-change effect below exists only to invalidate a
// *real* category (which has no meaning in another language's entirely
// different category set), not to keep a translated string in sync too.
const TOP_STORIES = "__top_stories__";

export default function HomeScreen() {
  const { language } = useLanguagePreference();
  const { t } = useTranslation();
  const [category, setCategory] = useState<string>(TOP_STORIES);
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  // A category selected in one language's list (e.g. "sports") has no
  // meaning in another (whose categories can be an entirely different set,
  // e.g. Hindi's own "बिजनेस"/"स्पोर्ट्स") - reset to Top Stories whenever
  // the language changes.
  useEffect(() => {
    setCategory(TOP_STORIES);
  }, [language]);

  const { data: categories } = useQuery({
    queryKey: ["categories", language],
    queryFn: () => fetchCategories(language),
  });

  const topPadding = Platform.select({
    default: insets.top,
    web: Spacing.six,
  });
  // Same tab-bar reservation as search/index.tsx and preferences/index.tsx -
  // see NATIVE_TAB_BAR_HEIGHT's own comment for why insets.bottom alone
  // isn't enough. Without this, StoryList/ArticleList's last card was
  // clipped behind Android's opaque tab bar (invisible there, unlike iOS's
  // translucent one where the same unreserved content stays legible).
  const bottomPadding = Platform.select({
    default: insets.bottom + NATIVE_TAB_BAR_HEIGHT,
    web: 0,
  });

  const pillValues = [TOP_STORIES, ...(categories ?? [])];
  const isTopStories = category === TOP_STORIES;

  // Translates a raw category value into the currently active language -
  // falls back to a capitalized version of the raw value for anything
  // outside the shared taxonomy (e.g. a language-specific local section)
  // rather than hiding it.
  const getCategoryLabel = (cat: string) => {
    if (cat === TOP_STORIES) return t("topStories");
    const key = categoryLabelKey(cat);
    return key ? t(key) : cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  return (
    <View
      style={{
        flex: 1,
        paddingTop: topPadding,
        paddingBottom: bottomPadding,
        backgroundColor: theme.background,
      }}
    >
      <AppHeader title={t("appName")} />
      <CategoryPills
        categories={pillValues}
        selected={category}
        onSelect={setCategory}
        getLabel={getCategoryLabel}
        pinnedCollapsedLabel={t("topStoriesShort")}
      />

      {isTopStories ? (
        <StoryList category={undefined} />
      ) : (
        <ArticleList category={category} basePath="/article" />
      )}
    </View>
  );
}
