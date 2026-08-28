# Fixing the white flash on screen navigation

A brief flash of the wrong background color appeared on every push/pop
transition (article <-> home, language-select <-> preferences, etc.),
even after the app had its own custom color palette wired up everywhere
else. Fixed on Android and mostly-fixed on iOS across five layers - two
in `src/app/_layout.tsx`, one via a `patch-package` patch, one via a
custom Android config plugin, one via `NativeTabs`' own props - because
the color is painted by several different things at several different
points in a transition.

One remaining artifact, isolated to iOS 26's native push-transition
compositing specifically, is a **known, accepted issue for now** - see
Layer 6 for the two real fixes found (both would have worked) and why
neither shipped.

## Layer 1: React Navigation's own `Theme` object

`@react-navigation/native`'s stock `DefaultTheme`/`DarkTheme` use their
own colors (`DefaultTheme.background` is `rgb(242,242,242)`, a light
gray - not this app's own warm cream `#FAF7F2`; `DarkTheme.background` is
`rgb(1,1,1)`, not this app's own `#17140F`). This `Theme` is what every
`Stack` (the root one, and every nested one, e.g.
`preferences/_layout.tsx`'s own, since they all read from the same single
`ThemeProvider` ancestor) uses as a screen's *native* default background,
underneath whatever the screen's own React content paints.

A push/pop transition briefly reveals that native layer before the
screen's own content finishes painting over it - with the stock colors,
that read as a flash of "white" in light mode against this app's cream
(`rgb(242,242,242)` is close enough to white to look like a mismatch) on
every transition.

Fix: `AppLightTheme`/`AppDarkTheme` override `background` (and `card`,
used by some transition presets for the same purpose) to this app's own
tokens - this fixes the color actually shown during that brief frame,
rather than trying to eliminate the frame itself.

## Layer 2: the native root view, below React Navigation entirely

Overriding the `Theme` object alone didn't fully fix the flash - it's
still reported live even with `AppLightTheme`/`AppDarkTheme` in place,
because that only recolors the JS-level Stack transition backdrop (read
by `native-stack/.../NativeStackView.native.tsx`'s own `contentStyle`).

The *native* root view sits one layer further down, underneath React
Navigation entirely, and defaults to plain white regardless of that
theme. `react-native-screens`' push/pop transitions (Fragment
transactions on Android, `UIViewController` transitions on iOS) can
briefly reveal that native backdrop at a screen's edges before its own
content view has finished compositing over it - exactly the "white
surrounding" flash still visible on article/language-select navigation
even after the `Theme` fix.

Fix: `expo-system-ui`'s `setBackgroundColorAsync`, called on every
`resolvedScheme` change, keeps the native root view's own background
synced with the current theme too - closing the gap at the layer the JS
`Theme` object can't reach.

## Layer 3: the native `Screen` component itself, per pushed route

Even with both layers above in place, the flash was *still* reported live
on real pushes (article, language-select). `expo-system-ui`'s Layer 2 fix
only reaches the app's single shared root window/root view - it does
nothing for a screen that `react-native-screens` pushes onto the native
stack, since each pushed screen gets its *own* native `UIViewController`
(iOS) / Fragment (Android) with its *own* independent default background,
entirely separate from the app's root view.

Reading `react-native-screens`' actual source
(`node_modules/react-native-screens/src/components/ScreenStackItem.tsx`,
the file Metro actually bundles - its `package.json`'s `"react-native"`
field points at `src/index`, not the compiled `lib/` output) confirmed
this precisely: `contentStyle` (what Layer 1's Theme override ultimately
flows into, via native-stack's own `NativeStackView.native.tsx`) is only
ever applied to an *inner* JS `View` (`DebugContainer`) wrapping the
screen's content - never to the native `Screen` component's own `style`
prop, which is what the OS actually paints first, before that inner View
has rendered. There's a real exception already in the library for exactly
this problem, `internalScreenStyle`, which lifts `contentStyle`'s
`backgroundColor` onto the native `Screen`'s own `style` directly (the
layer that's actually visible during the transition) - but upstream it's
gated to `stackPresentation === 'formSheet'` only, added as a workaround
for a *different*, formSheet-specific truncated-content bug, not this
one. This app only ever uses `'push'`, so that gate meant the fix that
already exists in the library for this exact mechanism never ran for any
screen this app pushes.

Fix: `patches/react-native-screens+4.16.0.patch` (`patch-package`, same
mechanism as `patches/react-native-render-html+6.3.4.patch` - see
`AGENTS.md`) extends that gate to `stackPresentation === 'push'` too, so
the real native transition layer carries the app's own background color
from the very first frame, closing the last gap.

## Layer 4: Android's static `windowBackground` theme attribute

Even with all three layers above, live testing on a real Android emulator
still showed a brief flash - not a full-screen wash this time, but white
specifically at the four corners on a page change, gone once the new
screen finished loading. Android's edge-to-edge rounded-corner mask (the
overlay that clips content to the device's physical corner radius) is
drawn by the OS sampling the *window's* own static `android:windowBackground`
theme attribute - a different, lower layer than any of the three above,
all of which only take effect once JS has run (Layer 1's `Theme` object,
Layer 2's `setBackgroundColorAsync` runtime call, and Layer 3's per-Screen
`contentStyle`). `AppTheme` in `android/app/src/main/res/values/styles.xml`
never had `android:windowBackground` set at all, so it fell back to
`Theme.AppCompat.DayNight`'s own default (plain white in light mode) -
exactly what the corner mask briefly showed.

`expo-system-ui`'s own config plugin (as opposed to its runtime API used
for Layer 2) can set this, but only from a single
`expo.android.backgroundColor` - no light/dark split, unlike
`expo-splash-screen`'s plugin (which does support a `dark` sub-key,
already used for this app's splash screen). Since `android/` itself is
gitignored and regenerated by `expo prebuild` (see `AGENTS.md`), hand-
editing `styles.xml` directly wouldn't survive the next prebuild or EAS
build - the fix has to live at the config-plugin level.

Fix: `plugins/with-android-root-view-background.js`, a small local Expo
config plugin (registered in `app.json`'s `plugins` array) that mirrors
what `expo-splash-screen`'s plugin already does for
`splashscreen_background` - writes the color to both
`values/colors.xml` and `values-night/colors.xml` (via
`@expo/config-plugins`' `withAndroidColorsNight`, the same night-qualifier
mechanism Android already resolves automatically for
`Theme.AppCompat.DayNight`), then points `AppTheme`'s
`android:windowBackground` at that color. Correct from the very first
native frame, no JS involved at all.

## Layer 5: `NativeTabs`' own props (necessary, not sufficient)

A screen recording from a real iPhone (not something this session could
otherwise verify - see the caveat in `AGENTS.md`'s testing-discipline
section) showed the flash was never actually fixed on iOS either, despite
all four layers above already being in place there too (none of them are
Android-specific by construction, Layer 4 aside). The recording showed
something structurally different from a full-screen wash: a light/cream
band specifically across the status-bar area and the tab-bar area, with
correctly-dark app content sandwiched in between - i.e. isolated to
exactly the native chrome `expo-router/unstable-native-tabs`' `NativeTabs`
owns, not the per-screen content any of layers 1-4 touch.

The working theory at the time: this app has its own in-app
light/dark/system preference, independent of the device's actual OS-level
appearance setting - a user can force dark in-app while their phone is
set to system light. RN content follows that in-app choice correctly
(it's plain React state). `NativeTabs`' tab bar, however, is a genuinely
native `UITabBarController` bar with its own translucent blur material -
`expo-system-ui`'s Layer 2 sync only reaches the RN root view, never this
sibling native layer, so left unset, that material follows the OS's
*actual* system trait instead of the app's in-app override.

`app-tabs.tsx` already themes `indicatorColor`/`iconColor`/`labelStyle`
on `<NativeTabs>` but had never set its `backgroundColor` or `blurEffect`
props (confirmed via `expo-router`'s own `NativeTabsProps` type -
`backgroundColor: ColorValue | null` and `blurEffect: NativeTabsBlurEffect`,
the latter accepting explicit `'systemMaterialDark'`/`'systemMaterialLight'`
values that lock the blur to a specific appearance rather than following
the system trait). Set both from the app's own `resolvedScheme`, the same
source every other themed prop on this component already uses - a real,
worthwhile fix (a genuinely unset prop), kept regardless of what follows.

But a second iPhone recording after this landed showed the flash
unchanged, disproving the "shared tab-bar chrome" half of this theory:
the light patch's edge tracked the *individual sliding screen's* own
leading corner (a curved diagonal, not a flat band spanning the full tab
bar width), so it can't be one single shared native-tabs-level view. See
Layer 6.

## Layer 6: an upstream `react-native-screens` bug, fixed by upgrading

The real cause, per the corrected geometry from Layer 5: it belongs to
the individual pushed screen, on iOS 26 specifically. Searched the
`react-native-screens` changelog (this app was pinned to `4.16.0`, the
exact version Expo SDK 54 bundles) for anything iOS-26-and-corner/
background-shaped, and found an exact match in `4.17.0`'s release, whose
own release notes lead with "Important patches for iOS 26 behaviour":

- [#3279](https://github.com/software-mansion/react-native-screens/pull/3279) -
  `ios/bottom-tabs/RNSBottomTabsScreenComponentView.mm`: a tabs-background
  workaround was hardcoded to `[UIColor whiteColor]`, fixed to
  `[UIColor systemBackgroundColor]` - explicitly to "prevent incorrect tab
  bar appearance after tab change on iOS 26.0".
- [#3231](https://github.com/software-mansion/react-native-screens/pull/3231) -
  `ScreenStackItem.tsx` gained a `shouldUseSafeAreaView` path
  (`Platform.OS === 'ios' && parseInt(Platform.Version, 10) >= 26`) that
  wraps pushed content in a real `SafeAreaView` on iOS 26, "to fix content
  rendering under `UINavigationBar` on iOS 26."
- [#3228](https://github.com/software-mansion/react-native-screens/pull/3228) -
  deduplicated `contentStyle` handling between `Screen` and
  `ScreenContentWrapper` - the exact code area Layer 3's patch touches.

**First attempt, tried and reverted**: upgraded just `react-native-screens`
from `4.16.0` to `4.17.1` directly (the very next patch release),
regenerating `patches/react-native-screens+4.16.0.patch` against the new
source. Built and ran cleanly on Android (full native rebuild, verified
live on the emulator), but broke iOS outright: app load failed with
`Exception in HostFunction: TypeError: expected dynamic type 'boolean'
but had type 'string'` - a Fabric prop-type mismatch. Root cause: Expo
SDK 54 officially bundles `~4.16.0`; the native prop schema `expo-router`'s
native-tabs bindings expect and what `react-native-screens` 4.17.x's
Fabric spec actually provides no longer lined up, on iOS specifically -
exactly the risk of going outside a bundled version pairing. A hard crash
is strictly worse than a cosmetic transient flash, so this was reverted
in full before it ever reached the user's phone as a real fix.

**Second attempt, worked but reverted anyway**: upgraded the whole Expo
SDK, 54 -> 55, rather than one package in isolation - SDK 55 bundles
`react-native-screens ~4.23.0` (confirmed via its own
`bundledNativeModules.json`), well past the `4.17.0` fix, with every
other native module version-paired correctly by Expo rather than guessed
at package-by-package. Confirmed the underlying fix was actually present
post-upgrade: `[UIColor systemBackgroundColor]` appeared in
`ios/bottom-tabs/host/RNSBottomTabsHostComponentView.mm` where `4.16.0`
had none, and the app built and ran correctly on Android end to end.

Getting an actual iOS verification build turned out to be its own saga,
independent of whether the fix itself worked: the test device had since
moved to an iOS 27 *beta*, which needs a beta Xcode (a large separate
download, free Apple ID only - no paid Developer Program needed) and its
own compounding build issues once installed - a CocoaPods deployment-target
floor mismatch (several pods' resource-bundle sub-targets were stuck as
low as iOS 9.0, below Xcode 27 beta's iOS 15.0 minimum), then a second
issue from the first fix attempt at that (`expo-build-properties`
unconditionally overwrites *every* pod's deployment target rather than
only raising outliers below a floor, which broke `expo-router`'s own
legitimate iOS 16.0+ requirement for its LinkPreview code). A working
fix for that was found (a custom raise-only Podfile `post_install`
patch, `plugins/with-ios-pod-resource-bundle-deployment-target.js`), but
by that point the cumulative effort - on a work laptop, for a cosmetic
transient flash - was judged not worth continuing. **Reverted in full**:
`react-native-screens` back to `4.16.0` (patch regenerated to match),
Expo SDK back to 54, `expo-router`'s native-tabs usage back to its
54-compatible API, and both new iOS-build-specific plugins removed.

**Current status: known, accepted issue.** The fix is understood and
was confirmed to work (SDK 55, `react-native-screens >= 4.17.0`) - revisit
if this app upgrades its Expo SDK for other reasons in the future, at
which point this specific artifact should already be resolved as a side
effect rather than needing its own dedicated effort again.
