import { ARTICLES_PAGE_SIZE, cursorFor, fetchArticles } from "@/api/articles";
import ErrorState from "@/components/error-state";
import FeedCard from "@/components/feed-card";
import ArticleListSkeleton from "@/components/article-list-skeleton";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text } from "react-native";

import { Spacing } from "@/constants/theme";
import { useBookmarks } from "@/contexts/bookmarks-context";
import { useDebugPreference } from "@/contexts/debug-preference";
import { useLanguagePreference } from "@/contexts/language-preference";
import { useSourcesPreference } from "@/contexts/sources-preference";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";
import { articleHref } from "@/utils/navigation";

type Props = {
  category?: string;
  search?: string;
  basePath: "/article" | "/search/article";
};

export default function ArticleList({ category, search, basePath }: Props) {
  const { language } = useLanguagePreference();
  const { selectedSources } = useSourcesPreference();
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { debugEnabled } = useDebugPreference();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [category, search, selectedSources]);

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
    queryKey: ["articles", language, category, search, selectedSources],
    queryFn: ({ pageParam }) =>
      fetchArticles(language, category, pageParam as string | undefined, search, selectedSources),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.length === ARTICLES_PAGE_SIZE
        ? cursorFor(lastPage[lastPage.length - 1])
        : undefined,
    placeholderData: keepPreviousData,
  });

  // Belt-and-braces: de-dupe by id in case any page still overlaps (e.g. a
  // filter switch racing with an in-flight fetch), since FlatList requires
  // unique keys.
  const seenIds = new Set<number>();
  const articles = (data?.pages.flat() ?? []).filter((article) => {
    if (seenIds.has(article.id)) return false;
    seenIds.add(article.id);
    return true;
  });

  if (isLoading) return <ArticleListSkeleton />;

  if (error) {
    return (
      <ErrorState
        testID="article-list-error"
        message={t("articlesLoadError")}
        onRetry={refetch}
      />
    );
  }

  return (
    <FlatList
      ref={listRef}
      testID="article-list"
      data={articles}
      keyExtractor={(item) => item.id.toString()}
      onRefresh={refetch}
      refreshing={isRefetching}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <Text
          style={[
            styles.message,
            search ? styles.messageCentered : null,
            { color: theme.textSecondary },
          ]}
        >
          {search ? t("noResultsForTemplate", { query: search }) : t("noArticlesFound")}
        </Text>
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator style={styles.footer} accessibilityLabel={t("loadingMore")} />
        ) : null
      }
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => (
        <FeedCard
          title={item.title}
          metaText={item.source}
          imageUrl={item.image_url}
          category={item.category}
          accessibilityLabel={`${item.title}, ${item.source}`}
          debugScore={debugEnabled && item.ranking_score != null ? item.ranking_score : undefined}
          debugTestID="ranking-debug-pill"
          bookmarked={isBookmarked(item.id)}
          bookmarkAccessibilityLabel={isBookmarked(item.id) ? t("removeBookmark") : t("save")}
          onToggleBookmark={() =>
            toggleBookmark({
              id: item.id,
              title: item.title,
              link: item.link,
              source: item.source,
              category: item.category,
              published_at: item.published_at,
              image_url: item.image_url,
              language: item.language,
            })
          }
          onPress={() => router.push(articleHref(item.id, basePath))}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  message: { padding: 16 },
  messageCentered: { textAlign: "center" },
  footer: { paddingVertical: Spacing.four },
  listContent: { padding: Spacing.three, gap: Spacing.three },
});
