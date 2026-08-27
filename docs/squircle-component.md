# `Squircle` component design

`squircle.tsx` renders `children` over a continuous-curvature ("squircle")
background shape instead of relying on React Native's plain circular-arc
`borderRadius` - used for the app's genuinely partially-rounded rectangles
(cards, images, inputs).

Fully-round elements (buttons, badges, capsule pills) don't need this: a
circle and a squircle are the same shape once the radius reaches half the
box's shortest side, so those keep plain `borderRadius` (see `Radius.full`
in `constants/theme.ts`).

## Why it measures itself before rendering a real shape

SVG needs concrete pixel dimensions to generate a path (unlike
`borderRadius`, which works at any size). `onLayout` measures the box on
first render; until then it renders a plain rounded `View` at the same
radius, so there's no flash of an unrounded box while waiting for the
measurement.

## Why `onPress` makes the whole component a `Pressable`, not a wrapper

The more common pattern - a `TouchableOpacity` wrapping a
separately-positioned background - doesn't work here: `TouchableOpacity`'s
press-dimming only affects its own subtree, and the squircle background
would be a sibling layer that never dims, leaving only the content on top
fading while the card's own surface color stayed fully opaque. Rendering
a `Pressable` as the root instead means the press-opacity applies to the
SVG background too.

`CORNER_SMOOTHING` (0.6) is how rounded the corners feel between "plain
circular arc" (0) and a full superellipse (1) - matches the smoothing
most iOS UI (not app icons, which go higher) actually uses.
