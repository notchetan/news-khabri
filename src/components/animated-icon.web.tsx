// The native splash overlay (see animated-icon.tsx) plays after
// SplashScreen.hideAsync(), which has no equivalent concept on web - there's
// no native splash screen to hand off from here, so this is intentionally a
// no-op rather than a web port of that animation.
export function AnimatedSplashOverlay() {
  return null;
}
