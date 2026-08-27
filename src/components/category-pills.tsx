import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  LayoutAnimation,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";

import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";

// LayoutAnimation needs an explicit opt-in on Android (iOS has it enabled by
// default) - still used below for the divider<->back-arrow swap, a genuine
// discrete "one element replaces another" change unlike the pinned pill's
// own text/width transition (see PinnedPill), which now tracks scroll
// position continuously instead.
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
  // A shorter form of the pinned (first) category's label to smoothly
  // shrink into as the user scrolls through the rest of the row - e.g.
  // "Top Stories" -> "Top" once the full label isn't needed for
  // recognition anymore and the room can go to the scrollable categories
  // instead. Optional: the pinned pill just keeps its full label unchanged
  // if this isn't given, since not every caller of this shared component
  // necessarily has a natural short form for whatever it pins.
  pinnedCollapsedLabel?: string;
  // Maps a raw category value to what's actually displayed - lets a caller
  // translate category names (see (home)/index.tsx) without this component
  // needing to know anything about i18n itself. Defaults to showing the
  // category value unchanged.
  getLabel?: (category: string) => string;
};

const SCROLL_BACK_THRESHOLD = 8;
// How much horizontal scroll the pinned pill's full<->collapsed transition
// is spread across - not a delay or a fixed-duration animation, a distance:
// scrollX (below) drives the interpolation directly, so scrubbing the strip
// slowly moves through the transition slowly and flicking it moves through
// fast, matching the scroll gesture 1:1 the way iOS's own collapsing
// titles/toolbars do, rather than a LayoutAnimation snap triggered once a
// threshold is crossed (the previous design).
const PINNED_PILL_COLLAPSE_DISTANCE = 60;

