# `story-detail-screen.tsx` notes

## Singleton-story guard

A story that only one source/article ever joined isn't really a cluster.
The list screen already routes straight to the article for these (see
`story-list.tsx`), but this screen is still reachable directly (a deep
link, a push notification, cached navigation state), so it needs its own
guard: bounce straight to the article rather than show a "1 sources · 1
articles" page with nothing to add over the article itself.
`router.replace` (not `push`) is used for the bounce so the back gesture
doesn't return here.

`story-list.tsx` applies the same "singleton" concept one level up: a
story with only one source/article renders and navigates exactly like a
plain `ArticleList` card instead of a story card, since "1 sources · 1
articles" is noise, not information, and the story detail screen (source/
article counts, a members list of exactly one) has nothing to add over
the article itself.
