# `category-icon.ts` emoji choices

Used for the search tab's category-selection grid, where a colorful emoji
works as decorative tile art rather than a functional icon - a different
context from `category-glyph.ts`'s SF Symbol mapping (used for
`article-image.tsx`'s no-photo placeholder), where a flat emoji on a plain
box would read as a broken/empty state rather than a designed one.

- **Cricket** keeps the cricket-bat emoji it always had; general
  **sports** (now meaning "everything except cricket" - football, tennis,
  Olympics, ...) uses a football/soccer ball rather than a trophy, reading
  more clearly as "sports" at a glance in the grid.
- **Politics** is the topic the backend's own "india"/national-news
  category resolves to (see `docs/category-topic-mapping.md` - the
  backend has no separate canonical "politics" category; "india" is what
  actually surfaces this card in the search grid), so its icon is the
  India flag rather than a generic government building.
