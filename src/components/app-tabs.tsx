import Ionicons from '@expo/vector-icons/Ionicons';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

// SDK 55's expo-router replaced the standalone <Icon>/<Label>/<VectorIcon>
// imports this file used to have with compound components hanging off
// <NativeTabs.Trigger> instead (NativeTabs.Trigger.Icon/.Label/.VectorIcon)
// - same underlying API, just relocated. The Android icon prop was also
// renamed from `androidSrc` to plain `src` (still paired with `sf` for
// iOS) - see docs.expo.dev's current native-tabs guide.
const { Icon, Label, VectorIcon } = NativeTabs.Trigger;

import { Colors } from '@/constants/theme';
import { useThemePreference } from '@/contexts/theme-preference';
import { useTranslation } from '@/i18n/translations';

export default function AppTabs() {
  const { resolvedScheme } = useThemePreference();
  const { t } = useTranslation();
  const colors = Colors[resolvedScheme];

  return (
    <NativeTabs
      // Without these two, the tab bar's own native translucent material
      // follows the OS's actual system light/dark trait - independent of
      // this app's own in-app theme preference (which can differ from the
      // system setting entirely, unlike expo-system-ui's root-view sync,
      // which only reaches the RN content layer, not this genuinely native
      // bar). A real UIKit quirk on top of that mismatch: blur materials
      // can flash their unblended base tint during view-hierarchy changes,
      // which is what showed up as a brief white/cream band across the
      // status bar and tab bar during push/pop transitions - see
      // docs/navigation-white-flash.md's fifth layer. Locking both to the
      // app's own resolvedScheme fixes both causes at once.
      backgroundColor={colors.background}
      blurEffect={resolvedScheme === "dark" ? "systemMaterialDark" : "systemMaterialLight"}
      indicatorColor={colors.backgroundElement}
      iconColor={{ default: colors.textSecondary, selected: colors.text }}
      labelStyle={{ selected: { color: colors.text } }}
      // "onScrollDown" is a single, tab-bar-wide UIKit setting (iOS 26+),
      // not something scoped per-screen - it doesn't reliably reset when
      // navigating between screens with different scroll views (e.g. it
      // stays minimized after leaving the article screen and going back to
      // Home), so it's disabled rather than left in a broken/inconsistent
      // state.
      minimizeBehavior="never">
      {/* Labels are kept (not omitted) but hidden - each tab's own name now
          shows at the top of its screen instead (see app-header.tsx), so
          repeating it under the icon here would be redundant. `hidden`
          rather than dropping <Label> entirely so the text is still there
          for accessibility (a screen reader still gets a real name for
          each tab), just not painted. */}
      <NativeTabs.Trigger name="(home)">
        <Label hidden>{t('tabHome')}</Label>
        {/* A generic house glyph, not the app's own mark - that logo now
            shows in the header instead (see app-header.tsx), so this only
            needs to read as "the Home tab" the way every other tab's icon
            reads as its own destination. sf is iOS-only (SF Symbols don't
            exist on Android) - src is the required cross-platform fallback
            there, via expo-router's own VectorIcon helper (@expo/vector-icons
            under the hood). Without it, Android's tab bar has no icon *and*
            no label (see Label's own comment above - it's deliberately
            hidden), which reads as a completely empty bar rather than just a
            missing icon. */}
        <Icon
          sf={{ default: 'house', selected: 'house.fill' }}
          src={{
            default: <VectorIcon family={Ionicons} name="home-outline" />,
            selected: <VectorIcon family={Ionicons} name="home" />,
          }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="search">
        <Label hidden>{t('tabSearch')}</Label>
        <Icon
          sf="magnifyingglass"
          src={<VectorIcon family={Ionicons} name="search" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="preferences">
        <Label hidden>{t('tabPreferences')}</Label>
        <Icon
          sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
          src={{
            default: <VectorIcon family={Ionicons} name="settings-outline" />,
            selected: <VectorIcon family={Ionicons} name="settings" />,
          }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
