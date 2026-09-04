import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NATIVE_TAB_BAR_HEIGHT } from "@/constants/theme";

// The space a screen must reserve at its bottom edge to clear the native
// tab bar. useSafeAreaInsets().bottom does NOT include the tab bar's own
// height - NativeTabs exposes no JS API to measure itself - so every screen
// that scrolls content behind the bar adds this on top of its own base gap.
// See docs/android-tab-bar.md and NATIVE_TAB_BAR_HEIGHT's own comment.
export function useTabBarInset(): number {
  const insets = useSafeAreaInsets();
  return Platform.select({
    web: 0,
    default: insets.bottom + NATIVE_TAB_BAR_HEIGHT,
  });
}
