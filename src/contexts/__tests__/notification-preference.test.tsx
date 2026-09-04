import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { registerPushSubscription } from "@/api/notifications";
import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import {
  NotificationPreferenceProvider,
  useNotificationPreference,
} from "@/contexts/notification-preference";

const STORAGE_KEY = "notificationPreference";
const PUSH_TOKEN_STORAGE_KEY = "notificationPushToken";

jest.mock("@/api/notifications", () => ({
  registerPushSubscription: jest.fn().mockResolvedValue(undefined),
}));

// getStoredToken reads this - no session here, so the register calls pass
// null as the session token.
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
const mockGetExpoPushTokenAsync = jest.fn();
jest.mock("expo-notifications", () => ({
  getPermissionsAsync: (...args: unknown[]) => mockGetPermissionsAsync(...args),
  requestPermissionsAsync: (...args: unknown[]) => mockRequestPermissionsAsync(...args),
  getExpoPushTokenAsync: (...args: unknown[]) => mockGetExpoPushTokenAsync(...args),
}));

const mockRegisterPushSubscription = registerPushSubscription as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <LanguagePreferenceProvider>
      <NotificationPreferenceProvider>{children}</NotificationPreferenceProvider>
    </LanguagePreferenceProvider>
  );
}

describe("useNotificationPreference", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    mockGetPermissionsAsync.mockResolvedValue({ status: "granted" });
    mockRequestPermissionsAsync.mockResolvedValue({ status: "granted" });
    mockGetExpoPushTokenAsync.mockResolvedValue({ data: "ExponentPushToken[test]" });
  });

  it("throws when used outside the provider", async () => {
    const { result } = await renderHook(() => {
      try {
        return useNotificationPreference();
      } catch (e) {
        return e as Error;
      }
    });
    expect(result.current).toBeInstanceOf(Error);
    expect((result.current as Error).message).toContain(
      "useNotificationPreference must be used within a NotificationPreferenceProvider"
    );
  });

  it("defaults to off (0) before storage resolves and after resolving to nothing stored", async () => {
    const { result } = await renderHook(() => useNotificationPreference(), { wrapper });

    expect(result.current.interval).toBe(0);
    await waitFor(() => {
      expect(result.current.interval).toBe(0);
    });
    // Off by default - no permission/registration work should happen.
    expect(mockGetPermissionsAsync).not.toHaveBeenCalled();
  });

  it("loads a previously persisted interval from storage on mount", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "15");

    const { result } = await renderHook(() => useNotificationPreference(), { wrapper });

    await waitFor(() => {
      expect(result.current.interval).toBe(15);
    });
  });

  it("ignores a corrupt/unrecognized stored value and keeps off", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "7");

    const { result } = await renderHook(() => useNotificationPreference(), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.interval).toBe(0);
  });

  it("requests permission and registers the push token with the backend when a non-zero interval is chosen", async () => {
    const { result } = await renderHook(() => useNotificationPreference(), { wrapper });

    await act(async () => {
      result.current.setInterval(15);
    });

    expect(result.current.interval).toBe(15);
    await waitFor(async () => {
      expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe("15");
    });
    await waitFor(() => {
      expect(mockRegisterPushSubscription).toHaveBeenCalledWith(
        "ExponentPushToken[test]",
        15,
        "en",
        null
      );
    });
    await waitFor(async () => {
      expect(await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY)).toBe(
        "ExponentPushToken[test]"
      );
    });
  });

  it("does not request permission or a push token when the interval is set back to off", async () => {
    const { result } = await renderHook(() => useNotificationPreference(), { wrapper });

    await act(async () => {
      result.current.setInterval(0);
    });

    expect(mockGetPermissionsAsync).not.toHaveBeenCalled();
    expect(mockGetExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it("tells the backend interval 0 when turning off, if a token was already obtained", async () => {
    await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, "ExponentPushToken[existing]");
    const { result } = await renderHook(() => useNotificationPreference(), { wrapper });

    await act(async () => {
      result.current.setInterval(0);
    });

    await waitFor(() => {
      expect(mockRegisterPushSubscription).toHaveBeenCalledWith(
        "ExponentPushToken[existing]",
        0,
        "en",
        null
      );
    });
  });

  it("does not register anything if permission is denied", async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: "denied" });
    mockRequestPermissionsAsync.mockResolvedValue({ status: "denied" });
    const { result } = await renderHook(() => useNotificationPreference(), { wrapper });

    await act(async () => {
      result.current.setInterval(15);
    });

    // The local preference still persists even though the backend never
    // learns about this device - matches this app's graceful-degradation
    // pattern for optional preferences elsewhere.
    await waitFor(async () => {
      expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe("15");
    });
    expect(mockRegisterPushSubscription).not.toHaveBeenCalled();
  });

  it("does not crash when getExpoPushTokenAsync rejects (e.g. no physical device)", async () => {
    mockGetExpoPushTokenAsync.mockRejectedValue(new Error("no physical device"));
    const { result } = await renderHook(() => useNotificationPreference(), { wrapper });

    await act(async () => {
      result.current.setInterval(15);
    });

    await waitFor(async () => {
      expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe("15");
    });
    expect(mockRegisterPushSubscription).not.toHaveBeenCalled();
  });
});
