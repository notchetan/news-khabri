import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { FlatList, Platform, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import FeedCard from "@/components/feed-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useBookmarks } from "@/contexts/bookmarks-context";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";

// Top-level route (not a tab), reached from the bookmark icon in
// AppHeader and the button on the Profile screen - same back-button
// pattern as profile.tsx since it's outside any tab's own Stack. Renders
// straight off the on-device bookmark list (contexts/bookmarks-context),
// which is the source of truth signed in or out.
export default function SavedScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { bookmarks, isBookmarked, toggleBookmark } = useBookmarks();

  const topPadding = Platform.select({
    default: insets.top,
    web: Spacing.six,
  });

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: topPadding }]}>
      <Pressable
        onPress={goBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t("back")}
        style={styles.backPressable}
      >
        <SymbolView
          name="chevron.left"
          size={16}
          weight="semibold"
          tintColor={theme.text}
          fallback={<ThemedText style={styles.backGlyph}>‹</ThemedText>}
        />
        <ThemedText style={styles.backGlyph}>{" " + t("back")}</ThemedText>
      </Pressable>

      <ThemedText type="subtitle" style={styles.title} accessibilityRole="header">
        {t("savedArticlesTitle")}
      </ThemedText>

      <FlatList
        testID="saved-list"
        data={bookmarks}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <ThemedView style={styles.empty}>
            <SymbolView
              name="bookmark"
              size={40}
              weight="regular"
              tintColor={theme.textSecondary}
              fallback={null}
            />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              {t("noSavedArticles")}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.emptyMessage}>
              {t("noSavedArticlesDescription")}
            </ThemedText>
          </ThemedView>
        }
        renderItem={({ item }) => (
          <FeedCard
            title={item.title}
            metaText={item.source}
            imageUrl={item.image_url}
            category={item.category}
            accessibilityLabel={`${item.title}, ${item.source}`}
            bookmarked={isBookmarked(item.id)}
            bookmarkAccessibilityLabel={t("removeBookmark")}
            onToggleBookmark={() => toggleBookmark(item)}
            onPress={() =>
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (router.push as any)({
                pathname: "/article/[id]",
                params: { id: String(item.id) },
              })
            }
          />
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backPressable: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.one,
  },
  backGlyph: { fontSize: 16, fontWeight: "600" },
  title: { paddingHorizontal: Spacing.four, marginTop: Spacing.two, marginBottom: Spacing.two },
  listContent: { padding: Spacing.three, gap: Spacing.three, flexGrow: 1 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.five,
    gap: Spacing.two,
  },
  emptyTitle: { textAlign: "center" },
  emptyMessage: { textAlign: "center" },
});
