# Scroll-linked collapse animations

Two places in the app collapse a label/UI element continuously as the user
scrolls, rather than snapping at a threshold: the pinned category pill
("Top Stories" -> "Top" in `category-pills.tsx`) and the article page's
floating header labels (`article-detail-screen.tsx`). Both share the same
underlying pattern and the same set of hard-won lessons, documented once
here instead of duplicated at each call site.

## Continuous interpolation, not a threshold + imperative animation

Both features drive their collapse off a live `Animated.Value` fed by real
`onScroll` events (`scrollX`/`scrollY`), interpolated with
`extrapolate: "clamp"`, rather than a boolean state flipped past a fixed
threshold that then triggers a separate imperative `Animated.timing` in a
`useEffect`.

The article header used the threshold approach first, and it had a real
bug: a rapid scroll-up gesture that didn't fully settle back below the
threshold could re-trigger the timing animation mid-flight repeatedly, and
the *next* value change would always win - visually this read as "the
header only re-expands once you scroll all the way back to the top," not
on every scroll-up. A pure interpolation of the live scroll offset can't
get stuck in an intermediate state that way: reversing scroll direction at
any point immediately starts reversing the animated value too, since
there's no separate animation to get out of sync with the real scroll
position.

## Width shrinks smoothly; opacity swaps almost instantly

Both features shrink their element's width over the full collapse
distance (`PINNED_PILL_COLLAPSE_DISTANCE` / `HEADER_COLLAPSE_DISTANCE`,
60), but fade the *label text's* opacity over a near-zero range
(`[0, 1]`) instead of the same distance.

This was originally one interpolation shared across both properties, and
it caused two different visible problems depending on the context:

- **category-pills**: cross-fading two different labels ("Top Stories" /
  "Top") over the full distance meant that for most of a slow scroll, the
  box sat at some in-between width while both labels were partway
  visible - neither one actually fit that width, so they visibly
  overlapped/collided.
- **article-detail-screen**: a single label (e.g. " Back") shrinking its
  own `maxWidth` while `numberOfLines={1}` kept re-truncating it read as
  the text getting replaced letter by letter before finally vanishing,
  rather than a clean disappearance.

Making the opacity fade near-instant (full width label visible only at
scroll position exactly 0, invisible for any scroll past that) fixes both:
the label is already fully transparent well before the shrinking width
would otherwise visibly clip or overlap it, while the width itself still
shrinks and grows smoothly in step with the real scroll position.

## Fast-fling scroll-bounce can jitter a short collapse range

`category-pills.tsx`'s pinned pill collapse is driven by real
`contentOffset.x` values over a fixed `[0, PINNED_PILL_COLLAPSE_DISTANCE]`
range, regardless of how much content is actually scrollable. That's fine
normally (`extrapolate: "clamp"` keeps anything past the range steady) -
but a fast fling's native rubber-band bounce can overshoot past the real
scrollable end and spring back several times before settling, generating
oscillating `contentOffset.x` values.

For a language with only a few categories (a short scrollable range - e.g.
Marathi's 4), that overshoot-and-settle repeatedly sweeps back through the
*whole* `[0, 60]` collapse range instead of landing safely past it,
visibly making the pinned pill's width/text jitter on every bounce cycle.
This isn't reproducible with more categories (English's 10), where the
same bounce still happens but lands far past 60, already fully clamped.

Fixed by disabling the scroll view's bounce/overscroll effect entirely
(`bounces={false}` on iOS, `overScrollMode="never"` on Android) - this
removes the oscillating input at its source, rather than trying to make
the interpolation itself robust against arbitrarily large swings.

## Driving a scroll-linked value back explicitly on a programmatic scroll

Native `onScroll` events aren't guaranteed to keep firing during a
*programmatic* animated `scrollTo()` on every platform. `category-pills`'s
"scroll back to start" button (the back-arrow) triggers exactly this kind
of scroll, so if `scrollX` (and therefore the pinned pill's width/text
interpolation) only ever updated from real scroll events, tapping the
button could visually return the strip to `x: 0` while `scrollX` itself
stayed stuck wherever it last was - freezing the pinned pill mid-collapse.

The fix is to drive `scrollX` back to 0 explicitly, via its own
`Animated.timing`, in step with the same `scrollTo()` call - not to rely
on the real scroll event to do it. The same reasoning applies to the
divider<->back-arrow swap state (`isScrolled`), which normally also only
updates from real scroll events and needs the same explicit nudge here.

## Measuring both label widths independently, outside the animated subtree

`category-pills.tsx` measures the pinned pill's full and collapsed label
widths via two `MeasureProbe` components rendered as *siblings* of
`PinnedPill`, not inside it, and entirely independent of each other (no
shared wrapper).

A previous version measured them *inside* the same animated,
`overflow: "hidden"`, shrinking-width container - correct on first mount,
but wrong specifically after a scroll-and-back cycle. Rather than
reasoning out the exact mechanism, the fix removes the shared ancestry
entirely: each probe is `position: "absolute"` with no inset props (so it
self-measures via `onLayout` without affecting the row's own layout at
all) and `opacity: 0` (paint-time only, so it never constrains its own
child's real measured size the way a `height: 0` + `overflow: "hidden"`
clip could).

This mirrors the general onLayout-probe guidance in `AGENTS.md`: two
probes sharing one column-direction wrapper get silently stretched to the
same resolved width by that wrapper's default `alignItems: "stretch"`,
and a probe nested inside an animated ancestor can measure correctly on
first mount and silently go wrong after the ancestor's size changes once.
