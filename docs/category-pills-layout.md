# `category-pills.tsx` layout details

Static layout/spacing rationale for the category pills row, extracted out
of the component to keep the source focused on behavior. See
[`animated-scroll-collapse.md`](./animated-scroll-collapse.md) for the
scroll-driven animation behavior instead.

## The divider/back-arrow slot has a fixed width

The divider (shown at the start of the scrollable strip) and the back
arrow (shown once scrolled, to jump back to the start) occupy one shared,
fixed-width slot (`dividerSlot`) rather than each being its own bare flex
item. Swapping between a 2px-wide divider and a ~20px-wide icon changed
the row's total width, which visibly made the `ScrollView` after it jump
sideways on every swap. The slot's own width never changes; only what's
centered inside it does.

The slot's width (14) isn't the icon's own `size` prop (20) - that's the
icon's full bounding box, not its actual rendered ink. A left-chevron
glyph is narrower than it is tall, so most of that 20px was dead space
that the *divider* also got centered inside (on top of its own row gap),
reading as a noticeably bigger gap around the divider specifically than
everywhere else in the row. 14 is a closer (still estimated, not
measured) fit for the chevron's true width.

## Divider color matches the back arrow's icon color

The divider uses `theme.textSecondary`, the same color the back arrow's
own icon uses, so the two things that occupy the same slot read as one
consistent element rather than two different colors depending on scroll
state - and it's the *current* color scheme's own token (not the other
scheme's, as this once mistakenly used), so it stays guaranteed to
contrast against its own background either way.

## PILL_GAP vs. PILL_ITEM_GAP

Two different spacing constants, deliberately not unified into one:

- `PILL_GAP` is the screen-edge padding (pinned pill's left edge, and the
  scrollable strip's trailing right edge). Kept at `Spacing.three`
  specifically so the pinned pill's left edge lines up with the
  article/story cards' own left edge below it - a fixed design constraint
  tied to the rest of the page's layout.
- `PILL_ITEM_GAP` (14) is the space *between* items within the row:
  pinned pill -> divider/back-arrow slot, slot -> first scrollable pill,
  and between each scrollable pill after that. This is just a visual
  density choice, not tied to anything else on the page - `Spacing.three`
  there read as too much white space. It's driven by `row`'s own `gap`
  property rather than scattered margin/padding on each individual piece;
  that per-piece approach is what previously let the actual gaps drift
  apart from each other (the back arrow's own touch-padding was stacking
  with the divider's margin on one side while providing less than a full
  gap on the other).
