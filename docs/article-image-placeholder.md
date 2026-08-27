# `ArticleImage`'s no-photo/failed-load placeholder

## Circular clip, not a squircle mask

`ArticleImage` uses a plain circular `borderRadius` clip for its
placeholder, not a squircle mask. This app tried masking the real photo
through `@react-native-masked-view/masked-view` to get a true
squircle-clipped image, but that library only fails when its native view
actually tries to mount (not at `require()` time, unlike other optional
native modules in this app) - so the "is it available" shim couldn't
detect a broken/unlinked install, and the failure showed up as every
image rendering as a blank white box in practice. A circle is visually
indistinguishable from a squircle at typical thumbnail radii anyway, so
this trades a subtle corner-curve difference for images that reliably
render.

## No photo vs. failed to load are different states

These get genuinely different treatments rather than sharing one "here's
some text" box:

- **No photo was ever provided** (an expected, permanent condition for
  ~8% of articles - two whole sources never include one in their feed at
  all) gets a quiet, icon-only tile, the same way iOS itself represents
  "no artwork available" (Podcasts, Music, News) - not a colorful emoji
  plus a redundant repeat of the category name already shown elsewhere on
  the card.
- **A load failure** (had a URL, broke - a network hiccup, not a
  permanent fact about the article) keeps a brief explanation, since
  that one is more "something went wrong" than "there was never anything
  here".
