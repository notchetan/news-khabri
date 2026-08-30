import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { registerPushSubscription } from "@/api/notifications";
import { useLanguagePreference } from "@/contexts/language-preference";

// 0 = off. Matches the backend's own VALID_INTERVALS (routes/push.js) -
// keep the two in sync if this ever changes.
export type NotificationInterval = 0 | 5 | 15 | 30 | 60 | 120;

const VALID_INTERVALS: NotificationInterval[] = [0, 5, 15, 30, 60, 120];
const STORAGE_KEY = "notificationPreference";
// See "Why the push token is cached locally" in docs/push-notifications.md.
const PUSH_TOKEN_STORAGE_KEY = "notificationPushToken";

type NotificationPreferenceContextValue = {
  interval: NotificationInterval;
  setInterval: (interval: NotificationInterval) => void;
};

const NotificationPreferenceContext = createContext<
  NotificationPreferenceContextValue | undefined
>(undefined);

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

export function NotificationPreferenceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { language } = useLanguagePreference();
  const [interval, setIntervalState] = useState<NotificationInterval>(0);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      const parsed = Number(stored) as NotificationInterval;
      if (VALID_INTERVALS.includes(parsed)) setIntervalState(parsed);
    });
  }, []);

  // Re-registers whenever the interval or the active language changes -
  // the trending story a device receives is language-scoped server-side,
  // so switching language while notifications are on should start
  // notifying in the new language, not silently keep the old one.
  useEffect(() => {
    if (interval === 0) return;
    registerForPushNotifications(interval, language);
  }, [interval, language]);

  const setInterval = (next: NotificationInterval) => {
    setIntervalState(next);
    AsyncStorage.setItem(STORAGE_KEY, String(next));
    if (next === 0) {
      // See "Why the push token is cached locally" in docs/push-notifications.md.
      AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY).then((token) => {
        if (token) registerPushSubscription(token, 0, language).catch(() => {});
      });
    }
  };

  return (
    <NotificationPreferenceContext.Provider value={{ interval, setInterval }}>
      {children}
    </NotificationPreferenceContext.Provider>
  );
}

export function useNotificationPreference() {
  const ctx = useContext(NotificationPreferenceContext);
  if (!ctx) {
    throw new Error(
      "useNotificationPreference must be used within a NotificationPreferenceProvider"
    );
  }
  return ctx;
}
