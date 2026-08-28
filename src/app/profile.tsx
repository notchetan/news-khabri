import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Platform, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";

// Placeholder for the future sign-in/account screen. No account system
// exists yet, so this is intentionally just a coming-soon placeholder
// rather than a login form that doesn't do anything.
//
// This used to be its own tab (see app-tabs.tsx's own comment on why it no
// longer is) - now a plain pushed screen at the top level, reachable from
// the profile button in AppHeader on every tab that shows one. Its own
// back button below follows the same pattern as legal-document-screen.tsx,
// since it's no longer inside any tab's own Stack that would otherwise
// supply one.
export default function ProfileScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const topPadding = Platform.select({
    default: insets.top,
    web: Spacing.six,
  });

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: topPadding }]}>
      <Pressable
        onPress={goBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t("back")}
        style={styles.backPressable}
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

      <ThemedView style={styles.content}>
        <SymbolView
          name="person.crop.circle"
          size={48}
          weight="regular"
          tintColor={theme.textSecondary}
          fallback={<Ionicons name="person-circle" size={48} color={theme.textSecondary} />}
        />
        <ThemedText type="subtitle" style={styles.title} accessibilityRole="header">
          {t("profileTitle")}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.message}>
          {t("profileComingSoon")}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backPressable: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.one,
  },
  backGlyph: { fontSize: 16, fontWeight: "600" },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.five,
  },
  title: { marginTop: Spacing.three, textAlign: "center" },
  message: { marginTop: Spacing.two, textAlign: "center" },
});
