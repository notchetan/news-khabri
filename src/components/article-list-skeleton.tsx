import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";

const SKELETON_CARDS = 6;

export default function ArticleListSkeleton() {
  const opacity = useRef(new Animated.Value(0.4)).current;
  const theme = useTheme();
  const { t } = useTranslation();

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  const blockStyle = { backgroundColor: theme.backgroundSelected, opacity };

  return (
    <View
      style={{ backgroundColor: theme.background }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t("loadingArticles")}
      importantForAccessibility="yes"
    >
      {Array.from({ length: SKELETON_CARDS }).map((_, i) => (
        <View
          key={i}
          style={[styles.card, { borderColor: theme.backgroundSelected }]}
          importantForAccessibility="no-hide-descendants"
        >
          <Animated.View style={[styles.image, blockStyle]} />
          <Animated.View style={[styles.line, blockStyle]} />
          <Animated.View style={[styles.line, styles.lineShort, blockStyle]} />
          <Animated.View style={[styles.sourceLine, blockStyle]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, borderBottomWidth: 1 },
  image: {
    width: "100%",
    height: 180,
    // Matches feed-card.tsx's concentric image radius (its card is
    // Radius.large with 12px padding, so its image lands on Radius.tiny) -
    // this skeleton is standing in for that exact shape.
    borderRadius: Radius.tiny,
  },
  line: {
    height: 16,
    borderRadius: Radius.tiny,
    marginTop: 10,
  },
  lineShort: { width: "60%", marginTop: 6 },
  sourceLine: {
    height: 10,
    width: "30%",
    borderRadius: Radius.tiny,
    marginTop: 10,
  },
});
