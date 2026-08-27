// Brief cooldown after any accepted navigation, guarding against a fast
// double-tap stacking two detail screens. Module-scoped, not per-component
// state - "tap article A, then a different article B" needs this shared
// across every caller, since a per-component debounce wouldn't stop B's
// own separate press handler from firing just because A's already did.
let lastNavigationAt = 0;
const NAVIGATION_COOLDOWN_MS = 800;

// A tap during the cooldown is silently dropped, not queued.
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
