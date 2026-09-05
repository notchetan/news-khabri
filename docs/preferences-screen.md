# Preferences screen layout details

Layout rationale specific to `preferences/index.tsx`, extracted out of the
component. See
[`cross-script-text-rendering.md`](./cross-script-text-rendering.md) for
the general cross-script glyph-centering lesson this screen's font-size
preview also relies on.

## Font-size preview height: sized to content, not reserved

The preview text sizes to its own content. `numberOfLines` (3) stays as a
safety cap so a pathological string can't run away with the layout, but
there is no `minHeight`.

It used to reserve three worst-case lines so that switching size wouldn't
shift the layout below. Two things were wrong with that. The reservation
was sized on the premise that "every locale's `fontPreviewText` is one
short sentence (~40-55 characters)" - true only of English (56); the
Indic strings run 101-139 characters. And because those scripts still
render in one or two lines, reserving three left roughly 52pt of dead
space under this one section in most locales - conspicuous on a screen
where every other section sits flush against its divider. It was reported
from a device as "a large white space below the font size toggle".

Sizing to content trades that permanent gap for a one-line nudge of the
content below, and only while the reader is actively working this control
- where it doubles as feedback that their choice took effect.

Before the reservation, this was measured from a hidden zero-height
`onLayout` probe. That is not worth bringing back: the probe was real
machinery (a wrapper style, a state value, a layout handler) and the
thing it computed is no longer needed at all.

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

## Sources vs. Notifications: different sign-in gating

The two rows look inconsistent at a glance - Sources stays visible but
fully disabled until signed in, while Notifications keeps a plain on/off
`Switch` (defaulting "on" to 15 minutes) even when signed out. This is
intentional, not drift: notification delivery already works for an
anonymous device (the backend keys a push subscription off the Expo push
token itself, not an account), so gating it entirely would remove
something readers already had before this feature existed. Source
filtering has no equivalent anonymous-capable fallback worth keeping - the
full 5/15/30/60/120-minute interval picker is what actually needs an
account, since that choice has to persist across devices/reinstalls.
