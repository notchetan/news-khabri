import { act, renderHook } from "@testing-library/react-native";
import { useColorScheme as useRNColorScheme } from "react-native";

import { useColorScheme } from "../use-color-scheme.web";

describe("useColorScheme (web)", () => {
  it("returns the underlying system color scheme once hydrated", async () => {
    const { result } = await renderHook(() => useColorScheme());
    await act(async () => {});

    // Once the post-mount hydration effect has run, this should track
    // whatever react-native's own useColorScheme reports - not the
    // hardcoded 'light' fallback used before hydration.
    const { result: rnResult } = await renderHook(() => useRNColorScheme());
    expect(result.current).toBe(rnResult.current);
  });
});
