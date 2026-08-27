import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, Spacing } from '@/constants/theme';
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
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton>{t('tabProfile')}</TabButton>
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

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        <ThemedText type="smallBold" style={styles.brandText}>
          News Khabri
        </ThemedText>

        {props.children}
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
  brandText: {
    marginRight: 'auto',
  },
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
