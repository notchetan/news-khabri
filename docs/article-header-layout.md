# Article page header & layout details

Layout rationale for the floating back/brand header
(`floating-detail-header.tsx`), extracted out of `article-detail-screen.tsx`
originally - see "Shared between article and story screens" below - and
for `article-detail-screen.tsx`'s own remaining layout. See
[`animated-scroll-collapse.md`](./animated-scroll-collapse.md) for the
scroll-driven collapse animation itself, and
[`cross-script-text-rendering.md`](./cross-script-text-rendering.md) for
the header labels' text-clipping/alignment fixes.

## Shared between article and story screens

`floating-detail-header.tsx` was originally `article-detail-screen.tsx`'s
own JSX. Extracted after `story-detail-screen.tsx` was found still using
an older, plain in-flow back button - it had simply never been updated
when the article screen gained this floating GlassView header, since the
two screens never actually shared code for it. Both now render the same
component (`testIDPrefix` distinguishes their tests), so this class of
drift isn't possible again.

## `GlassView`'s non-iOS fallback

`GlassView`'s real frosted-glass rendering - the pill's only visual
background, neither pill sets one of its own otherwise - is iOS-only;
everywhere else it silently falls back to a plain, fully transparent
`View` (see `expo-glass-effect`'s own `GlassView.tsx`), leaving the
chevron/logo floating with no pill backdrop at all, especially illegible
over a busy hero image. `floating-detail-header.tsx`'s `glassFallbackStyle`
stands in with a solid `theme.backgroundElement` fill (the same "raised
surface" token used elsewhere, e.g. the share button) wherever glass is
actually unavailable, without double-drawing on top of the real thing.

Whether it's available is checked once via `isLiquidGlassAvailable()`,
computed at module scope rather than per-render. That function calls into
the real native module on iOS and *throws* (not just warns, unlike
`GlassView` itself) when the module isn't present - true in the Jest test
environment, where `jest-expo`'s own `NativeViewManagerAdapter` mocking
covers `GlassView`'s rendering but not this direct native call. Hence the
try/catch at module scope, defaulting to "no glass" on any failure rather
than re-attempting (and re-throwing) on every render.

## Hero image starts below the header, not behind it

The floating back/brand pill row (`backRow`) is absolutely positioned over
the scrolling content, matching `AppHeader`'s left-label/right-label shape
on Home/Search/Preferences (back button instead of the app mark on the
left, the app mark instead of a profile button on the right). Content is
deliberately allowed to scroll *behind* it - but only once the user
actually scrolls, not from the very first frame.

To get that, the scroll content's top padding (`contentTopPadding`) is
driven by the header row's own measured height (`headerHeight`, set via
`onLayout` on `backRow`) plus a small gap, rather than just the status bar
inset. Before that first measurement lands, it falls back to a generous
estimate (`topPadding + 44`) so the hero image never briefly pokes out
above the header for that one frame either. The header row's own height is
otherwise stable (only the labels' *width* animates, never the row's own
height - see `animated-scroll-collapse.md`), so measuring it once via
`onLayout` here is safe, unlike the ancestor-is-itself-animating case
`AGENTS.md` warns against for measurement probes generally.

`ArticleDetailSkeleton` uses the exact same formula (its first block
stands in for the hero image, so it needs to start below the header too),
receiving `headerHeight`/`topPadding` as props from the parent rather than
measuring anything itself.

## Status bar scrim vs. the floating header

Scrolling content is allowed to flow behind the floating back/brand pills
themselves, but never behind the status bar strip above them - a separate
opaque `statusBarScrim` view pins to exactly `insets.top` so the
clock/battery/carrier text always has a solid backdrop, independent of
where the pills currently are.

## Pill shape

`backGlass`/`brandGlass` are plain circular (not the app's usual Squircle
shape) on purpose: they clip a native `GlassView` blur, which can't be
shaped by the app's SVG squircle path without deeper native integration -
a circle here is visually identical to a squircle anyway once the radius
exceeds half the pill's own height, which it does at this size.

## Matching story-detail-screen's meta layout

The source/date/read-time block (`metaRow`/`metaTextBlock`) and the share
button's position (inside `metaRow`, on the right) intentionally mirror
`story-detail-screen.tsx`'s own layout exactly, rather than the article
page's own previous design (share button standalone, above this row). Any
change to one should usually be made to both.

## Spacing consistency with the rest of the app

`readOriginal` and `relatedSection`'s `marginTop` both use `Spacing.three`
- the same "gap between distinct blocks" standard used throughout
home/search/preferences (see the frontend `AGENTS.md`), not the larger,
mismatched values (`Spacing.four`/`Spacing.five`) this screen used before
those pages were aligned to the same standard. The `readOriginal` divider
color (`theme.textSecondary`) also matches the preferences footer
divider's own color, not the subtler tone the related-articles rows below
still use for their own separators.
