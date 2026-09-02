import { StyleSheet, View, type ViewStyle } from "react-native";

import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const DOT_SIZE = 8;
// The active step reads as an elongated pill rather than just a color swap -
// "bolden the dot" per the design ask, the same page-indicator convention
// iOS's own onboarding/App Store carousels use.
const ACTIVE_DOT_WIDTH = 20;

type Props = { total: number; current: number; style?: ViewStyle };

// Sits below each onboarding screen's own text content (title/description/
// feature list), not pinned to the screen's bottom edge - see
// OnboardingSideNav for the actual forward/back controls, which live
// independently at the screen's vertical center instead.
export function OnboardingDots({ total, current, style }: Props) {
  const theme = useTheme();

  return (
    <View
      style={[styles.row, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              width: index === current ? ACTIVE_DOT_WIDTH : DOT_SIZE,
              backgroundColor: index === current ? theme.tint : theme.backgroundSelected,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.one },
  dot: { height: DOT_SIZE, borderRadius: Radius.full },
});
