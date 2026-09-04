import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

// The row shared by the three pushed picker screens under preferences/
// (language, sources, notifications). All three had a byte-identical
// styles.row and near-identical JSX; the only real difference is whether
// selecting closes the screen, which is the caller's business, not this
// component's.
type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
};

export default function CheckmarkRow({ label, selected, onPress, testID }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[styles.row, { borderColor: theme.backgroundSelected }]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <ThemedText type="default" style={[selected && { color: theme.tint }]}>
        {label}
      </ThemedText>
      {selected && (
        <SymbolView
          name="checkmark"
          size={16}
          weight="semibold"
          tintColor={theme.tint}
          fallback={<ThemedText style={{ color: theme.tint }}>✓</ThemedText>}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
