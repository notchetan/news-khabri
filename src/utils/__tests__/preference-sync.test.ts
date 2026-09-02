import { notifyPreferenceChanged, onPreferenceChanged } from "../preference-sync";

describe("preference-sync", () => {
  it("calls a subscribed listener when a change is notified", () => {
    const listener = jest.fn();
    onPreferenceChanged(listener);

    notifyPreferenceChanged();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("calls every subscribed listener, not just the first", () => {
    const first = jest.fn();
    const second = jest.fn();
    onPreferenceChanged(first);
    onPreferenceChanged(second);

    notifyPreferenceChanged();

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("stops calling a listener once unsubscribed", () => {
    const listener = jest.fn();
    const unsubscribe = onPreferenceChanged(listener);

    unsubscribe();
    notifyPreferenceChanged();

    expect(listener).not.toHaveBeenCalled();
  });

  it("does not throw when there are no listeners", () => {
    expect(() => notifyPreferenceChanged()).not.toThrow();
  });
});
