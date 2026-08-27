import en from "@/i18n/locales/en";
import type { TranslationKey } from "@/i18n/translations";
import { formatPublishedDate, formatRelativeTime } from "../format-date";

// A minimal stand-in for the real t() - formatRelativeTime is
// translation-agnostic (see its own comment), so this test only needs to
// prove it calls through correctly, using the real English strings as the
// fixture rather than duplicating them ad hoc.
function t(key: TranslationKey, vars?: Record<string, string>): string {
  let text: string = en[key];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replace(`{${name}}`, value);
    }
  }
  return text;
}

describe("formatPublishedDate", () => {
  it("returns null for a null input", () => {
    expect(formatPublishedDate(null)).toBeNull();
  });

  it("returns null for an unparsable date string", () => {
    expect(formatPublishedDate("not a date")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(formatPublishedDate("")).toBeNull();
  });

  it("formats an ISO 8601 UTC date into IST", () => {
    // 2026-01-15T18:30:00Z is 2026-01-16T00:00:00 IST (UTC+5:30).
    expect(formatPublishedDate("2026-01-15T18:30:00Z")).toBe(
      "16 January 2026 12:00 AM IST"
    );
  });

  it("formats an RFC 822 date string (common in RSS feeds)", () => {
    // Mon, 15 Jan 2026 12:00:00 GMT -> 17:30 IST same day.
    expect(formatPublishedDate("Mon, 15 Jan 2026 12:00:00 GMT")).toBe(
      "15 January 2026 5:30 PM IST"
    );
  });

  it("pads single-digit minutes with a leading zero", () => {
    // 2026-01-15T18:05:00Z -> 23:35 IST -> "11:35 PM"
    expect(formatPublishedDate("2026-01-15T18:05:00Z")).toBe(
      "15 January 2026 11:35 PM IST"
    );
  });
});

describe("formatRelativeTime", () => {
  const NOW = new Date("2026-08-26T12:00:00Z");

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns null for a null input", () => {
    expect(formatRelativeTime(null, t)).toBeNull();
  });

  it("returns null for an unparsable date string", () => {
    expect(formatRelativeTime("not a date", t)).toBeNull();
  });

  it("formats minutes ago", () => {
    expect(formatRelativeTime("2026-08-26T11:35:00Z", t)).toBe("25m ago");
  });

  it("formats hours ago", () => {
    expect(formatRelativeTime("2026-08-26T09:00:00Z", t)).toBe("3h ago");
  });

  it("formats days ago", () => {
    expect(formatRelativeTime("2026-08-24T12:00:00Z", t)).toBe("2d ago");
  });

  it("shows 'Just now' for very recent timestamps", () => {
    expect(formatRelativeTime("2026-08-26T11:59:50Z", t)).toBe("Just now");
  });

  it("clamps a future date (e.g. clock skew) to 'Just now' instead of a negative value", () => {
    expect(formatRelativeTime("2026-08-26T12:05:00Z", t)).toBe("Just now");
  });

  it("calls through the given t() rather than hardcoding English - proves this is actually localizable", () => {
    const trackedCalls: [string, Record<string, string> | undefined][] = [];
    const trackingT = (key: TranslationKey, vars?: Record<string, string>) => {
      trackedCalls.push([key, vars]);
      return `translated:${key}`;
    };

    expect(formatRelativeTime("2026-08-26T11:35:00Z", trackingT)).toBe(
      "translated:minutesAgoTemplate"
    );
    expect(trackedCalls).toEqual([["minutesAgoTemplate", { minutes: "25" }]]);
  });
});
