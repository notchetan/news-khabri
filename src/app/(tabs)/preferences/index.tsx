import { useRouter } from "expo-router";
import { SFSymbol, SymbolView } from "expo-symbols";
import { Fragment, useState } from "react";
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppHeader from "@/components/app-header";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { LANGUAGE_ENDONYMS } from "@/constants/languages";
import { NATIVE_TAB_BAR_HEIGHT, Radius, Spacing } from "@/constants/theme";
import { useDebugPreference } from "@/contexts/debug-preference";
import {
  FontSizePreference,
  useFontSizePreference,
} from "@/contexts/font-size-preference";
import { useLanguagePreference } from "@/contexts/language-preference";
import {
  ThemePreference,
  useThemePreference,
} from "@/contexts/theme-preference";
import { useTheme } from "@/hooks/use-theme";
import { TranslationKey, useTranslation } from "@/i18n/translations";

const APPEARANCE_OPTIONS: {
  value: ThemePreference;
  glyph: string;
  sf: SFSymbol;
  descriptionKey: TranslationKey;
}[] = [
  // sf renders as a real SF Symbol on iOS; glyph is the Android/web fallback
  // (SymbolView renders nothing there on its own - see the fallback prop
  // below). "circle.lefthalf.filled" is the same glyph macOS System
  // Settings itself uses for "Auto" appearance.
  { value: "automatic", glyph: "⚙️", sf: "circle.lefthalf.filled", descriptionKey: "appearanceAutomaticDesc" },
  { value: "day", glyph: "☀️", sf: "sun.max.fill", descriptionKey: "appearanceDayDesc" },
  { value: "night", glyph: "🌙", sf: "moon.fill", descriptionKey: "appearanceNightDesc" },
];

const FONT_SIZE_OPTIONS: {
  value: FontSizePreference;
  glyphSize: number;
  scale: number;
  labelKey: TranslationKey;
}[] = [
  { value: "small", glyphSize: 13, scale: 0.875, labelKey: "fontSizeSmall" },
  { value: "medium", glyphSize: 17, scale: 1, labelKey: "fontSizeMedium" },
  { value: "large", glyphSize: 21, scale: 1.2, labelKey: "fontSizeLarge" },
];

// The About/Privacy/Terms links at the bottom of this screen - each just a
// static-content route under this same preferences/ stack (see
// legal-document-screen.tsx for their shared shell). Shown as a single
// centered line (see legalLinksRow) rather than three stacked rows, since
// three short reference links don't need a full row each.
const LEGAL_LINKS: { href: "/preferences/about" | "/preferences/privacy" | "/preferences/terms"; labelKey: TranslationKey }[] = [
  { href: "/preferences/about", labelKey: "about" },
  { href: "/preferences/privacy", labelKey: "privacyPolicy" },
  { href: "/preferences/terms", labelKey: "termsOfService" },
];

const FONT_PREVIEW_BASE_SIZE = 15;
const LARGEST_FONT_SCALE = Math.max(...FONT_SIZE_OPTIONS.map((option) => option.scale));

