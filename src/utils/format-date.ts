import type { TranslationKey } from "@/i18n/translations";

// Publisher feeds use a mix of RFC 822 and ISO 8601 date strings, in
// whatever timezone that publisher happens to use. Normalize to a single
// readable format in IST, since this is an India-focused news app.
export function formatPublishedDate(dateString: string | null): string | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;

  const datePart = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);

  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(date);

  return `${datePart} ${timePart} IST`;
}

// Used for story-card metadata ("Updated 25m ago"). The date math here is
// deliberately hand-rolled rather than Intl.RelativeTimeFormat - that API's
// support is inconsistent across the Hermes builds this app actually runs
// on (it's thrown at runtime on some), unlike Intl.DateTimeFormat above
// which is reliably available. The *text* itself, unlike
// formatPublishedDate's hardcoded "IST" above, does go through the app's
// translation system - takes the caller's own t() (every call site already
// has one via useTranslation()) rather than importing the hook here, since
// this file has no React context of its own to call it from.
export function formatRelativeTime(
  dateString: string | null,
  t: (key: TranslationKey, vars?: Record<string, string>) => string
): string | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;

  // Clamp negative (a future date, e.g. clock skew from a source) to 0
  // rather than showing a nonsensical "in the past" value.
  const diffSeconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));

  if (diffSeconds < 60) return t("justNow");

  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return t("minutesAgoTemplate", { minutes: String(diffMinutes) });

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return t("hoursAgoTemplate", { hours: String(diffHours) });

  const diffDays = Math.round(diffHours / 24);
  return t("daysAgoTemplate", { days: String(diffDays) });
}
