import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { MaxContentWidth, NATIVE_TAB_BAR_HEIGHT, Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type ToastConfig = {
  message: string;
  // Optional inline link, e.g. "Check now" -> the Saved screen.
  action?: { label: string; onPress: () => void };
};

// A single bottom-anchored toast, driven by toast-context. `config` goes
// null on dismiss; the last shown config is kept around just long enough
// to animate out before the view actually unmounts.
export default function Toast({
  config,
  onHide,
}: {
  config: ToastConfig | null;
  onHide: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);
  const shownRef = useRef<ToastConfig | null>(null);
  if (config) shownRef.current = config;
  const shown = shownRef.current;

  useEffect(() => {
    if (config) setMounted(true);
    const animation = Animated.timing(anim, {
      toValue: config ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !config) setMounted(false);
    });
    // Stop the animation on unmount so a test that shows a toast and tears
    // down before it settles doesn't leak a timer (see AGENTS.md).
    return () => animation.stop();
  }, [config, anim]);

  if (!mounted || !shown) return null;

  return (
    <Animated.View
      testID="toast"
      pointerEvents={config ? "box-none" : "none"}
      style={[
        styles.wrap,
        // Clear the tab bar where there is one; on the tab-less screens
        // (article/story detail, Saved) it just floats a little higher,
        // which is fine for a transient toast.
        { bottom: insets.bottom + NATIVE_TAB_BAR_HEIGHT + Spacing.two },
        {
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
          ],
        },
      ]}
    >
      <View style={[styles.toast, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText style={styles.message} numberOfLines={2}>
          {shown.message}
        </ThemedText>
        {shown.action && (
          <Pressable
            testID="toast-action"
            onPress={() => {
              shown.action?.onPress();
              onHide();
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={shown.action.label}
          >
            <ThemedText style={[styles.action, { color: theme.tint }]}>
              {shown.action.label}
            </ThemedText>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: Spacing.four,
    zIndex: 1000,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.full,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  message: { fontSize: 14, fontWeight: "500", flexShrink: 1 },
  action: { fontSize: 14, fontWeight: "700" },
});
