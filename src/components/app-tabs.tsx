import Ionicons from '@expo/vector-icons/Ionicons';
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';
import { useThemePreference } from '@/contexts/theme-preference';
import { useTranslation } from '@/i18n/translations';

export default function AppTabs() {
  const { resolvedScheme } = useThemePreference();
  const { t } = useTranslation();
  const colors = Colors[resolvedScheme];

  return (
    <NativeTabs
      // backgroundColor/blurEffect: without these, the tab bar's native
      // translucent material follows the OS's system light/dark trait
      // rather than this app's own in-app theme preference - see
      // docs/navigation-white-flash.md's fifth layer.
      backgroundColor={colors.background}
      blurEffect={resolvedScheme === "dark" ? "systemMaterialDark" : "systemMaterialLight"}
      indicatorColor={colors.backgroundElement}
      iconColor={{ default: colors.textSecondary, selected: colors.text }}
      labelStyle={{ selected: { color: colors.text } }}
      // "onScrollDown" is tab-bar-wide (iOS 26+), not per-screen - it
      // doesn't reset navigating between screens with different scroll
      // views, so it's disabled rather than left inconsistent.
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
            shows in the header instead (see app-header.tsx). androidSrc is
            required alongside sf - see docs/android-tab-bar.md. */}
        <Icon
          sf={{ default: 'house', selected: 'house.fill' }}
          androidSrc={{
            default: <VectorIcon family={Ionicons} name="home-outline" />,
            selected: <VectorIcon family={Ionicons} name="home" />,
          }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="search">
        <Label hidden>{t('tabSearch')}</Label>
        <Icon
          sf="magnifyingglass"
          androidSrc={<VectorIcon family={Ionicons} name="search" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="preferences">
        <Label hidden>{t('tabPreferences')}</Label>
        <Icon
          sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
          androidSrc={{
            default: <VectorIcon family={Ionicons} name="settings-outline" />,
            selected: <VectorIcon family={Ionicons} name="settings" />,
          }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
