import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { NATIVE_TAB_BAR_HEIGHT, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";

type Props = {
  title: string;
  children: ReactNode;
  // Overrides the default "‹ Back" row with a custom header (e.g.
  // page-header.tsx, used by language.tsx/sources.tsx to match
  // article-detail-screen.tsx's own header look) - also suppresses the
  // in-content title below, since the custom header already shows it.
  // About/Privacy/Terms don't pass this and keep the plain default.
  renderHeader?: (goBack: () => void) => ReactNode;
};

// Shared shell for the About/Privacy Policy/Terms of Service screens (see
// preferences/about.tsx, preferences/privacy.tsx, preferences/terms.tsx) -
// the same back-button pattern already established by
// story-detail-screen.tsx and article-detail-screen.tsx, just without any
// data fetching since this content is static.
export default function LegalDocumentScreen({ title, children, renderHeader }: Props) {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const topPadding = Platform.select({
    default: insets.top + Spacing.two,
    web: Spacing.six,
  });
  // Same tab-bar reservation as article-detail-screen.tsx/search/index.tsx -
  // see docs/android-tab-bar.md.
  const bottomPadding = Platform.select({
    web: 0,
    default: insets.bottom + NATIVE_TAB_BAR_HEIGHT,
  });

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/preferences");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: topPadding, paddingBottom: bottomPadding }}>
      {renderHeader ? (
        renderHeader(goBack)
      ) : (
        <View style={styles.headerRow}>
          <Pressable
            onPress={goBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t("back")}
            style={[styles.backPressable, styles.backPressableRow]}
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
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!renderHeader && (
          <ThemedText type="subtitle" style={styles.title} accessibilityRole="header">
            {title}
          </ThemedText>
        )}
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.two },
  backPressable: { alignSelf: "flex-start", paddingVertical: Spacing.one },
  backPressableRow: { flexDirection: "row", alignItems: "center" },
  backGlyph: { fontSize: 16, fontWeight: "600" },
  scrollContent: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six },
  title: { marginBottom: Spacing.three },
});
