import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { StyleSheet, Text, View, type DimensionValue } from "react-native";

import Squircle from "@/components/squircle";
import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";
import { getCategoryGlyph } from "@/utils/category-glyph";
import { getCategoryIcon } from "@/utils/category-icon";

type Props = {
  uri: string | null;
  category?: string;
  height?: DimensionValue;
  alt?: string;
  // Callers pass the radius that fits their context (e.g. a smaller,
  // concentric value when nested inside a card that has its own radius) -
  // see utils/corner-radius.ts. Defaults to the small thumbnail size.
  radius?: number;
};

// A plain circular borderRadius clip, not a squircle mask - this app tried
// masking the real photo through @react-native-masked-view/masked-view to
// get a true squircle-clipped image, but that library only fails when its
// native view actually tries to mount (not at require() time, unlike other
// optional native modules in this app), so the "is it available" shim
// couldn't detect a broken/unlinked install - the failure showed up as
// every image rendering as a blank white box in practice. A circle is
// visually indistinguishable from a squircle at typical thumbnail radii
// anyway, so this trades a subtle corner-curve difference for images that
// reliably render.
export default function ArticleImage({
  uri,
  category,
  height = 180,
  alt,
  radius = Radius.small,
}: Props) {
  const [failed, setFailed] = useState(false);
  const theme = useTheme();
  const { t } = useTranslation();

  if (!uri || failed) {
    // Two genuinely different states, given distinct treatments rather than
    // sharing one "here's some text" box: no photo was ever provided (an
    // expected, permanent condition for ~8% of articles - two whole sources
    // never include one in their feed at all) gets a quiet, icon-only tile,
    // the same way iOS itself represents "no artwork available" (Podcasts,
    // Music, News) - not a colorful emoji + a redundant repeat of the
    // category name already shown elsewhere on the card. A load failure
    // (had a URL, broke - a network hiccup, not a permanent fact about the
    // article) keeps a brief explanation, since that one is more "something
    // went wrong" than "there was never anything here".
    return (
      <Squircle
        radius={radius}
        backgroundColor={theme.backgroundElement}
        style={[styles.placeholder, { height }]}
      >
        <View
          style={styles.placeholderContent}
          accessible
          accessibilityLabel={uri ? t("imageFailedToLoad") : t("noImage")}
        >
          <SymbolView
            testID="article-image-placeholder-glyph"
            name={uri ? "exclamationmark.triangle.fill" : getCategoryGlyph(category)}
            size={36}
            tintColor={theme.textSecondary}
            fallback={
              <Text style={styles.placeholderFallbackIcon}>
                {uri ? "⚠️" : getCategoryIcon(category)}
              </Text>
            }
          />
          {uri && (
            <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
              {t("imageFailedToLoad")}
            </Text>
          )}
        </View>
      </Squircle>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.image, { height, borderRadius: radius }]}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={150}
      onError={() => setFailed(true)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={alt || t("articleImageAlt")}
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  image: { width: "100%" },
  placeholder: { width: "100%" },
  placeholderContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  placeholderFallbackIcon: { fontSize: 32 },
  placeholderText: { fontSize: 13 },
});
