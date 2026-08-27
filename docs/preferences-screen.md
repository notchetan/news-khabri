# Preferences screen layout details

Layout rationale specific to `preferences/index.tsx`, extracted out of the
component. See
[`cross-script-text-rendering.md`](./cross-script-text-rendering.md) for
the general cross-script glyph-centering lesson this screen's font-size
preview also relies on.

## Font-size preview height, reserved via a hidden probe

Switching between font sizes (small/medium/large) shouldn't visibly shift
the layout below the preview text. `previewHeight` is measured once from
a hidden probe (`previewProbeWrapper`, `height: 0` + `overflow: "hidden"`,
letting the `Text` inside lay out normally so `onLayout` measures its true
wrapped height) rendered at the *largest* font scale regardless of what's
currently selected, then applied as a fixed `minHeight` on the visible
preview text.

A fixed `minHeight` guess that happened to fit some sizes but not others
was tried first - small's own 1-line height was already well under that
guess, but the guess was still recomputed on every switch, which is what
actually produced the visible shift. Reserving the true worst case once,
from a probe, fixes it for every pair of sizes (small<->medium,
medium<->large, small<->large), not just the one it happened to be tuned
against.

## Font-size sample glyph centering

The sample glyph (`fontSizeSampleGlyph`) uses `lineHeight: Math.ceil(size
* 1.4)`, the same ratio as the general cross-script fix (see
`cross-script-text-rendering.md`) - a first attempt set `lineHeight ==
fontSize` exactly, tight enough to clip the top of taller scripts'
ascenders/matras (Hindi especially, at medium/large). 1.4x leaves real
headroom on every script tried, Latin included, while still comfortably
fitting the 40px circle at every size (13/17/21 -> ~18/24/29).

## Legal footer pinned above the tab bar

The About/Privacy/Terms links footer is pinned outside the `ScrollView`,
above the tab bar, rather than scrolling with everything else - a fixed
reference point (like iOS Settings' own app-version footer), not
something that scrolls out of view along with whichever toggle the user
was actually there to change. Because it's no longer inside the
`ScrollView`, it needs its own `NATIVE_TAB_BAR_HEIGHT` reservation (the
`ScrollView` itself never needed one - content simply scrolled past/under
the tab bar until this footer existed to anchor something there).

Its own divider uses `theme.textSecondary`, not `theme.backgroundSelected`
like the section dividers above it - matching the color already used for
the divider/back-arrow on the home page's category strip
(`category-pills.tsx`), since this divider sits directly above a
persistent, always-visible footer rather than marking a boundary between
two scrollable sections.

`legalLinksRow` renders one centered line with a dot between each link,
using the row's own `gap` uniformly between every child (link, dot, link,
dot, link) - the same "let flexbox gap own the spacing" approach used in
`category-pills.tsx`, rather than mismatched per-element margins.
