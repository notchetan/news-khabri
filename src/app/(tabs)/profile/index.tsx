import { SymbolView } from "expo-symbols";
import { Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";

// Placeholder for the future sign-in/account tab - the actual "Profile" tab
// (see app-tabs.tsx), now separate from the appearance/language/font-size
// settings that moved to preferences/index.tsx. No account system exists
// yet, so this is intentionally just a coming-soon placeholder rather than
// a login form that doesn't do anything.
export default function ProfileScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const topPadding = Platform.select({
    default: insets.top,
    web: 0,
  });

  return (
    <ThemedView style={[styles.container, { paddingTop: topPadding }]}>
      <SymbolView
        name="person.crop.circle"
        size={48}
        weight="regular"
        tintColor={theme.textSecondary}
        fallback={<ThemedText style={styles.iconFallback}>◍</ThemedText>}
      />
      <ThemedText type="subtitle" style={styles.title} accessibilityRole="header">
        {t("profileTitle")}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.message}>
        {t("profileComingSoon")}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.five,
  },
  iconFallback: { fontSize: 48 },
  title: { marginTop: Spacing.three, textAlign: "center" },
  message: { marginTop: Spacing.two, textAlign: "center" },
});
