import { StyleSheet, Text, View } from "react-native";

import ArticleImage from "@/components/article-image";
import Squircle from "@/components/squircle";
import { Radius } from "@/constants/theme";
import { concentricRadius } from "@/utils/corner-radius";
import { useTheme } from "@/hooks/use-theme";

const CARD_PADDING = 12;
const IMAGE_RADIUS = concentricRadius(Radius.large, CARD_PADDING);

type Props = {
  title: string;
  metaText: string;
  imageUrl: string | null;
  category: string;
  onPress: () => void;
  accessibilityLabel: string;
  // Rendered as a debug pill top-left of the image when provided - callers
  // pass undefined to hide it (e.g. debug mode off, or no score available).
  debugScore?: number;
  debugTestID?: string;
};

// Shared by ArticleList and StoryList - both render the same card shape
// (image, title, one line of meta text, optional debug pill), previously
// duplicated near-verbatim with inline style objects in each file.
export default function FeedCard({
  title,
  metaText,
  imageUrl,
  category,
  onPress,
  accessibilityLabel,
  debugScore,
  debugTestID,
}: Props) {
  const theme = useTheme();

  return (
    <Squircle
      radius={Radius.large}
      backgroundColor={theme.backgroundElement}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.card}
    >
      <View style={styles.imageWrapper}>
        <ArticleImage uri={imageUrl} category={category} alt={title} radius={IMAGE_RADIUS} />
        {debugScore != null && (
          <View testID={debugTestID} style={styles.debugPill}>
            <Text style={styles.debugPillText}>{debugScore.toFixed(2)}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.meta, { color: theme.textSecondary }]}>{metaText}</Text>
    </Squircle>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: CARD_PADDING,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  imageWrapper: { position: "relative" },
  debugPill: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  debugPillText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  title: { fontWeight: "600", fontSize: 16, marginTop: 8 },
  meta: { fontSize: 12, marginTop: 4 },
});
