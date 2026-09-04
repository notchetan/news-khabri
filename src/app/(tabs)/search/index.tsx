import { fetchCategories } from "@/api/articles";
import AppHeader from "@/components/app-header";
import ArticleList from "@/components/article-list";
import Squircle from "@/components/squircle";
import { useQuery } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Radius, Spacing } from "@/constants/theme";
import { useLanguagePreference } from "@/contexts/language-preference";
import { useTabBarInset } from "@/hooks/use-tab-bar-inset";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";
import { categoryLabelKey } from "@/utils/category-label";
import { getCategoryIcon } from "@/utils/category-icon";

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MIN_LENGTH = 2;

// See docs/search-category-grid.md for the grid-sizing rationale below.
const REFERENCE_GRID_ROWS = 5;
const GRID_VERTICAL_PADDING = Spacing.three * 2;
const GRID_ROW_GAPS = Spacing.three * (REFERENCE_GRID_ROWS - 1);

// Groups a flat list into pairs for a 2-column grid - [1,2,3,4,5] ->
// [[1,2],[3,4],[5]]. See docs/search-category-grid.md for why not
// FlatList's own numColumns/columnWrapperStyle.
function chunkIntoPairs<T>(items: T[]): T[][] {
  const pairs: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    pairs.push(items.slice(i, i + 2));
  }
  return pairs;
}

export default function SearchScreen() {
  const { language } = useLanguagePreference();
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const searchInputRef = useRef<TextInput>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  // Frozen to the keyboard-closed measurement only - see
  // docs/search-category-grid.md.
  const [closedHeight, setClosedHeight] = useState<number | null>(null);

  // Focus the search box (and raise the keyboard) every time this tab gains
  // focus - matches how Apple's own App Store/Podcasts/Music Search tabs
  // behave on a normal tap, rather than requiring a second tap into the
  // field once it's already visible.
  useFocusEffect(
    useCallback(() => {
      searchInputRef.current?.focus();
    }, [])
  );

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleGridLayout = (event: LayoutChangeEvent) => {
    if (keyboardVisible) return;
    setClosedHeight(event.nativeEvent.layout.height);
  };

  // Before the first closed-keyboard layout pass reports a real number,
  // cardRowHeight is undefined and gridRow falls back to flex:1 (see its
  // style below) - a brief, harmless default, never a visible jump since
  // it only affects an already-empty grid.
  const cardRowHeight = closedHeight
    ? Math.max(
        (closedHeight - GRID_VERTICAL_PADDING - GRID_ROW_GAPS) / REFERENCE_GRID_ROWS,
        0
      )
    : undefined;

  useEffect(() => {
    const timeout = setTimeout(() => {
      const trimmed = query.trim();
      // Below the minimum, fall back to the category grid instead of firing
      // a search for a 1-character prefix that would mostly return noise.
      setDebouncedQuery(trimmed.length >= SEARCH_MIN_LENGTH ? trimmed : "");
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [query]);

  const { data: categories } = useQuery({
    queryKey: ["categories", language],
    queryFn: () => fetchCategories(language),
  });

  const topPadding = Platform.select({
    default: insets.top,
    web: Spacing.six,
  });

  return (
    // Tab-bar reservation lives on this outer View, not on
    // KeyboardAvoidingView's own style - see AGENTS.md's
    // KeyboardAvoidingView paddingBottom lesson.
    <View
      style={{
        flex: 1,
        paddingTop: topPadding,
        paddingBottom: tabBarInset,
        backgroundColor: theme.background,
      }}
    >
      <AppHeader title={t("tabSearch")} />
      {/* KeyboardAvoidingView, not a plain View, so the resize animates
          using the keyboard's own reported duration/easing. */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.searchBarRow}>
          <TextInput
            ref={searchInputRef}
            value={query}
            onChangeText={setQuery}
            placeholder={t("searchPlaceholder")}
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.searchInput,
              { backgroundColor: theme.backgroundElement, color: theme.text },
            ]}
            accessibilityLabel={t("searchPlaceholder")}
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>

        {debouncedQuery ? (
          <ArticleList search={debouncedQuery} basePath="/search/article" />
        ) : (
          <ScrollView
            testID="category-grid"
            onLayout={handleGridLayout}
            style={styles.gridScrollView}
            contentContainerStyle={styles.gridContent}
          >
            {chunkIntoPairs(categories ?? []).map((pair, rowIndex) => (
              <View
                key={rowIndex}
                testID={`grid-row-${rowIndex}`}
                style={[
                  styles.gridRow,
                  cardRowHeight ? { height: cardRowHeight } : styles.gridRowFallback,
                ]}
              >
                {pair.map((cat) => {
                  const labelKey = categoryLabelKey(cat);
                  const label = labelKey ? t(labelKey) : cat.charAt(0).toUpperCase() + cat.slice(1);
                  return (
                    <Squircle
                      key={cat}
                      radius={Radius.large}
                      backgroundColor={theme.backgroundElement}
                      onPress={() =>
                        router.push({
                          pathname: "/search/category/[category]",
                          params: { category: cat },
                        })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={label}
                      style={styles.card}
                    >
                      <Text style={styles.cardIcon}>{getCategoryIcon(cat)}</Text>
                      <Text style={[styles.cardLabel, { color: theme.text }]}>
                        {label}
                      </Text>
                    </Squircle>
                  );
                })}
                {/* An odd final category needs a same-size invisible spacer,
                    or its lone card would stretch to fill the whole row's
                    width instead of staying a normal-width tile. */}
                {pair.length === 1 && <View style={styles.cardSpacer} />}
              </View>
            ))}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: { flex: 1 },
  // No paddingBottom here - whatever renders below (the category grid or
  // ArticleList's search results) already supplies its own top padding
  // (Spacing.three), and the two were stacking into a visibly bigger gap
  // here than anywhere else in the app.
  searchBarRow: { paddingHorizontal: Spacing.three },
  // A genuine capsule (Radius.full), not Squircle - real iOS search fields
  // are fully-round pills, not a modest rounded-rect.
  searchInput: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    fontSize: 16,
    borderRadius: Radius.full,
    // Web-only: without this, the browser's own default focus ring (a
    // square-cornered black outline) draws over the capsule shape above -
    // a no-op on native, which has no such default to suppress.
    outlineWidth: 0,
  },
  // Explicit outer flex:1, not just flexGrow on contentContainerStyle - see
  // AGENTS.md's ScrollView-needs-explicit-flex lesson; without it,
  // handleGridLayout measured a height that didn't reflect the tab-bar
  // reservation at all.
  gridScrollView: { flex: 1 },
  // gap must stay in sync with GRID_ROW_GAPS above.
  gridContent: { flexGrow: 1, padding: Spacing.three, gap: Spacing.three },
  gridRow: { flexDirection: "row", gap: Spacing.three },
  // Only used for the one frame before the first onLayout measurement
  // lands (cardRowHeight is still undefined then) - stretches like the old
  // design did, briefly, rather than collapsing to zero height.
  gridRowFallback: { flex: 1 },
  cardSpacer: { flex: 1 },
  card: {
    flex: 1,
    paddingVertical: Spacing.three,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.one,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardIcon: { fontSize: 26 },
  cardLabel: { fontSize: 14, fontWeight: "600" },
});
