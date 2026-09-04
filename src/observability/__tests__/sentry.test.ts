// sentryEnabled is decided at module load from EXPO_PUBLIC_SENTRY_DSN and
// __DEV__, so each case resets the module registry and re-requires with
// those set - grabbing the fresh @sentry/react-native mock from the same
// registry so the spies line up.
function load(dsn: string | undefined, dev: boolean) {
  jest.resetModules();
  if (dsn === undefined) delete process.env.EXPO_PUBLIC_SENTRY_DSN;
  else process.env.EXPO_PUBLIC_SENTRY_DSN = dsn;

  const g = global as unknown as { __DEV__: boolean };
  const original = g.__DEV__;
  g.__DEV__ = dev;
  const sentry = require("@sentry/react-native") as {
    init: jest.Mock;
    captureException: jest.Mock;
  };
  const mod = require("../sentry") as typeof import("../sentry");
  g.__DEV__ = original;
  return { ...mod, sentry };
}

describe("initSentry", () => {
  it("does nothing when no DSN is configured", () => {
    const { initSentry, sentryEnabled, sentry } = load(undefined, false);
    initSentry();
    expect(sentryEnabled).toBe(false);
    expect(sentry.init).not.toHaveBeenCalled();
  });

  it("does nothing in development even with a DSN", () => {
    const { initSentry, sentryEnabled, sentry } = load(
      "https://key@example.ingest.sentry.io/1",
      true
    );
    initSentry();
    expect(sentryEnabled).toBe(false);
    expect(sentry.init).not.toHaveBeenCalled();
  });

  it("initializes with the DSN in a release build", () => {
    const dsn = "https://key@example.ingest.sentry.io/1";
    const { initSentry, sentryEnabled, sentry } = load(dsn, false);
    initSentry();
    expect(sentryEnabled).toBe(true);
    expect(sentry.init).toHaveBeenCalledTimes(1);
    expect(sentry.init.mock.calls[0][0]).toMatchObject({ dsn, tracesSampleRate: 0 });
  });
});

describe("captureException", () => {
  it("is a no-op when Sentry is disabled", () => {
    const { captureException, sentry } = load(undefined, false);
    captureException(new Error("boom"));
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it("forwards to Sentry when enabled", () => {
    const { captureException, sentry } = load(
      "https://key@example.ingest.sentry.io/1",
      false
    );
    const err = new Error("boom");
    captureException(err);
    expect(sentry.captureException).toHaveBeenCalledWith(err);
  });
});
