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
// story-detail-screen.tsx - back button left, app name/logo right, both
// floating over scrolling content. See docs/article-header-layout.md.

// See docs/article-header-layout.md's "GlassView's non-iOS fallback" for
// why this is computed once at module scope rather than per-render.
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
  // The caller's own live scroll position - this component only reads it,
  // never resets or owns it, since reset-on-content-change behavior
  // differs by caller.
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

  // Stands in for GlassView's real (iOS-only) blur where it's unavailable -
  // see docs/article-header-layout.md's "GlassView's non-iOS fallback".
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

// See "Hero image starts below the header, not behind it" in
// docs/article-header-layout.md.
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
