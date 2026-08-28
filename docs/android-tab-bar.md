# Android native tab bar notes

Three separate gaps found via live emulator testing (not achievable
through reasoning alone - see `AGENTS.md`'s testing-discipline section on
why this app usually can't verify visual/native behavior without a real
device).

## Every `<Icon>` needs `androidSrc`

SF Symbols (`sf` prop) don't exist on Android. `app-tabs.tsx`'s
`<NativeTabs.Trigger>`s each pass `androidSrc` alongside `sf`, via
`expo-router`'s own `<VectorIcon>` helper (`@expo/vector-icons` under the
hood) - without it, Android's tab bar has no icon *and* no label (labels
are deliberately hidden, each tab's name shows in its own screen header
instead - see `AppTabs`'s own comment), which reads as a completely
empty bar rather than just a missing icon.

## `NATIVE_TAB_BAR_HEIGHT`'s Android value: 80dp, not 56dp

The Android value was originally set to 56dp (the older Material 2
`BottomNavigationView` spec) as a reasoning-only guess, before this app
had live device access to verify it. A real emulator's `uiautomator dump`
later measured the actual rendered tab bar and found it flush against
Material 3's `NavigationBar` spec (80dp) instead - confirmed concretely
by the preferences screen's legal-links footer landing exactly at the tab
bar's own top edge with zero clearance when the constant was still 56.

## Every screen needs its own bottom-tab-bar padding reservation

`useSafeAreaInsets().bottom` doesn't include the tab bar's own height
(see `AGENTS.md`) - `NATIVE_TAB_BAR_HEIGHT` has to be added on top,
and every screen that scrolls content behind the tab bar needs to do
this itself, screen by screen (there's no single shared layout owner to
put it in once).

This matters more on Android than iOS: iOS's tab bar is translucent, so
content scrolling behind it stays legible, just dimmed - a screen that
forgets the reservation still "works," if not ideally. Android's tab bar
is opaque, so the same missing reservation fully hides whatever's behind
it. `legal-document-screen.tsx` (and by extension every screen it backs -
About/Privacy/Terms/Language) and the Home tab's own screen both went
through a period of simply never having this reservation at all, since
neither predates `NATIVE_TAB_BAR_HEIGHT`'s introduction - unlike
`article-detail-screen.tsx`/`search/index.tsx`/`preferences/index.tsx`,
which had it from early on.
