import { fetchStoryFeed, STORIES_PAGE_SIZE, STORY_FEED_MAX_LIMIT } from "@/api/stories";
import ArticleListSkeleton from "@/components/article-list-skeleton";
import FeedCard from "@/components/feed-card";
import { useInfiniteQuery, keepPreviousData } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text } from "react-native";

import { Spacing } from "@/constants/theme";
import { useDebugPreference } from "@/contexts/debug-preference";
import { useLanguagePreference } from "@/contexts/language-preference";
import { useSourcesPreference } from "@/contexts/sources-preference";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";
import { formatRelativeTime } from "@/utils/format-date";

type Props = {
  category?: string;
};

// One card per story cluster instead of one per article - a deliberately
// separate component from ArticleList rather than a third mode bolted onto
// it: the data shape (sourceCount/articleCount/representativeArticle), the
// pagination strategy (growing-limit only, no cursor mode), and the tap
// target (a story detail screen, not the article detail screen) all differ
// enough that sharing ArticleList's already-dual-mode logic would only add
// confusion.
export default function StoryList({ category }: Props) {
  const { language } = useLanguagePreference();
  const { selectedSources } = useSourcesPreference();
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { debugEnabled } = useDebugPreference();
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [category, selectedSources]);

  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["storyFeed", language, category, selectedSources],
    queryFn: ({ pageParam }) =>
      fetchStoryFeed(language, category, pageParam as number, selectedSources),
    initialPageParam: STORIES_PAGE_SIZE,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      const requested = typeof lastPageParam === "number" ? lastPageParam : STORIES_PAGE_SIZE;
      if (lastPage.length < requested || requested >= STORY_FEED_MAX_LIMIT) return undefined;
      return requested + STORIES_PAGE_SIZE;
    },
    placeholderData: keepPreviousData,
  });

  const seenIds = new Set<number>();
  const stories = (data?.pages.flat() ?? []).filter((story) => {
    if (seenIds.has(story.id)) return false;
    seenIds.add(story.id);
    return true;
  });

  if (isLoading) return <ArticleListSkeleton />;

  if (error) {
    return (
      <Text style={[styles.message, { color: theme.text }]}>{t("storiesLoadError")}</Text>
    );
  }

  return (
    <FlatList
      ref={listRef}
      testID="story-list"
      data={stories}
      keyExtractor={(item) => item.id.toString()}
      onRefresh={refetch}
      refreshing={isRefetching}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <Text style={[styles.message, { color: theme.textSecondary }]}>
          {t("noStoriesFound")}
        </Text>
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator style={styles.footer} accessibilityLabel={t("loadingMore")} />
        ) : null
      }
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => {
        const updatedLabel = formatRelativeTime(item.latestPublishedAt, t);
        // Renders/navigates like a plain ArticleList card for a singleton
        // story - see docs/story-detail-screen.md.
        const isSingleton = item.articleCount <= 1 && item.sourceCount <= 1;
        const metaText = isSingleton
          ? [item.representativeArticle?.source, updatedLabel].filter(Boolean).join(" · ")
          : [
              t("storySourcesTemplate", { count: String(item.sourceCount) }),
              t("storyArticlesTemplate", { count: String(item.articleCount) }),
              ...(updatedLabel ? [t("storyUpdatedTemplate", { time: updatedLabel })] : []),
            ].join(" · ");

        return (
          <FeedCard
            title={item.title}
            metaText={metaText}
            imageUrl={item.representativeArticle?.image_url ?? null}
            category={item.category}
            accessibilityLabel={`${item.title}, ${metaText}`}
            debugScore={debugEnabled ? item.storyScore : undefined}
            debugTestID="story-debug-pill"
            onPress={() => {
              // Typed routes can't verify a dynamic pathname built from a
              // variable id, same pattern used throughout the app.
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const push = router.push as any;
              if (isSingleton && item.representativeArticle) {
                push({
                  pathname: "/article/[id]",
                  params: { id: String(item.representativeArticle.id) },
                });
              } else {
                push({ pathname: "/story/[id]", params: { id: String(item.id) } });
              }
            }}
          />
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  message: { padding: 16 },
  footer: { paddingVertical: Spacing.four },
  listContent: { padding: Spacing.three, gap: Spacing.three },
});
