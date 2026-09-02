import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { Colors } from "@/constants/theme";
import { AuthProvider } from "@/contexts/auth-context";
import { BookmarksProvider } from "@/contexts/bookmarks-context";
import { DebugPreferenceProvider } from "@/contexts/debug-preference";
import { FontSizePreferenceProvider } from "@/contexts/font-size-preference";
import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import {
  NotificationPreferenceProvider,
  useNotificationPreference,
} from "@/contexts/notification-preference";
import { OnboardingProvider, useOnboarding } from "@/contexts/onboarding-context";
import { SourcesPreferenceProvider } from "@/contexts/sources-preference";
import {
  ThemePreferenceProvider,
  useThemePreference,
} from "@/contexts/theme-preference";

SplashScreen.preventAutoHideAsync();

// Overrides React Navigation's own stock Theme colors with this app's own
// tokens - see docs/navigation-white-flash.md.
const AppLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.light.background,
    card: Colors.light.background,
    text: Colors.light.text,
    border: Colors.light.backgroundSelected,
    primary: Colors.light.tint,
  },
};
const AppDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.dark.background,
    card: Colors.dark.background,
    text: Colors.dark.text,
    border: Colors.dark.backgroundSelected,
    primary: Colors.dark.tint,
  },
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The default (0) refetches on every mount, re-fetching a list every
      // time you navigate back into it even though nothing changed - the
      // backend only ingests new articles every 15 minutes, so a couple of
      // minutes of freshness avoids that round-trip. Pull-to-refresh still
      // bypasses this and always hits the network.
      staleTime: 2 * 60 * 1000,
    },
  },
});

function AppContent() {
  const { resolvedScheme } = useThemePreference();
  const { interval: notificationInterval } = useNotificationPreference();
  const { hasCompletedOnboarding } = useOnboarding();
  const router = useRouter();

  // First launch only - send the reader through onboarding/ before they
  // ever see the real app. Held behind the same AsyncStorage read that
  // gates the return `null` below, so this only ever fires once, right as
  // hasCompletedOnboarding resolves to false.
  useEffect(() => {
    if (hasCompletedOnboarding === false) {
      router.replace("/onboarding");
    }
  }, [hasCompletedOnboarding, router]);

  // Belt-and-suspenders alongside AppLightTheme/AppDarkTheme above - see
  // docs/navigation-white-flash.md.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(
      resolvedScheme === "dark" ? Colors.dark.background : Colors.light.background
    );
  }, [resolvedScheme]);

  // Tapping a trending-story notification opens that story directly - see
  // "Tapping a notification" in docs/push-notifications.md. Only set up
  // once notifications are actually on (and even then, guarded by try/catch)
  // - see "Why expo-notifications is required lazily, not imported" in that
  // same doc for why this can't be a top-level import.
  useEffect(() => {
    if (notificationInterval === 0) return;
    try {
      const Notifications: typeof import("expo-notifications") = require("expo-notifications");
      const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const storyId = response.notification.request.content.data?.storyId;
        if (storyId == null) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (router.push as any)({
          pathname: "/story/[id]",
          params: { id: String(storyId) },
        });
      });
      return () => subscription.remove();
    } catch {
      return undefined;
    }
  }, [router, notificationInterval]);

  // Nothing to render yet - the native splash screen (see
  // SplashScreen.preventAutoHideAsync() above) just stays up a little
  // longer, since AnimatedSplashOverlay below never gets a chance to call
  // hideAsync(). Avoids ever painting the tabs behind the redirect above.
  if (hasCompletedOnboarding === null) {
    return null;
  }

  return (
    <ThemeProvider value={resolvedScheme === "dark" ? AppDarkTheme : AppLightTheme}>
      <StatusBar style={resolvedScheme === "dark" ? "light" : "dark"} />
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemePreferenceProvider>
            <FontSizePreferenceProvider>
              <LanguagePreferenceProvider>
                <SourcesPreferenceProvider>
                  <NotificationPreferenceProvider>
                    <DebugPreferenceProvider>
                      <AuthProvider>
                        <BookmarksProvider>
                          <OnboardingProvider>
                            <AppContent />
                          </OnboardingProvider>
                        </BookmarksProvider>
                      </AuthProvider>
                    </DebugPreferenceProvider>
                  </NotificationPreferenceProvider>
                </SourcesPreferenceProvider>
              </LanguagePreferenceProvider>
            </FontSizePreferenceProvider>
          </ThemePreferenceProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
