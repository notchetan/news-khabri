import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useRef, useState } from "react";
import { Alert, Animated, FlatList, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import FeedCard from "@/components/feed-card";
import FloatingDetailHeader, {
  getContentTopPadding,
  useHeaderScrollY,
} from "@/components/floating-detail-header";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useBookmarks } from "@/contexts/bookmarks-context";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";

// Top-level route (not a tab), reached from the bookmark icon in
// AppHeader and the button on the Profile screen. Wears the same floating
// header as the article/story screens (back pill left, logo pill right)
// plus an inline "Saved" title that fades in as the large one scrolls
// away - see FloatingDetailHeader and docs/article-header-layout.md.
// Renders straight off the on-device bookmark list
// (contexts/bookmarks-context), the source of truth signed in or out.
export default function SavedScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { bookmarks, isBookmarked, toggleBookmark, clearBookmarks } = useBookmarks();

  const scrollY = useHeaderScrollY();
  const [headerHeight, setHeaderHeight] = useState(0);

  const topPadding = Platform.select({
    default: insets.top + Spacing.two,
    web: Spacing.six,
  });
  const contentTopPadding = Platform.select({
    default: getContentTopPadding(headerHeight, topPadding),
    web: Spacing.six,
  });
  // Top-level route, so no native tab bar to reserve for - just the inset.
  const contentBottomPadding =
    Spacing.three + Platform.select({ web: 0, default: insets.bottom });

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    // false: FloatingDetailHeader animates layout props (maxWidth) the
    // native driver can't touch - matches article-detail-screen.tsx.
    { useNativeDriver: false }
  );

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const confirmClearAll = () => {
    Alert.alert(t("clearAllConfirmTitle"), t("clearAllConfirmMessage"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("clearAll"), style: "destructive", onPress: clearBookmarks },
    ]);
  };

  const listHeader = (
    <View style={styles.titleBlock}>
      <ThemedText type="subtitle" accessibilityRole="header">
        {t("savedArticlesTitle")}
      </ThemedText>
      {bookmarks.length > 0 && (
        <View style={styles.subtitleRow}>
          <ThemedText themeColor="textSecondary" type="small">
            {t("savedCountTemplate", { count: String(bookmarks.length) })}
          </ThemedText>
          <Pressable
            testID="saved-clear-all"
            onPress={confirmClearAll}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("clearAll")}
          >
            <ThemedText type="small" style={[styles.clearAll, { color: theme.danger }]}>
              {t("clearAll")}
            </ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FloatingDetailHeader
        scrollY={scrollY}
        topPadding={topPadding}
        onGoBack={goBack}
        onHeaderHeightChange={setHeaderHeight}
        testIDPrefix="saved"
        centerTitle={t("savedArticlesTitle")}
        opaque
      />

      <FlatList
        testID="saved-list"
        style={styles.list}
        data={bookmarks}
        keyExtractor={(item) => item.id.toString()}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: contentTopPadding, paddingBottom: contentBottomPadding },
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <SymbolView
              name="bookmark"
              size={40}
              weight="regular"
              tintColor={theme.textSecondary}
              fallback={
                <Ionicons name="bookmark-outline" size={40} color={theme.textSecondary} />
              }
            />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              {t("noSavedArticles")}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.emptyMessage}>
              {t("noSavedArticlesDescription")}
            </ThemedText>
          </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Explicit flex:1 - see AGENTS.md's ScrollView-needs-explicit-flex lesson.
  list: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.three, gap: Spacing.three, flexGrow: 1 },
  titleBlock: { gap: Spacing.one, marginBottom: Spacing.one },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  clearAll: { fontWeight: "600" },
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
