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

import { NATIVE_TAB_BAR_HEIGHT, Radius, Spacing } from "@/constants/theme";
import { useLanguagePreference } from "@/contexts/language-preference";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";
import { categoryLabelKey } from "@/utils/category-label";
import { getCategoryIcon } from "@/utils/category-icon";

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MIN_LENGTH = 2;

// English has 10 categories (5 rows of 2) - every language's card grid is
// sized against that, not its own category count, so a language with fewer
// categories (some have as few as 3-4 right now) gets shorter rows worth of
// scroll space rather than the same rows flex-stretching taller to fill the
// leftover room. That stretching was the previous design (flex:1 on every
// row) - it made the grid fill the screen for any category count, but at
// the cost of card size actually depending on how many categories a
// language happens to have, which reads as inconsistent/distorted next to
// every other language's cards.
const REFERENCE_GRID_ROWS = 5;
// The two non-card-height pieces of the grid's total measured height:
// contentContainerStyle's own top+bottom padding, and the gaps between
// REFERENCE_GRID_ROWS rows - kept as named constants (not requiring the
// exact styles.gridContent/gridRow values below) so this math stays
// correct if those spacing tokens ever change.
const GRID_VERTICAL_PADDING = Spacing.three * 2;
// Matches gridContent's own row gap below (Spacing.three) - was
// Spacing.two, a smaller value than the grid's own column gap and every
// other major gap in the app, which read as visibly tighter between rows
// than between columns for no real reason. Keep this in sync with
// styles.gridContent.gap if that ever changes again.
const GRID_ROW_GAPS = Spacing.three * (REFERENCE_GRID_ROWS - 1);

// Groups a flat list into pairs for a 2-column grid - [1,2,3,4,5] ->
// [[1,2],[3,4],[5]]. A plain function rather than FlatList's own
// numColumns/columnWrapperStyle: that combination doesn't actually forward
// flex-grow to the row wrappers it creates (confirmed empirically - every
// row stayed flexGrow:0 despite columnWrapperStyle setting flex:1), which
// is exactly what's needed for the grid to fill whatever vertical space is
// actually available. Rendering the rows directly here means this file
// controls every element's style itself - nothing left to that indirection
// to lose.
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
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const searchInputRef = useRef<TextInput>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  // The grid's own measured height, captured once per keyboard state (not
  // recomputed on every layout pass, which would also fire mid-animation
  // with a transient in-between value) - whichever of the two is relevant
  // right now is what REFERENCE_GRID_ROWS divides into a fixed row height
  // below, and it stays remembered across a keyboard toggle so switching
  // back doesn't need to re-measure.
  const [measuredHeights, setMeasuredHeights] = useState<{
    open: number | null;
    closed: number | null;
  }>({ open: null, closed: null });

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
    const height = event.nativeEvent.layout.height;
    setMeasuredHeights((prev) =>
      keyboardVisible ? { ...prev, open: height } : { ...prev, closed: height }
    );
  };

  // Before the very first layout pass reports a real number, cardRowHeight
  // is undefined and gridRow falls back to flex:1 (see its style below) -
  // a brief, harmless default for the one frame before measurement lands,
  // never a visible jump since it only affects an already-empty grid.
  const referenceHeight = keyboardVisible ? measuredHeights.open : measuredHeights.closed;
  const cardRowHeight = referenceHeight
    ? Math.max(
        (referenceHeight - GRID_VERTICAL_PADDING - GRID_ROW_GAPS) / REFERENCE_GRID_ROWS,
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
    // The tab-bar reservation lives on this outer View, deliberately not on
    // KeyboardAvoidingView's own style below - React Native's "padding"
    // behavior does `StyleSheet.compose(style, {paddingBottom: bottomHeight})`
    // internally (see KeyboardAvoidingView.js), and RN styles resolve
    // last-write-wins on a shared key, so any paddingBottom passed in its
    // own `style` gets silently replaced by the keyboard-driven value - 0
    // whenever the keyboard is closed, which is exactly when the tab-bar
    // reservation matters most. Earlier attempts at this all put the
    // reservation directly on KeyboardAvoidingView's style and were each
    // overwritten the same way; a separate outer element it can't touch is
    // the only way both paddings actually apply at once.
    <View
      style={{
        flex: 1,
        paddingTop: topPadding,
        // See NATIVE_TAB_BAR_HEIGHT's own comment for why this can't come
        // from useSafeAreaInsets() alone.
        paddingBottom: Platform.select({
          web: 0,
          default: insets.bottom + NATIVE_TAB_BAR_HEIGHT,
        }),
        backgroundColor: theme.background,
      }}
    >
      <AppHeader title={t("tabSearch")} />
      {/* KeyboardAvoidingView (not a plain View) specifically so the resize
          when the keyboard shows/hides is animated using the keyboard's own
          reported duration/easing, matching its native motion, rather than
          snapping instantly - "padding" behavior shrinks/grows this view's
          bottom edge as the keyboard rises/falls, which is exactly the
          category grid's available height below the search bar. */}
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
  // A genuine capsule, not Squircle - real iOS search fields (Safari,
  // Messages, Settings) are fully-round pills, not a modest rounded-rect.
  // At this bar's height a squircle radius small enough to read as a
  // rounded-rect corner reads instead as an ambiguous, half-capsule shape;
  // Radius.full sidesteps that entirely and also means this doesn't need
  // Squircle at all (a circle and a squircle are identical once the radius
  // reaches half the box's shortest side - see squircle.tsx's own header
  // comment).
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
  // flex:1 on the ScrollView's own outer style (not just flexGrow on its
  // contentContainerStyle below) is what makes the ScrollView itself
  // actually get constrained to the KeyboardAvoidingView's available
  // height, tab-bar reservation included - without an explicit outer flex,
  // the ScrollView's own frame sizes to its content instead of being
  // bounded by its parent, so onLayout (see handleGridLayout) was measuring
  // a height that didn't reflect that reservation at all, and English's
  // reference 5 rows could still run past the visible area even though the
  // math dividing that measurement by REFERENCE_GRID_ROWS was already
  // correct.
  gridScrollView: { flex: 1 },
  // Row gap matches gridRow's own column gap below (both Spacing.three) -
  // see GRID_ROW_GAPS's own comment above for why this needs to stay in
  // sync with that constant.
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
