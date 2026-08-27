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
import { Colors } from "@/constants/theme";
import { DebugPreferenceProvider } from "@/contexts/debug-preference";
import { FontSizePreferenceProvider } from "@/contexts/font-size-preference";
import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import {
  ThemePreferenceProvider,
  useThemePreference,
} from "@/contexts/theme-preference";

SplashScreen.preventAutoHideAsync();

// @react-navigation/native's own DefaultTheme/DarkTheme use their own stock
// colors (DefaultTheme.background is rgb(242,242,242), a light gray - not
// this app's own warm cream #FAF7F2; DarkTheme.background is rgb(1,1,1),
// not this app's own #17140F) - this Theme is what every Stack (this root
// one, and every nested one, e.g. preferences/_layout.tsx's own, since they
// all read from this same single ThemeProvider ancestor) uses as a
// screen's *native* default background, underneath whatever the screen's
// own React content paints. A push/pop transition briefly reveals that
// native layer before the screen's own content finishes painting over it -
// with the stock colors, that's a visible flash of the wrong color (reads
// as "white" in light mode against this app's cream, since rgb(242,242,242)
// is close enough to white to look like a mismatch) on every single
// transition. Overriding background (and card, used by some transition
// presets for the same purpose) to this app's own tokens fixes the color
// actually shown during that brief frame, rather than trying to eliminate
// the frame itself.
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
