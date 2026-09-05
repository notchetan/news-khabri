import { StyleSheet, Text, type TextProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useFontScale } from '@/contexts/font-size-preference';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary';
  themeColor?: ThemeColor;
  // Opts this text out of the reader's font-size preference. Two cases only:
  // fixed-size chrome whose container can't grow with it (header pills, the
  // tab bar), and the Preferences font-size sample/preview, which sets its
  // own size *from* the scale and would otherwise square it.
  unscaled?: boolean;
};

export function ThemedText({
  style,
  type = 'default',
  themeColor,
  unscaled = false,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();
  const scale = useFontScale();
  // linkPrimary defaults to the tint color rather than needing every caller
  // to also pass themeColor="tint" - an explicit themeColor still wins.
  const resolvedThemeColor = themeColor ?? (type === 'linkPrimary' ? 'tint' : 'text');

  const composed = [
    { color: theme[resolvedThemeColor] },
    type === 'default' && styles.default,
    type === 'title' && styles.title,
    type === 'small' && styles.small,
    type === 'smallBold' && styles.smallBold,
    type === 'subtitle' && styles.subtitle,
    (type === 'link' || type === 'linkPrimary') && styles.link,
    style,
  ];

  // Applied after flattening, so a caller's own fontSize override scales too
  // rather than silently escaping the preference - the whole point is that
  // "Large" means large everywhere, not just where a type variant happens to
  // supply the size. lineHeight moves with it so line spacing stays
  // proportional (and tall scripts keep their headroom - see
  // docs/cross-script-text-rendering.md).
  if (unscaled || scale === 1) {
    return <Text style={composed} {...rest} />;
  }

  const flat = StyleSheet.flatten(composed);
  return (
    <Text
      style={[
        flat,
        typeof flat.fontSize === 'number' && { fontSize: flat.fontSize * scale },
        typeof flat.lineHeight === 'number' && { lineHeight: flat.lineHeight * scale },
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
