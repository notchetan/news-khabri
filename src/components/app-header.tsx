import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";

type Props = {
  // Already-translated text for the tab this header is rendered on top of -
  // the app's own name for Home, "Search" for Search, "Preferences" for
  // Preferences (see each screen's own call site). Kept as a plain string
  // rather than a tab-name enum so this component doesn't need to know
  // anything about routing/tab structure itself.
  title: string;
};

// Shared top header for the Home/Search/Preferences tabs: the app's own
// mark plus the current tab's title on the left, and a button to the
// now-tab-less Profile screen (see app-tabs.tsx's own comment on why
// Profile is no longer a tab) on the right, in the same row - replaces the
// per-tab text labels those three tabs used to show in the tab bar itself.
//
// Not rendered on web: the web tab bar (app-tabs.web.tsx) already lives at
// the top of the screen and carries this same information inside its own
// bar instead of stacking a second one underneath it.
export default function AppHeader({ title }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  if (Platform.OS === "web") return null;

  return (
    <View style={styles.row}>
      <View style={styles.titleGroup}>
        <Image
          testID="app-header-logo"
          // The app's own mark, not a generic icon - same density-correct
          // asset already used for anything else needing this app's own
          // logo at a small size (see its own @2x/@3x siblings).
          source={require("@/assets/images/tab-home-icon.png")}
          style={styles.logo}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
        <ThemedText style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </ThemedText>
      </View>

      <Pressable
        testID="app-header-profile-button"
        onPress={() => router.push("/profile")}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t("tabProfile")}
      >
        <SymbolView
          name="person.crop.circle"
          size={28}
          weight="regular"
          tintColor={theme.text}
          fallback={<Text style={[styles.profileFallback, { color: theme.text }]}>◍</Text>}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.three,
    // Matches the app's other major structural gaps (list item spacing,
    // grid spacing, etc.) - this is what every tab's own content sits
    // below this header by, and it needs to be the same everywhere this
    // header appears for that to actually read as consistent.
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    // So a long title still leaves room for the profile button instead of
    // pushing it off the right edge.
    flexShrink: 1,
  },
  logo: { width: 28, height: 28 },
  title: { fontSize: 20, fontWeight: "700" },
  profileFallback: { fontSize: 28, lineHeight: 30 },
});
