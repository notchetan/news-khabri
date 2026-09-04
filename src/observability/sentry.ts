import * as Sentry from "@sentry/react-native";

// Crash + error reporting. Deliberately inert until a DSN is configured -
// same shape as expo-updates in this repo (the wiring ships now, does
// nothing until the project is actually set up). To turn it on:
//   1. create a Sentry project, put its DSN in EXPO_PUBLIC_SENTRY_DSN
//      (per environment - it's inlined at build time, not secret)
//   2. set SENTRY_ORG / SENTRY_PROJECT / SENTRY_AUTH_TOKEN as EAS build
//      secrets so source maps upload (see AGENTS.md)
//   3. rebuild the native app (the JS-only fallback here won't report
//      native crashes)
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

// No DSN -> Sentry.init is never called, so there's no transport, no
// network, and the guards below make captureException a no-op.
export const sentryEnabled = Boolean(dsn) && !__DEV__;

export function initSentry(): void {
  if (!sentryEnabled) return;
  Sentry.init({
    dsn,
    // Pure crash/error reporting for now - no performance transactions,
    // so nothing to sample and no quota burn. Raise this (and add a
    // navigation integration) if we later want tracing.
    tracesSampleRate: 0,
    // The app already shows its own recovery UI (the ErrorBoundary in
    // app/_layout.tsx); Sentry's native crash screen would double up.
    attachStacktrace: true,
  });
}

// Called from the root ErrorBoundary. A bare re-export would still report
// when disabled (Sentry buffers events pre-init); this stays silent.
export function captureException(error: unknown): void {
  if (sentryEnabled) Sentry.captureException(error);
}

// app/_layout.tsx wraps its default export with this - a no-op passthrough
// when Sentry is disabled.
export const wrap = Sentry.wrap;
