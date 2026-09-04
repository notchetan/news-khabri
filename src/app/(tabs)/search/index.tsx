import { fetchCategories } from "@/api/articles";
import AppHeader from "@/components/app-header";
import ArticleList from "@/components/article-list";
import Squircle from "@/components/squircle";
import { useQuery } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
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

// The category grid is a plain 2-up flex-wrap. Card width is half the
// screen (minus the container padding and the one inter-column gap), and
// height is that width over a fixed ratio - so every card is identical
// regardless of how many categories a language has, and there's no layout
// measurement involved. See git history for the onLayout-probe version
// this replaced.
const GRID_PADDING = Spacing.three;
const GRID_GAP = Spacing.three;
const CARD_ASPECT_RATIO = 1.4;

export default function SearchScreen() {
  const { language } = useLanguagePreference();
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  const { width: screenWidth } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const searchInputRef = useRef<TextInput>(null);

  const cardWidth = (screenWidth - GRID_PADDING * 2 - GRID_GAP) / 2;
  const cardHeight = cardWidth / CARD_ASPECT_RATIO;

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
            style={styles.gridScrollView}
            contentContainerStyle={styles.gridContent}
          >
            {(categories ?? []).map((cat) => {
              const labelKey = categoryLabelKey(cat);
              const label = labelKey
                ? t(labelKey)
                : cat.charAt(0).toUpperCase() + cat.slice(1);
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
                  style={[styles.card, { width: cardWidth, height: cardHeight }]}
                >
                  <Text style={styles.cardIcon}>{getCategoryIcon(cat)}</Text>
                  <Text style={[styles.cardLabel, { color: theme.text }]}>
                    {label}
                  </Text>
                </Squircle>
              );
            })}
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
  gridScrollView: { flex: 1 },
  gridContent: {
    padding: GRID_PADDING,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
    alignContent: "flex-start",
  },
  card: {
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
