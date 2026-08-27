import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { DebugPreferenceProvider } from "@/contexts/debug-preference";
import { FontSizePreferenceProvider } from "@/contexts/font-size-preference";
import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import {
  ThemePreferenceProvider,
  useThemePreference,
} from "@/contexts/theme-preference";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The default (0) refetches on every mount, so navigating away from
      // and back to a list (e.g. into an article and back) re-fetches it
      // every time even though nothing has changed - the backend only
      // ingests new articles every 15 minutes (see the backend's cron), so
      // treating data as fresh for a couple of minutes avoids that
      // redundant network round-trip without perceptibly staling the feed.
      // Pull-to-refresh (onRefresh -> refetch()) still bypasses this and
      // always hits the network.
      staleTime: 2 * 60 * 1000,
    },
  },
});

function AppContent() {
  const { resolvedScheme } = useThemePreference();

  return (
    <ThemeProvider value={resolvedScheme === "dark" ? DarkTheme : DefaultTheme}>
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
                <DebugPreferenceProvider>
                  <AppContent />
                </DebugPreferenceProvider>
              </LanguagePreferenceProvider>
            </FontSizePreferenceProvider>
          </ThemePreferenceProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
