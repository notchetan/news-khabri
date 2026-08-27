import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';
import { useThemePreference } from '@/contexts/theme-preference';
import { useTranslation } from '@/i18n/translations';

export default function AppTabs() {
  const { resolvedScheme } = useThemePreference();
  const { t } = useTranslation();
  const colors = Colors[resolvedScheme];

  return (
    <NativeTabs
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
            reads as its own destination. */}
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="search">
        <Label hidden>{t('tabSearch')}</Label>
        <Icon sf="magnifyingglass" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="preferences">
        <Label hidden>{t('tabPreferences')}</Label>
        <Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
