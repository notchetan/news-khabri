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
      <NativeTabs.Trigger name="(home)">
        <Label>{t('tabHome')}</Label>
        {/* The app's own mark instead of a generic house glyph - a brand
            logo, not a state-dependent icon, so the same image covers both
            default/selected (iconColor above still tints the label text,
            just not this full-color image). */}
        <Icon src={require('@/assets/images/tab-home-icon.png')} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="search">
        <Label>{t('tabSearch')}</Label>
        <Icon sf="magnifyingglass" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <Label>{t('tabProfile')}</Label>
        <Icon sf={{ default: 'person', selected: 'person.fill' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="preferences">
        <Label>{t('tabPreferences')}</Label>
        <Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
