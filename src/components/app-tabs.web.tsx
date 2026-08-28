import Ionicons from '@expo/vector-icons/Ionicons';
import { usePathname, useRouter } from 'expo-router';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { Image, Pressable, View, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translations';
import { concentricRadius } from '@/utils/corner-radius';

const OUTER_RADIUS = Spacing.five;

export default function AppTabs() {
  const { t } = useTranslation();

  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>{t('tabHome')}</TabButton>
          </TabTrigger>
          {/* Typed routes' generated union for this literal is flaky across
              regenerations - same pragmatic cast used elsewhere for
              cross-stack navigation. */}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <TabTrigger name="search" href={"/search" as any} asChild>
            <TabButton>{t('tabSearch')}</TabButton>
          </TabTrigger>
          <TabTrigger name="preferences" href="/preferences" asChild>
            <TabButton>{t('tabPreferences')}</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => pressed && styles.pressed}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
    >
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

// Which tab's own title to show on the left (see the header comment below)
// for the screen currently on top - checked by prefix so a pushed screen
// further into a tab's own stack (e.g. /preferences/language, an article
// under /search/article/:id) still shows that tab's name, not nothing.
// Profile is no longer a tab (see below), but still gets its own title here
// since it's still a real screen this bar sits on top of.
function titleKeyForPathname(pathname: string) {
  if (pathname.startsWith('/search')) return 'tabSearch' as const;
  if (pathname.startsWith('/preferences')) return 'tabPreferences' as const;
  if (pathname.startsWith('/profile')) return 'profileTitle' as const;
  return 'appName' as const;
}

export function CustomTabList(props: TabListProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        {/* The app's own mark plus the current tab's name, replacing the
            static "News Khabri" brand text this used to always show -
            mirrors app-header.tsx's native equivalent, just inside this
            bar instead of a separate one underneath it (this bar already
            lives at the top of the screen on web, unlike the bottom native
            tab bar). */}
        <View style={styles.titleGroup}>
          <Image
            source={require('@/assets/images/tab-home-icon.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          <ThemedText type="smallBold" numberOfLines={1}>
            {t(titleKeyForPathname(pathname))}
          </ThemedText>
        </View>

        {props.children}

        {/* Profile is no longer a tab (see AppTabs above) - this button
            replaces it, in the same trailing position, pushing the same
            /profile screen rather than switching tabs to it. */}
        <Pressable
          onPress={() => router.push('/profile')}
          accessibilityRole="button"
          accessibilityLabel={t('tabProfile')}
        >
          <SymbolView
            name="person.crop.circle"
            size={22}
            weight="regular"
            tintColor={theme.text}
            fallback={<Ionicons name="person-circle" size={22} color={theme.text} />}
          />
        </Pressable>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    // With neither top/bottom nor an explicit height given, this stretches
    // to fill the whole screen height on web instead of sizing to its own
    // content - an invisible full-height layer that silently ate
    // paint/hit-testing priority over anything positioned beneath it
    // elsewhere on the page (e.g. a floating button on a pushed screen).
    // An explicit height sidesteps that sizing quirk entirely.
    top: 0,
    height: 68,
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: OUTER_RADIUS,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginRight: 'auto',
  },
  logo: { width: 22, height: 22 },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    // Concentric with innerContainer's own radius above, given the vertical
    // padding between them, rather than an independently-chosen number.
    borderRadius: concentricRadius(OUTER_RADIUS, Spacing.two),
  },
});
