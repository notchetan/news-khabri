import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Appearance, Platform } from "react-native";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: jest.fn(),
}));

import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  ThemePreferenceProvider,
  useThemePreference,
} from "../theme-preference";

const STORAGE_KEY = "themePreference";
const mockUseColorScheme = useColorScheme as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemePreferenceProvider>{children}</ThemePreferenceProvider>;
}

describe("useThemePreference", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockUseColorScheme.mockReturnValue("light");
    jest.spyOn(Appearance, "setColorScheme").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("throws when used outside the provider", async () => {
    const { result } = await renderHook(() => {
      try {
        return useThemePreference();
      } catch (e) {
        return e as Error;
      }
    });
    expect(result.current).toBeInstanceOf(Error);
    expect((result.current as Error).message).toContain(
      "useThemePreference must be used within a ThemePreferenceProvider"
    );
  });

  it("defaults to automatic, resolving to the system scheme", async () => {
    mockUseColorScheme.mockReturnValue("dark");

    const { result } = await renderHook(() => useThemePreference(), {
      wrapper,
    });

    expect(result.current.preference).toBe("automatic");
    expect(result.current.resolvedScheme).toBe("dark");
  });

  it("resolves to light when system scheme is not dark in automatic mode", async () => {
    mockUseColorScheme.mockReturnValue("light");

    const { result } = await renderHook(() => useThemePreference(), {
      wrapper,
    });

    expect(result.current.resolvedScheme).toBe("light");
  });

  it("resolves to light when system scheme is null/undefined in automatic mode", async () => {
    mockUseColorScheme.mockReturnValue(null);

    const { result } = await renderHook(() => useThemePreference(), {
      wrapper,
    });

    expect(result.current.resolvedScheme).toBe("light");
  });

  it("loads a previously persisted preference from storage on mount", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "night");

    const { result } = await renderHook(() => useThemePreference(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.preference).toBe("night");
      expect(result.current.resolvedScheme).toBe("dark");
    });
  });

  it("ignores a corrupt/unrecognized stored value and keeps automatic", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "twilight");

    const { result } = await renderHook(() => useThemePreference(), {
      wrapper,
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.preference).toBe("automatic");
  });

  it("resolves 'day' to light and 'night' to dark regardless of system scheme", async () => {
    mockUseColorScheme.mockReturnValue("dark");
    const { result } = await renderHook(() => useThemePreference(), {
      wrapper,
    });

    await act(async () => {
      result.current.setPreference("day");
    });
    expect(result.current.resolvedScheme).toBe("light");

    await act(async () => {
      result.current.setPreference("night");
    });
    expect(result.current.resolvedScheme).toBe("dark");
  });

  it("persists the preference to storage when changed", async () => {
    const { result } = await renderHook(() => useThemePreference(), {
      wrapper,
    });

    await act(async () => {
      result.current.setPreference("night");
    });

    await waitFor(async () => {
      expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe("night");
    });
  });

  it("does not call Appearance.setColorScheme on web", async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, "OS", { value: "web", configurable: true });

    const { result } = await renderHook(() => useThemePreference(), {
      wrapper,
    });

    await act(async () => {
      result.current.setPreference("night");
    });

    expect(Appearance.setColorScheme).not.toHaveBeenCalled();

    Object.defineProperty(Platform, "OS", { value: originalOS, configurable: true });
  });

  it("calls Appearance.setColorScheme with the resolved native scheme on non-web platforms", async () => {
    const { result } = await renderHook(() => useThemePreference(), {
      wrapper,
    });

    await act(async () => {
      result.current.setPreference("night");
    });
    expect(Appearance.setColorScheme).toHaveBeenLastCalledWith("dark");

    await act(async () => {
      result.current.setPreference("day");
    });
    expect(Appearance.setColorScheme).toHaveBeenLastCalledWith("light");

    await act(async () => {
      result.current.setPreference("automatic");
    });
    expect(Appearance.setColorScheme).toHaveBeenLastCalledWith(null);
  });
});
