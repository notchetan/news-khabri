import { StyleSheet, Text, type TextProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  // linkPrimary defaults to the tint color rather than needing every caller
  // to also pass themeColor="tint" - an explicit themeColor still wins.
  const resolvedThemeColor = themeColor ?? (type === 'linkPrimary' ? 'tint' : 'text');

  return (
    <Text
      style={[
        { color: theme[resolvedThemeColor] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        (type === 'link' || type === 'linkPrimary') && styles.link,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  // See "ThemedText's title/subtitle scale" in
  // docs/cross-script-text-rendering.md.
  title: {
    fontSize: 40,
    fontWeight: 700,
    lineHeight: Math.ceil(40 * 1.4),
  },
  subtitle: {
    fontSize: 34,
    lineHeight: Math.ceil(34 * 1.4),
    fontWeight: 700,
  },
  // Shared by both link types - they differ only in default color (see
  // resolvedThemeColor above), never in metrics.
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
});
