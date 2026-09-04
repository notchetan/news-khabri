import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useContext, useEffect, type ReactNode } from "react";

import { registerPushSubscription } from "@/api/notifications";
import { createPersistedPreference } from "@/contexts/create-persisted-preference";
import { useLanguagePreference } from "@/contexts/language-preference";

// 0 = off. Matches the backend's own VALID_INTERVALS (routes/push.js) -
// keep the two in sync if this ever changes.
export type NotificationInterval = 0 | 5 | 15 | 30 | 60 | 120;

const VALID_INTERVALS: NotificationInterval[] = [0, 5, 15, 30, 60, 120];
export const NOTIFICATION_STORAGE_KEY = "notificationPreference";
export const DEFAULT_NOTIFICATION_INTERVAL: NotificationInterval = 0;
// See "Why the push token is cached locally" in docs/push-notifications.md.
const PUSH_TOKEN_STORAGE_KEY = "notificationPushToken";

const base = createPersistedPreference<NotificationInterval>({
  storageKey: NOTIFICATION_STORAGE_KEY,
  defaultValue: DEFAULT_NOTIFICATION_INTERVAL,
  codec: {
    parse: (raw) => {
      const n = Number(raw) as NotificationInterval;
      return VALID_INTERVALS.includes(n) ? n : undefined;
    },
    serialize: (v) => String(v),
  },
});

let notificationHandlerConfigured = false;

// Requests permission, obtains this device's Expo push token, and
// registers it with the backend - see "Registration is silent-fail by
// design" in docs/push-notifications.md for why every failure mode here is
// caught and ignored rather than surfaced, and "Why expo-notifications is
// required lazily, not imported" for why the module itself is only ever
// touched from inside this try block, never at module load time.
async function registerForPushNotifications(
  interval: NotificationInterval,
  language: string
) {
  try {
    // Turning notifications off doesn't need a fresh permission prompt or
    // push token - reuse whatever's already cached, if anything is.
    if (interval === 0) {
      const cachedToken = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
      if (cachedToken) await registerPushSubscription(cachedToken, 0, language);
      return;
    }

    const Notifications: typeof import("expo-notifications") = require("expo-notifications");

    if (!notificationHandlerConfigured) {
      notificationHandlerConfigured = true;
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: pushToken } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, pushToken);
    await registerPushSubscription(pushToken, interval, language);
  } catch {
    // See the function's own comment above.
  }
}

// Re-registers whenever the interval or the active language changes - the
// trending story a device receives is language-scoped server-side, so
// switching language while notifications are on should start notifying in
// the new language, not silently keep the old one. Skips interval === 0
// (nothing to register); explicitly turning notifications *off* is handled
// in setInterval below.
function NotificationSync({ children }: { children: ReactNode }) {
  const ctx = useContext(base.Context);
  const interval = ctx?.value ?? DEFAULT_NOTIFICATION_INTERVAL;
  const { language } = useLanguagePreference();
  useEffect(() => {
    if (interval === 0) return;
    registerForPushNotifications(interval, language);
  }, [interval, language]);
  return <>{children}</>;
}

export function NotificationPreferenceProvider({ children }: { children: ReactNode }) {
  return (
    <base.Provider>
      <NotificationSync>{children}</NotificationSync>
    </base.Provider>
  );
}

export function useNotificationPreference() {
  const ctx = useContext(base.Context);
  if (!ctx) {
    throw new Error(
      "useNotificationPreference must be used within a NotificationPreferenceProvider"
    );
  }
  const { language } = useLanguagePreference();
  return {
    interval: ctx.value,
    setInterval: (next: NotificationInterval) => {
      ctx.setValue(next);
      // The sync effect skips interval === 0 - this is the one path that
      // still needs to tell the server "off".
      if (next === 0) registerForPushNotifications(0, language);
    },
  };
}
