import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  FontSizePreferenceProvider,
  useFontSizePreference,
} from "../font-size-preference";

const STORAGE_KEY = "fontSizePreference";

function wrapper({ children }: { children: React.ReactNode }) {
  return <FontSizePreferenceProvider>{children}</FontSizePreferenceProvider>;
}

describe("useFontSizePreference", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("throws when used outside the provider", async () => {
    const { result } = await renderHook(() => {
      try {
        return useFontSizePreference();
      } catch (e) {
        return e as Error;
      }
    });
    expect(result.current).toBeInstanceOf(Error);
    expect((result.current as Error).message).toContain(
      "useFontSizePreference must be used within a FontSizePreferenceProvider"
    );
  });

  it("defaults to medium with a scale of 1", async () => {
    const { result } = await renderHook(() => useFontSizePreference(), {
      wrapper,
    });

    expect(result.current.preference).toBe("medium");
    expect(result.current.scale).toBe(1);
  });

  it("loads a previously persisted preference from storage on mount", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "large");

    const { result } = await renderHook(() => useFontSizePreference(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.preference).toBe("large");
      expect(result.current.scale).toBe(1.2);
    });
  });

  it("ignores a corrupt/unrecognized stored value and keeps the default", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "huge");

    const { result } = await renderHook(() => useFontSizePreference(), {
      wrapper,
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.preference).toBe("medium");
  });

  it.each([
    ["small", 0.875],
    ["medium", 1],
    ["large", 1.2],
  ] as const)(
    "updates state, scale, and persists to storage for %s",
    async (value, scale) => {
      const { result } = await renderHook(() => useFontSizePreference(), {
        wrapper,
      });

      await act(async () => {
        result.current.setPreference(value);
      });

      expect(result.current.preference).toBe(value);
      expect(result.current.scale).toBe(scale);
      await waitFor(async () => {
        expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe(value);
      });
    }
  );
});
