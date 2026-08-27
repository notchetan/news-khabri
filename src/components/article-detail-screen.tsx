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
// How much scroll the header labels' collapse is spread across - a
// distance, not a delay or fixed-duration animation, so scrubbing slowly
// moves through it slowly and flicking moves through it fast, matching the
// scroll gesture 1:1. Same value/reasoning as category-pills.tsx's own
// PINNED_PILL_COLLAPSE_DISTANCE.
const HEADER_COLLAPSE_DISTANCE = 60;
// Natural width of each label at its current font/weight, used as the
// collapsed<->expanded endpoint for its own Animated.View below - eyeballed
// against the real strings (not measured via an onLayout probe), the same
// pragmatic choice already made for the back label before this change.
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
  // Drives both header labels' collapse (back button's " Back" and the
  // brand pill's "News Khabri") continuously off the real scroll position,
  // not a discrete threshold + imperative Animated.timing toggle - the
  // previous version (a boolean isScrolled flipped past a fixed y, driving
  // a separate Animated.timing in a useEffect) only reliably re-expanded
  // once scrolling all the way back to the top, not on every scroll-up:
  // rapid direction changes near the threshold could re-trigger the
  // timing animation mid-flight repeatedly, and the *next* real value
  // change would always win, so a rapid scroll-up gesture could leave it
  // looking stuck collapsed until the scroll fully settled at y<=threshold.
  // A pure interpolation of the live scroll offset can't get stuck in an
  // intermediate state like that - same fix shape as
  // category-pills.tsx's own scroll-linked pinned-pill transition.
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  // Measured height of the floating back/brand pill row (backRow below),
  // including its own topPadding (status bar inset + gap) - used so the
  // hero image starts *below* the header on initial load instead of
  // immediately behind it, per explicit request: the header should only
  // start overlaying content once the user actually scrolls, not from the
  // very first frame. The row's own height is otherwise stable (only the
  // labels' *width* animates via headerLabelOpacity/backLabelWidth/
  // brandLabelWidth above, never the row's own height), so measuring it
  // once via onLayout is safe here - unlike the ancestor-is-itself-
  // animating case AGENTS.md warns against for measurement probes.
  const [headerHeight, setHeaderHeight] = useState(0);

  // Deliberately *not* spread across the same HEADER_COLLAPSE_DISTANCE as
  // the width shrink below - cross-fading both over the same range meant
  // numberOfLines={1} kept re-truncating the label against its own
  // shrinking maxWidth for most of the scroll, which read as the text
  // getting replaced letter by letter before finally vanishing. A
  // near-zero input range makes the fade an effectively instant swap right
  // at the very start of the scroll - full opacity only while at the very
  // top (scrollY exactly 0), gone for any scroll at all - so the label is
  // already invisible well before the shrinking width would visibly clip
  // it. Same technique, same reasoning, as category-pills.tsx's own
  // PinnedPill fullOpacity/collapsedOpacity.
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
    // false: width/maxWidth (see labelStyle below) is a layout property the
    // native driver can't animate - everything here already runs once per
    // scroll frame on the JS thread regardless (scrollEventThrottle).
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
  // On mount, the hero image should sit fully below the floating header,
  // not behind it - it's only once the user actually scrolls that content
  // is meant to pass underneath the header (see headerHeight's own
  // comment above). Before the header row's first onLayout measurement
  // lands, fall back to a generous estimate (topPadding plus a typical
  // pill height) so the image never briefly pokes out above the header
  // for that one frame either.
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
        {/* Same left-label/right-label shape as AppHeader (see
            app-header.tsx) on Home/Search/Preferences, adapted for this
            screen: back button (not the app mark) on the left, the app
            mark (not a profile button) on the right - and floating over
            scrolling content via GlassView rather than sitting in normal
            flow, matching how the back button already worked here. Both
            labels collapse together, in step with scroll position (see
            headerLabelOpacity/backLabelWidth/brandLabelWidth above). */}
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
  // Same header-clearing formula as the real ScrollView above (see
  // contentTopPadding's own comment there) - the skeleton's first block
  // stands in for the hero image, so it needs to start below the header
  // too, not just clear the status bar.
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
  // center, not flex-end - the pill previously anchored the icon and label
  // to their shared bottom edge (to keep a since-removed hard height:20
  // clip on the label wrapper from cutting into cross-script ascenders/
  // matras), but that clip is long gone: the label wrapper now sizes
  // purely from backGlyph's own generous lineHeight below, so this row's
  // cross-axis height already *is* that lineHeight, with real headroom on
  // both sides. Centering the icon within it is what actually reads as
  // vertically centered in the pill - bottom-anchoring instead visibly sat
  // the icon low, since the label's own headroom was all above it.
  backPressableRow: { flexDirection: "row", alignItems: "center" },
  // A generous lineHeight (not equal to fontSize) - same reasoning as the
  // font-size preview glyph fix in preferences/index.tsx: Devanagari/
  // Tamil/etc. glyphs need real headroom above fontSize itself or they
  // clip, and the label wrapper above no longer has its own fixed height
  // to clip them regardless (see backPressableRow's own comment).
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
  // Same shape as backGlass, on the opposite side.
  brandGlass: { alignSelf: "flex-start", borderRadius: Radius.full, overflow: "hidden" },
  // center - see backPressableRow's own comment for why (same shape, same
  // reasoning, mirrored for the logo instead of the chevron).
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
  // No longer alignSelf/marginTop'd for standalone placement - this now
  // lives inside metaRow, on the right, the same position/role as
  // story-detail-screen.tsx's own share button.
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
  // Matches story-detail-screen.tsx's own metaRow/metaTextBlock exactly:
  // source above, date/time (+ read time, folded into the same line) below,
  // on the left; share button on the right.
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
  // marginTop matches relatedSection's own below - both Spacing.three, the
  // same app-wide "gap between distinct blocks" standard used throughout
  // home/search/preferences (see AGENTS.md), not the larger, mismatched
  // values (four/five) this screen used before.
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
