import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
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
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
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
  // Sized against iOS's own Dynamic Type scale rather than arbitrary
  // numbers - Large Title is 34pt, and this app had no size above that
  // (its "title" was 48pt, closer to a website's hero text than anything
  // in the native scale). "title" now sits just above "subtitle" (Large
  // Title itself) for the rare hero/display case that needs to read a step
  // bigger; "subtitle" is what every actual page/article title in this app
  // uses today (article/story titles, legal document titles, profile,
  // search category headers).
  //
  // Both lineHeights are a generous 1.4x fontSize (not Apple's own tighter
  // 44/41 ratios, ~1.1-1.2x) - same reasoning and multiplier as the
  // font-size preview glyph fix in preferences/index.tsx and the header
  // label fixes in app-header.tsx/article-detail-screen.tsx: Apple's own
  // ratios are tuned for Latin text and clip the top of Devanagari/Tamil/
  // etc.'s taller ascenders/matras, which is exactly what these titles -
  // wrapping real scraped headlines in whichever language is active - hit
  // in practice.
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
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
