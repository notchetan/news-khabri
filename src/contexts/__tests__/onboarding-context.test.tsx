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

  // app/_layout.tsx renders null (holding the native splash up) while this
  // is null, so a rejected read used to strand the app on the splash screen.
  // AsyncStorage's own jest mock exposes real jest.fn()s backed by an
  // in-memory store, so a *Once override queues one failure and then falls
  // straight back to normal behaviour - no spyOn/mockRestore, which replaces
  // that backing implementation and leaks into the next test.
  it("resolves to false rather than hanging when the stored read fails", async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(
      new Error("storage unavailable")
    );

    const { result } = await renderHook(() => useOnboarding(), { wrapper });

    await waitFor(() => {
      expect(result.current.hasCompletedOnboarding).toBe(false);
    });
  });

  it("still marks onboarding complete in-session when the write fails", async () => {
    const { result } = await renderHook(() => useOnboarding(), { wrapper });
    await waitFor(() => {
      expect(result.current.hasCompletedOnboarding).toBe(false);
    });

    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("disk full"));

    await act(async () => {
      await result.current.completeOnboarding();
    });

    expect(result.current.hasCompletedOnboarding).toBe(true);
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
