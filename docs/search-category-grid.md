# Search tab's category grid

Layout/sizing rationale specific to `search/index.tsx`'s category grid,
extracted out of the component. For the generic `KeyboardAvoidingView`/
`ScrollView`/`onLayout` gotchas this file also runs into, see the
frontend `AGENTS.md`'s own "Hard-won `Animated`/`onLayout`/layout
lessons" section instead - this file only covers what's specific to the
grid itself.

## Every language's grid is sized against English's row count

English has 10 categories (5 rows of 2). Every language's card grid is
sized against that reference (`REFERENCE_GRID_ROWS = 5`), not its own
category count, so a language with fewer categories (some have as few as
3-4) gets shorter rows worth of scroll space rather than the same rows
flex-stretching taller to fill the leftover room.

The previous design used `flex: 1` on every row, which made the grid fill
the screen for any category count - but at the cost of card size actually
depending on how many categories a language happens to have, which read
as inconsistent/distorted next to every other language's cards.

`GRID_VERTICAL_PADDING` and `GRID_ROW_GAPS` are the two non-card-height
pieces of the grid's total measured height (the content container's own
padding, and the gaps between `REFERENCE_GRID_ROWS` rows) - kept as named
constants derived from the same `Spacing` tokens the actual styles use
(`styles.gridContent`/`styles.gridRow`), rather than hardcoded numbers, so
this math stays correct if those tokens ever change. `cardRowHeight` then
divides the grid's real measured height (minus those two pieces) by
`REFERENCE_GRID_ROWS` to get a row height every language shares.

## Card size freezes on the keyboard-closed measurement

`handleGridLayout` deliberately ignores any layout pass fired while the
keyboard is visible, and `cardRowHeight` is derived only from that frozen
`closedHeight`. This used to remember a *separate* measurement per
keyboard state and switch between them depending on `keyboardVisible`,
which meant every keyboard show/hide visibly resized the cards (the
keyboard shrinks the grid's available height, and each state's height fed
into the same `REFERENCE_GRID_ROWS` division differently). The fix is to
just never let a keyboard-open layout pass update the reference height at
all - card size always reflects only the keyboard-closed measurement, so
it can't shift no matter how the keyboard toggles.

## `chunkIntoPairs`, not `FlatList`'s `numColumns`

Categories are grouped into row-pairs manually and rendered as plain
`View`s rather than using `FlatList`'s own `numColumns`/
`columnWrapperStyle`. That combination doesn't actually forward
`flex-grow` to the row wrappers it creates - confirmed empirically, every
row stayed `flexGrow: 0` despite `columnWrapperStyle` setting `flex: 1` -
which is exactly what's needed for the grid to fill whatever vertical
space is actually available. Rendering the rows directly here means this
file controls every element's style itself, with nothing left to that
indirection to lose.
