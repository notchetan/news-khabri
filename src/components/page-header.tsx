import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { SymbolView } from "expo-symbols";
import { Image, Platform, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";

// Same visual language as floating-detail-header.tsx (chevron pill on the
// left, brand logo pill on the right) but static rather than floating/
// scroll-collapsing, and with the page's own title next to the chevron
// instead of a "Back" label - for simple pushed settings screens
// (language.tsx, sources.tsx, notifications.tsx) with no scrolling hero for a
// floating header to sit over. See docs/article-header-layout.md's
// "GlassView's non-iOS fallback" for why liquidGlassAvailable is computed
// once at module scope.
let liquidGlassAvailable = false;
try {
  liquidGlassAvailable = isLiquidGlassAvailable();
} catch {
  liquidGlassAvailable = false;
}

// Both of floating-detail-header.tsx's own pills always contain a label
// Text alongside the icon/logo - the label's *width* animates to 0 on
// scroll, but never its height, and flexbox sizes a row by its tallest
// child regardless of width - so that pill is always this tall (padding +
// this line height), even fully scrolled/"collapsed". This component has
// no label at all, so without forcing the same minHeight here its pills
// come out shorter than the reference in every state, not just some.
const PILL_CONTENT_HEIGHT = Math.ceil(16 * 1.4);

type Props = {
  title: string;
  onGoBack: () => void;
  // Distinguishes testIDs per caller, same rationale as
  // floating-detail-header.tsx's own testIDPrefix.
  testIDPrefix: string;
};

export default function PageHeader({ title, onGoBack, testIDPrefix }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();

  const glassFallbackStyle = liquidGlassAvailable
    ? null
    : { backgroundColor: theme.backgroundElement };

  return (
    <View testID={`${testIDPrefix}-header-row`} style={styles.row}>
      <View style={styles.leftGroup}>
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
              fallback={<ThemedText unscaled style={styles.backGlyph}>‹</ThemedText>}
            />
          </Pressable>
        </GlassView>
        <ThemedText unscaled style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </ThemedText>
      </View>

      <GlassView style={[styles.brandGlass, glassFallbackStyle]} glassEffectStyle="regular">
        <View style={styles.brandRow}>
          <Image
            testID={`${testIDPrefix}-brand-logo`}
            source={require("@/assets/images/tab-home-icon.png")}
            style={styles.brandLogo}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>
      </GlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Same row padding/alignment as floating-detail-header.tsx's own backRow
  // (Spacing.four horizontal, Spacing.two bottom, flex-start) - not
  // position:absolute/zIndex/the statusBarScrim, since those exist there
  // only because content scrolls behind that floating header; this one is
  // a plain static row above an ordinary list, nothing flows behind it.
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  leftGroup: { flexDirection: "row", alignItems: "center", gap: Spacing.two, flexShrink: 1 },
  backGlass: { alignSelf: "flex-start", borderRadius: Radius.full, overflow: "hidden" },
  // Same pill padding as floating-detail-header.tsx's own backPressable.
  backPressable: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  backPressableRow: { flexDirection: "row", alignItems: "center", minHeight: PILL_CONTENT_HEIGHT },
  // Exact same glyph style as floating-detail-header.tsx's own backGlyph
  // (lineHeight + Android centering fix included) - without these, the
  // fallback "‹" (used wherever SymbolView has no real SF Symbol to render,
  // e.g. Android) renders visibly differently sized/aligned than the
  // article page's own back button, even though the surrounding pill
  // padding already matches.
  backGlyph: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: Math.ceil(16 * 1.4),
    ...Platform.select({
      android: { includeFontPadding: false, textAlignVertical: "center" },
      default: {},
    }),
  },
  // Same title style as app-header.tsx's own (fontSize 20/weight 700), not
  // ThemedText's much larger "subtitle" scale meant for a standalone
  // content heading - this is a compact header row, not a page heading.
  title: {
    flexShrink: 1,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: Math.ceil(20 * 1.4),
    ...Platform.select({
      android: { includeFontPadding: false, textAlignVertical: "center" },
      default: {},
    }),
  },
  brandGlass: { alignSelf: "flex-start", borderRadius: Radius.full, overflow: "hidden" },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: PILL_CONTENT_HEIGHT,
  },
  // Same logo size as floating-detail-header.tsx's own brandLogo (20x20) -
  // this logo sits inside a snug glass pill, the same context that size was
  // tuned for; app-header.tsx's bare (unwrapped) 28x28 logo is sized for a
  // different context and looks oversized once put in a pill this size.
  brandLogo: { width: 20, height: 20 },
});
