# Fixing the white flash on screen navigation

A brief flash of the wrong background color appeared on every push/pop
transition (article <-> home, language-select <-> preferences, etc.),
even after the app had its own custom color palette wired up everywhere
else. Fixed in two layers, both in `src/app/_layout.tsx`, because the
color is painted by two different things at two different points in a
transition.

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
