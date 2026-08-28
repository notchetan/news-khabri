# Article-swipe gesture vs. the OS back gesture

`article-detail-screen.tsx` wraps the entire screen in a `GestureDetector`
so a horizontal swipe anywhere jumps to the previous/next related article
(`swipeGesture`, `goToRelative`). That `Gesture.Pan()` has no edge
exclusion by default, and `react-native-gesture-handler`'s `PanGestureHandler`
is a low-level touch interceptor that claims a touch before Android's
system gesture navigation (or iOS's interactive-pop swipe) ever sees it.

This was a real, reproduced bug, not a hypothetical: simulating an
edge-swipe on the Android emulator (`adb shell input swipe 5 1500 500 1500
200` - starting 5px from the left edge) was captured entirely by
`swipeGesture`, which swapped to a related article and showed its own
swipe-direction indicator chevron - the OS back gesture never fired. A
user swiping in from the edge to go back (system-wide muscle memory,
especially with Android's default gesture navigation) would instead land
on an unrelated article with no indication why.

## Fix

`swipeGesture.hitSlop({ left: -EDGE_EXCLUSION_WIDTH, right: -EDGE_EXCLUSION_WIDTH })`.

`hitSlop` normally *expands* a gesture's recognized touch area beyond the
view's bounds (a positive number means touches outside the view still
count). A **negative** value does the opposite - it shrinks the
recognized area inward from that edge. Confirmed by reading
`GestureHandler.isWithinBounds` in the native Android implementation
(`node_modules/react-native-gesture-handler/android/.../GestureHandler.kt`):
`left -= padLeft`, so a negative `padLeft` (i.e. a negative `hitSlop.left`)
makes `left` become positive, meaning touches starting within that many
points of the left edge fall outside the accepted region and never reach
this handler - they fall through to whatever's underneath, including the
OS's own edge-swipe-back recognizer.

`EDGE_EXCLUSION_WIDTH = 24` matches Android's default system back-gesture
edge inset (`24dp`); generous enough to also clear iOS's interactive-pop
edge zone. Re-verified live on the emulator after the fix: the same edge
swipe now falls through and correctly navigates back instead of swapping
articles.
