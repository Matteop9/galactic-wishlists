// All day bucketing is Europe/London; the server runs in UTC.
export const TZ = "Europe/London";

export function londonDate(d: Date = new Date()): string {
  // en-CA gives YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function londonDateTime(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** HAE dates look like "2026-04-23 07:12:00 +0100"; the local date is the first 10 chars. */
export function haeDate(raw: string): string {
  return raw.slice(0, 10);
}