export default function PreferencesScreen() {
  const { preference, setPreference } = useThemePreference();
  const { preference: fontPreference, setPreference: setFontPreference } =
    useFontSizePreference();
  const { language } = useLanguagePreference();
  const { debugEnabled, setDebugEnabled } = useDebugPreference();
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // Measured once from the hidden probe below, at the largest font scale
  // regardless of what's currently selected - reserved as a fixed height
  // for the *visible* preview text so switching between any pair of sizes
  // (small<->medium, medium<->large, small<->large) never changes how much
  // room it takes, instead of guessing a fixed minHeight that happened to
  // fit some sizes but not others (small's own 1-line height was already
  // well under the old guess, but was still recomputed on every switch,
  // which is what actually produced the visible shift - only reserving the
  // true worst case, once, fixes it for every pair, not just the one this
  // was tuned against).
  const [previewHeight, setPreviewHeight] = useState<number | null>(null);
  const handlePreviewProbeLayout = (event: LayoutChangeEvent) => {
    setPreviewHeight(event.nativeEvent.layout.height);
  };

  // No extra top gap beyond the inset itself, matching Home/Search - that
  // gap used to exist here specifically to give the old inline "Preferences"
  // title some breathing room before it; AppHeader (below) now owns that
  // spacing instead, the same way it does on those other two tabs.
  const topPadding = Platform.select({
    default: insets.top,
    web: Spacing.six,
  });

  const selectedAppearance = APPEARANCE_OPTIONS.find(
    (option) => option.value === preference
  );
  const selectedFontSize = FONT_SIZE_OPTIONS.find(
    (option) => option.value === fontPreference
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: topPadding }]}>
      <AppHeader title={t("tabPreferences")} />
      <ScrollView
        testID="preferences-scroll"
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.toggleRow}>
          <ThemedText type="default" accessibilityRole="header">{t("appearance")}</ThemedText>
          <View style={styles.iconRow}>
            {APPEARANCE_OPTIONS.map((option) => {
              const selected = preference === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setPreference(option.value)}
                  style={[
                    styles.iconButton,
                    {
                      backgroundColor: selected
                        ? theme.tint
                        : theme.backgroundElement,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t(option.descriptionKey)}
                >
                  <SymbolView
                    name={option.sf}
                    size={18}
                    tintColor={selected ? theme.tintText : theme.text}
                    fallback={
                      <Text style={styles.iconGlyph}>{option.glyph}</Text>
                    }
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <ThemedText themeColor="textSecondary" style={styles.description}>
          {selectedAppearance && t(selectedAppearance.descriptionKey)}
        </ThemedText>

        <View
          style={[styles.divider, styles.sectionSpacing, { backgroundColor: theme.backgroundSelected }]}
        />

        <View style={styles.toggleRow}>
          <ThemedText type="default" accessibilityRole="header">{t("articleFontSize")}</ThemedText>
          <View style={styles.iconRow}>
            {FONT_SIZE_OPTIONS.map((option) => {
              const selected = fontPreference === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setFontPreference(option.value)}
                  style={[
                    styles.iconButton,
                    {
                      backgroundColor: selected
                        ? theme.tint
                        : theme.backgroundElement,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t(option.labelKey)}
                >
                  <ThemedText
                    style={[
                      styles.iconGlyph,
                      styles.fontSizeSampleGlyph,
                      {
                        fontSize: option.glyphSize,
                        // A generous lineHeight (not equal to fontSize) is
                        // what actually centers this - Devanagari, Tamil,
                        // Telugu, etc. glyphs sit noticeably off-center
                        // otherwise, even though the *button* itself is
                        // centered via flexbox: each script's default line
                        // box has different built-in vertical padding above/
                        // below the glyph, which alignItems/justifyContent
                        // center relative to the box, not the visible glyph.
                        // A first attempt set lineHeight == fontSize exactly,
                        // which was tight enough to clip the top of taller
                        // scripts' ascenders/matras (Hindi especially, at
                        // medium/large) - 1.4x leaves real headroom above and
                        // below the glyph on every script tried, Latin
                        // included, while still comfortably fitting the
                        // 40px circle at every size (13/17/21 -> ~18/24/29).
                        lineHeight: Math.ceil(option.glyphSize * 1.4),
                        color: selected ? theme.tintText : theme.text,
                      },
                    ]}
                  >
                    {t("fontSizeSampleGlyph")}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <View>
          {/* Invisible probe, always rendered at the largest font scale
              regardless of the current selection - laid out normally (so it
              measures the true wrap width) but clipped to zero height by
              its wrapper, so it never affects visible layout itself. See
              previewHeight's own comment above for why this exists. */}
          <View style={styles.previewProbeWrapper} pointerEvents="none">
            <ThemedText
              onLayout={handlePreviewProbeLayout}
              themeColor="textSecondary"
              style={[styles.description, { fontSize: FONT_PREVIEW_BASE_SIZE * LARGEST_FONT_SCALE }]}
            >
              {t("fontPreviewText")}
            </ThemedText>
          </View>
          <ThemedText
            themeColor="textSecondary"
            style={[
              styles.description,
              previewHeight ? { minHeight: previewHeight } : null,
              { fontSize: FONT_PREVIEW_BASE_SIZE * (selectedFontSize?.scale ?? 1) },
            ]}
          >
            {t("fontPreviewText")}
          </ThemedText>
        </View>

        <View
          style={[styles.divider, styles.sectionSpacing, { backgroundColor: theme.backgroundSelected }]}
        />

        <Pressable
          onPress={() => router.push("/preferences/language")}
          style={styles.legalRow}
          accessibilityRole="button"
          accessibilityLabel={t("language")}
        >
          <ThemedText type="default" accessibilityRole="header">{t("language")}</ThemedText>
          <View style={styles.languagePickerValue}>
            <ThemedText themeColor="textSecondary">{LANGUAGE_ENDONYMS[language]}</ThemedText>
            <SymbolView
              name="chevron.right"
              size={14}
              weight="semibold"
              tintColor={theme.textSecondary}
              fallback={
                <ThemedText themeColor="textSecondary" style={styles.legalChevronFallback}>
                  ›
                </ThemedText>
              }
            />
          </View>
        </Pressable>
        <ThemedText themeColor="textSecondary" style={styles.description}>
          {t("languageDescription")}
        </ThemedText>

        <View
          style={[styles.divider, styles.sectionSpacing, { backgroundColor: theme.backgroundSelected }]}
        />

        <View style={styles.toggleRow}>
          <ThemedText type="default" accessibilityRole="header">{t("debugMode")}</ThemedText>
          <Switch
            value={debugEnabled}
            onValueChange={setDebugEnabled}
            // Without this, the "on" track defaults to the OS's stock green -
            // clashing with this app's warm palette. thumbColor is left alone
            // so the platform's own native thumb rendering (white on iOS)
            // stays untouched.
            trackColor={{ false: theme.backgroundSelected, true: theme.tint }}
            accessibilityRole="switch"
            accessibilityLabel={t("debugMode")}
          />
        </View>
        <ThemedText themeColor="textSecondary" style={styles.description}>
          {t("debugModeDescription")}
        </ThemedText>
      </ScrollView>

      {/* Pinned above the tab bar rather than scrolling with everything
          else above - a fixed reference point (like iOS Settings' own app
          version footer) rather than something that scrolls out of view
          along with whichever toggle the user was actually there to
          change. Needs its own NATIVE_TAB_BAR_HEIGHT reservation since it's
          no longer inside the ScrollView, which never needed one itself
          (content simply scrolls past/under the tab bar until this footer
          existed to actually anchor something there). */}
      <View
        testID="preferences-legal-footer"
        style={[
          styles.legalFooter,
          {
            // Spacing.three (the same base gap as everywhere else - divider
            // to scroll content above, and every other major gap in the
            // app) plus the tab-bar reservation, which is a *functional*
            // reservation for the physical bar, not part of the visible
            // gap itself - see NATIVE_TAB_BAR_HEIGHT's own comment.
            paddingBottom:
              Spacing.three +
              Platform.select({
                web: 0,
                default: insets.bottom + NATIVE_TAB_BAR_HEIGHT,
              }),
          },
        ]}
      >
        <View
          testID="preferences-legal-footer-divider"
          // textSecondary here specifically (not backgroundSelected, like
          // the section dividers above) - matches the color already used
          // for the divider/back-arrow on the home page's category strip
          // (see category-pills.tsx), since this divider sits directly
          // above a persistent, always-visible footer rather than marking
          // a boundary between two scrollable sections.
          style={[styles.divider, styles.sectionSpacing, { backgroundColor: theme.textSecondary }]}
        />
        <View style={styles.legalLinksRow}>
          {LEGAL_LINKS.map((link, index) => (
            <Fragment key={link.href}>
              {index > 0 && <ThemedText themeColor="textSecondary">{"·"}</ThemedText>}
              <Pressable
                onPress={() => router.push(link.href)}
                accessibilityRole="button"
                accessibilityLabel={t(link.labelKey)}
              >
                <ThemedText type="small" themeColor="tint">
                  {t(link.labelKey)}
                </ThemedText>
              </Pressable>
            </Fragment>
          ))}
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // flex:1 (not just contentContainerStyle) is what actually bounds the
  // ScrollView to the space remaining after AppHeader and legalFooter below
  // it - without it, the ScrollView sizes to its own content instead of
  // being constrained by its parent, the same lesson learned the hard way
  // in search/index.tsx's own gridScrollView.
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.three },
  sectionSpacing: { marginTop: Spacing.three },
  divider: { height: StyleSheet.hairlineWidth, marginBottom: Spacing.three },
  legalFooter: { paddingHorizontal: Spacing.four },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconRow: { flexDirection: "row", gap: Spacing.two },
  iconButton: {
    width: 40,
    height: 40,
    // Fully round at this size - plain circular, not squircle (see
    // Radius.full's own comment).
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  iconGlyph: { fontSize: 18 },
  fontSizeSampleGlyph: Platform.select({
    // Android's default font metrics reserve extra vertical padding above/
    // below the glyph on top of lineHeight (historically for accent marks)
    // - includeFontPadding strips that, and textAlignVertical:"center"
    // makes the remaining box center on the actual glyph rather than its
    // baseline. iOS has no equivalent quirk once lineHeight is set (above).
    android: { includeFontPadding: false, textAlignVertical: "center" },
    default: {},
  }),
  description: { marginTop: Spacing.one },
  // Zero-height, clipped - lets the probe Text inside it lay out normally
  // (so onLayout measures its real wrapped height at the full content
  // width) without taking up any visible space itself. See previewHeight's
  // own comment above.
  previewProbeWrapper: { height: 0, overflow: "hidden" },
  legalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.two,
  },
  legalChevronFallback: { fontSize: 18, fontWeight: "600" },
  languagePickerValue: { flexDirection: "row", alignItems: "center", gap: Spacing.one },
  // One centered line with a dot between each link - gap on the row applies
  // uniformly between every child (link, dot, link, dot, link), the same
  // "let flexbox gap own the spacing" approach used in category-pills.tsx,
  // rather than mismatched per-element margins. No paddingVertical of its
  // own - that used to stack with the divider's marginBottom above it into
  // a bigger gap there (24) than below it (8, before legalFooter's own
  // paddingBottom took over), so both sides now come from the divider and
  // legalFooter alone instead.
  legalLinksRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.two,
  },
});
