# Cross-script text rendering (Devanagari/Tamil/Telugu/etc.)

This app renders real headlines and UI labels in 10 languages, several of
which (Devanagari, Tamil, Telugu, Malayalam, ...) have taller ascenders
and matras than Latin text needs. The same clipping bug showed up
independently in three places this app has touched so far - `app-header.tsx`,
`themed-text.tsx`'s shared `title`/`subtitle` styles, and
`article-detail-screen.tsx`'s header labels - documented once here since
the root cause and fix are identical each time.

## Root cause

Either (a) a hard `height: N` + `overflow: "hidden"` clip box on the text's
wrapper that's sized for Latin text's shorter natural line box, or (b) an
explicit `lineHeight` ratio copied from Apple's own Dynamic Type scale
(roughly 1.1-1.2x `fontSize`), which is tuned for Latin glyphs and clips
the top of taller scripts' ascenders/matras. `numberOfLines={1}`
truncating to `"X…"` is a good diagnostic sign the container is narrower
than intended, not necessarily that the text itself is wrong.

## Fix

A generous `lineHeight: Math.ceil(fontSize * 1.4)` (noticeably larger than
`fontSize`, not equal to it - equal clips tall scripts' ascenders/matras),
plus, on Android only, `includeFontPadding: false` +
`textAlignVertical: "center"`. `themed-text.tsx` has a test asserting the
invariant `lineHeight / fontSize >= 1.3` rather than an exact value, so
future retuning doesn't break the test.

## Vertically centering an icon/logo next to a label

Once a label has real headroom above its own glyph (from the generous
`lineHeight` above), a *hard* clip on its wrapper isn't the risk anymore -
what actually matters is how that headroom interacts with `alignItems` on
the row containing the icon/logo and the label:

- If the row has no other height constraint, its cross-axis height comes
  from the *tallest* child - which, once the label's own `lineHeight` has
  real headroom, is the label itself. Centering the icon within that
  height (`alignItems: "center"`) is what reads as vertically centered
  against the label - `article-detail-screen.tsx`'s header pills anchor
  this way.
- `app-header.tsx`'s title uses `alignItems: "flex-end"` on its row
  instead, so the title sits against the logo's own bottom edge rather
  than centered against it - deliberately different from the article
  header, chosen because a title's line-height box there has enough
  headroom above the glyph that centering it against the logo put the
  *glyph itself* noticeably higher than the logo's own center. Anchoring
  to the bottom instead means that headroom simply extends upward past
  the logo, harmlessly, whatever its size ends up being for a given
  script.

Which of the two (`center` vs `flex-end`) is right depends on how the
specific row is composed - `center` is correct once nothing else in the
row constrains height below the label's own natural size; `flex-end` is
the fallback when a shorter icon needs to align against a taller label's
own baseline-like edge instead.

## `ThemedText`'s `title`/`subtitle` scale

`title`/`subtitle` (`themed-text.tsx`) are sized against iOS's own Dynamic
Type scale rather than arbitrary numbers - Large Title is 34pt, and this
app previously had no size above that (its old "title" was 48pt, closer
to a website's hero text than anything in the native scale). `title` now
sits just above `subtitle` (Large Title itself) for the rare hero/display
case that needs to read a step bigger; `subtitle` is what every actual
page/article title in the app uses today (article/story titles, legal
document titles, profile, search category headers).

Both `lineHeight`s use the same generous 1.4x `fontSize` as everywhere
else on this page (not Apple's own tighter 44/41 ratios, ~1.1-1.2x) - real
scraped headlines, rendered in whichever language is currently active,
hit the same ascender/matra clipping Apple's own ratios cause. `themed-text.test.tsx`
asserts the invariant `lineHeight / fontSize >= 1.3` rather than an exact
value, so future retuning doesn't break the test.