export default function CategoryPills({
  categories,
  selected,
  onSelect,
  pinnedCollapsedLabel,
  getLabel = (category) => category,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollBackAnimation = useRef<Animated.CompositeAnimation | null>(null);
  // The pinned pill's own full/collapsed label widths, measured here (not
  // inside PinnedPill itself) and passed down as plain props - see the two
  // MeasureProbes rendered below, and their own comment, for why this
  // measurement deliberately lives completely outside PinnedPill's animated
  // subtree.
  const [pinnedFullWidth, setPinnedFullWidth] = useState<number | null>(null);
  const [pinnedCollapsedWidth, setPinnedCollapsedWidth] = useState<number | null>(null);

  // Stop, rather than leak, the back-arrow's own scrollX animation (below)
  // if this whole strip unmounts mid-animation - e.g. navigating away right
  // after tapping the back arrow.
  useEffect(() => {
    return () => {
      scrollBackAnimation.current?.stop();
    };
  }, []);

  // The first category is always "All" (see index.tsx) - pin it outside the
  // scrollable region so it's never scrolled out of view, with the rest of
  // the categories in their own scrollable strip after a divider.
  const [pinned, ...scrollable] = categories;
  if (!pinned) return null;

  const pinnedFullLabel = getLabel(pinned);

  const scrollToStart = () => {
    scrollRef.current?.scrollTo({ x: 0, animated: true });
    // scrollX (and therefore the pinned pill's width/text interpolation)
    // is driven entirely by real onScroll native events - but those aren't
    // guaranteed to keep firing reliably for a *programmatic* animated
    // scroll like this one on every platform (a well-known RN gotcha, and
    // this button's whole purpose is exactly this kind of scroll). Without
    // this, tapping the back arrow could visually return the strip to x:0
    // while scrollX itself stays stuck at whatever it last was, freezing
    // the pinned pill mid-collapse - drive it back explicitly, in step
    // with the same animated scroll, instead of hoping the native bridge
    // cooperates.
    scrollBackAnimation.current = Animated.timing(scrollX, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    });
    scrollBackAnimation.current.start();
    // Same reasoning applies to isScrolled (the divider<->back-arrow swap):
    // it's normally set from the same real onScroll events, so it needs
    // the same explicit nudge here rather than waiting on them.
    if (isScrolled) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsScrolled(false);
    }
  };

  // The divider<->back-arrow swap is still a discrete, threshold-based
  // change (a genuinely different element appearing/disappearing, not a
  // continuous property) - scrollX above handles the pinned pill's own
  // continuous transition independently via Animated.event's listener
  // option below, both driven by the same onScroll.
  const handleScrollThreshold = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIsScrolled = event.nativeEvent.contentOffset.x > SCROLL_BACK_THRESHOLD;
    if (nextIsScrolled !== isScrolled) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsScrolled(nextIsScrolled);
    }
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    // false: the pinned pill interpolates `width` below, a layout property
    // the native driver can't animate - everything here already runs once
    // per scroll frame on the JS thread regardless (scrollEventThrottle).
    { useNativeDriver: false, listener: handleScrollThreshold }
  );

  return (
    <View style={styles.row}>
      <View style={styles.pinnedContainer}>
        <PinnedPill
          fullLabel={pinnedFullLabel}
          collapsedLabel={pinnedCollapsedLabel}
          fullWidth={pinnedFullWidth}
          collapsedWidth={pinnedCollapsedWidth}
          scrollX={scrollX}
          isActive={selected === pinned}
          onPress={() => onSelect(pinned)}
        />
      </View>

      {/* Both probes live here, siblings of PinnedPill rather than inside
          it, and are entirely independent of each other (no shared
          wrapper) - deliberately outside PinnedPill's own animated,
          shrinking, overflow:"hidden" width so neither measurement can
          ever be affected by it. A previous version measured them *inside*
          that same animated container: correct on first mount, but wrong
          specifically after a scroll-and-back cycle - this removes that
          shared ancestry entirely rather than trying to reason out exactly
          why. Each is position:"absolute" with no inset props (so it
          self-measures via onLayout without affecting this row's own
          layout at all) and opacity:0 (paint-time only, so it never
          constrains its own child's real measured size the way a
          height:0/overflow:"hidden" clip could). */}
      {pinnedCollapsedLabel != null && (
        <>
          <MeasureProbe
            testID="pinned-pill-full-measure"
            label={pinnedFullLabel}
            onMeasured={setPinnedFullWidth}
          />
          <MeasureProbe
            testID="pinned-pill-collapsed-measure"
            label={pinnedCollapsedLabel}
            onMeasured={setPinnedCollapsedWidth}
          />
        </>
      )}

      {scrollable.length > 0 && (
        <>
          {/* Both the divider and the back arrow live in this one
              fixed-width slot, rather than each being its own bare flex
              item, so swapping between them (a 2px-wide divider vs. a
              ~20px-wide icon) never itself changes the row's total width -
              that mismatch was what caused the ScrollView after it to
              visibly jump sideways on every swap. The slot's own width
              never changes, only what's centered inside it does. */}
          <View testID="category-pills-divider-slot" style={styles.dividerSlot}>
            {!isScrolled && (
              <View
                testID="category-pills-divider"
                // textSecondary - the same color the back arrow's own icon
                // uses (see tintColor below) - so the two things that occupy
                // this exact same slot read as one consistent element, not
                // two different colors depending on scroll state. Still the
                // *current* scheme's own token (not the other scheme's, as
                // this once mistakenly used), so it stays guaranteed to
                // contrast against its own background either way.
                style={[styles.divider, { backgroundColor: theme.textSecondary }]}
              />
            )}
            {isScrolled && (
              <TouchableOpacity
                onPress={scrollToStart}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("scrollToFirstCategory")}
                style={styles.backArrow}
              >
                <SymbolView
                  name="chevron.left"
                  size={20}
                  weight="bold"
                  tintColor={theme.textSecondary}
                  fallback={
                    <Text style={[styles.backArrowText, { color: theme.textSecondary }]}>
                      ‹
                    </Text>
                  }
                />
              </TouchableOpacity>
            )}
          </View>
          <ScrollView
            ref={scrollRef}
            testID="category-pills-scroll-view"
            horizontal
            showsHorizontalScrollIndicator={false}
            // The pinned pill's collapse is driven by real contentOffset.x
            // values over a fixed [0, PINNED_PILL_COLLAPSE_DISTANCE] range,
            // regardless of how much is actually scrollable - fine normally
            // (extrapolate: "clamp" keeps anything past that range steady),
            // but a fast fling's native rubber-band bounce can overshoot
            // past the real end and spring back several times before
            // settling, generating oscillating contentOffset.x values. For
            // a language with few categories (a short scrollable range,
            // e.g. Marathi's 4), that overshoot-and-settle repeatedly
            // sweeps back through the *whole* [0, 60] range instead of
            // safely past it, visibly making the pinned pill's width/text
            // jitter each bounce cycle - not reproducible with more
            // categories (English's 10), where the same bounce still
            // happens but far past 60, already fully clamped. Disabling
            // the bounce/overscroll effect here removes the oscillating
            // input at its source, rather than trying to make the
            // interpolation itself robust against arbitrarily large swings.
            bounces={false}
            overScrollMode="never"
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={styles.scrollView}
            contentContainerStyle={styles.container}
          >
            {scrollable.map((cat) => (
              <Pill
                key={cat}
                category={cat}
                getLabel={getLabel}
                isActive={selected === cat}
                onPress={() => onSelect(cat)}
              />
            ))}
          </ScrollView>
        </>
      )}
    </View>
  );
}

