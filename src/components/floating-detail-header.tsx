import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { SymbolView } from "expo-symbols";
import { useRef } from "react";
import { Animated, Image, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";

// Shared floating header for article-detail-screen.tsx and
// story-detail-screen.tsx - back button on the left, the app's own
// name/logo on the right, both floating over scrolling content via
// GlassView, collapsing together as the caller's own scroll position
// moves. See docs/animated-scroll-collapse.md and
// docs/article-header-layout.md for the collapse/layout rationale - this
// was originally article-detail-screen.tsx's own JSX, extracted here after
// story-detail-screen.tsx was found still using the older plain-back-
// button header, having drifted apart from a pattern that was never
// actually shared in code.

// isLiquidGlassAvailable() calls into the real native module on iOS and
// *throws* (not just warns, unlike GlassView itself) when that module isn't
// present - true in the Jest test environment, where jest-expo's own
// NativeViewManagerAdapter mocking covers GlassView's rendering but not
// this direct native call. Computed once at module scope, defaulting to
// "no glass" on any failure, rather than re-attempting (and re-throwing)
// on every render.
let liquidGlassAvailable = false;
try {
  liquidGlassAvailable = isLiquidGlassAvailable();
} catch {
  liquidGlassAvailable = false;
}

// Distance (not a duration) the header labels' collapse is spread across -
// see docs/animated-scroll-collapse.md.
const HEADER_COLLAPSE_DISTANCE = 60;
// Natural width of each label, eyeballed against the real strings rather
// than measured via an onLayout probe.
const BACK_LABEL_WIDTH = 80;
const BRAND_LABEL_WIDTH = 100;

type Props = {
  // The caller's own live scroll position (its ScrollView's onScroll feeds
  // the same Animated.Value) - this component only reads it, never resets
  // or owns it, since scroll-reset-on-content-change behavior differs by
  // caller (e.g. article-detail-screen.tsx resets on swiping to a related
  // article; story-detail-screen.tsx has no equivalent).
  scrollY: Animated.Value;
  topPadding: number;
  onGoBack: () => void;
  onHeaderHeightChange: (height: number) => void;
  // Distinguishes testIDs per caller (default "article", matching this
  // component's original home in article-detail-screen.tsx) so both
  // screens' own tests can target their own instance unambiguously.
  testIDPrefix?: string;
};

export default function FloatingDetailHeader({
  scrollY,
  topPadding,
  onGoBack,
  onHeaderHeightChange,
  testIDPrefix = "article",
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Near-instant opacity swap, deliberately not spread across the same
  // distance as the width shrink below - see docs/animated-scroll-collapse.md.
  const headerLabelOpacity = scrollY.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const backLabelWidth = scrollY.interpolate({
    inputRange: [0, HEADER_COLLAPSE_DISTANCE],
    outputRange: [BACK_LABEL_WIDTH, 0],
    extrapolate: "clamp",
  });
  const brandLabelWidth = scrollY.interpolate({
    inputRange: [0, HEADER_COLLAPSE_DISTANCE],
    outputRange: [BRAND_LABEL_WIDTH, 0],
    extrapolate: "clamp",
  });

  // GlassView's real frosted-glass rendering (the pill's only visual
  // background - neither backGlass/brandGlass sets one of its own) is
  // iOS-only; everywhere else it silently falls back to a plain, fully
  // transparent View (see expo-glass-effect's own GlassView.tsx), leaving
  // the chevron/logo floating with no pill backdrop at all - especially
  // illegible over a busy hero image. A solid theme.backgroundElement
  // fill (the same "raised surface" token used elsewhere in the app, e.g.
  // the share button) stands in for the missing glass wherever it's
  // actually unavailable, without double-drawing on top of the real thing.
  const glassFallbackStyle = liquidGlassAvailable
    ? null
    : { backgroundColor: theme.backgroundElement };

  return (
    <>
      {/* Scrolling content is deliberately allowed to flow behind the
          floating pills below, but never behind the status bar itself -
          this opaque strip pins to exactly the status bar's height so the
          clock/battery/carrier text always has a solid backdrop. */}
      {Platform.OS !== "web" && (
        <View
          pointerEvents="none"
          style={[styles.statusBarScrim, { height: insets.top, backgroundColor: theme.background }]}
        />
      )}
      <View
        testID={`${testIDPrefix}-header-row`}
        style={[styles.backRow, { paddingTop: topPadding }]}
        onLayout={(event) => onHeaderHeightChange(event.nativeEvent.layout.height)}
        pointerEvents="box-none"
      >
        <GlassView style={[styles.backGlass, glassFallbackStyle]} glassEffectStyle="regular">
          <Pressable
            onPress={onGoBack}
            hitSlop={12}
            style={[styles.backPressable, styles.backPressableRow]}
            accessibilityRole="button"
            accessibilityLabel={t("back")}
          >
            <SymbolView
              testID={`${testIDPrefix}-back-chevron`}
              name="chevron.left"
              size={16}
              weight="semibold"
              tintColor={theme.text}
              fallback={<ThemedText style={styles.backGlyph}>‹</ThemedText>}
            />
            <Animated.View
              style={{
                opacity: headerLabelOpacity,
                maxWidth: backLabelWidth,
                overflow: "hidden",
              }}
            >
              <ThemedText numberOfLines={1} style={[styles.backGlyph, styles.backLabel]}>
                {` ${t("back")}`}
              </ThemedText>
            </Animated.View>
          </Pressable>
        </GlassView>

        <GlassView style={[styles.brandGlass, glassFallbackStyle]} glassEffectStyle="regular">
          <View testID={`${testIDPrefix}-brand-row`} style={styles.brandRow}>
            <Image
              testID={`${testIDPrefix}-brand-logo`}
              source={require("@/assets/images/tab-home-icon.png")}
              style={styles.brandLogo}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
            <Animated.View
              style={{
                opacity: headerLabelOpacity,
                maxWidth: brandLabelWidth,
                overflow: "hidden",
              }}
            >
              <ThemedText numberOfLines={1} style={[styles.backGlyph, styles.brandLabel]}>
                {` ${t("appName")}`}
              </ThemedText>
            </Animated.View>
          </View>
        </GlassView>
      </View>
    </>
  );
}

// A single Animated.Value, module-free of any particular screen - callers
// that don't need swipe-loop/activeId-driven resets (story-detail-screen.tsx)
// can still use this the same way article-detail-screen.tsx does.
export function useHeaderScrollY() {
  return useRef(new Animated.Value(0)).current;
}

// The hero image should sit fully below the floating header on initial
// load, not behind it - see "Hero image starts below the header, not
// behind it" in docs/article-header-layout.md. Before headerHeight's first
// onLayout measurement lands (still 0), falls back to a generous estimate
// (topPadding plus a typical pill height) so the image never briefly pokes
// out above the header for that one frame either.
export function getContentTopPadding(headerHeight: number, topPadding: number): number {
  return (headerHeight || topPadding + 44) + Spacing.two;
}

const styles = StyleSheet.create({
  statusBarScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  backRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  // See "Pill shape" in docs/article-header-layout.md.
  backGlass: { alignSelf: "flex-start", borderRadius: Radius.full, overflow: "hidden" },
  backPressable: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  // See docs/cross-script-text-rendering.md.
  backPressableRow: { flexDirection: "row", alignItems: "center" },
  backGlyph: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: Math.ceil(16 * 1.4),
    ...Platform.select({
      android: { includeFontPadding: false, textAlignVertical: "center" },
      default: {},
    }),
  },
  backLabel: { flexShrink: 0 },
  brandGlass: { alignSelf: "flex-start", borderRadius: Radius.full, overflow: "hidden" },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  brandLogo: { width: 20, height: 20 },
  brandLabel: { flexShrink: 0 },
});
