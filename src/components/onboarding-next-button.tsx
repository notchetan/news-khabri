import Ionicons from "@expo/vector-icons/Ionicons";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, type ViewStyle } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";

// A visible forward affordance for the swipe-only onboarding flow - the
// gesture alone isn't discoverable. Screens 1 and 2 render this between
// their content and the dots; screen 3 has its own sign-in / skip
// buttons and doesn't need it.
export function OnboardingNextButton({
  onPress,
  style,
}: {
  onPress: () => void;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Pressable
      testID="onboarding-next"
      onPress={onPress}
      style={[styles.button, { backgroundColor: theme.tint }, style]}
      accessibilityRole="button"
      accessibilityLabel={t("onboardingNext")}
    >
      <ThemedText type="default" style={{ color: theme.tintText }}>
        {t("onboardingNext")}
      </ThemedText>
      <SymbolView
        name="chevron.right"
        size={15}
        weight="semibold"
        tintColor={theme.tintText}
        fallback={<Ionicons name="chevron-forward" size={15} color={theme.tintText} />}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Radius.full,
  },
});
