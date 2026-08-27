import { GlassView } from "expo-glass-effect";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import RenderHtml from "react-native-render-html";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { fetchArticleDetail } from "@/api/articles";
import ArticleImage from "@/components/article-image";
import Squircle from "@/components/squircle";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useFontSizePreference } from "@/contexts/font-size-preference";
import { useTheme } from "@/hooks/use-theme";
import { formatPublishedDate } from "@/utils/format-date";
import { useTranslation } from "@/i18n/translations";
import { useQuery } from "@tanstack/react-query";

const SWIPE_THRESHOLD = 60;

type Props = {
  basePath: "/article" | "/search/article";
  homePath: "/" | "/search";
};

export default function ArticleDetailScreen({ basePath, homePath }: Props) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const { scale: fontScale } = useFontSizePreference();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [showCaption, setShowCaption] = useState(false);
  const [activeId, setActiveId] = useState(Number(id));
  const [sequence, setSequence] = useState<number[]>([]);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const swipeIndicatorOpacity = useRef(new Animated.Value(0)).current;
  const backLabelAnim = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef<ScrollView>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["article", activeId],
    queryFn: () => fetchArticleDetail(activeId),
  });

  // Seed a fixed swipe loop (this article + its related list) once, the
  // first time it loads. Every article has its own, different related list,
  // so re-deriving the loop on each swipe would make it wobble around
  // instead of cycling through a stable set - seeding once keeps it a
  // proper loop.
  useEffect(() => {
    if (data && sequence.length === 0) {
      setSequence([data.id, ...data.related.map((item) => item.id)]);
    }
  }, [data, sequence.length]);

  useEffect(() => {
    setShowCaption(false);
    setIsScrolled(false);
    backLabelAnim.setValue(1);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [activeId, backLabelAnim]);

  useEffect(() => {
    Animated.timing(backLabelAnim, {
      toValue: isScrolled ? 0 : 1,
      duration: 260,
      useNativeDriver: false,
    }).start();
  }, [isScrolled, backLabelAnim]);

  const SCROLL_COLLAPSE_THRESHOLD = 20;
  const handleScroll = (event: {
    nativeEvent: { contentOffset: { y: number } };
  }) => {
    const y = event.nativeEvent.contentOffset.y;
    setIsScrolled((prev) => {
      if (!prev && y > SCROLL_COLLAPSE_THRESHOLD) return true;
      if (prev && y <= SCROLL_COLLAPSE_THRESHOLD) return false;
      return prev;
    });
  };

  const goToRelative = (direction: 1 | -1) => {
    if (sequence.length < 2) return;
    const idx = sequence.indexOf(activeId);
    const nextIdx = (idx + direction + sequence.length) % sequence.length;
    setActiveId(sequence[nextIdx]);

    setSwipeDirection(direction === 1 ? "left" : "right");
    swipeIndicatorOpacity.setValue(1);
    Animated.timing(swipeIndicatorOpacity, {
      toValue: 0,
      duration: 450,
      delay: 150,
      useNativeDriver: true,
    }).start();
  };

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onEnd((event) => {
      "worklet";
      if (event.translationX < -SWIPE_THRESHOLD) {
        scheduleOnRN(goToRelative, 1);
      } else if (event.translationX > SWIPE_THRESHOLD) {
        scheduleOnRN(goToRelative, -1);
      }
    });

  const topPadding = Platform.select({
    default: insets.top + Spacing.two,
    web: Spacing.six,
  });
  // The scrollable content itself only needs to clear the status bar (not
  // the floating back button too) - it's fine, and intended, for the
  // button to float semi-transparently over the very top of the hero image
  // once content starts; it's only the status bar strip above that that
  // must never show article content.
  const contentTopPadding = Platform.select({
    default: insets.top,
    web: Spacing.six,
  });

  const openOriginal = () => {
    if (data?.link) WebBrowser.openBrowserAsync(data.link);
  };

  const shareArticle = async () => {
    if (!data?.link) return;
    try {
      // Android's share sheet only reads `message` - `url` is silently
      // dropped there, so the link has to be folded into the message text
      // to actually reach the target app. iOS handles `url` as its own
      // field (and web's Share shim - see react-native-web - forwards both
      // separately to navigator.share), so it can stay split there.
      await Share.share(
        Platform.OS === "ios"
          ? { title: data.title, url: data.link }
          : { message: `${data.title}\n${data.link}` },
        { dialogTitle: data.title }
      );
    } catch {
      // Share sheet dismissed, or unsupported (e.g. desktop web without a
      // navigator.share implementation) - nothing to recover from, no-op.
    }
  };

  // router.back() warns/no-ops when this screen has no prior route to pop -
  // e.g. opened via a direct link or a web page reload, which drops the
  // stack down to just this screen. Fall back to this stack's own root in
  // that case.
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      // homePath is a prop, so typed routes can't verify it statically like
      // a literal pathname.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (router.replace as any)(homePath);
    }
  };

  const publishedLabel = data ? formatPublishedDate(data.published_at) : null;

  // react-native-render-html warns about costly rerenders if these props
  // are recreated (new object identity) on every render - memoize them so
  // they only change when what they actually depend on changes.
  const htmlSource = useMemo(
    () => ({ html: data?.content ?? "" }),
    [data?.content]
  );
  const renderBaseStyle = useMemo(
    () => ({
      color: theme.text,
      fontSize: 16 * fontScale,
      lineHeight: 24 * fontScale,
    }),
    [theme.text, fontScale]
  );
  const renderTagsStyles = useMemo(
    () => ({
      p: { marginBottom: Spacing.three },
      // Token-consistent only, not squircle-clipped - these come from
      // react-native-render-html's own image rendering for arbitrary
      // scraped article HTML, which doesn't have a hook for our Squircle
      // component.
      img: { borderRadius: Radius.small, marginVertical: Spacing.three },
      a: { color: theme.text, textDecorationLine: "underline" as const },
      figcaption: { color: theme.textSecondary, fontSize: 13 * fontScale },
    }),
    [theme.text, theme.textSecondary, fontScale]
  );

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {Platform.OS !== "web" && (
          <View
            pointerEvents="none"
            style={[
              styles.statusBarScrim,
              { height: insets.top, backgroundColor: theme.background },
            ]}
          />
        )}
        <View
          style={[styles.backRow, { paddingTop: topPadding }]}
          pointerEvents="box-none"
        >
          <GlassView style={styles.backGlass} glassEffectStyle="regular">
            <Pressable
              onPress={goBack}
              hitSlop={12}
              style={[styles.backPressable, styles.backPressableRow]}
              accessibilityRole="button"
              accessibilityLabel={t("back")}
            >
              <SymbolView
                testID="article-back-chevron"
                name="chevron.left"
                size={16}
                weight="semibold"
                tintColor={theme.text}
                fallback={<ThemedText style={styles.backGlyph}>‹</ThemedText>}
              />
              <Animated.View
                style={{
                  opacity: backLabelAnim,
                  maxWidth: backLabelAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 80],
                  }),
                  height: 20,
                  overflow: "hidden",
                }}
              >
                <ThemedText
                  numberOfLines={1}
                  style={[styles.backGlyph, styles.backLabel]}
                >
                  {` ${t("back")}`}
                </ThemedText>
              </Animated.View>
            </Pressable>
          </GlassView>
        </View>

        {isLoading ? (
          <ArticleDetailSkeleton />
        ) : error || !data ? (
          <View style={styles.centerFill}>
            <ThemedText themeColor="textSecondary">
              {t("articleLoadError")}
            </ThemedText>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            testID="article-scroll-view"
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: contentTopPadding },
            ]}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            <View style={styles.heroWrapper}>
              <ArticleImage
                uri={data.image_url}
                category={data.category}
                alt={data.title}
                radius={Radius.large}
              />
              {data.image_caption && !showCaption && (
                <Pressable
                  style={styles.infoBadge}
                  onPress={() => setShowCaption(true)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t("showPhotoCredit")}
                >
                  <SymbolView
                    name="info"
                    size={14}
                    weight="bold"
                    tintColor="#fff"
                    fallback={<ThemedText style={styles.infoBadgeText}>i</ThemedText>}
                  />
                </Pressable>
              )}
              {showCaption && data.image_caption && (
                <Squircle
                  radius={Radius.large}
                  backgroundColor="rgba(0,0,0,0.72)"
                  onPress={() => setShowCaption(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t("hidePhotoCredit")}
                  style={styles.imageCaptionScrim}
                >
                  <ThemedText style={styles.imageCaptionText}>
                    {data.image_caption}
                  </ThemedText>
                </Squircle>
              )}
            </View>

            <ThemedText
              type="subtitle"
              style={styles.title}
              accessibilityRole="header"
            >
              {data.title}
            </ThemedText>

            <TouchableOpacity
              onPress={shareArticle}
              style={[styles.shareButton, { backgroundColor: theme.backgroundElement }]}
              accessibilityRole="button"
              accessibilityLabel={t("share")}
            >
              <SymbolView
                name="square.and.arrow.up"
                size={16}
                weight="semibold"
                tintColor={theme.text}
                fallback={<ThemedText style={styles.shareGlyphFallback}>⬆</ThemedText>}
              />
              <ThemedText style={styles.shareButtonText}>{t("share")}</ThemedText>
            </TouchableOpacity>

            <View style={styles.metaRow}>
              <ThemedText themeColor="textSecondary" style={styles.meta}>
                {data.source}
                {publishedLabel ? ` · ${publishedLabel}` : ""}
              </ThemedText>
              {data.read_time_minutes ? (
                <View
                  style={[
                    styles.readTimePill,
                    { backgroundColor: theme.backgroundElement },
                  ]}
                >
                  <ThemedText themeColor="textSecondary" style={styles.readTimePillText}>
                    {t("minReadTemplate", { minutes: String(data.read_time_minutes) })}
                  </ThemedText>
                </View>
              ) : null}
            </View>

            {data.content ? (
              <RenderHtml
                contentWidth={width - Spacing.four * 2}
                source={htmlSource}
                baseStyle={renderBaseStyle}
                tagsStyles={renderTagsStyles}
              />
            ) : (
              <ThemedText themeColor="textSecondary" style={styles.noContent}>
                {t("articleContentError")}
              </ThemedText>
            )}

            <TouchableOpacity
              onPress={openOriginal}
              style={[styles.readOriginal, { borderColor: theme.backgroundSelected }]}
              accessibilityRole="link"
              accessibilityLabel={t("readOnTemplate", { source: data.source })}
            >
              <ThemedText type="linkPrimary">
                {t("readOnTemplate", { source: data.source })}
              </ThemedText>
            </TouchableOpacity>

            {data.related.length > 0 && (
              <View style={styles.relatedSection}>
                <ThemedText
                  type="smallBold"
                  style={styles.relatedHeading}
                  accessibilityRole="header"
                >
                  {t("relatedArticles")}
                </ThemedText>
                {data.related.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.relatedRow, { borderColor: theme.backgroundSelected }]}
                    onPress={() =>
                      // basePath is a prop, so typed routes can't verify it
                      // statically like a literal pathname.
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (router.push as any)({
                        pathname: `${basePath}/[id]`,
                        params: { id: String(item.id) },
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`${item.title}, ${item.source}`}
                  >
                    <View style={styles.relatedThumb}>
                      <ArticleImage
                        uri={item.image_url}
                        category={item.category}
                        height={80}
                        alt={item.title}
                        radius={Radius.small}
                      />
                    </View>
                    <View style={styles.relatedTextBlock}>
                      <ThemedText numberOfLines={3} style={styles.relatedTitle}>
                        {item.title}
                      </ThemedText>
                      <ThemedText themeColor="textSecondary" type="small">
                        {item.source}
                      </ThemedText>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        )}

        {swipeDirection && (
          <Animated.View
            style={[
              styles.swipeIndicator,
              swipeDirection === "left" ? { left: Spacing.four } : { right: Spacing.four },
              {
                backgroundColor: theme.text,
                opacity: swipeIndicatorOpacity,
                pointerEvents: "none",
              },
            ]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <SymbolView
              name={swipeDirection === "left" ? "chevron.left" : "chevron.right"}
              size={20}
              weight="bold"
              tintColor={theme.background}
              fallback={
                <ThemedText style={[styles.swipeArrow, { color: theme.background }]}>
                  {swipeDirection === "left" ? "‹" : "›"}
                </ThemedText>
              }
            />
          </Animated.View>
        )}
      </View>
    </GestureDetector>
  );
}

function ArticleDetailSkeleton() {
  const opacity = useRef(new Animated.Value(0.4)).current;
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const contentTopPadding = Platform.select({
    default: insets.top,
    web: Spacing.six,
  });

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  const block = { backgroundColor: theme.backgroundSelected, opacity };
  const { t } = useTranslation();

  return (
    <View
      style={[styles.scrollContent, { paddingTop: contentTopPadding }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t("loadingArticle")}
    >
      <Animated.View style={[styles.skeletonImage, block]} />
      <Animated.View style={[styles.skeletonLine, block]} />
      <Animated.View style={[styles.skeletonLine, { width: "70%" }, block]} />
      <Animated.View style={[styles.skeletonLineSmall, block]} />
      <Animated.View style={[styles.skeletonLine, { marginTop: Spacing.four }, block]} />
      <Animated.View style={[styles.skeletonLine, block]} />
      <Animated.View style={[styles.skeletonLine, { width: "85%" }, block]} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Scrolling content is deliberately allowed to flow behind the floating
  // back button (see backRow below), but it should never show through the
  // status bar itself - this opaque strip pins to exactly the status bar's
  // height so the clock/battery/carrier text always has a solid backdrop.
  statusBarScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  backRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  // Fully-round, plain circular (not squircle) on purpose - this clips a
  // native GlassView blur, which can't be shaped by our SVG squircle path
  // without a deeper native integration; a circle here is visually
  // identical to a squircle anyway since the radius already exceeds half
  // the pill's height.
  backGlass: { alignSelf: "flex-start", borderRadius: Radius.full, overflow: "hidden" },
  backPressable: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  backPressableRow: { flexDirection: "row", alignItems: "center" },
  backGlyph: { fontSize: 16, fontWeight: "600" },
  backLabel: { flexShrink: 0 },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six },
  swipeIndicator: {
    position: "absolute",
    top: "45%",
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  swipeArrow: { fontSize: 24, fontWeight: "700" },
  heroWrapper: { position: "relative" },
  infoBadge: {
    position: "absolute",
    top: Spacing.two,
    right: Spacing.two,
    width: 26,
    height: 26,
    borderRadius: Radius.full,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    fontStyle: "italic",
  },
  // borderRadius intentionally omitted - Squircle (see JSX above) handles
  // the corner shape now, matching the hero image's own squircle exactly
  // since this overlays it at the same bounds.
  imageCaptionScrim: {
    ...StyleSheet.absoluteFillObject,
    padding: Spacing.three,
    justifyContent: "center",
  },
  imageCaptionText: { color: "#fff", fontSize: 13, lineHeight: 19 },
  title: { marginTop: Spacing.three },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: Spacing.one,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
  },
  shareButtonText: { fontSize: 14, fontWeight: "600" },
  shareGlyphFallback: { fontSize: 14, fontWeight: "700" },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.two,
    marginTop: Spacing.one,
    marginBottom: Spacing.three,
  },
  meta: {},
  readTimePill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  readTimePillText: { fontSize: 12 },
  noContent: { marginTop: Spacing.two },
  readOriginal: {
    marginTop: Spacing.four,
    paddingVertical: Spacing.three,
    borderTopWidth: 1,
    alignItems: "center",
  },
  relatedSection: { marginTop: Spacing.five },
  relatedHeading: { letterSpacing: 0.5, marginBottom: Spacing.two },
  relatedRow: {
    flexDirection: "row",
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderTopWidth: 1,
  },
  relatedThumb: { width: 80, height: 80 },
  relatedTextBlock: { flex: 1, justifyContent: "center", gap: 4 },
  relatedTitle: { fontSize: 14, fontWeight: "600" },
  skeletonImage: { width: "100%", height: 220, borderRadius: Radius.large },
  skeletonLine: { height: 18, borderRadius: Radius.tiny, marginTop: Spacing.three },
  skeletonLineSmall: {
    height: 12,
    width: "40%",
    borderRadius: Radius.tiny,
    marginTop: Spacing.two,
  },
});