// The pinned (first) pill specifically - the only one that ever collapses
// to a shorter label, so the scroll-linked animation machinery lives here
// rather than in the plain Pill below (used for every other, non-collapsing
// pill).
function PinnedPill({
  fullLabel,
  collapsedLabel,
  fullWidth,
  collapsedWidth,
  scrollX,
  isActive,
  onPress,
}: {
  fullLabel: string;
  collapsedLabel?: string;
  // Measured by the caller (see the two MeasureProbes in CategoryPills'
  // own render, and their comment) rather than here - this component no
  // longer measures anything itself.
  fullWidth: number | null;
  collapsedWidth: number | null;
  scrollX: Animated.Value;
  isActive: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const canCollapse = collapsedLabel != null;
  const color = isActive ? theme.tintText : theme.textSecondary;

  const animatedWidth =
    canCollapse && fullWidth != null && collapsedWidth != null
      ? scrollX.interpolate({
          inputRange: [0, PINNED_PILL_COLLAPSE_DISTANCE],
          outputRange: [fullWidth, collapsedWidth],
          extrapolate: "clamp",
        })
      : undefined;

  // The text swap is intentionally *not* spread across the same distance
  // as the width shrink above - cross-fading both over PINNED_PILL_COLLAPSE_
  // DISTANCE meant that for most of a slow scroll, the box was some
  // in-between width while both labels were partway visible, and neither
  // one actually fit that width, so they visibly overlapped/collided. A
  // near-zero input range makes this an effectively instant swap right at
  // the very start of the scroll - "Top Stories" only while the pill is at
  // its full width (scrollX exactly 0), "Top" for any scroll at all - while
  // the width itself keeps shrinking smoothly over the full distance.
  const fullOpacity = scrollX.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const collapsedOpacity = scrollX.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      testID="pinned-pill"
      style={[
        styles.pill,
        { backgroundColor: isActive ? theme.tint : theme.backgroundElement },
        canCollapse && styles.pinnedPillFixed,
        animatedWidth != null && { width: animatedWidth, overflow: "hidden" },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
        // Always the full label, deliberately ignoring the collapsed
        // cross-fade - a screen reader should still announce the complete
        // name even once the pill has visually shrunk.
        accessibilityLabel={fullLabel}
        style={canCollapse && styles.pinnedPillInner}
      >
        {canCollapse ? (
          <>
            <Animated.Text
              testID="pinned-pill-full-text"
              numberOfLines={1}
              style={[styles.pillText, styles.pinnedPillOverlayText, { color, opacity: fullOpacity }]}
            >
              {fullLabel}
            </Animated.Text>
            <Animated.Text
              testID="pinned-pill-collapsed-text"
              numberOfLines={1}
              style={[styles.pillText, styles.pinnedPillOverlayText, { color, opacity: collapsedOpacity }]}
            >
              {collapsedLabel}
            </Animated.Text>
          </>
        ) : (
          <Text style={[styles.pillText, { color }]}>{fullLabel}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// Measures one label's own natural pill width via onLayout, entirely
// independent of any other probe or of PinnedPill's own animated width -
// see the render comment in CategoryPills for why that independence
// matters here specifically.
function MeasureProbe({
  testID,
  label,
  onMeasured,
}: {
  testID?: string;
  label: string;
  onMeasured: (width: number) => void;
}) {
  const handleLayout = (event: LayoutChangeEvent) => {
    onMeasured(event.nativeEvent.layout.width);
  };

  return (
    <View
      testID={testID}
      onLayout={handleLayout}
      pointerEvents="none"
      accessible={false}
      style={[styles.pill, styles.measureProbe]}
    >
      <Text style={styles.pillText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function Pill({
  category,
  displayLabel,
  getLabel,
  isActive,
  onPress,
}: {
  // The real category value - always used for the selection/onPress
  // contract, regardless of what's visually shown.
  category: string;
  // What's actually rendered, if it should differ from getLabel(category).
  displayLabel?: string;
  getLabel: (category: string) => string;
  isActive: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const fullLabel = getLabel(category);
  const label = displayLabel ?? fullLabel;

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={fullLabel}
      style={[
        styles.pill,
        { backgroundColor: isActive ? theme.tint : theme.backgroundElement },
      ]}
    >
      <Text
        style={[
          styles.pillText,
          { color: isActive ? theme.tintText : theme.textSecondary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// The screen-edge padding (pinned pill's left edge, and the scroll strip's
// trailing right edge) - kept at Spacing.three specifically so the pinned
// pill's left edge lines up with the article/story cards' own left edge
// below it, both starting from the same token. Deliberately a *different*
// value from PILL_ITEM_GAP below: that edge alignment is a fixed design
// constraint, while the space between the pills themselves is just a
// visual density choice, and 16px there read as too much white space.
const PILL_GAP = Spacing.three;
// The gap between items within the row: pinned pill -> divider (unscrolled)
// or back arrow (scrolled - the divider hides once the arrow appears,
// since the arrow already separates the pinned pill from the scrollable
// ones just as clearly, and showing both just burns an extra gap's worth
// of width for no added meaning), divider/back arrow -> first scrollable
// pill, and between each scrollable pill thereafter. Driven by `row`'s own
// `gap` below rather than scattered margin/padding on each individual
// piece - that per-piece approach is what let the actual gaps drift apart
// (the back arrow's own touch-padding was stacking with the divider's
// margin on one side while providing less than a full gap on the other).
const PILL_ITEM_GAP = 14;

const styles = StyleSheet.create({
  row: {
    height: 56,
    flexShrink: 0,
    flexGrow: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: PILL_ITEM_GAP,
  },
  pinnedContainer: { paddingLeft: PILL_GAP },
  // Fixed width so swapping between the divider and the back arrow never
  // itself changes the row's layout (see the render comment above). This
  // was 20 (the icon's own `size` prop) at first, but that's the icon's
  // bounding box, not its actual rendered ink - a left-chevron glyph is
  // narrower than it is tall, so most of that 20px was dead space the
  // *divider* then also got centered inside, on top of its own row gap,
  // reading as a much bigger gap around the divider specifically than
  // everywhere else in the row. 14 is a closer (still estimated, not
  // measured) fit for the chevron's own true width.
  dividerSlot: { width: 14, alignItems: "center", justifyContent: "center" },
  divider: { width: 2, height: 24, borderRadius: 1 },
  // No horizontal padding - hitSlop below already gives this a comfortable
  // touch target without also widening the *visual* gap on either side
  // beyond what `row`'s gap already provides.
  backArrow: { paddingVertical: 8 },
  backArrowText: { fontSize: 20, fontWeight: "700" },
  scrollView: { flexShrink: 1, flexGrow: 0 },
  container: {
    // No paddingLeft here - `row`'s own gap already supplies the space
    // before this ScrollView (from the divider or the back arrow,
    // whichever immediately precedes it); adding one here too would double it.
    paddingRight: PILL_GAP,
    paddingVertical: 10,
    gap: PILL_ITEM_GAP,
    alignItems: "center",
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    // Already a fully-round capsule at this size (radius >= half the
    // pill's own height) - Radius.full just makes that explicit/consistent
    // rather than hardcoding a number that happens to be big enough.
    borderRadius: Radius.full,
  },
  pillText: { fontSize: 14, fontWeight: "500" },
  // The collapsible pinned pill's own horizontal padding moves onto
  // pinnedPillInner instead, since pinnedPillFixed zeroes it out here - the
  // padding needs to live around the *text content*, whose own natural
  // sizing (from the probes below) already accounts for it, not doubled up
  // on the outer box too.
  pinnedPillFixed: { paddingHorizontal: 0 },
  pinnedPillInner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  // Both labels stack on the exact same spot so the opacity cross-fade
  // reads as one label smoothly turning into the other, not two texts
  // sliding past each other.
  pinnedPillOverlayText: { position: "absolute" },
  // position: "absolute" (with no top/left/right/bottom) takes each probe
  // fully out of this row's own flex layout - it self-measures via
  // onLayout independently, but never affects (or is affected by) any
  // sibling's size, unlike the shared, in-flow wrapper a previous version
  // used, which is what caused this whole feature's very first bug (two
  // probes stretched to the same resolved width by their column parent's
  // default alignItems: "stretch"). opacity: 0 (not height: 0 +
  // overflow: "hidden") hides it purely at paint time, so nothing here
  // ever constrains the probe's own natural size either.
  measureProbe: { position: "absolute", opacity: 0 },
});
