// A brief cooldown after any accepted navigation - guards against a fast
// double-tap firing a second push before the first one has visibly
// happened, which would otherwise stack two detail screens on top of each
// other. Module-scoped (not per-component state) deliberately: "tap
// article A, then quickly tap a *different* article B" needs this shared
// across every caller, not local to whichever single card/button was
// pressed - a per-component debounce wouldn't stop B's own separate press
// handler from firing just because A's already did.
let lastNavigationAt = 0;
const NAVIGATION_COOLDOWN_MS = 800;

// Runs `action` only if the cooldown has elapsed since the last accepted
// call anywhere in the app, and starts a fresh cooldown when it does. A
// tap that arrives during the cooldown is silently dropped, not queued -
// the user's intent was "go to what I just tapped", not "go there, then
// immediately go somewhere else".
export function guardedNavigate(action: () => void): void {
  const now = Date.now();
  if (now - lastNavigationAt < NAVIGATION_COOLDOWN_MS) return;
  lastNavigationAt = now;
  action();
}

// Test-only: resets the module-scoped cooldown state so one test's calls
// can't leak into the next - real callers never need this (the cooldown is
// deliberately shared/persistent for the app's own lifetime).
export function __resetGuardedNavigateForTests(): void {
  lastNavigationAt = 0;
}
