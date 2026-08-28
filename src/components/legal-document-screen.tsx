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
};

// Shared shell for the About/Privacy Policy/Terms of Service screens (see
// preferences/about.tsx, preferences/privacy.tsx, preferences/terms.tsx) -
// the same back-button pattern already established by
// story-detail-screen.tsx and article-detail-screen.tsx, just without any
// data fetching since this content is static.
export default function LegalDocumentScreen({ title, children }: Props) {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const topPadding = Platform.select({
    default: insets.top + Spacing.two,
    web: Spacing.six,
  });
  // Same tab-bar reservation as article-detail-screen.tsx/search/index.tsx -
  // see NATIVE_TAB_BAR_HEIGHT's own comment for why insets.bottom alone
  // isn't enough. Missing here previously: on Android the native tab bar is
  // opaque (unlike iOS's translucent one, where content scrolling behind it
  // stays legible), so the last bit of unreserved content was fully hidden
  // behind it instead of just dimmed.
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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="subtitle" style={styles.title} accessibilityRole="header">
          {title}
        </ThemedText>
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
