import { API_BASE_URL as BASE_URL } from "./config";

// Registers (or updates) this device's push token with the backend -
// called every time the interval or language preference changes, not just
// once, so the backend's own cron (see the backend's
// docs/push-notifications.md) picks up the change on its very next tick.
// The endpoint is anonymous, but passing the session token (when signed
// in) links the subscription to the account so it can be cleaned up on
// account deletion; re-registering without one nulls that link.
export async function registerPushSubscription(
  pushToken: string,
  intervalMinutes: number,
  language: string,
  sessionToken?: string | null
): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
  const res = await fetch(`${BASE_URL}/push-subscriptions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ pushToken, intervalMinutes, language }),
  });
  if (!res.ok) throw new Error("Failed to register push subscription");
}

// Forget this device's subscription entirely - no auth, the caller holds
// the token. Used on sign-out alongside a fresh anonymous register.
export async function deregisterPushSubscription(pushToken: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/push-subscriptions`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pushToken }),
  });
  if (!res.ok) throw new Error("Failed to deregister push subscription");
}
