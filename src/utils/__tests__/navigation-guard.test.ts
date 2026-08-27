import { __resetGuardedNavigateForTests, guardedNavigate } from "../navigation-guard";

describe("guardedNavigate", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // The cooldown is module-scoped state (deliberately - see its own
    // comment, it needs to persist across different cards/screens in the
    // real app) - reset it explicitly so one test's accepted call doesn't
    // leak into the next test's own "first call" expectations.
    __resetGuardedNavigateForTests();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("runs the action on the first call", () => {
    const action = jest.fn();
    guardedNavigate(action);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("drops a second call that arrives before the cooldown elapses - the core fix for a fast double-tap", () => {
    const first = jest.fn();
    const second = jest.fn();
    guardedNavigate(first);

    jest.advanceTimersByTime(200);
    guardedNavigate(second);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });

  it("drops a rapid call even when it's a *different* action - two different articles tapped quickly, not just the same one twice", () => {
    // This is what actually needs to be true for the reported bug: tapping
    // article A then a different article B in quick succession must only
    // navigate once, not twice.
    const articleA = jest.fn();
    const articleB = jest.fn();
    guardedNavigate(articleA);

    jest.advanceTimersByTime(50);
    guardedNavigate(articleB);

    expect(articleA).toHaveBeenCalledTimes(1);
    expect(articleB).not.toHaveBeenCalled();
  });

  it("allows a new call once the cooldown has fully elapsed", () => {
    const first = jest.fn();
    const second = jest.fn();
    guardedNavigate(first);

    jest.advanceTimersByTime(801);
    guardedNavigate(second);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });
});
