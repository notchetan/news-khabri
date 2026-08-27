# Article page header & layout details

Layout rationale specific to `article-detail-screen.tsx`, extracted out of
the component. See
[`animated-scroll-collapse.md`](./animated-scroll-collapse.md) for the
scroll-driven collapse animation itself, and
[`cross-script-text-rendering.md`](./cross-script-text-rendering.md) for
the header labels' text-clipping/alignment fixes.

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
