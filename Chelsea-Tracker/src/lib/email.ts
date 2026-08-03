import { Game, Member, Settings } from "./types";
import { formatEmailDate } from "./format";

export function buildEmailBody(
  settings: Settings,
  game: Game,
  members: Member[],
  applierName: string
): string {
  const memberLines = members
    .map((m) => `${m.name} - ${m.membershipNumber}`)
    .join("\n");
  const applierFirstName = applierName.split(" ")[0] ?? applierName;
  return settings.email.template
    .replaceAll("{count}", String(members.length))
    .replaceAll("{opponent}", game.opponent)
    .replaceAll("{date}", formatEmailDate(game.date))
    .replaceAll("{members}", memberLines)
    .replaceAll("{applier}", applierFirstName);
}

export function buildEmailSubject(game: Game): string {
  const venue = game.homeAway === "H" ? "(H)" : "(A)";
  return `Ticket application — ${game.opponent} ${venue}, ${formatEmailDate(game.date)}`;
}

export function buildMailto(
  settings: Settings,
  game: Game,
  members: Member[],
  applierName: string
): string {
  const body = buildEmailBody(settings, game, members, applierName);
  const subject = buildEmailSubject(game);
  const to = settings.email.to.trim();
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}
