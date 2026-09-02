import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { OnboardingProvider, useOnboarding } from "../onboarding-context";

const STORAGE_KEY = "hasCompletedOnboarding";

function wrapper({ children }: { children: React.ReactNode }) {
  return <OnboardingProvider>{children}</OnboardingProvider>;
}

describe("useOnboarding", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("throws when used outside the provider", async () => {
    const { result } = await renderHook(() => {
      try {
        return useOnboarding();
      } catch (e) {
        return e as Error;
      }
    });
    expect(result.current).toBeInstanceOf(Error);
    expect((result.current as Error).message).toContain(
      "useOnboarding must be used within an OnboardingProvider"
    );
  });

  it("resolves to false when nothing is stored yet", async () => {
    const { result } = await renderHook(() => useOnboarding(), { wrapper });

    await waitFor(() => {
      expect(result.current.hasCompletedOnboarding).toBe(false);
    });
  });

  it("resolves to true when a prior completion is already stored", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "true");

    const { result } = await renderHook(() => useOnboarding(), { wrapper });

    await waitFor(() => {
      expect(result.current.hasCompletedOnboarding).toBe(true);
    });
  });

  it("marks onboarding complete and persists it", async () => {
    const { result } = await renderHook(() => useOnboarding(), { wrapper });

    await waitFor(() => {
      expect(result.current.hasCompletedOnboarding).toBe(false);
    });

    await act(async () => {
      await result.current.completeOnboarding();
    });

    expect(result.current.hasCompletedOnboarding).toBe(true);
    await waitFor(async () => {
      expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe("true");
    });
  });
});
