const BASE_URL = "http://192.168.0.55:3000";

// Registers (or updates) this device's push token with the backend -
// called every time the interval or language preference changes, not just
// once, so the backend's own cron (see the backend's
// docs/push-notifications.md) picks up the change on its very next tick.
export async function registerPushSubscription(
  pushToken: string,
  intervalMinutes: number,
  language: string
): Promise<void> {
  const res = await fetch(`${BASE_URL}/push-subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pushToken, intervalMinutes, language }),
  });
  if (!res.ok) throw new Error("Failed to register push subscription");
}
