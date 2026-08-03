import { AppData, Game } from "./types";
import { formatKickoff, formatWindowPoint } from "./format";

/** Days before an away game's window opens that the reminder should land. */
export const AWAY_LEAD_DAYS = 3;

const APP_URL = "https://chelsea-tracker.vercel.app";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Format a Date as a floating local ICS datetime (no timezone suffix). */
function icsLocal(d: Date): string {
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}00`
  );
}

function icsUtcNow(): string {
  const d = new Date();
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Fold lines longer than 75 octets per RFC 5545 (continuation = CRLF + space). */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 73) {
    out.push(rest.slice(0, 73));
    rest = " " + rest.slice(73);
  }
  out.push(rest);
  return out.join("\r\n");
}

/** When the group actually needs to act on a game. */
export function actionTime(game: Game): Date {
  const open = new Date(game.orderOpen);
  if (game.homeAway === "A") {
    return new Date(open.getTime() - AWAY_LEAD_DAYS * 86_400_000);
  }
  return open;
}

function eventFor(game: Game, dtstamp: string): string[] {
  const start = actionTime(game);
  const end = new Date(start.getTime() + 30 * 60_000);
  const isAway = game.homeAway === "A";
  const summary = isAway
    ? `Send Neil request: ${game.opponent} (Away) — by ${formatWindowPoint(game.orderOpen)}`
    : `Apply window open: ${game.opponent} (Home) — closes ${formatWindowPoint(game.orderClose)}`;
  const descriptionParts = [
    `${game.opponent} (${isAway ? "Away" : "Home"}) — kickoff ${formatKickoff(game.date)}, ${game.competition}.`,
    isAway
      ? `Away game: requests must be with Neil BEFORE the order window opens (${formatWindowPoint(game.orderOpen)}).`
      : `Club order window: ${formatWindowPoint(game.orderOpen)} to ${formatWindowPoint(game.orderClose)}.`,
    game.notes ? `Note: ${game.notes}` : "",
    `Check interest and draft the email: ${APP_URL}`,
  ].filter(Boolean);
  return [
    "BEGIN:VEVENT",
    `UID:${game.id}@chelsea-tracker`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${icsLocal(start)}`,
    `DTEND:${icsLocal(end)}`,
    fold(`SUMMARY:${escapeText(summary)}`),
    fold(`DESCRIPTION:${escapeText(descriptionParts.join("\n"))}`),
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Chelsea ticket application reminder",
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
  ];
}

/**
 * Build a calendar of application reminders: home games get an event when
 * the window opens; away games get one AWAY_LEAD_DAYS before it opens.
 * Games whose action time has already passed are skipped.
 */
export function buildICS(data: AppData): string {
  const now = new Date();
  const dtstamp = icsUtcNow();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Chelsea Tracker//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:Chelsea Tickets ${escapeText(data.settings.seasonLabel)}`),
  ];
  for (const game of data.games) {
    if (actionTime(game) <= now) continue;
    lines.push(...eventFor(game, dtstamp));
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

export function downloadICS(data: AppData): void {
  const blob = new Blob([buildICS(data)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `chelsea-tickets-${data.settings.seasonLabel}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
