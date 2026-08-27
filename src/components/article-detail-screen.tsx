import { GlassView } from "expo-glass-effect";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
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
import { NATIVE_TAB_BAR_HEIGHT, Radius, Spacing } from "@/constants/theme";
import { useFontSizePreference } from "@/contexts/font-size-preference";
import { useTheme } from "@/hooks/use-theme";
import { formatPublishedDate } from "@/utils/format-date";
import { useTranslation } from "@/i18n/translations";
import { useQuery } from "@tanstack/react-query";

const SWIPE_THRESHOLD = 60;
// Distance (not a duration) the header labels' collapse is spread across -
// see docs/animated-scroll-collapse.md.
const HEADER_COLLAPSE_DISTANCE = 60;
// Natural width of each label, eyeballed against the real strings rather
// than measured via an onLayout probe.
const BACK_LABEL_WIDTH = 80;
const BRAND_LABEL_WIDTH = 100;

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
  const swipeIndicatorOpacity = useRef(new Animated.Value(0)).current;
  // Continuous scroll-position-driven collapse, not a discrete threshold -
  // see docs/animated-scroll-collapse.md.
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  // Measured height of the floating back/brand pill row (backRow below) -
  // see docs/article-header-layout.md.
  const [headerHeight, setHeaderHeight] = useState(0);

  // Near-instant opacity swap, deliberately not spread across the same
  // distance as the width shrink below - see docs/animated-scroll-collapse.md.
  const headerLabelOpacity = scrollY.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const backLabelWidth = scrollY.interpolate({
    inputRange: [0, HEADER_COLLAPSE_DISTANCE],
    outputRange: [BACK_LABEL_WIDTH, 0],
    extrapolate: "clamp",
  });
  const brandLabelWidth = scrollY.interpolate({
    inputRange: [0, HEADER_COLLAPSE_DISTANCE],
    outputRange: [BRAND_LABEL_WIDTH, 0],
    extrapolate: "clamp",
  });

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
    scrollY.setValue(0);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [activeId, scrollY]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    // false: the animated maxWidth below is a layout property the native
    // driver can't animate.
    { useNativeDriver: false }
  );

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
  // See docs/article-header-layout.md.
  const contentTopPadding = Platform.select({
    default: (headerHeight || topPadding + 44) + Spacing.two,
    web: Spacing.six,
  });
  // Same base gap (Spacing.three) plus tab-bar reservation formula used in
  // search/index.tsx and preferences/index.tsx - see NATIVE_TAB_BAR_HEIGHT's
  // own comment for why insets.bottom alone isn't enough.
  const contentBottomPadding =
    Spacing.three +
    Platform.select({
      web: 0,
      default: insets.bottom + NATIVE_TAB_BAR_HEIGHT,
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
        {/* Same left-label/right-label shape as AppHeader - see
            docs/article-header-layout.md. */}
        <View
          testID="article-header-row"
          style={[styles.backRow, { paddingTop: topPadding }]}
          onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
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
                  opacity: headerLabelOpacity,
                  maxWidth: backLabelWidth,
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

          <GlassView style={styles.brandGlass} glassEffectStyle="regular">
            <View testID="article-brand-row" style={styles.brandRow}>
              <Image
                testID="article-brand-logo"
                source={require("@/assets/images/tab-home-icon.png")}
                style={styles.brandLogo}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
              <Animated.View
                style={{
                  opacity: headerLabelOpacity,
                  maxWidth: brandLabelWidth,
                  overflow: "hidden",
                }}
              >
                <ThemedText
                  numberOfLines={1}
                  style={[styles.backGlyph, styles.brandLabel]}
                >
                  {` ${t("appName")}`}
                </ThemedText>
              </Animated.View>
            </View>
          </GlassView>
        </View>

        {isLoading ? (
          <ArticleDetailSkeleton headerHeight={headerHeight} topPadding={topPadding} />
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
              { paddingTop: contentTopPadding, paddingBottom: contentBottomPadding },
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

            <View testID="article-meta-row" style={styles.metaRow}>
              <View testID="article-meta-text-block" style={styles.metaTextBlock}>
                <ThemedText themeColor="textSecondary" style={styles.meta}>
                  {data.source}
                </ThemedText>
                {(publishedLabel || data.read_time_minutes) && (
                  <ThemedText themeColor="textSecondary" style={styles.meta}>
                    {[
                      publishedLabel,
                      data.read_time_minutes
                        ? t("minReadTemplate", { minutes: String(data.read_time_minutes) })
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </ThemedText>
                )}
              </View>

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
              // textSecondary, not backgroundSelected - matches the
              // preferences footer divider's own color (see
              // preferences/index.tsx), not the subtler tone the related-
              // articles rows below still use for their own separators.
              style={[styles.readOriginal, { borderColor: theme.textSecondary }]}
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

function ArticleDetailSkeleton({
  headerHeight,
  topPadding,
}: {
  headerHeight: number;
  topPadding: number;
}) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // Same header-clearing formula as the real ScrollView - see
  // docs/article-header-layout.md.
  const contentTopPadding = Platform.select({
    default: (headerHeight || topPadding + 44) + Spacing.two,
    web: Spacing.six,
  });
  const contentBottomPadding =
    Spacing.three +
    Platform.select({
      web: 0,
      default: insets.bottom + NATIVE_TAB_BAR_HEIGHT,
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
      style={[
        styles.scrollContent,
        { paddingTop: contentTopPadding, paddingBottom: contentBottomPadding },
      ]}
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
  // See "Status bar scrim" in docs/article-header-layout.md.
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  // See "Pill shape" in docs/article-header-layout.md.
  backGlass: { alignSelf: "flex-start", borderRadius: Radius.full, overflow: "hidden" },
  backPressable: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  // See docs/cross-script-text-rendering.md.
  backPressableRow: { flexDirection: "row", alignItems: "center" },
  backGlyph: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: Math.ceil(16 * 1.4),
    ...Platform.select({
      android: { includeFontPadding: false, textAlignVertical: "center" },
      default: {},
    }),
  },
  backLabel: { flexShrink: 0 },
  brandGlass: { alignSelf: "flex-start", borderRadius: Radius.full, overflow: "hidden" },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  brandLogo: { width: 20, height: 20 },
  brandLabel: { flexShrink: 0 },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { paddingHorizontal: Spacing.four },
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
  // See "Matching story-detail-screen's meta layout" in
  // docs/article-header-layout.md.
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
  },
  shareButtonText: { fontSize: 14, fontWeight: "600" },
  shareGlyphFallback: { fontSize: 14, fontWeight: "700" },
  // See "Matching story-detail-screen's meta layout" in
  // docs/article-header-layout.md.
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.one,
    marginBottom: Spacing.three,
  },
  metaTextBlock: { gap: 2 },
  meta: {},
  noContent: { marginTop: Spacing.two },
  // See "Spacing consistency with the rest of the app" in
  // docs/article-header-layout.md.
  readOriginal: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.three,
    borderTopWidth: 1,
    alignItems: "center",
  },
  relatedSection: { marginTop: Spacing.three },
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
