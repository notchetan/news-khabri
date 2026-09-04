import { renderHook } from "@testing-library/react-native";

import { NATIVE_TAB_BAR_HEIGHT } from "@/constants/theme";

import { useTabBarInset } from "../use-tab-bar-inset";

// The safe-area-context jest mock reports zero insets, so the hook's result
// is purely the tab-bar content height for the test platform (iOS).
test("returns the safe-area bottom inset plus the native tab-bar height", async () => {
  const { result } = await renderHook(() => useTabBarInset());
  expect(result.current).toBe(NATIVE_TAB_BAR_HEIGHT);
});
