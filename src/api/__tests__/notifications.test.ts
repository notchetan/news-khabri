import { registerPushSubscription } from "../notifications";

function mockFetchOnce(ok = true) {
  global.fetch = jest.fn().mockResolvedValue({ ok }) as unknown as typeof fetch;
}

describe("registerPushSubscription", () => {
  it("POSTs the token, interval, and language as JSON", async () => {
    mockFetchOnce();

    await registerPushSubscription("ExponentPushToken[abc]", 15, "en");

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/push-subscriptions"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pushToken: "ExponentPushToken[abc]",
          intervalMinutes: 15,
          language: "en",
        }),
      })
    );
  });

  it("throws when the response is not ok", async () => {
    mockFetchOnce(false);

    await expect(
      registerPushSubscription("ExponentPushToken[abc]", 15, "en")
    ).rejects.toThrow("Failed to register push subscription");
  });
});
